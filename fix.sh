#!/bin/bash

# ============================================================================
# 🔧 누락된 백엔드 라우트 파일들 생성
# 파일: fix-missing-routes.sh
# 용도: MODULE_NOT_FOUND 오류 해결
# ============================================================================

echo "🔧 누락된 백엔드 라우트 파일들을 생성합니다..."

# backend 디렉토리로 이동
cd backend

# ============================================================================
# 📁 필요한 디렉토리 구조 생성
# ============================================================================

mkdir -p src/routes/passport
mkdir -p src/routes/cue
mkdir -p src/routes/vault
mkdir -p src/middleware
mkdir -p src/types
mkdir -p src/utils

# ============================================================================
# 🎫 AI Passport 라우트 (passport.ts)
# ============================================================================

cat > src/routes/passport/passport.ts << 'EOF'
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
EOF

# ============================================================================
# 💎 CUE 토큰 라우트 (cue.ts)
# ============================================================================

cat > src/routes/cue/cue.ts << 'EOF'
// ============================================================================
// 💎 CUE 토큰 관리 라우트
// 경로: backend/src/routes/cue/cue.ts
// 용도: CUE 토큰 마이닝, 거래, 잔액 관리 API
// ============================================================================

import { Router, Request, Response } from 'express';
import { supabaseService } from '../../services/database/SupabaseService';
import { DatabaseService } from '../../services/database/DatabaseService';
import CUEMiningService from '../../services/cue/CUEMiningService';

const router = Router();

// 데이터베이스 서비스 선택
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : supabaseService;

// CUE 마이닝 서비스 초기화
const miningService = new CUEMiningService(db);

console.log('💎 CUE routes initialized with:', db.constructor.name);

// ============================================================================
// ⛏️ CUE 토큰 마이닝
// POST /api/cue/mine
// ============================================================================

router.post('/mine', async (req: Request, res: Response) => {
  try {
    const {
      userDid,
      userId,
      amount,
      source,
      messageContent,
      aiResponse,
      model,
      personalContextUsed,
      responseTime,
      conversationId
    } = req.body;
    
    console.log(`⛏️ CUE 마이닝 요청: ${userDid}, source: ${source}`);
    
    // 필수 필드 검증
    if (!userDid || !source) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userDid와 source가 필요합니다.'
      });
    }

    let minedAmount = 0;

    // 소스에 따른 마이닝 처리
    switch (source) {
      case 'ai_chat':
        if (messageContent && aiResponse) {
          minedAmount = await miningService.mineFromInteraction({
            userDid,
            messageContent,
            aiResponse,
            model: model || 'default',
            personalContextUsed: personalContextUsed || 0,
            responseTime: responseTime || 3000,
            conversationId: conversationId || `conv_${Date.now()}`
          });
        } else {
          minedAmount = amount || Math.floor(Math.random() * 5) + 1;
        }
        break;
        
      case 'data_extraction':
        minedAmount = await miningService.mineFromDataExtraction({
          userDid,
          dataType: req.body.dataType || 'text',
          dataSize: req.body.dataSize || 1000,
          extractionQuality: req.body.extractionQuality || 0.8,
          processingTime: req.body.processingTime || 5000
        });
        break;
        
      case 'daily_login':
        minedAmount = await miningService.mineLoginBonus(userDid);
        break;
        
      default:
        minedAmount = amount || Math.floor(Math.random() * 3) + 1;
        
        // 기본 마이닝 거래 기록
        await miningService.awardCUE({
          userDid,
          amount: minedAmount,
          reason: source,
          description: `CUE mined from ${source}`,
          metadata: req.body
        });
    }
    
    res.json({
      success: true,
      minedAmount,
      source,
      userDid,
      timestamp: new Date().toISOString(),
      message: `${minedAmount} CUE 토큰이 마이닝되었습니다.`
    });

  } catch (error: any) {
    console.error('❌ CUE 마이닝 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mine CUE',
      message: 'CUE 마이닝 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 💰 CUE 잔액 조회
// GET /api/cue/:userDid/balance
// ============================================================================

router.get('/:userDid/balance', async (req: Request, res: Response) => {
  try {
    const { userDid } = req.params;
    
    console.log(`💰 CUE 잔액 조회: ${userDid}`);
    
    const balance = await miningService.getBalance(userDid);
    
    res.json({
      success: true,
      balance,
      userDid,
      currency: 'CUE',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ CUE 잔액 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CUE balance',
      message: 'CUE 잔액 조회 중 오류가 발생했습니다.',
      balance: 0
    });
  }
});

// ============================================================================
// 📊 CUE 거래 내역
// GET /api/cue/:userDid/transactions
// ============================================================================

router.get('/:userDid/transactions', async (req: Request, res: Response) => {
  try {
    const { userDid } = req.params;
    const { limit = 50 } = req.query;
    
    console.log(`📊 CUE 거래 내역 조회: ${userDid}`);
    
    const transactions = await miningService.getTransactionHistory(
      userDid, 
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      transactions,
      count: transactions.length,
      userDid,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ CUE 거래 내역 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
      message: 'CUE 거래 내역 조회 중 오류가 발생했습니다.',
      transactions: []
    });
  }
});

// ============================================================================
// 📈 CUE 마이닝 통계
// GET /api/cue/:userDid/stats
// ============================================================================

router.get('/:userDid/stats', async (req: Request, res: Response) => {
  try {
    const { userDid } = req.params;
    const { days = 7 } = req.query;
    
    console.log(`📈 CUE 마이닝 통계: ${userDid}`);
    
    const stats = await miningService.getMiningStats(
      userDid, 
      parseInt(days as string)
    );
    
    res.json({
      success: true,
      stats,
      userDid,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ CUE 통계 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mining stats',
      message: 'CUE 마이닝 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// ============================================================================
// 💸 CUE 소비
// POST /api/cue/spend
// ============================================================================

router.post('/spend', async (req: Request, res: Response) => {
  try {
    const { userDid, amount, purpose, metadata } = req.body;
    
    console.log(`💸 CUE 소비 요청: ${userDid}, amount: ${amount}, purpose: ${purpose}`);
    
    // 필수 필드 검증
    if (!userDid || !amount || !purpose) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userDid, amount, purpose가 필요합니다.'
      });
    }

    const spentAmount = await miningService.spendCUE(userDid, amount, purpose, metadata);
    
    res.json({
      success: true,
      spentAmount,
      purpose,
      userDid,
      remainingBalance: await miningService.getBalance(userDid),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ CUE 소비 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to spend CUE',
      message: error.message || 'CUE 소비 중 오류가 발생했습니다.'
    });
  }
});

// ============================================================================
// 🔍 상태 확인
// GET /api/cue/health
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'CUE Mining Service',
    status: 'operational',
    database: db.constructor.name,
    timestamp: new Date().toISOString()
  });
});

