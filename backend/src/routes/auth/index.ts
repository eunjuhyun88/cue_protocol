// ============================================================================
// 📁 backend/src/routes/auth/index.ts
// 🛣️ 통합 Auth 라우터 - 단일 진입점, DI 컨테이너 연동
// ============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { DIContainer } from '../../core/DIContainer';
import { AuthController } from '../../controllers/AuthController';
import { AuthConfig } from '../../config/auth';
import { 
  AuthError, 
  ValidationError, 
  WebAuthnError, 
  SessionError 
} from '../../types/auth.types';

/**
 * 통합 Auth 라우터 생성 함수
 * DI 컨테이너에서 의존성을 가져와서 라우터 구성
 */
export function createAuthRouter(): Router {
  const router = Router();
  
  console.log('🛣️ 통합 Auth 라우터 생성 시작...');
  
  // DI 컨테이너에서 필요한 서비스들 가져오기
  const container = DIContainer.getInstance();
  const config = container.get<AuthConfig>('AuthConfig');
  const authController = container.get<AuthController>('AuthController');
  
  // ============================================================================
  // 🔧 미들웨어 설정
  // ============================================================================
  
  // 요청 로깅 미들웨어
  router.use(requestLoggingMiddleware);
  
  // Rate limiting 설정
  const securityConfig = config.getSecurityConfig();
  const authRateLimit = rateLimit({
    windowMs: securityConfig.rateLimit.windowMs,
    max: securityConfig.rateLimit.maxRequests,
    message: {
      success: false,
      error: 'Too Many Requests',
      message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
      retryAfter: Math.ceil(securityConfig.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  
  // CORS 헤더 설정
  router.use(corsMiddleware(config));
  
  // JSON 파싱 에러 처리
  router.use(jsonParseErrorMiddleware);
  
  // ============================================================================
  // 🔥 통합 WebAuthn 인증 라우트 (메인 API)
  // ============================================================================
  
  /**
   * 통합 인증 시작 - 로그인/가입 자동 판별
   * POST /api/auth/webauthn/start
   */
  router.post('/webauthn/start', 
    authRateLimit,
    validateContentType,
    authController.startUnifiedAuth
  );
  
  /**
   * 통합 인증 완료 - 기존/신규 사용자 자동 처리
   * POST /api/auth/webauthn/complete
   */
  router.post('/webauthn/complete',
    authRateLimit,
    validateContentType,
    authController.completeUnifiedAuth
  );
  
  // ============================================================================
  // 🔧 기존 WebAuthn API (하위 호환성)
  // ============================================================================
  
  /**
   * 회원가입 시작
   * POST /api/auth/webauthn/register/start
   */
  router.post('/webauthn/register/start',
    authRateLimit,
    validateContentType,
    authController.startRegistration
  );
  
  /**
   * 회원가입 완료
   * POST /api/auth/webauthn/register/complete
   */
  router.post('/webauthn/register/complete',
    authRateLimit,
    validateContentType,
    authController.completeRegistration
  );
  
  /**
   * 로그인 시작
   * POST /api/auth/webauthn/login/start
   */
  router.post('/webauthn/login/start',
    authRateLimit,
    validateContentType,
    authController.startLogin
  );
  
  /**
   * 로그인 완료
   * POST /api/auth/webauthn/login/complete
   */
  router.post('/webauthn/login/complete',
    authRateLimit,
    validateContentType,
    authController.completeLogin
  );
  
  // ============================================================================
  // 🔧 세션 관리 라우트
  // ============================================================================
  
  /**
   * 세션 복원
   * POST /api/auth/session/restore
   */
  router.post('/session/restore',
    authRateLimit,
    validateContentType,
    authController.restoreSession
  );
  
  /**
   * 로그아웃
   * POST /api/auth/logout
   */
  router.post('/logout',
    validateContentType,
    authController.logout
  );
  
  // ============================================================================
  // 🔍 상태 확인 & 디버깅 라우트
  // ============================================================================
  
  /**
   * 인증 시스템 상태 확인
   * GET /api/auth/status
   */
  router.get('/status', authController.getAuthStatus);
  
  /**
   * 활성 세션 목록 (개발/관리용)
   * GET /api/auth/sessions
   */
  router.get('/sessions', 
    developmentOnlyMiddleware,
    authController.getSessions
  );
  
  // ============================================================================
  // 📋 API 문서 및 가이드 (개발용)
  // ============================================================================
  
  /**
   * API 가이드 및 문서
   * GET /api/auth/guide
   */
  router.get('/guide', developmentOnlyMiddleware, (req: Request, res: Response) => {
    res.json({
      title: '🔐 통합 Auth API 가이드',
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      
      quickStart: {
        description: '가장 간단한 인증 플로우 (권장)',
        steps: [
          '1. POST /webauthn/start - 통합 인증 시작',
          '2. 브라우저에서 패스키 인증',
          '3. POST /webauthn/complete - 인증 완료 (자동 로그인/가입)',
          '4. sessionToken 받아서 localStorage에 저장',
          '5. 필요시 POST /session/restore로 세션 복원'
        ]
      },

      features: {
        unified: [
          '✅ 통합 인증 API (로그인/가입 자동 판별)',
          '✅ DI 컨테이너 기반 아키텍처',
          '✅ 완전한 타입 안정성',
          '✅ Rate Limiting 및 보안',
          '✅ 상세한 에러 처리',
          '✅ 개발/프로덕션 환경 분리'
        ],
        compatibility: [
          '✅ 기존 API 완전 호환',
          '✅ paste.txt 로직 보존',
          '✅ 프론트엔드 호환성 키',
          '✅ Mock/Supabase 이중 모드'
        ]
      },

      endpoints: {
        unified: {
          'POST /webauthn/start': {
            description: '통합 인증 시작 - 로그인/가입 자동 판별',
            body: { deviceInfo: 'optional object' },
            response: 'WebAuthn options + sessionId'
          },
          'POST /webauthn/complete': {
            description: '통합 인증 완료 - 완전한 사용자 생성/로그인',
            body: { credential: 'WebAuthn credential', sessionId: 'string' },
            response: 'sessionToken + user data + action (login|register)'
          }
        },
        legacy: {
          'POST /webauthn/register/start': '회원가입 시작 (하위 호환)',
          'POST /webauthn/register/complete': '회원가입 완료',
          'POST /webauthn/login/start': '로그인 시작',
          'POST /webauthn/login/complete': '로그인 완료'
        },
        session: {
          'POST /session/restore': {
            description: '세션 복원 (30일 JWT)',
            body: { sessionToken: 'string' },
            response: 'user data + session info'
          },
          'POST /logout': '로그아웃 (세션 무효화)'
        },
        debug: {
          'GET /status': '시스템 상태 확인',
          'GET /sessions': '활성 세션 목록 (개발용)',
          'GET /guide': '이 가이드'
        }
      },

      architecture: {
        pattern: 'Clean Architecture + Dependency Injection',
        services: [
          'AuthService: 사용자 인증 비즈니스 로직',
          'SessionService: JWT 토큰 및 세션 관리',
          'WebAuthnService: 패스키 인증 처리',
          'AuthController: HTTP 요청/응답 처리'
        ],
        benefits: [
          '순환 의존성 완전 해결',
          '테스트 가능한 구조',
          '모듈 간 느슨한 결합',
          '설정 중앙집중화'
        ]
      },

      security: {
        features: [
          'Rate Limiting (100req/15min)',
          'CORS 설정',
          'JWT 토큰 검증',
          'Input 유효성 검사',
          '에러 정보 보안 처리'
        ],
        rateLimits: {
          windowMs: securityConfig.rateLimit.windowMs,
          maxRequests: securityConfig.rateLimit.maxRequests
        }
      },

      examples: {
        quickAuth: {
          step1: 'POST /webauthn/start',
          step2: 'navigator.credentials.create(options)',
          step3: 'POST /webauthn/complete',
          result: 'sessionToken + user data'
        },
        sessionRestore: {
          request: 'POST /session/restore { sessionToken }',
          response: 'user data if valid'
        }
      }
    });
  });
  
  // ============================================================================
  // 🚨 에러 처리 미들웨어 (라우터 레벨)
  // ============================================================================
  
  router.use(authErrorHandler);
  
  console.log('✅ 통합 Auth 라우터 생성 완료');
  console.log(`📊 등록된 라우트: ${router.stack.length}개`);
  
  return router;
}

// ============================================================================
// 🔧 미들웨어 함수들
// ============================================================================

/**
 * 요청 로깅 미들웨어
 */
function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  console.log(`🌐 ${req.method} ${req.path} - ${req.ip}`);
  
  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${statusColor} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
}

/**
 * CORS 미들웨어
 */
function corsMiddleware(config: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const securityConfig = config.getSecurityConfig();
    const origin = req.get('Origin');
    
    // 허용된 Origin인지 확인
    if (origin && securityConfig.allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24시간
    
    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  };
}

/**
 * Content-Type 검증 미들웨어
 */
function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST' && !req.is('application/json')) {
    res.status(400).json({
      success: false,
      error: 'Invalid Content-Type',
      message: 'Content-Type must be application/json',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
}

/**
 * JSON 파싱 에러 처리 미들웨어
 */
function jsonParseErrorMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST') {
    // Body가 이미 파싱되었는지 확인
    if (req.body === undefined) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON',
        timestamp: new Date().toISOString()
      });
      return;
    }
  }
  
  next();
}

