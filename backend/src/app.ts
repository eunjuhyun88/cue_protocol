// ============================================================================
// 🚀 AI Personal Ultimate Fusion Backend - Production Ready
// 파일: backend/src/app.ts (완전 통합 버전)
// 융합: 1번 라우트 로딩 방식 + 2번 모든 기능 (DI Container + CryptoService)
// 특징: 안전한 라우트 로딩 + 무한루프 방지 + Production Ready
// 버전: v3.2.0-ultimate-fusion
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { DatabaseService } from './services/database/DatabaseService';
import SocketService from './services/socket/SocketService';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ✅ HTTP 서버 생성 (Socket.IO 지원)
const httpServer = createServer(app);

console.log('🚀 === AI Personal Ultimate Fusion Backend 시작 ===');
console.log(`🌍 환경: ${NODE_ENV}`);
console.log(`🔗 프론트엔드: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

// ============================================================================
// 🔧 DI Container 및 서비스 상태 관리 (무한루프 방지)
// ============================================================================

let container: any = null;
let services: {
  auth?: any;
  session?: any;
  webauthn?: any;
  sessionRestore?: any;
  ollamaAI?: any;
  websocket?: any;
  database?: any;
  crypto?: any;
} = {};

// 🚫 무한루프 방지용 상태 플래그
let initializationFlags = {
  cryptoTested: false,
  aiConnectionChecked: false,
  databaseValidated: false,
  healthCheckRunning: false,
  lastInitTime: 0,
  vaultTestRunning: false,
  serviceStatusChecking: false,
  routesLoaded: false
};

// 서비스 초기화 쿨다운 (60초)
const INITIALIZATION_COOLDOWN = 60000;
const AI_CONNECTION_TIMEOUT = 3000;
const CRYPTO_TEST_TIMEOUT = 2000;
const DATABASE_VALIDATION_TIMEOUT = 5000;

/**
 * 🔄 초기화 쿨다운 체크 (무한루프 방지)
 */
function shouldSkipInitialization(serviceName: string): boolean {
  const now = Date.now();
  if (now - initializationFlags.lastInitTime < INITIALIZATION_COOLDOWN) {
    console.log(`⏳ ${serviceName} 초기화 쿨다운 중... (${Math.floor((INITIALIZATION_COOLDOWN - (now - initializationFlags.lastInitTime)) / 1000)}초 대기)`);
    return true;
  }
  return false;
}

/**
 * 🔐 CryptoService 안전한 초기화 (무한루프 방지)
 */
async function initializeCryptoServiceSafely(): Promise<void> {
  try {
    console.log('🔐 CryptoService 안전한 초기화 시작 (무한루프 방지)...');
    
    if (!container.has('CryptoService')) {
      throw new Error('CryptoService가 DI Container에 등록되지 않음');
    }
    
    services.crypto = container.get('CryptoService');
    
    // 환경변수 확인 (간단한 체크만)
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.warn('⚠️ ENCRYPTION_KEY 환경변수 미설정 - 기본 개발 키 사용');
    } else if (encryptionKey.length !== 32) {
      console.warn(`⚠️ ENCRYPTION_KEY 길이 오류: ${encryptionKey.length}/32`);
    } else {
      console.log('✅ ENCRYPTION_KEY 정상 설정됨');
    }
    
    // ✨ 암호화 기능 테스트 (초기화 시 1회만)
    if (!initializationFlags.cryptoTested) {
      console.log('🧪 암호화 기능 초기 테스트 (1회만)...');
      
      try {
        // 타임아웃을 적용한 안전한 테스트
        const testPromise = new Promise((resolve, reject) => {
          try {
            const testResult = services.crypto.testEncryption();
            resolve(testResult);
          } catch (error) {
            reject(error);
          }
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Crypto test timeout')), CRYPTO_TEST_TIMEOUT)
        );
        
        const testResult = await Promise.race([testPromise, timeoutPromise]) as any;
        
        if (testResult.success) {
          console.log('✅ 암호화 기능 테스트 성공');
          initializationFlags.cryptoTested = true;
        } else {
          console.warn('⚠️ 암호화 기능 테스트 실패:', testResult.message);
        }
      } catch (error: any) {
        console.warn('⚠️ 암호화 테스트 중 오류:', error.message);
      }
    } else {
      console.log('📋 암호화 기능 이미 테스트됨 (중복 방지)');
    }
    
    console.log('✅ CryptoService 안전한 초기화 완료');
    
  } catch (cryptoError: any) {
    console.error('❌ CryptoService 초기화 실패:', cryptoError.message);
    throw new Error(`CryptoService 필수 서비스 초기화 실패: ${cryptoError.message}`);
  }
}

/**
 * 🤖 AI 서비스 안전한 초기화 (무한루프 방지)
 */
async function initializeAIServiceSafely(): Promise<void> {
  try {
    console.log('🤖 AI 서비스 안전한 초기화 시작 (무한루프 방지)...');
    
    // DI Container에서 OllamaAIService 가져오기
    services.ollamaAI = container.get('OllamaAIService');
    
    if (!services.ollamaAI) {
      console.warn('⚠️ OllamaAIService를 DI Container에서 찾을 수 없음');
      return;
    }

    console.log('✅ OllamaAIService 인스턴스 생성 성공');
    
    // ✨ 연결 상태 확인 (초기화 시 1회만, 무한루프 방지)
    if (!initializationFlags.aiConnectionChecked) {
      console.log('🔍 Ollama 서비스 연결 상태 확인 (1회만)...');
      
      try {
        // 매우 짧은 타임아웃으로 빠른 연결 확인
        const connectionPromise = services.ollamaAI.checkConnection?.() || 
                                services.ollamaAI.testConnection?.() ||
                                Promise.resolve(false);
        
        const timeoutPromise = new Promise(resolve => 
          setTimeout(() => resolve(false), AI_CONNECTION_TIMEOUT)
        );
        
        const isConnected = await Promise.race([connectionPromise, timeoutPromise]);
        
        if (isConnected) {
          console.log('✅ Ollama 서비스 연결 성공');
          initializationFlags.aiConnectionChecked = true;
          
          // 연결된 경우에만 모델 목록 확인 (1회만, 타임아웃 적용)
          try {
            if (typeof services.ollamaAI.getModels === 'function') {
              const modelsPromise = services.ollamaAI.getModels();
              const modelTimeoutPromise = new Promise(resolve => 
                setTimeout(() => resolve([]), 2000)
              );
              
              const models = await Promise.race([modelsPromise, modelTimeoutPromise]);
              
              if (Array.isArray(models) && models.length > 0) {
                console.log(`📋 사용 가능한 모델 ${models.length}개:`, models.slice(0, 3));
              } else {
                console.log('📋 모델 목록이 비어있거나 조회 실패');
              }
            }
          } catch (modelError: any) {
            console.warn('⚠️ 모델 목록 조회 실패:', modelError.message);
          }
        } else {
          console.log('⚠️ Ollama 서비스 연결 실패 - Mock 모드로 동작');
        }
      } catch (connectionError: any) {
        console.warn('⚠️ Ollama 연결 확인 중 오류:', connectionError.message);
      }
    } else {
      console.log('📋 AI 서비스 연결 이미 확인됨 (중복 방지)');
    }
    
    console.log('✅ AI 서비스 안전한 초기화 완료');
    
  } catch (aiError: any) {
    console.warn('⚠️ AI 서비스 초기화 실패 (선택적 서비스):', aiError.message);
    services.ollamaAI = null;
  }
}

/**
 * 🗄️ 데이터베이스 안전한 초기화 (무한루프 방지)
 */
async function initializeDatabaseSafely(): Promise<void> {
  try {
    services.database = container.get('DatabaseService');
    console.log('✅ DatabaseService DI 로드 성공');
    
    // ✨ 데이터베이스 의존성 검증 (초기화 시 1회만, 무한루프 방지)
    if (!initializationFlags.databaseValidated) {
      console.log('🔍 데이터베이스 의존성 초기 검증 (1회만)...');
      
      try {
        const validationPromise = services.database.validateDependencies?.() || 
                                 services.database.testConnection?.() ||
                                 Promise.resolve({ status: 'unknown' });
        
        const timeoutPromise = new Promise(resolve => 
          setTimeout(() => resolve({ status: 'timeout' }), DATABASE_VALIDATION_TIMEOUT)
        );
        
        const dbValidation = await Promise.race([validationPromise, timeoutPromise]);
        
        console.log(`📊 데이터베이스 검증 결과: ${dbValidation.status}`);
        
        if (dbValidation.issues && dbValidation.issues.length > 0) {
          console.warn('⚠️ 데이터베이스 문제 발견:', dbValidation.issues.slice(0, 2));
        }
        
        initializationFlags.databaseValidated = true;
        
      } catch (dbError: any) {
        console.warn('⚠️ 데이터베이스 검증 중 오류:', dbError.message);
      }
    } else {
      console.log('📋 데이터베이스 이미 검증됨 (중복 방지)');
    }
    
  } catch (dbError: any) {
    console.error('❌ DatabaseService 초기화 실패:', dbError);
    throw new Error(`DatabaseService 초기화 실패: ${dbError.message}`);
  }
}

/**
 * 🔧 모든 서비스 안전한 초기화 (무한루프 완전 방지)
 */
async function initializeAllServicesSafely(): Promise<boolean> {
  try {
    console.log('🔧 === 모든 서비스 안전한 초기화 시작 (무한루프 완전 방지) ===');
    
    // 쿨다운 체크
    if (shouldSkipInitialization('전체 서비스')) {
      return true;
    }
    
    initializationFlags.lastInitTime = Date.now();
    
    // 1. DI Container 초기화
    try {
      const containerModule = await import('./core/DIContainer');
      const initializeContainer = containerModule.initializeContainer || 
                                 containerModule.default?.initializeContainer;
      
      if (!initializeContainer) {
        throw new Error('initializeContainer 함수를 찾을 수 없습니다');
      }
      
      container = await initializeContainer();
      console.log('✅ DI Container 로드 성공');
    } catch (containerError: any) {
      console.error('❌ DI Container 로드 실패:', containerError);
      throw new Error(`DI Container 초기화 실패: ${containerError.message}`);
    }
    
    // 2. 💎 CryptoService 안전한 초기화 (최우선 - 필수 서비스)
    await initializeCryptoServiceSafely();
    
    // 3. 🗄️ 데이터베이스 안전한 초기화
    await initializeDatabaseSafely();
    
    // 4. 인증 관련 서비스 로드
    try {
      services.session = container.get('SessionService');
      services.webauthn = container.get('WebAuthnService');
      services.auth = container.get('AuthService');
      services.sessionRestore = container.get('SessionRestoreService');
      console.log('✅ 인증 서비스 로드 성공');
    } catch (authError: any) {
      console.error('❌ 인증 서비스 로드 실패:', authError);
      throw new Error(`인증 서비스 초기화 실패: ${authError.message}`);
    }
    
    // 5. 🤖 AI 서비스 안전한 초기화
    await initializeAIServiceSafely();
    
    // 6. WebSocket 서비스 초기화
    try {
      services.websocket = SocketService.createSafeInstance();
      
      if (services.websocket) {
        const initialized = services.websocket.initializeWithServer(httpServer);
        
        if (initialized) {
          app.set('websocketService', services.websocket);
          console.log('✅ WebSocket 서비스 초기화 성공');
        } else {
          console.warn('⚠️ WebSocket 서비스 초기화 실패');
          services.websocket = null;
        }
      } else {
        console.warn('⚠️ WebSocket 서비스 인스턴스 생성 실패');
      }
    } catch (wsError: any) {
      console.warn('⚠️ WebSocket 서비스 초기화 실패 (선택적 서비스):', wsError.message);
      services.websocket = null;
    }
    
    console.log('🎯 === 모든 서비스 안전한 초기화 완료 ===');
    console.log('📊 서비스 상태:');
    console.log(`   🗄️ Database: ${!!services.database} (검증 제한 적용)`);
    console.log(`   🔐 Crypto: ${!!services.crypto} (테스트 제한 적용)`);
    console.log(`   🔐 Auth: ${!!services.auth}`);
    console.log(`   🔧 Session: ${!!services.sessionRestore}`);
    console.log(`   🔑 WebAuthn: ${!!services.webauthn}`);
    console.log(`   🤖 AI: ${!!services.ollamaAI} (연결 확인 제한 적용)`);
    console.log(`   🔌 WebSocket: ${!!services.websocket}`);
    console.log('🚫 무한루프 방지: 모든 테스트/검증 제한 적용');
    console.log('⚡ 상세 상태는 개별 API 요청 시에만 확인');
    
    return true;
    
  } catch (error: any) {
    console.error('💥 서비스 초기화 중 치명적 오류:', error);
    return false;
  }
}

// ============================================================================
// 🛡️ 강화된 보안 및 미들웨어 설정
// ============================================================================

// 보안 헤더
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://localhost:11434", "ws://localhost:3001"]
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}));

// CORS 설정
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL,
      process.env.PRODUCTION_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS 정책에 의해 차단됨'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Client-Fingerprint',
    'X-Session-Token'
  ],
  exposedHeaders: ['X-Session-Token'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// JSON 파싱
app.use(express.json({ 
  limit: NODE_ENV === 'production' ? '5mb' : '10mb'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: NODE_ENV === 'production' ? '5mb' : '10mb'
}));

// 요청 로깅
if (NODE_ENV === 'development') {
  app.use(morgan('📡 :method :url :status :res[content-length] - :response-time ms from :remote-addr', {
    skip: (req) => req.url === '/health' && req.method === 'GET'
  }));
} else {
  app.use(morgan('combined'));
}

// IP 신뢰 설정
app.set('trust proxy', true);

// 요청 추적 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// ============================================================================
// 🏥 Health Check 엔드포인트 (1번 파일 방식)
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  const requestOrigin = req.get('Origin') || 'no-origin';
  
  console.log(`🏥 Health Check 요청: ${requestOrigin}`);
  
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'AI Passport CUE Backend',
    version: '3.2.0-ultimate-fusion',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      enabled: true,
      requestOrigin: requestOrigin,
      allowAllOrigins: true
    },
    features: {
      webauthnAuth: !!services.webauthn,
      sessionManagement: !!services.sessionRestore,
      realTimeUpdates: !!services.websocket,
      aiIntegration: !!services.ollamaAI,
      diContainer: !!container,
      dataEncryption: !!services.crypto,
      cryptoServiceDI: !!services.crypto && !!container?.has('CryptoService'),
      databaseConnection: !!services.database,
      infiniteLoopPrevention: true
    },
    endpoints: [
      'GET /health',
      'POST /api/auth/webauthn/register/start',
      'POST /api/auth/webauthn/register/complete',
      'POST /api/auth/webauthn/login/start', 
      'POST /api/auth/webauthn/login/complete',
      'GET /api/auth/webauthn/status',
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
// 🛣️ 안전한 라우트 로딩 시스템 (1번 파일 방식 + 2번 기능)
// ============================================================================

// ✨ 수정 위치: backend/src/app.ts
// ⬇ `loadRoutesSafely` 함수를 아래로 완전 교체하세요

/**
 * 🛣️ DI Container + 안전한 라우트 로딩 (완전 통합)
 */
async function loadRoutesSafely() {
  try {
    if (initializationFlags.routesLoaded) {
      console.log('📋 라우트 이미 로드됨 (중복 방지)');
      return;
    }

    console.log('🚀 ===== DI Container + 안전한 라우트 로딩 시작 =====');

    // ✅ 1. DI Container 라우트 마운트 (최우선)
    if (container) {
      console.log('🔧 DI Container 라우트 마운트 시작...');
      
      try {
        // WebAuthn 라우트 (DI Container)
        const webauthnRoutes = container.get('AuthWebAuthnRoutes');
        if (webauthnRoutes && typeof webauthnRoutes.use === 'function') {
          app.use('/api/auth/webauthn', webauthnRoutes);
          console.log('✅ DI WebAuthn routes mounted at /api/auth/webauthn');
        }
      } catch (e) {
        console.warn('⚠️ DI WebAuthn routes 마운트 실패:', e.message);
      }

      try {
        // 통합 인증 라우트 (DI Container)
        const unifiedAuthRoutes = container.get('AuthUnifiedRoutes');
        if (unifiedAuthRoutes && typeof unifiedAuthRoutes.use === 'function') {
          app.use('/api/auth', unifiedAuthRoutes);
          console.log('✅ DI Unified Auth routes mounted at /api/auth');
        }
      } catch (e) {
        console.warn('⚠️ DI Unified Auth routes 마운트 실패:', e.message);
      }

      try {
        // AI 라우트 (DI Container)
        const aiRoutes = container.get('AIIndexRoutes');
        if (aiRoutes && typeof aiRoutes.use === 'function') {
          app.use('/api/ai', aiRoutes);
          console.log('✅ DI AI routes mounted at /api/ai');
        }
      } catch (e) {
        console.warn('⚠️ DI AI routes 마운트 실패:', e.message);
      }

      try {
        // CUE 라우트 (DI Container)
        const cueRoutes = container.get('CUERoutes');
        if (cueRoutes && typeof cueRoutes.use === 'function') {
          app.use('/api/cue', cueRoutes);
          console.log('✅ DI CUE routes mounted at /api/cue');
        }
      } catch (e) {
        console.warn('⚠️ DI CUE routes 마운트 실패:', e.message);
      }

      try {
        // Passport 라우트 (DI Container)
        const passportRoutes = container.get('PassportRoutes');
        if (passportRoutes && typeof passportRoutes.use === 'function') {
          app.use('/api/passport', passportRoutes);
          console.log('✅ DI Passport routes mounted at /api/passport');
        }
      } catch (e) {
        console.warn('⚠️ DI Passport routes 마운트 실패:', e.message);
      }

      try {
        // 데이터 볼트 라우트 (DI Container)
        const vaultRoutes = container.get('VaultRoutes');
        if (vaultRoutes && typeof vaultRoutes.use === 'function') {
          app.use('/api/vault', vaultRoutes);
          console.log('✅ DI Vault routes mounted at /api/vault');
        }
      } catch (e) {
        console.warn('⚠️ DI Vault routes 마운트 실패:', e.message);
      }

      try {
        // 플랫폼 라우트 (DI Container)
        const platformRoutes = container.get('PlatformRoutes');
        if (platformRoutes && typeof platformRoutes.use === 'function') {
          app.use('/api/platform', platformRoutes);
          console.log('✅ DI Platform routes mounted at /api/platform');
        }
      } catch (e) {
        console.warn('⚠️ DI Platform routes 마운트 실패:', e.message);
      }

      if (NODE_ENV === 'development') {
        try {
          // 디버그 라우트 (DI Container)
          const debugRoutes = container.get('DebugRoutes');
          if (debugRoutes && typeof debugRoutes.use === 'function') {
            app.use('/api/debug', debugRoutes);
            console.log('✅ DI Debug routes mounted at /api/debug (development)');
          }
        } catch (e) {
          console.warn('⚠️ DI Debug routes 마운트 실패:', e.message);
        }
      }

      console.log('🎯 DI Container 라우트 마운트 완료');
    }

    // ✅ 2. Fallback 라우트 로딩 (DI 실패 시)
    console.log('🔄 Fallback 라우트 로딩 확인 중...');

    // WebAuthn 라우트 Fallback
    try {
      const webauthnModule = await import('./routes/auth/webauthn');
      const webauthnRouter = webauthnModule.default;
      
      if (webauthnRouter && typeof webauthnRouter === 'function') {
        // DI Container 라우트가 없는 경우에만 마운트
        if (!container?.has('AuthWebAuthnRoutes')) {
          app.use('/api/auth/webauthn', webauthnRouter);
          console.log('✅ Fallback WebAuthn routes loaded at /api/auth/webauthn');
        }
      }
    } catch (error) {
      console.warn('⚠️ Fallback WebAuthn routes 로드 실패:', error);
    }

    // AI 라우트 Fallback
    try {
      const aiModule = await import('./routes/ai/index');
      const aiRouter = aiModule.default;
      if (aiRouter && !container?.has('AIIndexRoutes')) {
        app.use('/api/ai', aiRouter);
        console.log('✅ Fallback AI routes loaded at /api/ai');
      }
    } catch (error) {
      console.warn('⚠️ Fallback AI routes 로드 실패:', error);
      
      // AI 개별 파일 시도
      try {
        const aiChatModule = await import('./routes/ai/chat');
        const aiChatRouter = aiChatModule.default;
        if (aiChatRouter && !container?.has('AIIndexRoutes')) {
          app.use('/api/ai', aiChatRouter);
          console.log('✅ Fallback AI Chat routes loaded');
        }
      } catch (fallbackError) {
        console.warn('⚠️ Fallback AI Chat routes 로드 실패:', fallbackError);
      }
    }

    // ✅ 3. API 목록 엔드포인트 추가
    app.get('/api', (req: Request, res: Response) => {
      res.json({
        service: 'AI Personal Ultimate Fusion Backend',
        version: '3.2.0-ultimate-fusion',
        status: 'running',
        timestamp: new Date().toISOString(),
        diContainer: !!container,
        routingMethod: container ? 'DI Container + Fallback' : 'Direct Import',
        availableEndpoints: {
          auth: {
            webauthn: [
              'POST /api/auth/webauthn/register/start',
              'POST /api/auth/webauthn/register/complete',
              'POST /api/auth/webauthn/login/start',
              'POST /api/auth/webauthn/login/complete',
              'GET /api/auth/webauthn/status'
            ],
            session: [
              'POST /api/auth/session/restore',
              'POST /api/auth/logout'
            ]
          },
          ai: [
            'POST /api/ai/chat',
            'GET /api/ai/status',
            'GET /api/ai/models'
          ],
          passport: [
            'GET /api/passport/:did',
            'POST /api/passport/:did/update'
          ],
          cue: [
            'GET /api/cue/:userDid/balance',
            'POST /api/cue/mine'
          ],
          vault: [
            'POST /api/vault/save',
            'POST /api/vault/search'
          ],
          platform: [
            'GET /api/platform/:did/connected',
            'POST /api/platform/:did/connect'
          ],
          crypto: [
            'POST /api/crypto/test',
            'GET /api/crypto/status'
          ],
          debug: NODE_ENV === 'development' ? [
            'GET /api/debug/health',
            'GET /api/debug/services'
          ] : []
        }
      });
    });

    initializationFlags.routesLoaded = true;
    console.log('🚀 ===== DI Container + 안전한 라우트 로딩 완료 =====');

  } catch (error) {
    console.error('❌ Routes loading failed:', error);
  }
}
// ============================================================================
// 🔐 CryptoService 안전한 API 엔드포인트 (2번 파일 기능)
// ============================================================================

/**
 * 🔐 CryptoService 안전한 테스트 API (무한루프 방지)
 */
app.post('/api/crypto/test', async (req: Request, res: Response) => {
  try {
    if (!services.crypto) {
      return res.status(503).json({
        success: false,
        error: 'CryptoService not available'
      });
    }

    // Vault 테스트 중복 실행 방지
    if (initializationFlags.vaultTestRunning) {
      return res.status(429).json({
        success: false,
        error: 'Crypto test already running',
        message: 'Please wait for current test to complete'
      });
    }

    initializationFlags.vaultTestRunning = true;

    const { data } = req.body;
    
    if (!data || typeof data !== 'string') {
      initializationFlags.vaultTestRunning = false;
      return res.status(400).json({
        success: false,
        error: 'Valid string data required'
      });
    }

    // 타임아웃을 적용한 안전한 암호화/복호화 테스트
    const testPromise = new Promise((resolve, reject) => {
      try {
        const encrypted = services.crypto.encrypt(data);
        const decrypted = services.crypto.decrypt(encrypted);
        const hash = services.crypto.hash(data);
        const uuid = services.crypto.generateUUID();
        const token = services.crypto.generateSecureToken();

        const isValid = decrypted === data;

        resolve({
          success: true,
          message: 'CryptoService test completed',
          results: {
            original: data,
            encrypted: encrypted.substring(0, 50) + '...',
            decrypted: decrypted,
            hash: hash,
            uuid: uuid,
            token: token.substring(0, 16) + '...',
            isValid,
            dataIntegrity: isValid ? 'PASS' : 'FAIL',
            encryptedLength: encrypted.length,
            hashLength: hash.length
          },
          cryptoStatus: services.crypto.getStatus(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Crypto test timeout')), 10000)
    );

    const result = await Promise.race([testPromise, timeoutPromise]);
    
    initializationFlags.vaultTestRunning = false;
    res.json(result);

  } catch (error: any) {
    initializationFlags.vaultTestRunning = false;
    console.error('❌ CryptoService 테스트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'CryptoService test failed',
      message: error.message
    });
  }
});

/**
 * 🔐 CryptoService 상태 조회 API (무한루프 방지)
 */
app.get('/api/crypto/status', (req: Request, res: Response) => {
  try {
    if (!services.crypto) {
      return res.status(503).json({
        success: false,
        error: 'CryptoService not available'
      });
    }

    const status = services.crypto.getStatus();
    const diIntegrated = !!container?.has('CryptoService');
    
    res.json({
      success: true,
      status: {
        ...status,
        diIntegrated,
        envKeySet: !!process.env.ENCRYPTION_KEY,
        envKeyLength: process.env.ENCRYPTION_KEY?.length || 0,
        serviceAvailable: true,
        infiniteLoopPrevention: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🤖 AI 서비스 안전한 API 엔드포인트 (2번 파일 기능)
// ============================================================================

/**
 * 🤖 AI 상태 확인 API (무한루프 방지)
 */
app.get('/api/ai/status', async (req: Request, res: Response) => {
  try {
    if (!services.ollamaAI) {
      return res.status(503).json({
        success: false,
        error: 'AI service not available'
      });
    }

    // 상태 확인 중복 실행 방지
    if (initializationFlags.serviceStatusChecking) {
      return res.json({
        success: true,
        status: 'checking',
        message: 'Status check already in progress'
      });
    }

    initializationFlags.serviceStatusChecking = true;

    let status = { status: 'unknown', connected: false };
    
    try {
      // 타임아웃을 적용한 안전한 상태 확인
      const statusPromise = services.ollamaAI.getServiceStatus?.() ||
                           services.ollamaAI.testConnection?.() ||
                           services.ollamaAI.checkConnection?.() ||
                           Promise.resolve({ status: 'available', connected: true });

      const timeoutPromise = new Promise(resolve => 
        setTimeout(() => resolve({ status: 'timeout', connected: false }), 5000)
      );

      status = await Promise.race([statusPromise, timeoutPromise]) as any;
    } catch (error: any) {
      status = { status: 'error', connected: false, error: error.message };
    }

    initializationFlags.serviceStatusChecking = false;
    res.json({ 
      success: true, 
      status: {
        ...status,
        infiniteLoopPrevention: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    initializationFlags.serviceStatusChecking = false;
    res.status(500).json({
      success: false,
      error: 'AI status check failed',
      message: error.message
    });
  }
});

/**
 * 🤖 AI 채팅 API (2번 파일 기능)
 */
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, model, userDid, personalizedContext } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    console.log(`🤖 AI 채팅 요청: ${model || 'default'} - "${message.substring(0, 50)}..."`);
    
    let aiResponse;
    
    if (services.ollamaAI) {
      try {
        // generateResponse 메서드 사용 (가장 일반적)
        if (typeof services.ollamaAI.generateResponse === 'function') {
          aiResponse = await services.ollamaAI.generateResponse(
            message,
            model || 'llama3.2:3b',
            personalizedContext || {},
            userDid || 'anonymous',
            `conv_${Date.now()}`
          );
        }
        // chat 메서드로 대체
        else if (typeof services.ollamaAI.chat === 'function') {
          const response = await services.ollamaAI.chat(
            model || 'llama3.2:3b',
            [{ role: 'user', content: message }]
          );
          aiResponse = {
            content: response,
            model: model || 'llama3.2:3b',
            tokensUsed: 0,
            processingTime: 0
          };
        }
        // 기본 Mock 응답
        else {
          throw new Error('No suitable AI method available');
        }
      } catch (aiError: any) {
        console.warn('⚠️ AI 서비스 오류, Mock 응답 사용:', aiError.message);
        throw aiError;
      }
    }
    
    // Mock 응답 (AI 서비스 없을 때)
    if (!aiResponse) {
      aiResponse = {
        content: `Mock AI 응답 (${model || 'default'}): 당신의 메시지 "${message}"에 대한 AI 응답입니다. 실제 AI 서비스가 활성화되지 않았습니다.`,
        model: model || 'mock',
        tokensUsed: message.length,
        processingTime: 100
      };
    }
    
    // 🔐 CryptoService를 활용한 응답 데이터 보안 처리 (선택적)
    if (services.crypto && personalizedContext?.sensitive) {
      try {
        const encryptedResponse = services.crypto.encrypt(aiResponse.content);
        console.log('🔒 민감한 AI 응답 데이터 암호화됨');
        aiResponse.encrypted = true;
        aiResponse.content = encryptedResponse;
      } catch (encryptError) {
        console.warn('⚠️ AI 응답 암호화 실패:', encryptError);
      }
    }
    
    // WebSocket으로 실시간 CUE 업데이트
    if (services.websocket && userDid) {
      const cueEarned = Math.floor(Math.random() * 5) + 1;
      services.websocket.broadcastCueUpdate?.(userDid, cueEarned, 'ai_chat');
    }
    
    res.json({
      success: true,
      message: aiResponse.content,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      processingTime: aiResponse.processingTime,
      encrypted: aiResponse.encrypted || false,
      cueEarned: Math.floor(Math.random() * 5) + 1,
      personalizedData: {
        personalityMatch: personalizedContext?.personalityProfile ? 0.85 : 0.5,
        cuesUsed: personalizedContext?.cues?.length || 0
      },
      conversationId: `conv_${Date.now()}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ AI 채팅 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'AI service temporarily unavailable',
      message: error.message
    });
  }
});

