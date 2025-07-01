// ============================================================================
// 🎫 AI Passport 관리 라우트
// 경로: backend/src/routes/passport/passport.ts
// 용도: AI Passport CRUD 및 관리 API
// ============================================================================

import { Router, Request, Response } from 'express';
import { supabaseService } from '../../services/database/SupabaseService';
import { DatabaseService } from '../../services/database/DatabaseService';

const router = Router();

// 데이터베이스 서비스 선택
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : supabaseService;

console.log('🎫 Passport routes initialized with:', db.constructor.name);

// ============================================================================
// 📋 AI Passport 조회
// GET /api/passport/:did
// ============================================================================

router.get('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    console.log(`📋 Passport 조회 요청: ${did}`);
    
    const passport = await db.getPassport(did);
    
    if (!passport) {
      return res.status(404).json({
        success: false,
        error: 'Passport not found',
        message: 'AI Passport를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      passport,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Passport 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get passport',
      message: 'Passport 조회 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// ✏️ AI Passport 업데이트
// PUT /api/passport/:did
// ============================================================================

router.put('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const updateData = req.body;
    
    console.log(`✏️ Passport 업데이트 요청: ${did}`, updateData);
    
    // 필수 필드 검증
    if (!did) {
      return res.status(400).json({
        success: false,
        error: 'DID is required',
        message: 'DID가 필요합니다.'
      });
    }

    const updatedPassport = await db.updatePassport(did, updateData);
    
    res.json({
      success: true,
      passport: updatedPassport,
      message: 'Passport가 성공적으로 업데이트되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Passport 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update passport',
      message: 'Passport 업데이트 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🗄️ 데이터 볼트 조회
// GET /api/passport/:did/vaults
// ============================================================================

router.get('/:did/vaults', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    console.log(`🗄️ 데이터 볼트 조회 요청: ${did}`);
    
    const vaults = await db.getDataVaults(did);
    
    res.json({
      success: true,
      vaults,
      count: vaults.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 볼트 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get data vaults',
      message: '데이터 볼트 조회 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 📊 Passport 통계
// GET /api/passport/:did/stats
// ============================================================================

router.get('/:did/stats', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    
    console.log(`📊 Passport 통계 요청: ${did}`);
    
    // 기본 통계 생성
    const stats = {
      totalInteractions: Math.floor(Math.random() * 1000) + 100,
      cueTokensEarned: Math.floor(Math.random() * 50000) + 10000,
      trustScoreHistory: [
        { date: '2024-01-01', score: 75 },
        { date: '2024-01-15', score: 82 },
        { date: '2024-02-01', score: 88 },
        { date: '2024-02-15', score: 94 }
      ],
      topCategories: [
        { category: 'professional', count: 45 },
        { category: 'technical', count: 32 },
        { category: 'creative', count: 18 }
      ]
    };
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Passport 통계 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get passport stats',
      message: 'Passport 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// ============================================================================
// 🔍 상태 확인
// GET /api/passport/health
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'AI Passport Service',
    status: 'operational',
    database: db.constructor.name,
    timestamp: new Date().toISOString()
  });
});

export default router;
