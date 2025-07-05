// ============================================================================
// 💎 CUE 토큰 라우트 (완전한 구현)
// 경로: backend/src/routes/cue/cue.ts
// 용도: CUE 토큰 마이닝, 잔액 조회, 거래 내역 API
// ============================================================================

import express, { Request, Response, Router } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { supabaseService } from '../../services/database/SupabaseService';
import { CUEMiningService } from '../../services/cue/CUEMiningService';

// 라우터 생성
const router: Router = express.Router();

// 데이터베이스 서비스 선택
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : supabaseService;

console.log('💎 CUE routes initialized with:', db.constructor.name);

// ============================================================================
// 💰 CUE 잔액 조회
// GET /api/cue/:userDid/balance
// ============================================================================

router.get('/:userDid/balance', async (req: Request, res: Response): Promise<void> => {
  const { userDid } = req.params;

  console.log(`💰 CUE 잔액 조회 요청: ${userDid}`);

  if (!userDid) {
    res.status(400).json({
      success: false,
      error: 'User DID is required'
    });
    return;
  }

  try {
    const balance = await db.getCUEBalance(userDid);
    
    res.json({
      success: true,
      balance,
      userDid,
      currency: 'CUE',
      timestamp: new Date().toISOString()
    });

    console.log(`✅ CUE 잔액 조회 성공: ${userDid} - ${balance} CUE`);

  } catch (error: any) {
    console.error('❌ CUE 잔액 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CUE balance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 📊 CUE 거래 내역 조회
// GET /api/cue/:userDid/transactions
// ============================================================================

router.get('/:userDid/transactions', async (req: Request, res: Response): Promise<void> => {
  const { userDid } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  console.log(`📊 CUE 거래 내역 조회: ${userDid}`);

  if (!userDid) {
    res.status(400).json({
      success: false,
      error: 'User DID is required'
    });
    return;
  }

  try {
    const cueService = new CUEMiningService(db);
    const transactions = await cueService.getTransactionHistory(
      userDid, 
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      transactions,
      count: transactions.length,
      userDid,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

    console.log(`✅ CUE 거래 내역 조회 성공: ${userDid} - ${transactions.length}건`);

  } catch (error: any) {
    console.error('❌ CUE 거래 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CUE transactions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// ⛏️ CUE 마이닝 실행
// POST /api/cue/mine
// ============================================================================

router.post('/mine', async (req: Request, res: Response): Promise<void> => {
  const { userDid, activity, data = {} } = req.body;

  console.log(`⛏️ CUE 마이닝 요청: ${userDid} - ${activity}`);

  if (!userDid || !activity) {
    res.status(400).json({
      success: false,
      error: 'User DID and activity type are required'
    });
    return;
  }

  try {
    const cueService = new CUEMiningService(db);
    let minedAmount = 0;
    
    // 활동에 따른 CUE 마이닝
    switch (activity) {
      case 'ai_chat':
        minedAmount = await cueService.mineFromInteraction({
          userDid,
          messageContent: data.message || 'AI Chat interaction',
          aiResponse: data.response || 'AI response',
          model: data.model || 'default',
          personalContextUsed: data.personalContextUsed || 0,
          responseTime: data.responseTime || 1000,
          conversationId: data.conversationId || `conv_${Date.now()}`
        });
        break;
        
      case 'data_extraction':
        minedAmount = await cueService.mineFromDataExtraction({
          userDid,
          dataType: data.dataType || 'text',
          dataSize: data.dataSize || 100,
          extractionQuality: data.extractionQuality || 0.8,
          processingTime: data.processingTime || 5000
        });
        break;
        
      case 'daily_login':
        minedAmount = await cueService.mineLoginBonus(userDid);
        break;
        
      case 'manual':
        minedAmount = Math.random() * 3 + 1; // 1-4 CUE
        await cueService.awardCUE({
          userDid,
          amount: minedAmount,
          reason: 'manual_mining',
          description: 'Manual CUE mining reward',
          metadata: data
        });
        break;
        
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid activity type',
          supportedActivities: ['ai_chat', 'data_extraction', 'daily_login', 'manual']
        });
        return;
    }

    res.json({
      success: true,
      minedAmount: Math.round(minedAmount * 100) / 100,
      activity,
      userDid,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ CUE 마이닝 성공: ${userDid} - ${minedAmount} CUE (${activity})`);

  } catch (error: any) {
    console.error('❌ CUE 마이닝 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mine CUE tokens',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 📈 CUE 마이닝 통계 조회
// GET /api/cue/:userDid/stats
// ============================================================================

router.get('/:userDid/stats', async (req: Request, res: Response): Promise<void> => {
  const { userDid } = req.params;
  const { days = 7 } = req.query;

  console.log(`📈 CUE 통계 조회: ${userDid} (${days}일)`);

  try {
    const cueService = new CUEMiningService(db);
    const stats = await cueService.getMiningStats(userDid, parseInt(days as string));
    
    res.json({
      success: true,
      stats,
      userDid,
      period: {
        days: parseInt(days as string),
        from: new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    });

    console.log(`✅ CUE 통계 조회 성공: ${userDid}`);

  } catch (error: any) {
    console.error('❌ CUE 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CUE statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 📋 상태 확인 API
// GET /api/cue/health
// ============================================================================

router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    service: 'CUE Routes',
    database: db.constructor.name,
    timestamp: new Date().toISOString(),
    mockMode: process.env.USE_MOCK_DATABASE === 'true'
  });
});

console.log('✅ [라우트명] routes loaded successfully');

export default router;