/**
 * 개발 환경 전용 미들웨어
 */
function developmentOnlyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'development') {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'This endpoint is only available in development mode',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
}

/**
 * Auth 관련 에러 처리 미들웨어
 */
function authErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('🚨 Auth Router Error:', err);
  
  // 에러 타입별 처리
  if (err instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      field: err.field,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (err instanceof SessionError) {
    res.status(401).json({
      success: false,
      error: 'Session Error',
      message: err.message,
      reason: err.reason,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (err instanceof WebAuthnError) {
    res.status(400).json({
      success: false,
      error: 'WebAuthn Error',
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({
      success: false,
      error: 'Authentication Error',
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // 일반 에러 처리
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : '서버 오류가 발생했습니다',
    timestamp: new Date().toISOString(),
    stack: isDevelopment ? err.stack : undefined
  });
}

// ============================================================================
// 📁 backend/src/routes/index.ts
// 🚀 메인 라우터 - 모든 라우트 통합
// ============================================================================

/**
 * 메인 라우터 생성 함수
 * 모든 라우트를 통합하여 Express 앱에 연결
 */
export function createMainRouter(): Router {
  const mainRouter = Router();
  
  console.log('🚀 메인 라우터 생성 시작...');
  
  // ============================================================================
  // 🔐 Auth 라우트 연결
  // ============================================================================
  
  const authRouter = createAuthRouter();
  mainRouter.use('/auth', authRouter);
  
  // ============================================================================
  // 🏥 헬스체크 라우트
  // ============================================================================
  
  mainRouter.get('/health', (req: Request, res: Response) => {
    const container = DIContainer.getInstance();
    
    try {
      // DI 컨테이너 상태 확인
      const diStatus = container.getStatus();
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        services: {
          diContainer: {
            initialized: true,
            services: diStatus.totalServices,
            initialized_services: diStatus.initializedServices
          }
        },
        version: '2.0.0'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // ============================================================================
  // 📋 API 정보 라우트
  // ============================================================================
  
  mainRouter.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'AI Personal Backend API',
      version: '2.0.0',
      description: 'Clean Architecture + DI Container 기반 백엔드',
      documentation: {
        auth: '/api/auth/guide',
        health: '/api/health'
      },
      features: [
        '🔐 WebAuthn 패스키 인증',
        '🏗️ Clean Architecture',
        '🔧 Dependency Injection',
        '💾 Mock/Supabase 이중 모드',
        '🛡️ 보안 미들웨어',
        '📊 상세한 로깅'
      ],
      timestamp: new Date().toISOString()
    });
  });
  
  // ============================================================================
  // 🚫 404 처리
  // ============================================================================
  
  mainRouter.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
      availableRoutes: {
        auth: '/api/auth/*',
        health: '/api/health',
        root: '/api/'
      },
      timestamp: new Date().toISOString()
    });
  });
  
  console.log('✅ 메인 라우터 생성 완료');
  
  return mainRouter;
}

// ============================================================================
// 📁 backend/src/app.ts에서 사용할 Express 앱 설정
// ============================================================================

/**
 * Express 앱 설정 함수
 * DI 컨테이너 초기화 및 라우터 연결
 */
export function createExpressApp(): any {
  const express = require('express');
  const app = express();
  
  console.log('🚀 Express 앱 설정 시작...');
  
  // ============================================================================
  // 🔧 기본 미들웨어 설정
  // ============================================================================
  
  // JSON 파싱 (크기 제한 포함)
  app.use(express.json({ 
    limit: '10mb',
    type: 'application/json'
  }));
  
  // URL 인코딩
  app.use(express.urlencoded({ 
    extended: true,
    limit: '10mb'
  }));
  
  // 신뢰할 수 있는 프록시 설정 (Nginx, CloudFlare 등)
  app.set('trust proxy', true);
  
  // ============================================================================
  // 🔗 라우터 연결
  // ============================================================================
  
  const mainRouter = createMainRouter();
  app.use('/api', mainRouter);
  
  // ============================================================================
  // 🌐 루트 라우트
  // ============================================================================
  
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: '🚀 AI Personal Backend is running!',
      version: '2.0.0',
      api: '/api',
      documentation: '/api/auth/guide',
      health: '/api/health',
      timestamp: new Date().toISOString()
    });
  });
  
  // ============================================================================
  // 🚨 글로벌 에러 처리
  // ============================================================================
  
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('🚨 글로벌 에러:', err);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
      success: false,
      error: 'Internal Server Error',
      message: isDevelopment ? err.message : '서버 오류가 발생했습니다',
      timestamp: new Date().toISOString(),
      stack: isDevelopment ? err.stack : undefined
    });
  });
  
  console.log('✅ Express 앱 설정 완료');
  
  return app;
}

// ============================================================================
// 📤 Exports
// ============================================================================

export { createAuthRouter, createMainRouter, createExpressApp };

// 기본 export (기존 코드와의 호환성)
export default createExpressApp;