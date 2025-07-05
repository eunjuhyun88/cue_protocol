// ============================================================================
// 🎫 향상된 AI Passport 라우트 시스템 (기존 + 신규 통합)
// 파일: backend/src/routes/passport/index.ts
// 기존 기능 + 개인화 분석 + 신뢰도 점수 + 성취 시스템
// ============================================================================

import express, { Request, Response, Router } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { SupabaseService } from '../../services/database/SupabaseService';
import { PersonalizationService } from '../../services/ai/PersonalizationService';
import { PersonalcueExtractor } from '../../services/ai/PersonalcueExtractor';
import { authMiddleware } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

// 서비스 인스턴스들 (기존 + 신규)
const databaseService = DatabaseService.getInstance();
const supabaseService = SupabaseService.getInstance();

// 데이터베이스 서비스 선택
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? databaseService
  : supabaseService;

// 신규 서비스들
let personalizationService: PersonalizationService;
let personalcueExtractor: PersonalcueExtractor;

try {
  personalizationService = new PersonalizationService();
  personalcueExtractor = new PersonalcueExtractor();
} catch (error) {
  console.warn('⚠️ 개인화 서비스 초기화 실패 - Mock 모드로 실행:', error);
}

console.log('🎫 Enhanced Passport Routes initialized with:', db.constructor.name);

// ============================================================================
// 🔍 AI Passport 정보 조회 (기존 + 신규 기능 통합)
// GET /api/passport/:did
// ============================================================================

