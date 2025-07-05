// ============================================================================
// 🚀 AI Personal Express 앱 (DI Container 기반 완전 개선)
// 파일: backend/src/app.ts
// 용도: Express 서버 + DI Container 통합 시스템
// 수정 위치: backend/src/app.ts (기존 파일 교체)
// ============================================================================

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// 환경변수 우선 로딩
dotenv.config();

console.log('🚀 AI Personal Express 앱 초기화 (DI Container 유지)...');
console.log('🔧 초기화 문제 해결된 버전');

// Express 앱 생성
const app: Application = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// 🔧 환경변수 검증
// ============================================================================

console.log('🔧 환경변수 상태:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${PORT}`);
console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ 설정됨' : '❌ 미설정'}`);
console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ 설정됨' : '❌ 미설정'}`);

// ============================================================================
// 🛡️ 기본 보안 설정
// ============================================================================

// Helmet 보안 (CORS 간섭 방지)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

// CORS 설정 (개발 환경 최적화)
app.use(cors({
  origin: true, // 모든 오리진 허용 (개발용)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
    'Authorization', 'Cache-Control', 'Pragma', 'X-Request-ID'
  ],
  exposedHeaders: ['Set-Cookie', 'X-Request-ID'],
  maxAge: 86400
}));

// JSON 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// 🔧 미들웨어 로딩 (안전한 방식)
// ============================================================================

let middleware: any = {};

try {
  console.log('🔧 미들웨어 로딩 중...');
  middleware = require('./middleware/index');
  console.log('✅ 미들웨어 로딩 성공');
} catch (error: any) {
  console.warn('⚠️ 미들웨어 로딩 실패, 기본 미들웨어 사용:', error.message);
  
  // Fallback 미들웨어
  middleware = {
    requestLogger: (req: Request, res: Response, next: NextFunction) => {
      console.log(`📝 ${req.method} ${req.originalUrl}`);
      next();
    },
    errorHandler: (error: any, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ 에러:', error.message);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Internal server error' 
      });
    },
    notFoundHandler: (req: Request, res: Response) => {
      res.status(404).json({ 
        success: false, 
        error: 'Not found' 
      });
    }
  };
}

// 요청 로깅
if (middleware.requestLogger) {
  app.use(middleware.requestLogger);
}

console.log('✅ 미들웨어 설정 완료');

// ============================================================================
// 🏥 기본 라우트
// ============================================================================

// 헬스 체크
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'AI Personal Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    diContainer: {
      status: 'background_initialization',
      note: 'DI Container는 백그라운드에서 초기화됩니다'
    }
  });
});

// 루트 경로
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '🚀 AI Personal Backend Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      ai: '/api/ai/*', 
      cue: '/api/cue/*',
      passport: '/api/passport/*',
      vault: '/api/vault/*'
    },
    timestamp: new Date().toISOString()
  });
});

console.log('✅ 기본 라우트 설정 완료');

// ============================================================================
// 🔧 DI Container 백그라운드 초기화
// ============================================================================

let diContainer: any = null;
let diInitialized = false;

async function initializeDIContainer() {
  try {
    console.log('🔄 DI Container 백그라운드 초기화 시작...');
    
    const { initializeDI, connectDIRouters } = require('./core/DIContainer');
    
    // DI Container 초기화
    diContainer = await initializeDI();
    
    // 라우터 연결
    const connectionResult = await connectDIRouters(app, diContainer);
    console.log(`📋 라우터 연결 결과: ${connectionResult.connectedCount}개 성공, ${connectionResult.failedCount}개 실패`);
    
    diInitialized = true;
    console.log('✅ DI Container 백그라운드 초기화 완료');
    
  } catch (error: any) {
    console.error('❌ DI Container 초기화 실패:', error.message);
    
    // DI Container 없이도 기본 API 동작하도록 Fallback 라우트 설정
    setupFallbackRoutes();
  }
}

// ============================================================================
// 🔄 Fallback 라우트 (DI Container 실패 시)
// ============================================================================

function setupFallbackRoutes() {
  console.log('🔄 Fallback 라우트 설정 중...');

  // WebAuthn 기본 응답
  app.post('/api/auth/webauthn/register/start', (req: Request, res: Response) => {
    res.json({
      success: false,
      error: 'WebAuthn service initializing',
      message: 'DI Container 초기화 중입니다. 잠시 후 다시 시도해주세요.'
    });
  });

  // AI 채팅 기본 응답  
  app.post('/api/ai/chat', (req: Request, res: Response) => {
    res.json({
      success: false,
      error: 'AI service initializing',
      message: 'AI 서비스 초기화 중입니다. 잠시 후 다시 시도해주세요.'
    });
  });

  // CUE 잔액 기본 응답
  app.get('/api/cue/balance/:did', (req: Request, res: Response) => {
    res.json({
      success: false,
      error: 'CUE service initializing',
      message: 'CUE 서비스 초기화 중입니다. 잠시 후 다시 시도해주세요.'
    });
  });

  // Passport 기본 응답
  app.get('/api/passport/:did', (req: Request, res: Response) => {
    res.json({
      success: false,
      error: 'Passport service initializing',
      message: 'Passport 서비스 초기화 중입니다. 잠시 후 다시 시도해주세요.'
    });
  });

  console.log('✅ Fallback 라우트 설정 완료');
}

// ============================================================================
// 🔧 DI Container 상태 확인 API
// ============================================================================

app.get('/api/di/status', (req: Request, res: Response) => {
  if (!diInitialized || !diContainer) {
    res.json({
      success: false,
      status: 'initializing',
      message: 'DI Container 초기화 중입니다',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const status = diContainer.getStatus();
    res.json({
      success: true,
      status: 'initialized',
      container: status,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'DI Container 상태 조회 실패',
      message: error.message
    });
  }
});

// ============================================================================
// 🚫 에러 핸들링
// ============================================================================

// 404 핸들러
app.use('*', (req: Request, res: Response) => {
  if (middleware.notFoundHandler) {
    middleware.notFoundHandler(req, res);
  } else {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
});

// 에러 핸들러
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (middleware.errorHandler) {
    middleware.errorHandler(error, req, res, next);
  } else {
    console.error('❌ 서버 에러:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// 🚀 서버 시작
// ============================================================================

async function startServer() {
  try {
    console.log('🚀 === 서버 시작 (DI Container와 분리) ===');
    
    // Express 서버 시작
    const server = app.listen(PORT, () => {
      console.log('✅ === 서버 시작 완료 ===');
      console.log(`📡 서버 주소: http://localhost:${PORT}`);
      console.log(`🏥 헬스 체크: http://localhost:${PORT}/health`);
      console.log(`🔧 DI 상태: http://localhost:${PORT}/api/di/status`);
      console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
      console.log('🔧 DI Container는 백그라운드에서 초기화됩니다.');
      console.log('');
      console.log('🚀 ===========================');
    });

    // 백그라운드에서 DI Container 초기화
    initializeDIContainer();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM 수신, 서버 종료 중...');
      server.close(() => {
        console.log('✅ 서버 종료 완료');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT 수신, 서버 종료 중...');
      server.close(() => {
        console.log('✅ 서버 종료 완료');
        process.exit(0);
      });
    });

  } catch (error: any) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 전역 에러 핸들러 설정
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 처리되지 않은 Promise 거부:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('🚨 처리되지 않은 예외:', error);
  process.exit(1);
});

// 서버 시작
startServer();

export default app;