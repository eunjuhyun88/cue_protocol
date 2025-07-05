// ============================================================================
// 🚀 AI Personal 백엔드 메인 애플리케이션 (완전 통합 버전)
// 파일: backend/src/app.ts
// 
// 🔄 개선사항:
// - SocketService 완전 통합 (1번의 개선된 createSafeInstance, initializeWithServer 적용)
// - 기존 2번의 모든 기능 보존 (WebAuthn, 통합 인증, 세션 관리 등)
// - DI Container 연동 강화
// - 실제 라우트 파일 연결 및 Fallback 시스템
// - 프로덕션 수준 에러 핸들링 및 로깅
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from './services/database/DatabaseService';
import { DIContainer } from './core/DIContainer';

// SocketService 임포트 (개선된 버전)
import SocketService from './services/socket/SocketService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 AI Personal 백엔드 서버 초기화 중...');

// ============================================================================
// 🧰 DI Container 초기화
// ============================================================================

let container: DIContainer;
try {
  container = DIContainer.getInstance();
  console.log('✅ DI Container 초기화 완료');
} catch (error) {
  console.warn('⚠️ DI Container 초기화 실패, 기본 모드로 진행:', error);
}

// ============================================================================
// 🔧 환경 변수 및 기본 설정
// ============================================================================

// JWT 시크릿
const JWT_SECRET = process.env.JWT_SECRET || 'temp-secret-key-for-development-only';

// Supabase 설정
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let useDatabase = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('dummy')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    useDatabase = true;
    console.log('✅ Supabase 클라이언트 초기화 성공');
  } catch (error) {
    console.warn('⚠️ Supabase 초기화 실패, Mock 데이터베이스 사용:', error.message);
  }
} else {
  console.warn('⚠️ Supabase 환경변수 없음, Mock 데이터베이스 사용');
}

// ============================================================================
// 🛠️ 유틸리티 함수
// ============================================================================

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 세션 저장소 및 WebAuthn 설정
const sessionStore = new Map<string, any>();
const rpName = process.env.WEBAUTHN_RP_NAME || 'AI Personal';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';

// ============================================================================
// 🔧 세션 관리자 클래스 (기존 기능 보존)
// ============================================================================

class SessionManager {
  private sessions = new Map<string, any>();
  
  generateSessionToken(userId: string, credentialId: string): string {
    const payload = {
      userId,
      credentialId,
      type: 'session',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30일
    };
    return jwt.sign(payload, JWT_SECRET);
  }
  
  verifySessionToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('❌ 세션 토큰 검증 실패:', error.message);
      return null;
    }
  }
  
  async findUserByCredentialId(credentialId: string): Promise<any> {
    if (useDatabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('credential_id', credentialId)
          .single();
        
        if (error) {
          console.log('🔍 사용자 조회 결과: 없음 (신규 사용자)');
          return null;
        }
        
        console.log('✅ 기존 사용자 발견:', data.username);
        return data;
      } catch (error) {
        console.error('❌ 사용자 조회 중 오류:', error);
        return null;
      }
    } else {
      // Mock 모드에서 간단한 세션 기반 확인
      const existingSession = Array.from(this.sessions.values())
        .find(session => session.credentialId === credentialId);
      
      if (existingSession) {
        console.log('✅ Mock: 기존 사용자 발견');
        return existingSession;
      }
      
      console.log('🔍 Mock: 신규 사용자');
      return null;
    }
  }
  
  async createUser(userData: any): Promise<any> {
    if (useDatabase && supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();
        
        if (error) throw error;
        
        console.log('✅ 신규 사용자 생성 완료:', data.username);
        return data;
      } catch (error) {
        console.error('❌ 사용자 생성 실패:', error);
        throw error;
      }
    } else {
      // Mock 모드
      const newUser = {
        ...userData,
        id: `mock_${Date.now()}`,
        created_at: new Date().toISOString()
      };
      
      this.sessions.set(userData.credential_id, newUser);
      console.log('✅ Mock: 신규 사용자 생성 완료');
      return newUser;
    }
  }
  
  async saveSession(userId: string, sessionData: any): Promise<void> {
    this.sessions.set(userId, {
      ...sessionData,
      lastActive: new Date().toISOString()
    });
  }
  
  getSession(userId: string): any {
    return this.sessions.get(userId);
  }
  
  clearSession(userId: string): void {
    this.sessions.delete(userId);
  }
}