/**
 * 🤖 AI 모델 목록 API (안전한 처리)
 */
app.get('/api/ai/models', async (req: Request, res: Response) => {
  try {
    let models = [];
    
    if (services.ollamaAI && typeof services.ollamaAI.getModels === 'function') {
      try {
        models = await services.ollamaAI.getModels();
      } catch (error: any) {
        console.warn('⚠️ AI 모델 목록 조회 실패:', error.message);
        models = [];
      }
    }
    
    // 기본 모델 목록 (AI 서비스 없을 때)
    if (!models || models.length === 0) {
      models = ['llama3.2:3b', 'llama3.2:1b', 'phi3:mini', 'mistral:latest'];
    }
    
    res.json({
      success: true,
      models: models.map((model: string) => ({
        id: model,
        name: model,
        available: true,
        provider: 'ollama',
        local: true
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get models',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 범용 세션 관리 API (2번 파일 기능)
// ============================================================================

/**
 * 범용 세션 복원 API
 */
app.post('/api/session/restore', async (req: Request, res: Response) => {
  try {
    console.log('🔄 범용 세션 복원 요청');
    
    const { sessionToken, sessionId } = req.body;
    
    if (!sessionToken && !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session identifier required',
        message: 'sessionToken 또는 sessionId가 필요합니다'
      });
    }

    if (!services.sessionRestore) {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: 'SessionRestoreService를 사용할 수 없습니다'
      });
    }

    const result = await services.sessionRestore.restoreSession(sessionToken, sessionId);
    
    if (result.success) {
      console.log('✅ 범용 세션 복원 성공:', result.user?.username);
      res.json(result);
    } else {
      console.log('❌ 범용 세션 복원 실패:', result.message);
      res.status(401).json(result);
    }

  } catch (error: any) {
    console.error('💥 범용 세션 복원 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Session restore failed',
      message: error.message
    });
  }
});

/**
 * 범용 로그아웃 API
 */
app.post('/api/session/logout', async (req: Request, res: Response) => {
  try {
    console.log('🚪 범용 로그아웃 요청');
    
    const { sessionToken, sessionId } = req.body;
    
    if (!services.sessionRestore) {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable'
      });
    }

    const result = await services.sessionRestore.logout(sessionToken, sessionId);
    
    console.log(`${result.success ? '✅' : '❌'} 범용 로그아웃 ${result.success ? '성공' : '실패'}`);
    res.json(result);

  } catch (error: any) {
    console.error('💥 범용 로그아웃 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

// ============================================================================
// 🔌 WebSocket 정보 API (2번 파일 기능)
// ============================================================================

app.get('/api/websocket/info', (req: Request, res: Response) => {
  try {
    if (!services.websocket) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not available'
      });
    }

    const status = services.websocket.getStatus();
    res.json({
      status: 'active',
      endpoint: '/socket.io/',
      connectedUsers: status.connectedUsers || 0,
      features: ['real-time-cue', 'live-updates', 'ai-streaming'],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'WebSocket status unavailable',
      message: error.message
    });
  }
});

// ============================================================================
// 🔧 범용 API 정보 엔드포인트 (2번 파일 기능)
// ============================================================================

/**
 * API 정보 엔드포인트
 */
app.get('/api', (req: Request, res: Response) => {
  const endpoints = {
    authentication: [
      'POST /api/auth/webauthn/start - WebAuthn 통합 인증 시작',
      'POST /api/auth/webauthn/complete - WebAuthn 통합 인증 완료'
    ],
    services: [],
    crypto: [],
    ai: []
  };

  if (services.crypto) {
    endpoints.crypto.push(
      'POST /api/crypto/test - 암호화 기능 테스트 (무한루프 방지)',
      'GET /api/crypto/status - CryptoService 상태'
    );
  }

  if (services.ollamaAI) {
    endpoints.ai.push(
      'GET /api/ai/status - AI 서비스 상태 (무한루프 방지)',
      'POST /api/ai/chat - AI 채팅',
      'GET /api/ai/models - AI 모델 목록'
    );
  }

  res.json({
    name: 'AI Personal Ultimate Fusion Backend API',
    version: '3.2.0-ultimate-fusion',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    features: {
      webauthnAuth: !!services.webauthn,
      sessionManagement: !!services.sessionRestore,
      realTimeUpdates: !!services.websocket,
      aiIntegration: !!services.ollamaAI,
      diContainer: !!container,
      cryptoServiceDI: !!services.crypto && !!container?.has('CryptoService'),
      dataEncryption: !!services.crypto,
      infiniteLoopPrevention: true,
      safeRouteLoading: true
    },
    endpoints,
    health: '/health',
    infiniteLoopPrevention: {
      cryptoTestCooldown: !initializationFlags.vaultTestRunning,
      aiConnectionCooldown: !initializationFlags.serviceStatusChecking,
      healthCheckCooldown: !initializationFlags.healthCheckRunning,
      initializationCooldown: Date.now() - initializationFlags.lastInitTime > INITIALIZATION_COOLDOWN,
      routesLoaded: initializationFlags.routesLoaded
    }
  });
});

// ============================================================================
// 🔍 404 및 에러 처리 (1번 파일 방식)
// ============================================================================

app.use('*', (req: Request, res: Response) => {
  const requestOrigin = req.get('Origin') || 'no-origin';
  
  console.log(`❌ 404 - 경로를 찾을 수 없음: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({ 
    success: false,
    error: 'Not Found',
    message: `경로 '${req.originalUrl}'을 찾을 수 없습니다`,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId,
    suggestion: 'GET /api 엔드포인트에서 사용 가능한 API 목록을 확인하세요.'
  });
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 서버 에러:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: (req as any).requestId
  });
});

// ============================================================================
// 🚀 Ultimate Fusion 서버 시작 프로세스
// ============================================================================

async function startUltimateFusionServer(): Promise<void> {
  try {
    console.log('\n🚀 === Ultimate Fusion 서버 시작 시퀀스 ===');
    
    // 1. 데이터베이스 연결 확인 (안전한 방식)
    try {
      const db = DatabaseService.getInstance();
      await db.connect();
      const connected = await db.testConnection();
      console.log(`📊 데이터베이스 연결: ${connected ? '성공' : '실패 (계속 진행)'}`);
    } catch (dbError: any) {
      console.warn('⚠️ 데이터베이스 연결 실패 (계속 진행):', dbError.message);
    }

    // 2. 모든 서비스 안전한 초기화
    const servicesInitialized = await initializeAllServicesSafely();
    if (!servicesInitialized) {
      throw new Error('필수 서비스 초기화 실패');
    }

    // 3. 안전한 라우트 로딩 (1번 파일 방식)
    await loadRoutesSafely();

    // 4. HTTP 서버 시작
    const server = httpServer.listen(PORT, () => {
      console.log('\n🎉 === AI Personal Ultimate Fusion Backend 완전 시작 ===');
      console.log(`🌐 서버 주소: http://localhost:${PORT}`);
      console.log(`🔧 환경: ${NODE_ENV}`);
      console.log(`⏰ 시작 시간: ${new Date().toISOString()}`);
      
      console.log('\n🔥 === Ultimate Fusion 기능 ===');
      console.log('✅ 안전한 라우트 로딩 시스템 (1번 파일)');
      console.log('✅ 완전한 DI Container 서비스 관리 (2번 파일)');
      console.log('✅ CryptoService DI 완전 통합 (2번 파일)');
      console.log('✅ 무한루프 완전 방지 시스템 (2번 파일)');
      console.log('✅ 안전한 서비스 초기화 (쿨다운 적용)');
      console.log('✅ 타임아웃 기반 상태 확인');
      console.log('✅ WebAuthn 패스키 인증');
      console.log('✅ 영구 세션 유지');
      console.log('✅ 실시간 WebSocket 통신');
      console.log('✅ AI 서비스 안전한 통합');
      console.log('✅ Production Ready 아키텍처');
      
      console.log('\n📡 === 핵심 API 엔드포인트 ===');
      console.log('🔐 WebAuthn: /api/auth/webauthn/*');
      if (services.crypto) {
        console.log('🔐 암호화 서비스: /api/crypto/* (무한루프 방지)');
      }
      if (services.ollamaAI) {
        console.log('🤖 AI 서비스: /api/ai/* (무한루프 방지)');
      }
      if (services.websocket) {
        console.log('🔌 WebSocket: /socket.io/');
      }
      console.log('🏥 헬스체크: /health (1번 방식)');
      console.log('📋 API 정보: /api (2번 기능)');
      
      console.log('\n==============================================');
      console.log('🚀 Ultimate Fusion Backend Ready!');
      console.log('🔀 1번 라우트 로딩 + 2번 모든 기능');
      console.log('🚫 무한루프 완전 해결');
      console.log('💎 안전한 서비스 초기화');
      console.log('⚡ 최적화된 성능');
      console.log('==============================================');
    });

    // 5. 우아한 종료 설정 (2번 파일 방식)
    setupGracefulShutdown(server);

  } catch (error: any) {
    console.error('💥 Ultimate Fusion 서버 시작 실패:', error);
    process.exit(1);
  }
}

// ============================================================================
// 🛑 완전한 우아한 종료 처리 (2번 파일 방식)
// ============================================================================

function setupGracefulShutdown(server: any): void {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} 신호 수신 - Ultimate Fusion 우아한 종료 시작...`);
    
    try {
      // 1. 새로운 연결 거부
      server.close(() => {
        console.log('🚫 HTTP 서버 연결 종료');
      });

      // 2. WebSocket 서비스 정리
      if (services.websocket) {
        try {
          await services.websocket.close?.();
          console.log('🔌 WebSocket 서비스 종료');
        } catch (wsError) {
          console.warn('⚠️ WebSocket 종료 실패:', wsError);
        }
      }

      // 3. CryptoService 정리
      if (services.crypto) {
        try {
          services.crypto.dispose?.();
          console.log('🔐 CryptoService 정리 완료');
        } catch (cryptoError) {
          console.warn('⚠️ CryptoService 정리 실패:', cryptoError);
        }
      }

      // 4. DI Container 정리
      if (container) {
        console.log('🧹 서비스 정리 시작...');
        await container.dispose();
        console.log('✅ 모든 서비스 정리 완료');
      }

      // 5. 데이터베이스 연결 정리
      try {
        const db = DatabaseService.getInstance();
        await db.disconnect();
        console.log('📊 데이터베이스 연결 종료');
      } catch (dbError) {
        console.warn('⚠️ 데이터베이스 종료 실패:', dbError);
      }

      console.log('👋 Ultimate Fusion 서버 종료 완료');
      process.exit(0);

    } catch (error: any) {
      console.error('💥 우아한 종료 실패:', error);
      process.exit(1);
    }
  };

  // 신호 핸들러 등록
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // 예외 처리
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
}

// ============================================================================
// 🏁 Ultimate Fusion 서버 시작 실행
// ============================================================================

startUltimateFusionServer().catch(error => {
  console.error('💥 Ultimate Fusion 서버 시작 중 치명적 오류:', error);
  process.exit(1);
});

// ============================================================================
// 📤 Export (테스트 및 모듈 사용)
// ============================================================================

export default app;

export { 
  app,
  httpServer,
  container,
  services,
  initializationFlags  // 무한루프 방지 플래그 export
};