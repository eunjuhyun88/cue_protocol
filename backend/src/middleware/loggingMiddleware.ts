// ============================================================================
// 📁 backend/src/middleware/loggingMiddleware.ts
// 📝 향상된 로깅 미들웨어 (성능 최적화 + 구조화된 로깅)
// ============================================================================

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// 🔧 타입 정의
// ============================================================================

interface LoggingRequest extends Request {
  startTime?: number;
  requestId?: string;
}

interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  includeHeaders: boolean;
  includeBody: boolean;
  maskSensitiveData: boolean;
  maxBodyLength: number;
  excludePaths: string[];
  includeUserAgent: boolean;
  includeIP: boolean;
}

interface RequestLog {
  requestId: string;
  timestamp: string;
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
  headers?: Record<string, any>;
  body?: any;
  userId?: string;
  userDid?: string;
}

interface ResponseLog extends RequestLog {
  statusCode: number;
  duration: number;
  size?: number;
  error?: any;
}

// ============================================================================
// 🎯 로깅 설정
// ============================================================================

const defaultConfig: LogConfig = {
  level: (process.env.LOG_LEVEL as any) || 'info',
  includeHeaders: process.env.NODE_ENV === 'development',
  includeBody: true,
  maskSensitiveData: true,
  maxBodyLength: 1000,
  excludePaths: ['/health', '/favicon.ico', '/metrics'],
  includeUserAgent: true,
  includeIP: true
};

// ============================================================================
// 🔐 민감정보 마스킹
// ============================================================================

const SENSITIVE_FIELDS = [
  'password', 'token', 'credential', 'privateKey', 'secret', 
  'authorization', 'cookie', 'sessionId', 'apiKey', 'key',
  'x-api-key', 'x-auth-token', 'x-session-id'
];