const sessionManager = new SessionManager();

// ============================================================================
// 🔧 미들웨어 설정
// ============================================================================

// 보안 헤더
app.use(helmet({
  contentSecurityPolicy: false, // 개발 환경에서는 비활성화
  crossOriginEmbedderPolicy: false
}));

// 요청 로깅
app.use(morgan('combined'));

// CORS 설정 (개발 환경용)
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 개발 모드에서는 모든 오리진 허용
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Fingerprint']
}));

// JSON 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 요청 로깅 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📡 ${req.method} ${req.originalUrl} from ${req.get('Origin') || 'no-origin'}`);
  next();
});

// 에러 로깅 미들웨어 (선택적 로드)
try {
  const { loggingMiddleware } = require('./middleware/loggingMiddleware');
  app.use(loggingMiddleware);
  console.log('✅ Logging middleware loaded');
} catch (error) {
  console.log('📝 Logging middleware not found, using basic logging');
}

// ============================================================================
// 🏥 헬스 체크 (SocketService 상태 포함)
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  const socketService = SocketService.createSafeInstance();
  const socketStatus = socketService ? socketService.getStatus() : { 
    connected: false, 
    users: 0, 
    health: 'unavailable',
    initialized: false 
  };
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    database: useDatabase ? 'supabase' : 'mock',
    supabaseConnected: !!supabase,
    socket: socketStatus,
    services: {
      webauthn: 'operational',
      ai: 'operational',
      cue: 'operational',
      passport: 'operational',
      vault: 'operational',
      socket: socketStatus.initialized ? 'operational' : 'degraded'
    },
    diContainer: container ? 'initialized' : 'fallback',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  console.log('✅ Health Check 응답 전송');
  res.json(healthData);
});

// ============================================================================
// 🔍 통합 패스키 인증 시작 (로그인/가입 자동 판별) - 기존 기능 보존
// ============================================================================