router.get('/:did(*)', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const { includeHistory = 'false', includeVaults = 'false', includeTrustHistory = 'false' } = req.query;
  const user = (req as any).user;
  const userDid = user?.did || user?.id;

  console.log(`🔍 Passport 정보 조회 요청: ${did}`);

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
    // 1. AI Passport 기본 정보 조회 (기존)
    const passport = await db.getPassport(did as string);
    
    // 2. CUE 잔액 조회 (기존)
    const cueBalance = await db.getCUEBalance(did as string);
    
    // 3. 데이터 볼트 조회 (기존 + 신규)
    const dataVaults = await db.getDataVaults(did as string);
    
    // 4. 사용자 정보 조회 (기존)
    let userData = null;
    if (typeof db.getUserById === 'function') {
      userData = await db.getUserById(did as string);
    }

    // 5. 추가 데이터 포함 (신규 기능)
    let enrichedPassport = passport || {};
    
    if (includeHistory === 'true') {
      try {
        let interactionHistory = [];
        if (typeof db.getInteractionHistory === 'function') {
          interactionHistory = await db.getInteractionHistory(did);
        } else if (typeof (db as any).getCUETransactions === 'function') {
          // CUE 거래 내역으로 대체
          interactionHistory = await (db as any).getCUETransactions(did, 50);
        }
        enrichedPassport.interactionHistory = interactionHistory;
      } catch (error) {
        console.warn('⚠️ 상호작용 이력 조회 실패:', error);
      }
    }
    
    if (includeVaults === 'true') {
      enrichedPassport.dataVaults = dataVaults.filter(vault => !vault.deleted);
    }

    // 6. 신뢰도 점수 실시간 계산 (신규 기능)
    let currentTrustScore = passport?.trust_score || 50;
    let trustScoreHistory = passport?.trust_score_history || passport?.trustScoreHistory || [];

    if (personalizationService) {
      try {
        currentTrustScore = await personalizationService.calculateTrustScore({
          ...passport,
          cueBalance,
          dataVaults
        });
        
        // 신뢰도 점수 이력 업데이트
        if (includeTrustHistory === 'true') {
          const lastScore = trustScoreHistory[trustScoreHistory.length - 1];
          if (!lastScore || lastScore.score !== currentTrustScore) {
            trustScoreHistory.push({
              score: currentTrustScore,
              timestamp: new Date().toISOString(),
              reason: 'Real-time calculation'
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ 신뢰도 점수 계산 실패:', error);
      }
    }

    // 7. 개인화 프로필 분석 (신규 기능)
    let personalityInsights = null;
    if (personalizationService && passport?.personality_profile) {
      try {
        personalityInsights = await personalizationService.analyzePersonalityInsights(
          passport.personality_profile
        );
      } catch (error) {
        console.warn('⚠️ 개인화 분석 실패:', error);
      }
    }

    // 8. 성취 시스템 (신규 기능)
    const achievements = [
      {
        id: 'first_passport',
        name: '첫 번째 Passport',
        description: 'AI Passport를 생성했습니다',
        earned: !!passport,
        earnedAt: passport?.created_at,
        category: 'onboarding'
      },
      {
        id: 'data_collector',
        name: '데이터 수집가',
        description: '10개 이상의 데이터 볼트 생성',
        earned: dataVaults.length >= 10,
        progress: dataVaults.length,
        target: 10,
        category: 'data'
      },
      {
        id: 'trusted_user',
        name: '신뢰할 수 있는 사용자',
        description: '신뢰도 점수 80점 달성',
        earned: currentTrustScore >= 80,
        progress: currentTrustScore,
        target: 80,
        category: 'trust'
      },
      {
        id: 'cue_millionaire',
        name: 'CUE 백만장자',
        description: '1,000,000 CUE 토큰 보유',
        earned: cueBalance >= 1000000,
        progress: cueBalance,
        target: 1000000,
        category: 'wealth'
      },
      {
        id: 'platform_connector',
        name: '플랫폼 연결자',
        description: '5개 이상의 외부 플랫폼 연결',
        earned: (passport?.platform_connections?.length || 0) >= 5,
        progress: passport?.platform_connections?.length || 0,
        target: 5,
        category: 'integration'
      }
    ];

    // 9. 통합 응답 구성
    const response = {
      success: true,
      passport: {
        // 기존 필드들
        ...(passport || {}),
        
        // 실시간 계산 필드들
        cueTokens: cueBalance,
        currentTrustScore,
        trustScoreHistory: includeTrustHistory === 'true' ? trustScoreHistory : undefined,
        
        // 볼트 정보
        dataVaults: includeVaults === 'true' ? enrichedPassport.dataVaults : undefined,
        vaultCount: dataVaults.length,
        
        // 개인화 정보
        personalityInsights,
        
        // 성취 정보
        achievements,
        earnedAchievements: achievements.filter(a => a.earned).length,
        
        // 활동 정보
        lastActivity: passport?.last_activity_at || passport?.updated_at,
        interactionHistory: includeHistory === 'true' ? enrichedPassport.interactionHistory : undefined
      },
      
      // 사용자 정보 (기존)
      user: userData ? {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        did: userData.did,
        walletAddress: userData.wallet_address,
        passkeyRegistered: userData.passkey_registered,
        loginCount: userData.login_count,
        lastLoginAt: userData.last_login_at,
        createdAt: userData.created_at
      } : null,
      
      // 통계 정보 (기존 + 신규)
      statistics: {
        cueBalance,
        vaultCount: dataVaults.length,
        totalInteractions: passport?.total_interactions || 0,
        trustScore: currentTrustScore,
        achievementProgress: achievements.filter(a => a.earned).length / achievements.length,
        platformConnections: passport?.platform_connections?.length || 0
      },
      
      // 메타데이터
      metadata: {
        includeHistory: includeHistory === 'true',
        includeVaults: includeVaults === 'true',
        includeTrustHistory: includeTrustHistory === 'true',
        lastUpdated: new Date().toISOString()
      }
    };

    console.log(`✅ Passport 조회 성공: ${did} (CUE: ${cueBalance}, Trust: ${currentTrustScore})`);
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
// 📝 AI Passport 생성 (신규 기능)
// POST /api/passport
// ============================================================================

router.post('/', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { 
    did, 
    walletAddress, 
    personalityProfile, 
    preferences, 
    deviceInfo,
    platformConnections = [],
    initialDataVaults = []
  } = req.body;
  const user = (req as any).user;

  console.log(`📝 새 Passport 생성: ${did}`);

  // 필수 필드 검증
  if (!did || !walletAddress) {
    res.status(400).json({
      success: false,
      error: 'DID and wallet address are required'
    });
    return;
  }

  try {
    // 기존 Passport 확인
    const existingPassport = await db.getPassport(did);
    if (existingPassport) {
      res.status(409).json({
        success: false,
        error: 'Passport already exists'
      });
      return;
    }

    // 개인화 서비스로 초기 프로필 분석 (신규)
    let analyzedProfile = personalityProfile || {};
    if (personalizationService && personalityProfile) {
      try {
        analyzedProfile = await personalizationService.analyzePersonality(
          personalityProfile,
          preferences || {}
        );
      } catch (error) {
        console.warn('⚠️ 개인화 분석 실패:', error);
      }
    }

    // Passport 데이터 생성
    const passportData = {
      did,
      wallet_address: walletAddress,
      walletAddress, // 신규 형식 호환
      personality_profile: analyzedProfile,
      personalityProfile: analyzedProfile, // 신규 형식 호환
      preferences: preferences || {},
      device_info: deviceInfo || {},
      deviceInfo: deviceInfo || {}, // 신규 형식 호환
      platform_connections: platformConnections,
      platformConnections, // 신규 형식 호환
      cue_tokens: 1000, // 초기 보너스 CUE
      cueTokens: 1000, // 신규 형식 호환
      trust_score: 50, // 초기 신뢰도 점수
      trustScore: 50, // 신규 형식 호환
      trust_score_history: [
        {
          score: 50,
          timestamp: new Date().toISOString(),
          reason: 'Initial registration'
        }
      ],
      trustScoreHistory: [ // 신규 형식 호환
        {
          score: 50,
          timestamp: new Date().toISOString(),
          reason: 'Initial registration'
        }
      ],
      total_interactions: 0,
      interactionCount: 0, // 신규 형식 호환
      registration_status: 'active',
      passport_level: 'Bronze',
      biometric_verified: false,
      email_verified: false,
      phone_verified: false,
      kyc_verified: false,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(), // 신규 형식 호환
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(), // 신규 형식 호환
      last_activity_at: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(), // 신규 형식 호환
      metadata: {
        version: '1.0',
        onboardingCompleted: false,
        features: {
          aiChat: true,
          cueMining: true,
          dataVaults: true,
          platformIntegration: true
        }
      }
    };

    // Passport 저장
    const savedPassport = await db.savePassport(passportData);

    // 초기 CUE 토큰 지급
    try {
      await db.updateCueBalance(did, 1000);
    } catch (error) {
      console.warn('⚠️ 초기 CUE 토큰 지급 실패:', error);
    }

    // 초기 데이터 볼트 생성 (신규 기능)
    if (initialDataVaults.length > 0) {
      try {
        for (const vaultData of initialDataVaults) {
          const vault = {
            id: uuidv4(),
            userDid: did,
            category: vaultData.category,
            data: vaultData.data,
            encrypted: vaultData.encrypted || false,
            dataSize: JSON.stringify(vaultData.data).length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            accessCount: 0,
            tags: vaultData.tags || [],
            metadata: {
              source: 'onboarding',
              contentType: 'initial_data',
              version: '1.0'
            }
          };
          await db.saveDataVault(vault);
        }
      } catch (vaultError) {
        console.warn('⚠️ 초기 데이터 볼트 생성 실패:', vaultError);
      }
    }

    console.log(`✅ Passport 생성 완료: ${did}`);

    res.status(201).json({
      success: true,
      passport: savedPassport,
      message: 'AI Passport가 성공적으로 생성되었습니다.',
      bonus: {
        cueTokens: 1000,
        message: '환영 보너스 1000 CUE가 지급되었습니다!'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Passport 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create passport',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// ✏️ AI Passport 정보 업데이트 (기존 + 신규 개인화 기능)
// PUT /api/passport/:did
// ============================================================================

router.put('/:did', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const updates = req.body;
  const user = (req as any).user;
  const userDid = user?.did || user?.id;

  console.log(`✏️ Passport 업데이트 요청: ${did}`, Object.keys(updates));

  // 권한 확인
  if (!userDid || userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied - Can only update your own passport'
    });
    return;
  }

  // 업데이트 가능한 필드 확장 (기존 + 신규)
  const allowedFields = [
    'personality_profile', 'personalityProfile',
    'preferences',
    'communication_style',
    'learning_patterns',
    'phone_verified',
    'kyc_verified',
    'device_info', 'deviceInfo',
    'platform_connections', 'platformConnections',
    'metadata'
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

    // 개인화 프로필 업데이트 시 재분석 (신규 기능)
    if ((updates.personality_profile || updates.personalityProfile || updates.preferences) && 
        personalizationService) {
      try {
        const newProfile = await personalizationService.analyzePersonality(
          updates.personality_profile || updates.personalityProfile || existingPassport.personality_profile,
          updates.preferences || existingPassport.preferences
        );
        filteredUpdates.personality_profile = newProfile;
        filteredUpdates.personalityProfile = newProfile; // 신규 형식 호환
      } catch (analysisError) {
        console.warn('⚠️ 개인화 분석 실패:', analysisError);
      }
    }

    // 업데이트 데이터 준비
    const updatedPassportData = {
      ...existingPassport,
      ...filteredUpdates,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(), // 신규 형식 호환
      last_activity_at: new Date().toISOString(),
      lastActiveAt: new Date().toISOString() // 신규 형식 호환
    };

    // Passport 업데이트
    const updatedPassport = await db.updatePassport(did as string, updatedPassportData);

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
      updatedFields: Object.keys(filteredUpdates),
      message: 'Passport가 성공적으로 업데이트되었습니다.',
      timestamp: new Date().toISOString()
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
// 🗄️ 연결된 데이터 볼트 조회 (신규 기능)
// GET /api/passport/:did/vaults
// ============================================================================

router.get('/:did/vaults(*)', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const { category, limit = 50, offset = 0 } = req.query;
  const user = (req as any).user;
  const userDid = user?.did || user?.id;
  
  console.log(`🗄️ 데이터 볼트 조회 요청: ${did}`);
  
  // 권한 확인
  if (!userDid || userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
    return;
  }

  try {
    let vaults = await db.getDataVaults(did);
    
    // 삭제된 볼트 제외
    vaults = vaults.filter((vault: any) => !vault.deleted);
    
    // 카테고리 필터링
    if (category) {
      vaults = vaults.filter(vault => 
        (vault.category || vault.vault_type) === category
      );
    }
    
    // 페이지네이션
    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());
    const paginatedVaults = vaults.slice(offsetNum, offsetNum + limitNum);
    
    // 볼트 추천 (신규 기능)
    const existingCategories = vaults.map(v => v.category || v.vault_type);
    const allCategories = ['identity', 'behavioral', 'professional', 'social', 'preferences', 'expertise'];
    const recommendedCategories = allCategories.filter(cat => !existingCategories.includes(cat));
    
    res.json({
      success: true,
      vaults: paginatedVaults.map(vault => ({
        id: vault.id,
        name: vault.name || vault.vault_name,
        category: vault.category || vault.vault_type,
        dataSize: vault.dataSize || vault.total_size || 0,
        encrypted: vault.encrypted || vault.is_encrypted,
        createdAt: vault.createdAt || vault.created_at,
        lastAccessed: vault.lastAccessed || vault.last_accessed_at
      })),
      total: vaults.length,
      showing: paginatedVaults.length,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < vaults.length
      },
      recommendations: recommendedCategories.map(cat => ({
        category: cat,
        description: getCategoryDescription(cat)
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data vaults',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 📊 AI Passport 통계 조회 (기존 + 신규 고급 통계)
// GET /api/passport/:did/stats
// ============================================================================

router.get('/:did/stats(*)', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const { period = '30d' } = req.query;
  const user = (req as any).user;
  const userDid = user?.did || user?.id;

  console.log(`📊 Passport 통계 조회: ${did} (${period})`);

  // 권한 확인
  if (!userDid || userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
    return;
  }

  try {
    // 기간별 필터링을 위한 날짜 계산
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 기본 통계 (기존)
    const passport = await db.getPassport(did as string);
    const cueBalance = await db.getCUEBalance(did as string);
    const dataVaults = await db.getDataVaults(did as string);
    
    // CUE 거래 내역 (기존)
    let transactions: any[] = [];
    if (typeof (db as any).getCUETransactions === 'function') {
      transactions = await (db as any).getCUETransactions(did, parseInt(period.replace('d', '')) * 5);
    }
    
    // 최근 상호작용 (기존)
    let recentInteractions: any[] = [];
    if (typeof (db as any).getRecentInteractions === 'function') {
      recentInteractions = await (db as any).getRecentInteractions(did, 10);
    }

    // 기간별 필터링
    const recentTransactions = transactions.filter((tx: any) => 
      new Date(tx.created_at) >= startDate
    );

    // 신규 고급 통계 계산
    const miningTransactions = recentTransactions.filter((tx: any) => 
      tx.transaction_type === 'mining' || tx.transaction_type === 'reward'
    );

    const totalMined = miningTransactions.reduce((sum: number, tx: any) => 
      sum + parseFloat(tx.amount), 0
    );

    const totalSpent = recentTransactions
      .filter((tx: any) => tx.transaction_type === 'spending')
      .reduce((sum: number, tx: any) => sum + Math.abs(parseFloat(tx.amount)), 0);

    // 데이터 볼트 통계
    const activeVaults = dataVaults.filter(vault => !vault.deleted);
    const recentVaults = activeVaults.filter(vault => 
      new Date(vault.createdAt || vault.created_at) >= startDate
    );

    // 신뢰도 점수 계산 (신규)
    let currentTrustScore = passport?.trust_score || 50;
    if (personalizationService) {
      try {
        currentTrustScore = await personalizationService.calculateTrustScore({
          ...passport,
          cueBalance,
          dataVaults: activeVaults
        });
      } catch (error) {
        console.warn('⚠️ 신뢰도 점수 계산 실패:', error);
      }
    }

    // 성취 진행률 계산 (신규)
    const achievements = [
      { id: 'data_collector', target: 10, current: activeVaults.length },
      { id: 'trusted_user', target: 80, current: currentTrustScore },
      { id: 'cue_millionaire', target: 1000000, current: cueBalance },
      { id: 'platform_connector', target: 5, current: passport?.platform_connections?.length || 0 }
    ];

    const overallProgress = achievements.reduce((sum, ach) => 
      sum + Math.min(ach.current / ach.target, 1), 0) / achievements.length;

    // 개인화 인사이트 (신규)
    let personalityInsights = null;
    if (personalizationService && passport?.personality_profile) {
      try {
        personalityInsights = await personalizationService.getPersonalityInsights(
          passport.personality_profile
        );
      } catch (error) {
        console.warn('⚠️ 개인화 인사이트 생성 실패:', error);
      }
    }

    // 통합 통계 구성
    const stats = {
      // 기본 정보 (기존 + 개선)
      passport: {
        level: passport?.passport_level || 'Bronze',
        trustScore: currentTrustScore,
        totalInteractions: passport?.total_interactions || 0,
        registrationStatus: passport?.registration_status || 'incomplete',
        biometricVerified: passport?.biometric_verified || false,
        emailVerified: passport?.email_verified || false,
        createdAt: passport?.created_at || passport?.createdAt
      },
      
      // CUE 토큰 통계 (기존 + 개선)
      cue: {
        currentBalance: cueBalance,
        totalMined: Math.round(totalMined * 100) / 100,
        totalSpent: Math.round(totalSpent * 100) / 100,
        netChange: Math.round((totalMined - totalSpent) * 100) / 100,
        dailyAverage: Math.round((totalMined / Math.max(parseInt(period.replace('d', '')), 1)) * 100) / 100,
        transactionCount: recentTransactions.length,
        miningEfficiency: miningTransactions.length > 0 ? totalMined / miningTransactions.length : 0
      },
      
      // 데이터 볼트 통계 (기존 + 개선)
      dataVaults: {
        totalVaults: activeVaults.length,
        newVaults: recentVaults.length,
        totalDataSize: activeVaults.reduce((sum: number, vault: any) => 
          sum + (vault.dataSize || vault.total_size || 0), 0
        ),
        categories: [...new Set(activeVaults.map((v: any) => v.category || v.vault_type))],
        encryptedVaults: activeVaults.filter((v: any) => v.encrypted || v.is_encrypted).length,
        compressionRatio: calculateCompressionRatio(activeVaults)
      },
      
      // 활동 통계 (기존 + 신규)
      activity: {
        recentInteractions: recentInteractions.length,
        lastActivity: passport?.last_activity_at || passport?.updated_at,
        activeDays: calculateActiveDays(transactions, startDate),
        engagementScore: calculateEngagementScore(recentInteractions, recentVaults, recentTransactions)
      },
      
      // 성취 시스템 (신규)
      achievements: {
        total: achievements.length,
        completed: achievements.filter(a => a.current >= a.target).length,
        overallProgress: Math.round(overallProgress * 100),
        nextMilestone: getNextMilestone(achievements)
      },
      
      // 개인화 인사이트 (신규)
      insights: personalityInsights,
      
      // 기간 정보
      period: {
        label: period,
        days: parseInt(period.replace('d', '')) || 30,
        from: startDate.toISOString(),
        to: now.toISOString()
      }
    };

    console.log(`✅ Passport 통계 조회 성공: ${did}`);
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
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
// 🔗 플랫폼 연결 관리 (신규 기능)
// POST /api/passport/:did/platforms
// ============================================================================

router.post('/:did/platforms', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const { platform, credentials, config } = req.body;
  const user = (req as any).user;
  const userDid = user?.did || user?.id;
  
  console.log(`🔗 플랫폼 연결: ${did} → ${platform}`);
  
  // 권한 확인
  if (!userDid || userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
    return;
  }

  if (!platform || !credentials) {
    res.status(400).json({
      success: false,
      error: 'Platform and credentials are required'
    });
    return;
  }

  try {
    const passport = await db.getPassport(did);
    if (!passport) {
      res.status(404).json({
        success: false,
        error: 'Passport not found'
      });
      return;
    }

    // 새로운 플랫폼 연결 정보
    const newConnection = {
      id: uuidv4(),
      platform,
      credentials: credentials, // 실제로는 암호화 필요
      config: config || {},
      status: 'connected',
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString()
    };

    // 기존 연결 업데이트 또는 새로 추가
    const existingConnections = passport.platform_connections || passport.platformConnections || [];
    const existingIndex = existingConnections.findIndex((conn: any) => conn.platform === platform);
    
    if (existingIndex >= 0) {
      existingConnections[existingIndex] = newConnection;
    } else {
      existingConnections.push(newConnection);
    }

    const updatedPassport = await db.updatePassport(did, {
      ...passport,
      platform_connections: existingConnections,
      platformConnections: existingConnections, // 신규 형식 호환
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString() // 신규 형식 호환
    });

    res.json({
      success: true,
      connection: newConnection,
      passport: updatedPassport,
      message: `${platform} 플랫폼이 성공적으로 연결되었습니다.`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 플랫폼 연결 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect platform',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 🧠 개인화 프로필 분석 (신규 기능)
// POST /api/passport/:did/analyze
// ============================================================================

router.post('/:did/analyze', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const { textData, preferences, context } = req.body;
  const user = (req as any).user;
  const userDid = user?.did || user?.id;
  
  console.log(`🧠 개인화 분석: ${did}`);
  
  // 권한 확인
  if (!userDid || userDid !== did) {
    res.status(403).json({
      success: false,
      error: 'Access denied'
    });
    return;
  }

  try {
    const passport = await db.getPassport(did);
    if (!passport) {
      res.status(404).json({
        success: false,
        error: 'Passport not found'
      });
      return;
    }

    let analysisResult = null;
    
    if (personalcueExtractor && personalizationService) {
      // Personal CUE 추출
      const personalCues = await personalcueExtractor.extractPersonalCues(textData, {
        existingProfile: passport.personality_profile || passport.personalityProfile,
        preferences: preferences || passport.preferences,
        context
      });

      // 개인화 서비스로 프로필 업데이트
      const updatedProfile = await personalizationService.updatePersonalityProfile(
        passport.personality_profile || passport.personalityProfile,
        personalCues
      );

      // Passport 업데이트
      const updatedPassport = await db.updatePassport(did, {
        ...passport,
        personality_profile: updatedProfile,
        personalityProfile: updatedProfile, // 신규 형식 호환
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(), // 신규 형식 호환
        last_activity_at: new Date().toISOString(),
        lastActiveAt: new Date().toISOString() // 신규 형식 호환
      });

      analysisResult = {
        personalCues,
        updatedProfile,
        changes: personalizationService.compareProfiles(
          passport.personality_profile || passport.personalityProfile,
          updatedProfile
        ),
        passport: updatedPassport
      };
    } else {
      // Mock 분석 결과
      analysisResult = {
        personalCues: ['communication_style: direct', 'interest: technology'],
        updatedProfile: {
          ...(passport.personality_profile || passport.personalityProfile || {}),
          lastAnalyzed: new Date().toISOString()
        },
        changes: ['Updated communication style', 'Added technology interest'],
        passport
      };
    }

    res.json({
      success: true,
      analysis: analysisResult,
      message: '개인화 프로필이 성공적으로 분석되고 업데이트되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 개인화 분석 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 🔄 AI Passport 새로고침 (기존 기능 유지)
// POST /api/passport/:did/refresh
// ============================================================================

router.post('/:did/refresh', authMiddleware, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { did } = req.params;
  const user = (req as any).user;
  const userDid = user?.did || user?.id;

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
    const userData = typeof db.getUserById === 'function' ? await db.getUserById(did as string) : null;
    const cueBalance = await db.getCUEBalance(did as string);
    const dataVaults = await db.getDataVaults(did as string);
    let recentTransactions: any[] = [];
    if (typeof (db as any).getCUETransactions === 'function') {
      recentTransactions = await (db as any).getCUETransactions(did as string, 10);
    }

    // 신뢰도 점수 재계산 (신규)
    let newTrustScore = 50;
    if (personalizationService) {
      try {
        newTrustScore = await personalizationService.calculateTrustScore({
          cueBalance,
          dataVaults,
          recentTransactions
        });
      } catch (error) {
        console.warn('⚠️ 신뢰도 점수 계산 실패:', error);
      }
    }

    // Passport 정보 업데이트
    const refreshedData = {
      last_activity_at: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(), // 신규 형식 호환
      total_interactions: recentTransactions.filter((tx: any) => 
        tx.source === 'ai_chat'
      ).length,
      trust_score: newTrustScore,
      trustScore: newTrustScore, // 신규 형식 호환
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
        newTrustScore,
        lastRefresh: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
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
    service: 'Enhanced Passport Routes',
    database: db.constructor.name,
    timestamp: new Date().toISOString(),
    features: [
      'CRUD operations',
      'Personalization analysis',
      'Trust score calculation',
      'Achievement system',
      'Platform connections',
      'Advanced statistics',
      'Data vault integration',
      'Real-time insights'
    ],
    compatibility: {
      legacy: 'Supports existing passport APIs',
      enhanced: 'Adds personalization and analytics'
    }
  });
});

// ============================================================================
// 🔧 헬퍼 함수들
// ============================================================================

function getCategoryDescription(category: string): string {
  const descriptions = {
    identity: '신원 정보 - 기본 프로필과 인증 데이터',
    behavioral: '행동 패턴 - 사용 습관과 선호도 분석',
    professional: '전문 정보 - 경력과 기술 스킬',
    social: '소셜 데이터 - 네트워크와 관계 정보',
    preferences: '개인 취향 - 관심사와 선호도',
    expertise: '전문 지식 - 특별한 기술과 경험'
  };
  return descriptions[category as keyof typeof descriptions] || `${category} 데이터`;
}

function calculateCompressionRatio(vaults: any[]): number {
  const compressedVaults = vaults.filter(v => v.compressed || v.compression_info);
  if (compressedVaults.length === 0) return 1.0;
  
  const totalOriginal = compressedVaults.reduce((sum, v) => 
    sum + (v.metadata?.originalSize || v.dataSize || 0), 0);
  const totalCompressed = compressedVaults.reduce((sum, v) => 
    sum + (v.dataSize || v.metadata?.compressedSize || 0), 0);
    
  return totalOriginal > 0 ? totalCompressed / totalOriginal : 1.0;
}

function calculateActiveDays(transactions: any[], startDate: Date): number {
  const activeDates = new Set();
  transactions.forEach(tx => {
    const txDate = new Date(tx.created_at);
    if (txDate >= startDate) {
      activeDates.add(txDate.toDateString());
    }
  });
  return activeDates.size;
}

function calculateEngagementScore(interactions: any[], vaults: any[], transactions: any[]): number {
  const interactionScore = Math.min(interactions.length / 10, 1) * 0.4;
  const vaultScore = Math.min(vaults.length / 5, 1) * 0.3;
  const transactionScore = Math.min(transactions.length / 20, 1) * 0.3;
  
  return Math.round((interactionScore + vaultScore + transactionScore) * 100);
}

function getNextMilestone(achievements: any[]): any {
  const incomplete = achievements.filter(a => a.current < a.target);
  if (incomplete.length === 0) return null;
  
  return incomplete.reduce((closest, current) => {
    const closestProgress = closest.current / closest.target;
    const currentProgress = current.current / current.target;
    return currentProgress > closestProgress ? current : closest;
  });
}

console.log('✅ Enhanced Passport Routes loaded successfully');

export default router;