function maskSensitiveData(obj: any, maxDepth = 3): any {
  if (maxDepth <= 0 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item, maxDepth - 1));
  }

  const masked: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      if (typeof value === 'string' && value.length > 0) {
        masked[key] = `[MASKED:${value.length}chars]`;
      } else {
        masked[key] = '[MASKED]';
      }
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value, maxDepth - 1);
    } else if (typeof value === 'string' && value.length > 200) {
      masked[key] = value.substring(0, 200) + '...[TRUNCATED]';
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

// ============================================================================
// 🔄 요청 ID 생성
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// 📊 구조화된 로그 출력
// ============================================================================

function logStructured(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...data
  };

  switch (level) {
    case 'error':
      console.error(`🔴 [${timestamp}] ${message}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
      break;
    case 'warn':
      console.warn(`🟡 [${timestamp}] ${message}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(`🔍 [${timestamp}] ${message}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
      }
      break;
    default:
      console.log(`🌐 [${timestamp}] ${message}`, data ? '\n' + JSON.stringify(data, null, 2) : '');
  }
}

// ============================================================================
// 📝 메인 로깅 미들웨어
// ============================================================================

export const loggingMiddleware = (config: Partial<LogConfig> = {}) => {
  const cfg = { ...defaultConfig, ...config };
  
  return (req: LoggingRequest, res: Response, next: NextFunction) => {
    // 제외 경로 확인
    if (cfg.excludePaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    // 요청 ID 및 시작 시간 설정
    req.requestId = generateRequestId();
    req.startTime = Date.now();
    
    // 요청 로그 데이터 구성
    const requestLog: RequestLog = {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl
    };

    // 선택적 정보 추가
    if (cfg.includeIP) {
      requestLog.ip = req.ip || req.connection.remoteAddress || 'unknown';
    }

    if (cfg.includeUserAgent) {
      const userAgent = req.get('User-Agent');
      if (userAgent) {
        requestLog.userAgent = userAgent.substring(0, 100);
      }
    }

    if (cfg.includeHeaders && Object.keys(req.headers).length > 0) {
      requestLog.headers = cfg.maskSensitiveData 
        ? maskSensitiveData(req.headers) 
        : req.headers;
    }

    if (cfg.includeBody && req.body && Object.keys(req.body).length > 0) {
      requestLog.body = cfg.maskSensitiveData 
        ? maskSensitiveData(req.body) 
        : req.body;
    }

    // 사용자 정보 추가 (인증 미들웨어 이후 실행 시)
    const user = (req as any).user;
    if (user) {
      requestLog.userId = user.id;
      requestLog.userDid = user.did;
    }

    // 요청 로그 출력
    logStructured('info', `➡️  ${req.method} ${req.originalUrl}`, {
      request: requestLog
    });

    // 응답 완료 시 로깅을 위한 이벤트 리스너
    res.on('finish', () => {
      const duration = req.startTime ? Date.now() - req.startTime : 0;
      const statusCode = res.statusCode;
      
      const responseLog: ResponseLog = {
        ...requestLog,
        statusCode,
        duration,
        size: res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : undefined
      };

      // 상태 코드에 따른 로그 레벨 결정
      let logLevel = 'info';
      let emoji = '✅';
      
      if (statusCode >= 500) {
        logLevel = 'error';
        emoji = '❌';
      } else if (statusCode >= 400) {
        logLevel = 'warn';
        emoji = '⚠️';
      }

      logStructured(logLevel, `${emoji} ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`, {
        response: responseLog
      });
    });

    // 에러 발생 시 로깅
    res.on('error', (error) => {
      const duration = req.startTime ? Date.now() - req.startTime : 0;
      
      logStructured('error', `💥 ${req.method} ${req.originalUrl} - ERROR (${duration}ms)`, {
        requestId: req.requestId,
        error: {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5),
          name: error.name
        }
      });
    });

    next();
  };
};

// ============================================================================
// 🚨 에러 로깅 미들웨어 (개선됨)
// ============================================================================

export const errorLoggingMiddleware = (error: any, req: LoggingRequest, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  
  // 에러 세부 정보 구성
  const errorDetails = {
    requestId: req.requestId || 'unknown',
    timestamp,
    method: req.method,
    url: req.originalUrl,
    duration,
    error: {
      name: error.name || 'UnknownError',
      message: error.message || 'No error message',
      status: error.status || error.statusCode || 500,
      stack: error.stack?.split('\n').slice(0, 10) || [],
      code: error.code,
      details: error.details
    },
    user: (req as any).user ? {
      id: (req as any).user.id,
      did: (req as any).user.did
    } : null,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  };

  // 에러 타입에 따른 로그 레벨 결정
  const isClientError = error.status >= 400 && error.status < 500;
  const logLevel = isClientError ? 'warn' : 'error';
  
  logStructured(logLevel, `💥 ${req.method} ${req.originalUrl} - ${error.name}`, {
    error: errorDetails
  });

  // 개발 환경에서는 더 상세한 정보 출력
  if (process.env.NODE_ENV === 'development') {
    console.error('\n🔍 개발 모드 상세 에러 정보:');
    console.error('Stack trace:', error.stack);
    if (req.body && Object.keys(req.body).length > 0) {
      console.error('Request body:', maskSensitiveData(req.body));
    }
  }

  next(error);
};

// ============================================================================
// 🎯 성능 모니터링 미들웨어
// ============================================================================

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  slowRequestThreshold: number;
  slowRequestCount: number;
  lastReset: Date;
}

const performanceMetrics: PerformanceMetrics = {
  requestCount: 0,
  averageResponseTime: 0,
  errorCount: 0,
  slowRequestThreshold: 1000, // 1초
  slowRequestCount: 0,
  lastReset: new Date()
};

export const performanceLoggingMiddleware = (req: LoggingRequest, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime!;
    
    // 메트릭 업데이트
    performanceMetrics.requestCount++;
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime * (performanceMetrics.requestCount - 1) + duration) / 
      performanceMetrics.requestCount;
    
    if (res.statusCode >= 400) {
      performanceMetrics.errorCount++;
    }
    
    if (duration > performanceMetrics.slowRequestThreshold) {
      performanceMetrics.slowRequestCount++;
      logStructured('warn', `🐌 Slow request detected: ${req.method} ${req.originalUrl} (${duration}ms)`, {
        requestId: req.requestId,
        duration,
        threshold: performanceMetrics.slowRequestThreshold
      });
    }
  });
  
  next();
};

// ============================================================================
// 📊 메트릭 조회 함수
// ============================================================================

export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...performanceMetrics };
}

export function resetPerformanceMetrics(): void {
  performanceMetrics.requestCount = 0;
  performanceMetrics.averageResponseTime = 0;
  performanceMetrics.errorCount = 0;
  performanceMetrics.slowRequestCount = 0;
  performanceMetrics.lastReset = new Date();
}

// ============================================================================
// 🚀 기본 설정 Export
// ============================================================================

// 기본 로깅 미들웨어 (이전 버전과 호환)
export const defaultLoggingMiddleware = loggingMiddleware();

// 개발용 상세 로깅
export const developmentLoggingMiddleware = loggingMiddleware({
  level: 'debug',
  includeHeaders: true,
  includeBody: true,
  maxBodyLength: 2000
});

// 프로덕션용 간소화 로깅
export const productionLoggingMiddleware = loggingMiddleware({
  level: 'info',
  includeHeaders: false,
  includeBody: false,
  excludePaths: ['/health', '/metrics', '/favicon.ico', '/robots.txt']
});

export default loggingMiddleware;