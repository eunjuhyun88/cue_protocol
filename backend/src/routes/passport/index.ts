// ============================================================================
// 🎫 AI Passport 라우트 (수정된 완전한 구현)
// 경로: backend/src/routes/passport/index.ts
// 용도: AI Passport 정보 조회 및 관리 API
// 수정사항: Express 라우터 오류 해결, 완전한 에러 처리 추가
// ============================================================================

import express, { Request, Response, Router } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { supabaseService } from '../../services/database/SupabaseService';
import { asyncHandler } from '../../middleware/errorHandler';

// 라우터 생성
const router: Router = express.Router();

// 데이터베이스 서비스 선택 (환경에 따라 자동 선택)
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : supabaseService;

console.log('🎫 Passport Routes module loaded - using', db.constructor.name);

// ============================================================================
// 🔍 AI Passport 정보 조회
// GET /api/passport/:did
// ============================================================================

router.get('/:did', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const userDid = (req as any).user?.did;

  console.log(`🔍 Passport 정보 조회 요청: ${did}`);

  // did 값이 없으면 에러 반환
  if (!did) {
    res.status(400).json({
      success: false,
      error: 'DID parameter is required'
    });
    return;
  }

  // 권한 확인
  if (!userDid) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied - Can only access your own passport'
    });
    return;
  }

  try {
    // 1. AI Passport 정보 조회
    const passport = await db.getPassport(did as string);
    
    // 2. CUE 잔액 조회
    const cueBalance = await db.getCUEBalance(did as string);
    
    // 3. 데이터 볼트 조회
    const dataVaults = await db.getDataVaults(did as string);
    
    // 4. 사용자 정보 조회 (추가 정보)
    let user = null;
    if (typeof db.getUserById === 'function') {
      user = await db.getUserById(did as string);
    }

    if (!passport && !user) {
      res.status(404).json({
        success: false,
        error: 'Passport not found'
      });
      return;
    }

    // 5. 응답 구성
    const response = {
      success: true,
      passport: passport ? {
        ...passport,
        cueTokens: cueBalance,
        dataVaults,
        vaultCount: dataVaults.length,
        lastActivity: passport.last_activity_at || passport.updated_at
      } : null,
      user: user ? {
        id: user.id,
        username: user.username,
        email: user.email,
        did: user.did,
        walletAddress: user.wallet_address,
        passkeyRegistered: user.passkey_registered,
        loginCount: user.login_count,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      } : null,
      statistics: {
        cueBalance,
        vaultCount: dataVaults.length,
        totalInteractions: passport?.total_interactions || 0,
        trustScore: passport?.trust_score || 0
      }
    };

    console.log(`✅ Passport 조회 성공: ${did} (CUE: ${cueBalance}, Vaults: ${dataVaults.length})`);
    res.json(response);

  } catch (error: any) {
    console.error('❌ Passport 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get passport information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// ✏️ AI Passport 정보 업데이트
// PUT /api/passport/:did
// ============================================================================

router.put('/:did', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const updates = req.body;
  const userDid = (req as any).user?.did;

  console.log(`✏️ Passport 업데이트 요청: ${did}`, Object.keys(updates));

  // 권한 확인
  if (!userDid) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied - Can only update your own passport'
    });
    return;
  }

  // 업데이트 가능한 필드 검증
  const allowedFields = [
    'personality_profile',
    'preferences',
    'communication_style',
    'learning_patterns',
    'phone_verified',
    'kyc_verified'
  ];

  const filteredUpdates: any = {};
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  if (Object.keys(filteredUpdates).length === 0) {
    res.status(400).json({
      success: false,
      error: 'No valid fields to update',
      allowedFields
    });
    return;
  }

  try {
    // 기존 Passport 확인
    const existingPassport = await db.getPassport(did as string);
    if (!existingPassport) {
      res.status(404).json({
        success: false,
        error: 'Passport not found'
      });
      return;
    }

    // Passport 업데이트
    const updatedPassport = await db.updatePassport(did as string, {
      ...filteredUpdates,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    });

    if (!updatedPassport) {
      res.status(500).json({
        success: false,
        error: 'Failed to update passport'
      });
      return;
    }

    console.log(`✅ Passport 업데이트 성공: ${did}`);
    
    res.json({
      success: true,
      passport: updatedPassport,
      updatedFields: Object.keys(filteredUpdates)
    });

  } catch (error: any) {
    console.error('❌ Passport 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update passport',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 📊 AI Passport 통계 조회
// GET /api/passport/:did/stats
// ============================================================================

router.get('/:did/stats', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const userDid = (req as any).user?.did;
  const { days = 7 } = req.query;

  console.log(`📊 Passport 통계 조회: ${did} (${days}일)`);

  // 권한 확인
  if (!userDid || userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
    return;
  }

  try {
    // 기본 통계
    const passport = await db.getPassport(did as string);
    const cueBalance = await db.getCUEBalance(did as string);
    const dataVaults = await db.getDataVaults(did as string);
    
    // CUE 거래 내역
    let transactions: any[] = [];
    if (typeof (db as any).getCUETransactions === 'function') {
      transactions = await (db as any).getCUETransactions(did, parseInt(days as string) * 5);
    } else {
      console.warn('getCUETransactions method not implemented on db instance');
    }
    
    // 최근 상호작용
    let recentInteractions: any[] = [];
    if ('getRecentInteractions' in db && typeof (db as any).getRecentInteractions === 'function') {
      recentInteractions = await (db as any).getRecentInteractions(did, 10);
    }

    // 통계 계산
    const daysNum = parseInt(days as string);
    const recentTransactions = transactions.filter((tx: any) => 
      new Date(tx.created_at) > new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000)
    );

    const miningTransactions = recentTransactions.filter((tx: any) => 
      tx.transaction_type === 'mining' || tx.transaction_type === 'reward'
    );

    const totalMined = miningTransactions.reduce((sum: number, tx: any) => 
      sum + parseFloat(tx.amount), 0
    );

    const totalSpent = recentTransactions
      .filter((tx: any) => tx.transaction_type === 'spending')
      .reduce((sum: number, tx: any) => sum + Math.abs(parseFloat(tx.amount)), 0);

    const stats = {
      passport: {
        level: passport?.passport_level || 'Unknown',
        trustScore: passport?.trust_score || 0,
        totalInteractions: passport?.total_interactions || 0,
        registrationStatus: passport?.registration_status || 'incomplete',
        biometricVerified: passport?.biometric_verified || false,
        emailVerified: passport?.email_verified || false
      },
      cue: {
        currentBalance: cueBalance,
        totalMined: Math.round(totalMined * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        netChange: Math.round((totalMined - totalSpent) * 100) / 100,
        dailyAverage: Math.round((totalMined / daysNum) * 100) / 100,
        transactionCount: recentTransactions.length
      },
      dataVaults: {
        totalVaults: dataVaults.length,
        totalDataCount: dataVaults.reduce((sum: number, vault: any) => 
          sum + (vault.data_count || 0), 0
        ),
        categories: [...new Set(dataVaults.map((v: any) => v.category))]
      },
      activity: {
        recentInteractions: recentInteractions.length,
        lastActivity: passport?.last_activity_at || passport?.updated_at,
        activeDays: daysNum
      },
      period: {
        days: daysNum,
        from: new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };

    console.log(`✅ Passport 통계 조회 성공: ${did}`);
    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('❌ Passport 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get passport statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 🔄 AI Passport 새로고침 (재동기화)
// POST /api/passport/:did/refresh
// ============================================================================

router.post('/:did/refresh', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const userDid = (req as any).user?.did;

  console.log(`🔄 Passport 새로고침 요청: ${did}`);

  // 권한 확인
  if (!userDid || userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
    return;
  }

  try {
    // 최신 데이터로 Passport 동기화
    const user = typeof db.getUserById === 'function' ? await db.getUserById(did as string) : null;
    const cueBalance = await db.getCUEBalance(did as string);
    const dataVaults = await db.getDataVaults(did as string);
    let recentTransactions: any[] = [];
    if (typeof (db as any).getCUETransactions === 'function') {
      recentTransactions = await (db as any).getCUETransactions(did as string, 10);
    } else {
      recentTransactions = [];
    }

    // Passport 정보 업데이트
    const refreshedData = {
      last_activity_at: new Date().toISOString(),
      total_interactions: recentTransactions.filter((tx: any) => 
        tx.source === 'ai_chat'
      ).length,
      data_vaults_count: dataVaults.length
    };

    const updatedPassport = await db.updatePassport(did as string, refreshedData);

    console.log(`✅ Passport 새로고침 완료: ${did}`);
    
    res.json({
      success: true,
      message: 'Passport refreshed successfully',
      passport: updatedPassport,
      syncedData: {
        cueBalance,
        vaultCount: dataVaults.length,
        recentTransactionCount: recentTransactions.length,
        lastRefresh: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Passport 새로고침 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh passport',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 📋 상태 확인 API
// GET /api/passport/health
// ============================================================================

router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    service: 'Passport Routes',
    database: db.constructor.name,
    timestamp: new Date().toISOString(),
    mockMode: process.env.USE_MOCK_DATABASE === 'true'
  });
});

console.log('✅ Passport Routes module initialized successfully');

// 라우터를 기본 내보내기로 명시적 export
export default router;