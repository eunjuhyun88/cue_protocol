// ============================================================================
// 🚨 완전 개선된 에러 핸들러 미들웨어 (프로덕션 대응)
// 파일: backend/src/middleware/errorHandler.ts
// 용도: 모든 에러 처리 + 로깅 + DI Container 연동
// 수정 위치: backend/src/middleware/errorHandler.ts (기존 파일 교체)
// ============================================================================

import { Request, Response, NextFunction } from 'express';

/**
 * 커스텀 에러 인터페이스
 */
export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

/**
 * 에러 로그 인터페이스
 */
interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  request: {
    method: string;
    url: string;
    headers: any;
    body?: any;
    params?: any;
    query?: any;
  };
  user?: {
    id?: string;
    did?: string;
    ip?: string;
  };
  environment: string;
}

/**
 * 비동기 함수 래퍼 (에러 자동 처리)
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 에러 상세 정보 추출
 */
const extractErrorDetails = (error: any): { type: string; details: any } => {
  // Database errors
  if (error.code === 'ECONNREFUSED') {
    return {
      type: 'DATABASE_CONNECTION_ERROR',
      details: { message: '데이터베이스 연결 실패' }
    };
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return {
      type: 'VALIDATION_ERROR',
      details: { fields: error.errors || {} }
    };
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return {
      type: 'JWT_ERROR',
      details: { message: '유효하지 않은 토큰' }
    };
  }

  // WebAuthn errors
  if (error.message?.includes('webauthn')) {
    return {
      type: 'WEBAUTHN_ERROR',
      details: { message: 'WebAuthn 인증 오류' }
    };
  }

  // DI Container errors
  if (error.message?.includes('DI') || error.message?.includes('Container')) {
    return {
      type: 'DI_CONTAINER_ERROR',
      details: { message: '의존성 주입 컨테이너 오류' }
    };
  }

  // AI service errors
  if (error.message?.includes('Ollama') || error.message?.includes('AI')) {
    return {
      type: 'AI_SERVICE_ERROR',
      details: { message: 'AI 서비스 연결 오류' }
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    details: { message: error.message || 'Unknown error occurred' }
  };
};

/**
 * 에러 로그 생성
 */
const createErrorLog = (error: any, req: Request): ErrorLog => {
  const errorDetails = extractErrorDetails(error);
  
  return {
    timestamp: new Date().toISOString(),
    level: error.statusCode >= 500 ? 'error' : 'warn',
    message: error.message || 'Unknown error',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: {
        'user-agent': req.get('user-agent'),
        'origin': req.get('origin'),
        'referer': req.get('referer')
      },
      body: req.body,
      params: req.params,
      query: req.query
    },
    user: {
      id: (req as any).user?.id,
      did: (req as any).user?.did,
      ip: req.ip || req.connection.remoteAddress
    },
    environment: process.env.NODE_ENV || 'development'
  };
};

/**
 * 에러 응답 생성
 */
const createErrorResponse = (error: any, req: Request) => {
  const errorDetails = extractErrorDetails(error);
  const statusCode = error.statusCode || 500;
  
  const baseResponse = {
    success: false,
    error: {
      type: errorDetails.type,
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  };

  // Development 환경에서만 상세 정보 포함
  if (process.env.NODE_ENV === 'development') {
    return {
      ...baseResponse,
      error: {
        ...baseResponse.error,
        stack: error.stack,
        details: errorDetails.details,
        rawError: error
      }
    };
  }

  // Production 환경에서는 민감한 정보 제거
  if (statusCode >= 500) {
    return {
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: 'Internal server error'
      }
    };
  }

  return baseResponse;
};

/**
 * 메인 에러 핸들러 미들웨어
 */
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 이미 응답이 전송된 경우 Express의 기본 에러 핸들러로 위임
  if (res.headersSent) {
    return next(error);
  }

  // 에러 로그 생성 및 출력
  const errorLog = createErrorLog(error, req);
  
  // 에러 레벨에 따른 로깅
  if (errorLog.level === 'error') {
    console.error('🚨 서버 에러:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      timestamp: errorLog.timestamp,
      user: errorLog.user
    });
  } else {
    console.warn('⚠️ 경고:', {
      message: error.message,
      url: req.originalUrl,
      method: req.method,
      timestamp: errorLog.timestamp
    });
  }

  // HTTP 상태 코드 결정
  const statusCode = error.statusCode || 500;

  // 에러 응답 생성 및 전송
  const errorResponse = createErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);

  // 심각한 에러의 경우 추가 처리
  if (statusCode >= 500) {
    // 여기에 에러 리포팅 서비스 연동 가능 (Sentry, LogRocket 등)
    console.error('💥 심각한 서버 에러 - 관리자 알림 필요');
  }
};

/**
 * 404 Not Found 핸들러
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  console.log(`❌ 404 - 찾을 수 없는 경로: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: 'API endpoint not found',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: [
        'GET /health',
        'POST /api/auth/webauthn/register/start',
        'POST /api/auth/webauthn/register/complete',
        'POST /api/auth/webauthn/login/start',
        'POST /api/auth/webauthn/login/complete',
        'POST /api/ai/chat',
        'GET /api/cue/balance/:did',
        'GET /api/passport/:did',
        'POST /api/vault/save',
        'POST /api/vault/search'
      ]
    }
  });
};

/**
 * 처리되지 않은 Promise 거부 핸들러
 */
export const setupGlobalErrorHandlers = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🚨 처리되지 않은 Promise 거부:', reason);
    console.error('Promise:', promise);
    
    // 서버를 graceful하게 종료
    process.exit(1);
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 처리되지 않은 예외:', error);
    
    // 서버를 graceful하게 종료
    process.exit(1);
  });
};

/**
 * 요청 로깅 미들웨어
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? '🔴' : 
                       res.statusCode >= 400 ? '🟡' : '🟢';
    
    console.log(
      `${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });
  
  next();
};

/**
 * DI Container 에러 복구 헬퍼
 */
export const handleDIContainerError = (error: any): void => {
  console.error('💥 DI Container 에러:', error.message);
  
  // DI Container 상태 확인 및 복구 시도
  try {
    const { DIContainer } = require('../core/DIContainer');
    const container = DIContainer.getInstance();
    
    console.log('🔄 DI Container 상태 확인 중...');
    const status = container.getStatus();
    
    if (status.health.status !== 'healthy') {
      console.log('⚠️ DI Container 상태 불량, 재초기화 시도...');
      container.reset();
    }
  } catch (recoveryError: any) {
    console.error('❌ DI Container 복구 실패:', recoveryError.message);
  }
};

/**
 * 기본 export (호환성)
 */
export default {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  requestLogger,
  setupGlobalErrorHandlers,
  handleDIContainerError
};