export default router;
EOF

# ============================================================================
# 🗄️ 데이터 볼트 라우트 (vault.ts)
# ============================================================================

cat > src/routes/vault/vault.ts << 'EOF'
// ============================================================================
// 🗄️ 데이터 볼트 관리 라우트
// 경로: backend/src/routes/vault/vault.ts
// 용도: 데이터 볼트 저장, 검색, 관리 API
// ============================================================================

import { Router, Request, Response } from 'express';
import { supabaseService } from '../../services/database/SupabaseService';
import { DatabaseService } from '../../services/database/DatabaseService';
import { SemanticCompressionService } from '../../services/ai/SemanticCompressionService';

const router = Router();

// 데이터베이스 서비스 선택
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : supabaseService;

// 의미적 압축 서비스
const compressionService = new SemanticCompressionService();

console.log('🗄️ Vault routes initialized with:', db.constructor.name);

// ============================================================================
// 💾 데이터 저장
// POST /api/vault/save
// ============================================================================

router.post('/save', async (req: Request, res: Response) => {
  try {
    const {
      userDid,
      vaultId,
      contentType,
      originalContent,
      metadata
    } = req.body;
    
    console.log(`💾 데이터 저장 요청: ${userDid}, type: ${contentType}`);
    
    // 필수 필드 검증
    if (!userDid || !originalContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userDid와 originalContent가 필요합니다.'
      });
    }

    // 의미적 압축 수행
    const compressionResult = await compressionService.compressContent(originalContent);
    
    // CUE 값 계산
    const importance = compressionResult.semanticPreservation * compressionResult.keywords.length / 10;
    const cueValue = Math.round(importance * 10 * 100) / 100;
    
    // 데이터 저장
    const cueData = {
      id: `cue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_did: userDid,
      vault_id: vaultId || 'default_vault',
      content_type: contentType || 'text',
      original_content: originalContent,
      compressed_content: compressionResult.compressedContent,
      compression_algorithm: 'semantic',
      compression_ratio: compressionResult.compressionRatio,
      semantic_preservation: compressionResult.semanticPreservation,
      keywords: compressionResult.keywords,
      entities: compressionResult.entities,
      topics: compressionResult.topics,
      importance_score: importance,
      cue_mining_value: cueValue,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    const savedCue = await db.storePersonalCue(cueData);
    
    res.json({
      success: true,
      cue: savedCue,
      compression: {
        ratio: compressionResult.compressionRatio,
        preservation: compressionResult.semanticPreservation,
        keywords: compressionResult.keywords,
        cueValue
      },
      message: '데이터가 성공적으로 저장되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 저장 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save data',
      message: '데이터 저장 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🔍 데이터 검색
// POST /api/vault/search
// ============================================================================

router.post('/search', async (req: Request, res: Response) => {
  try {
    const {
      userDid,
      query,
      keywords,
      limit = 10,
      vaultId
    } = req.body;
    
    console.log(`🔍 데이터 검색 요청: ${userDid}, query: ${query}`);
    
    // 필수 필드 검증
    if (!userDid) {
      return res.status(400).json({
        success: false,
        error: 'Missing userDid',
        message: 'userDid가 필요합니다.'
      });
    }

    let results = [];

    if (keywords && keywords.length > 0) {
      // 키워드 기반 검색
      results = await db.searchPersonalCues(userDid, keywords, limit);
    } else {
      // 전체 조회
      results = await db.getPersonalCues(userDid, limit);
    }
    
    // 검색 결과 필터링 (vaultId가 있으면)
    if (vaultId) {
      results = results.filter((cue: any) => cue.vault_id === vaultId);
    }
    
    res.json({
      success: true,
      results,
      count: results.length,
      query: query || 'all',
      userDid,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터 검색 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search data',
      message: '데이터 검색 중 오류가 발생했습니다.',
      results: []
    });
  }
});

// ============================================================================
// 📁 볼트 생성
// POST /api/vault/create
// ============================================================================

router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      ownerDid,
      name,
      description,
      category,
      accessLevel = 'private'
    } = req.body;
    
    console.log(`📁 볼트 생성 요청: ${ownerDid}, name: ${name}`);
    
    // 필수 필드 검증
    if (!ownerDid || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'ownerDid와 name이 필요합니다.'
      });
    }

    const vaultData = {
      id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      owner_did: ownerDid,
      name,
      description: description || '',
      category: category || 'general',
      access_level: accessLevel,
      status: 'active',
      data_count: 0,
      created_at: new Date().toISOString()
    };

    const newVault = await db.createDataVault(vaultData);
    
    res.json({
      success: true,
      vault: newVault,
      message: '데이터 볼트가 성공적으로 생성되었습니다.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 볼트 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create vault',
      message: '볼트 생성 중 오류가 발생했습니다.'
    });
  }
});

// ============================================================================
// 📂 볼트 목록 조회
// GET /api/vault/:userDid/list
// ============================================================================

router.get('/:userDid/list', async (req: Request, res: Response) => {
  try {
    const { userDid } = req.params;
    
    console.log(`📂 볼트 목록 조회: ${userDid}`);
    
    const vaults = await db.getDataVaults(userDid);
    
    res.json({
      success: true,
      vaults,
      count: vaults.length,
      userDid,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 볼트 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vaults',
      message: '볼트 목록 조회 중 오류가 발생했습니다.',
      vaults: []
    });
  }
});

// ============================================================================
// 🔍 상태 확인
// GET /api/vault/health
// ============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Data Vault Service',
    status: 'operational',
    database: db.constructor.name,
    compression: 'SemanticCompressionService',
    timestamp: new Date().toISOString()
  });
});

export default router;
EOF

# ============================================================================
# 🔧 app.ts 수정 (라우트 임포트 경로 수정)
# ============================================================================

cat > src/app.ts << 'EOF'
// ============================================================================
// 🚀 Final0626 AI Passport + CUE Backend Server (수정됨)
// 경로: backend/src/app.ts
// 용도: Express 서버 메인 애플리케이션
// 수정사항: 라우트 임포트 경로 수정, CORS 문제 해결
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { DatabaseService } from './services/database/DatabaseService';

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Final0626 AI Passport Backend...');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

// ============================================================================
// 🛡️ 보안 및 미들웨어 설정 (CORS 문제 완전 해결)
// ============================================================================

// 1. Helmet 설정 (CORS 간섭 방지)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

// 2. CORS 미들웨어 (모든 요청 허용)
app.use(cors({
  origin: true, // 모든 오리진 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

// 3. 기본 미들웨어
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// 🏥 Health Check 엔드포인트
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  const requestOrigin = req.get('Origin') || 'no-origin';
  
  console.log(`🏥 Health Check 요청: ${requestOrigin}`);
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Passport CUE Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      enabled: true,
      requestOrigin: requestOrigin,
      allowAllOrigins: true
    },
    endpoints: [
      'GET /health',
      'POST /api/auth/webauthn/register/start',
      'POST /api/auth/webauthn/register/complete',
      'POST /api/auth/webauthn/login/start', 
      'POST /api/auth/webauthn/login/complete',
      'POST /api/ai/chat',
      'POST /api/cue/mine',
      'GET /api/cue/:userDid/balance',
      'POST /api/vault/save',
      'POST /api/vault/search',
      'GET /api/passport/:did'
    ]
  });
});

// ============================================================================
// 🛣️ API 라우트 연결 (수정된 임포트 경로)
// ============================================================================

// 라우트들을 안전하게 로드
async function loadRoutes() {
  try {
    // WebAuthn 라우트
    console.log('📡 Loading WebAuthn routes...');
    try {
      const webauthnRoutes = await import('./routes/auth/webauthn');
      app.use('/api/auth/webauthn', webauthnRoutes.default);
      console.log('✅ WebAuthn routes loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load WebAuthn routes:', error);
    }

    // AI 채팅 라우트
    console.log('📡 Loading AI routes...');
    try {
      const aiRoutes = await import('./routes/ai/chat');
      app.use('/api/ai', aiRoutes.default);
      console.log('✅ AI routes loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load AI routes:', error);
    }

    // Passport 라우트 (수정된 경로)
    console.log('📡 Loading Passport routes...');
    try {
      const passportRoutes = await import('./routes/passport/passport');
      app.use('/api/passport', passportRoutes.default);
      console.log('✅ Passport routes loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Passport routes:', error);
    }

    // CUE 라우트 (수정된 경로)
    console.log('📡 Loading CUE routes...');
    try {
      const cueRoutes = await import('./routes/cue/cue');
      app.use('/api/cue', cueRoutes.default);
      console.log('✅ CUE routes loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load CUE routes:', error);
    }

    // Data Vault 라우트
    console.log('📡 Loading Data Vault routes...');
    try {
      const vaultRoutes = await import('./routes/vault/vault');
      app.use('/api/vault', vaultRoutes.default);
      console.log('✅ Data Vault routes loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Data Vault routes:', error);
    }

  } catch (error) {
    console.error('❌ Routes loading failed:', error);
  }
}

// ============================================================================
// 🔍 404 및 에러 처리
// ============================================================================

app.use('*', (req: Request, res: Response) => {
  const requestOrigin = req.get('Origin') || 'no-origin';
  
  console.log(`❌ 404 요청: ${req.method} ${req.originalUrl} from ${requestOrigin}`);
  
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    origin: requestOrigin,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /health',
      'POST /api/auth/webauthn/register/start',
      'POST /api/auth/webauthn/register/complete',
      'POST /api/auth/webauthn/login/start', 
      'POST /api/auth/webauthn/login/complete',
      'POST /api/ai/chat',
      'POST /api/cue/mine',
      'GET /api/cue/:userDid/balance',
      'POST /api/vault/save',
      'POST /api/vault/search',
      'GET /api/passport/:did'
    ]
  });
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 서버 에러:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🚀 서버 시작
// ============================================================================

async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    console.log('🔍 Database connection test: START');
    const db = DatabaseService.getInstance();
    await db.connect();
    const connected = await db.testConnection();
    console.log(`🔍 Database connection test: ${connected ? 'PASS' : 'FAIL'}`);

    // 라우트 로드
    await loadRoutes();

    // 서버 시작
    app.listen(PORT, () => {
      console.log('🚀 ================================');
      console.log('🚀 AI Passport CUE Backend Server');
      console.log('🚀 ================================');
      console.log(`📡 Server URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🌐 CORS: 모든 오리진 허용 (개발모드)`);
      console.log('🚀 ================================');
      console.log('🛣️  Available API Endpoints:');
      console.log('  🔐 Auth: /api/auth/webauthn/*');
      console.log('  🤖 AI: /api/ai/chat');
      console.log('  💎 CUE: /api/cue/*');
      console.log('  🗄️ Vault: /api/vault/*');
      console.log('  🎫 Passport: /api/passport/*');
      console.log('🚀 ================================');
      console.log('✅ Server initialization completed');
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();

export default app;
EOF

echo "✅ 누락된 모든 라우트 파일이 생성되었습니다!"
echo ""
echo "🔧 생성된 파일들:"
echo "  📁 src/routes/passport/passport.ts - AI Passport 관리"
echo "  💎 src/routes/cue/cue.ts - CUE 토큰 관리"
echo "  🗄️ src/routes/vault/vault.ts - 데이터 볼트 관리"
echo "  🚀 src/app.ts - 수정된 메인 서버"
echo ""
echo "🚀 이제 백엔드 서버를 실행해주세요:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "✅ 모든 라우트 에러가 해결됩니다!"