app.post('/api/auth/webauthn/start', async (req: Request, res: Response) => {
  console.log('🔍 === 패스키 통합 인증 시작 ===');
  
  try {
    // 모든 패스키 허용하는 인증 옵션 생성
    const options = {
      challenge: base64urlEncode(Buffer.from(`challenge_${Date.now()}_${Math.random()}`)),
      timeout: 60000,
      rpId: rpID,
      allowCredentials: [], // 🔑 빈 배열 = 모든 기존 패스키 허용
      userVerification: "preferred" as const
    };

    const sessionId = `unified_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStore.set(sessionId, {
      challenge: options.challenge,
      timestamp: Date.now(),
      type: 'unified' // 로그인/가입 통합
    });

    console.log('✅ 통합 인증 옵션 생성 완료:', sessionId);

    res.json({
      success: true,
      options,
      sessionId,
      message: '패스키를 사용하여 인증해주세요'
    });
  } catch (error) {
    console.error('❌ 통합 인증 시작 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication start failed',
      message: error.message
    });
  }
});

// ============================================================================
// ✅ 통합 패스키 인증 완료 (로그인/가입 자동 처리) - 기존 기능 보존
// ============================================================================

app.post('/api/auth/webauthn/complete', async (req: Request, res: Response) => {
  console.log('✅ === 패스키 통합 인증 완료 ===');
  
  try {
    const { credential, sessionId } = req.body;
    
    if (!credential || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'credential과 sessionId가 필요합니다'
      });
    }
    
    const sessionData = sessionStore.get(sessionId);
    if (!sessionData) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않거나 만료된 세션입니다'
      });
    }
    
    console.log('✅ 임시 세션 검증 완료');
    
    // 🔍 STEP 1: credential.id로 기존 사용자 확인
    console.log('🔍 기존 사용자 확인 중... credential_id:', credential.id);
    
    const existingUser = await sessionManager.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      // 🔑 기존 사용자 - 자동 로그인
      console.log('🎉 기존 사용자 자동 로그인!', existingUser.username);
      
      const sessionToken = sessionManager.generateSessionToken(existingUser.id, credential.id);
      
      // 세션 저장
      await sessionManager.saveSession(existingUser.id, {
        user: existingUser,
        credentialId: credential.id,
        loginTime: new Date().toISOString()
      });
      
      // SocketService를 통한 로그인 알림
      const socketService = SocketService.createSafeInstance();
      if (socketService) {
        socketService.broadcastCueUpdate(existingUser.did, 5, 'login_bonus');
      }
      
      sessionStore.delete(sessionId);
      
      return res.json({
        success: true,
        type: 'login',
        user: existingUser,
        sessionToken,
        message: `환영합니다, ${existingUser.username}님!`
      });
    } else {
      // 🆕 신규 사용자 - 자동 가입
      console.log('🆕 신규 사용자 자동 가입 처리');
      
      const username = `user_${Date.now().toString().slice(-6)}`;
      const userDid = `did:cue:${Date.now()}`;
      
      const newUserData = {
        username,
        did: userDid,
        credential_id: credential.id,
        trust_score: 50,
        cue_tokens: 100, // 초기 토큰
        status: 'active',
        personality_profile: JSON.stringify({
          traits: ['새로운 사용자'],
          preferences: {
            communicationStyle: 'friendly',
            responseLength: 'balanced'
          }
        })
      };
      
      const newUser = await sessionManager.createUser(newUserData);
      const sessionToken = sessionManager.generateSessionToken(newUser.id, credential.id);
      
      // 세션 저장
      await sessionManager.saveSession(newUser.id, {
        user: newUser,
        credentialId: credential.id,
        registrationTime: new Date().toISOString()
      });
      
      // SocketService를 통한 가입 축하 알림
      const socketService = SocketService.createSafeInstance();
      if (socketService) {
        socketService.broadcastCueUpdate(newUser.did, 100, 'registration_bonus');
      }
      
      sessionStore.delete(sessionId);
      
      return res.json({
        success: true,
        type: 'registration',
        user: newUser,
        sessionToken,
        message: `환영합니다! 새로운 AI Passport가 생성되었습니다.`
      });
    }
    
  } catch (error) {
    console.error('❌ 통합 인증 완료 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication completion failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🛣️ 라우트 파일 임포트 및 연결 (DI Container 우선 사용)
// ============================================================================

/**
 * 라우트 로더 유틸리티 함수 (개선됨)
 * DI Container에서 라우트를 가져오거나 직접 로드
 */
function loadRoute(routeName: string, routePath: string, mountPath: string) {
  try {
    // 1. DI Container에서 라우트 가져오기 시도
    if (container && container.has(routeName)) {
      const route = container.get(routeName);
      app.use(mountPath, route);
      console.log(`✅ ${routeName} loaded from DI Container: ${mountPath}`);
      return true;
    }
  } catch (diError) {
    console.warn(`⚠️ DI Container route loading failed for ${routeName}:`, diError.message);
  }

  try {
    // 2. 직접 파일 로드 시도
    const routeModule = require(routePath);
    const route = routeModule.default || routeModule.createRoutes?.() || routeModule;
    app.use(mountPath, route);
    console.log(`✅ ${routeName} loaded directly: ${mountPath}`);
    return true;
  } catch (directError) {
    console.error(`❌ Direct route loading failed for ${routeName}:`, directError.message);
    return false;
  }
}

// ============================================================================
// 🤖 AI 채팅 라우트 (기존 기능 보존 + 개선)
// ============================================================================

if (!loadRoute('AIRoutes', './routes/ai/chat', '/api/ai')) {
  // AI 채팅 Fallback 라우트
  const aiChatFallback = express.Router();
  
  aiChatFallback.post('/chat', async (req: Request, res: Response) => {
    console.log('🤖 AI 채팅 요청 (Fallback)');
    
    const { message, userDid } = req.body;
    
    // 간단한 응답 생성
    const responses = [
      "안녕하세요! AI Personal Assistant입니다.",
      "무엇을 도와드릴까요?",
      "흥미로운 질문이네요. 더 자세히 설명해주세요.",
      "그에 대해 더 알아보겠습니다.",
      "좋은 아이디어입니다!"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const cueEarned = Math.floor(Math.random() * 10) + 1;
    
    // SocketService를 통한 실시간 CUE 업데이트
    const socketService = SocketService.createSafeInstance();
    if (socketService && userDid) {
      socketService.broadcastCueUpdate(userDid, cueEarned, 'ai_chat');
    }
    
    res.json({
      success: true,
      response: randomResponse,
      messageId: `msg_${Date.now()}`,
      cueEarned,
      timestamp: new Date().toISOString()
    });
  });
  
  app.use('/api/ai', aiChatFallback);
}

// ============================================================================
// 💎 CUE 토큰 라우트 (기존 기능 보존 + SocketService 통합)
// ============================================================================

if (!loadRoute('CueRoutes', './routes/cue/cue', '/api/cue')) {
  // CUE Fallback 라우트
  const cueFallback = express.Router();
  
  cueFallback.get('/balance/:did', (req: Request, res: Response) => {
    const { did } = req.params;
    const balance = 1000 + Math.floor(Math.random() * 5000);
    
    console.log(`💎 CUE 잔액 조회 (Fallback): ${did} = ${balance} CUE`);
    
    res.json({
      success: true,
      balance,
      did,
      timestamp: new Date().toISOString()
    });
  });
  
  cueFallback.post('/mine', (req: Request, res: Response) => {
    const { userDid, amount = 10, source = 'activity' } = req.body;
    const newBalance = 1000 + Math.floor(Math.random() * 5000) + amount;
    
    console.log(`💎 CUE 마이닝 (Fallback): ${userDid} +${amount} CUE`);
    
    // SocketService를 통한 실시간 브로드캐스트
    const socketService = SocketService.createSafeInstance();
    if (socketService) {
      socketService.broadcastCueUpdate(userDid, amount, source);
    }
    
    res.json({
      success: true,
      amount,
      newBalance,
      source,
      timestamp: new Date().toISOString()
    });
  });
  
  app.use('/api/cue', cueFallback);
}

// ============================================================================
// 🎫 AI Passport 라우트 (기존 기능 보존)
// ============================================================================

if (!loadRoute('PassportRoutes', './routes/passport/passport', '/api/passport')) {
  // Passport Fallback 라우트
  const passportFallback = express.Router();
  
  passportFallback.get('/:did', (req: Request, res: Response) => {
    const { did } = req.params;
    
    console.log(`🎫 Passport 조회 (Fallback): ${did}`);
    
    const passport = {
      did,
      username: did.split(':').pop() || 'unknown',
      trustScore: 75 + Math.floor(Math.random() * 25),
      personalityProfile: {
        traits: ['창의적', '분석적', '호기심 많음'],
        preferences: { 
          communicationStyle: 'friendly', 
          responseLength: 'detailed' 
        }
      },
      cueBalance: 1500 + Math.floor(Math.random() * 5000),
      totalMined: 15000 + Math.floor(Math.random() * 50000),
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    res.json({
      success: true,
      passport,
      timestamp: new Date().toISOString()
    });
  });
  
  app.use('/api/passport', passportFallback);
}

// ============================================================================
// 🗄️ Data Vault 라우트 (기존 기능 보존)
// ============================================================================

if (!loadRoute('VaultRoutes', './routes/vault/index', '/api/vault')) {
  // Vault Fallback 라우트
  const vaultFallback = express.Router();
  
  vaultFallback.post('/save', (req: Request, res: Response) => {
    console.log('🗄️ 데이터 저장 (Fallback)');
    
    res.json({
      success: true,
      id: `vault_${Date.now()}`,
      message: '데이터가 저장되었습니다',
      timestamp: new Date().toISOString()
    });
  });
  
  vaultFallback.get('/:did', (req: Request, res: Response) => {
    const { did } = req.params;
    
    console.log(`🗄️ 데이터 조회 (Fallback): ${did}`);
    
    res.json({
      success: true,
      vaults: [
        {
          id: `vault_${Date.now()}`,
          name: 'Sample Vault',
          type: 'personal',
          size: Math.floor(Math.random() * 1000),
          created: new Date().toISOString()
        }
      ],
      timestamp: new Date().toISOString()
    });
  });
  
  app.use('/api/vault', vaultFallback);
}

// ============================================================================
// 🔧 Debug 라우트 (SocketService 상태 포함)
// ============================================================================

try {
  const debugRoutes = require('./routes/debug/index').default;
  app.use('/api/debug', debugRoutes);
  console.log('✅ Debug routes mounted: /api/debug');
} catch (error) {
  // Debug Fallback 라우트
  const debugFallback = express.Router();
  
  debugFallback.get('/status', (req: Request, res: Response) => {
    const socketService = SocketService.createSafeInstance();
    const socketStatus = socketService ? socketService.getStatus() : {
      connected: false,
      users: 0,
      health: 'unavailable',
      initialized: false
    };
    
    res.json({
      server: 'healthy',
      database: useDatabase ? 'connected' : 'mock',
      socket: socketStatus,
      diContainer: container ? 'initialized' : 'fallback',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });
  
  app.use('/api/debug', debugFallback);
  console.log('⚠️ Debug fallback routes mounted');
}

// ============================================================================
// 🔍 API 엔드포인트 목록 표시
// ============================================================================

app.get('/api', (req: Request, res: Response) => {
  const socketService = SocketService.createSafeInstance();
  const socketStatus = socketService ? socketService.getStatus() : {
    connected: false,
    users: 0,
    health: 'unavailable',
    initialized: false
  };
  
  res.json({
    name: 'AI Personal Backend API',
    version: '2.0.0',
    status: 'operational',
    socket: socketStatus,
    diContainer: container ? 'active' : 'fallback',
    endpoints: {
      auth: {
        webauthn: '/api/auth/webauthn/*',
        unified: '/api/auth/*'
      },
      ai: '/api/ai/chat',
      cue: {
        balance: '/api/cue/balance/:did',
        mine: '/api/cue/mine'
      },
      passport: '/api/passport/:did',
      vault: '/api/vault/*',
      debug: '/api/debug/*',
      health: '/health'
    },
    documentation: 'https://github.com/your-repo/docs',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🚫 404 및 에러 핸들링 (기존 기능 보존)
// ============================================================================

app.use('*', (req: Request, res: Response) => {
  console.log(`❌ 404 - 찾을 수 없는 경로: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /health - 서버 상태 확인',
      'GET /api - API 정보',
      'POST /api/auth/webauthn/start - 통합 인증 시작',
      'POST /api/auth/webauthn/complete - 통합 인증 완료',
      'POST /api/ai/chat - AI 채팅',
      'GET /api/cue/balance/:did - CUE 잔액 조회',
      'POST /api/cue/mine - CUE 마이닝',
      'GET /api/passport/:did - AI Passport 조회',
      'GET /api/vault/:did - 데이터 볼트 조회',
      'POST /api/vault/save - 데이터 저장',
      'GET /api/debug/status - 시스템 상태'
    ],
    suggestion: '위의 사용 가능한 엔드포인트를 확인해주세요.'
  });
});

// 글로벌 에러 핸들러
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ 서버 에러:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
});

// ============================================================================
// 🚀 서버 시작 (SocketService 완전 통합 + DI Container + 기존 기능 보존)
// ============================================================================

async function startServer() {
  try {
    console.log('🌍 환경:', process.env.NODE_ENV || 'development');
    
    // DI Container 설정 (선택적)
    if (container) {
      console.log('🔧 DI Container 서비스 등록 중...');
      
      try {
        // 데이터베이스 서비스 등록
        container.registerSingleton('DatabaseService', () => DatabaseService.getInstance());
        
        // SocketService 등록 (개선된 createSafeInstance 사용)
        container.registerSingleton('SocketService', () => SocketService.createSafeInstance());
        
        console.log('✅ DI Container 서비스 등록 완료');
      } catch (diError) {
        console.warn('⚠️ DI Container 서비스 등록 실패:', diError);
      }
    }
    
    // 데이터베이스 연결 테스트 (선택적)
    try {
      const db = DatabaseService.getInstance();
      await db.connect();
      const connected = await db.testConnection();
      console.log(`🔍 Database connection: ${connected ? 'SUCCESS' : 'FAILED (using fallback)'}`);
    } catch (dbError) {
      console.log('🔍 Database connection: FAILED (using fallback mode)');
    }

    // ✅ HTTP 서버 생성 (SocketService를 위해 필요)
    const server = createServer(app);

    // ✅ SocketService 초기화 (개선된 방식 - createSafeInstance + initializeWithServer)
    const socketService = SocketService.createSafeInstance();
    if (socketService) {
      socketService.initializeWithServer(server);
      console.log('🔌 SocketService 초기화 완료');
    } else {
      console.warn('⚠️ SocketService 초기화 실패, WebSocket 기능 비활성화');
    }

    // ✅ 서버 시작
    server.listen(PORT, () => {
      console.log('🚀 ===========================');
      console.log('🚀 AI Personal Backend Server');
      console.log('🚀 ===========================');
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📋 API Info: http://localhost:${PORT}/api`);
      console.log(`🔌 Socket.IO: ws://localhost:${PORT}/socket.io/`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('🚀 ===========================');
      console.log('🛣️  API Endpoints:');
      console.log('  🔐 WebAuthn: /api/auth/webauthn/*');
      console.log('  🤖 AI Chat: /api/ai/chat');
      console.log('  💎 CUE: /api/cue/*');
      console.log('  🎫 Passport: /api/passport/*');
      console.log('  🗄️ Vault: /api/vault/*');
      console.log('  🔧 Debug: /api/debug/*');
      console.log('🚀 ===========================');
      
      if (socketService) {
        console.log('🔌 SocketService Status:', socketService.getStatus());
      } else {
        console.log('🔌 SocketService Status: UNAVAILABLE');
      }
      
      console.log(`🧰 DI Container: ${container ? 'ACTIVE' : 'FALLBACK'}`);
      console.log(`🗄️ Database: ${useDatabase ? 'SUPABASE' : 'MOCK'}`);
      console.log('✅ Server ready - All routes mounted');
      console.log('💡 Tip: Fallback routes are active for missing files');
    });

    // ✅ Graceful shutdown (SocketService + DI Container 포함)
    const gracefulShutdown = (signal: string) => {
      console.log(`🛑 ${signal} received, shutting down gracefully`);
      
      // SocketService 정리
      if (socketService && typeof socketService.dispose === 'function') {
        try {
          socketService.dispose();
          console.log('🔌 SocketService disposed');
        } catch (error) {
          console.warn('⚠️ SocketService dispose failed:', error);
        }
      }
      
      // DI Container 정리 (있다면)
      if (container && typeof container.dispose === 'function') {
        try {
          container.dispose();
          console.log('🧰 DI Container disposed');
        } catch (error) {
          console.warn('⚠️ DI Container dispose failed:', error);
        }
      }
      
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();

export default app;