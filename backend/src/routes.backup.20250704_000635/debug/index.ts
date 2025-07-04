// ============================================================================
// 📁 backend/src/routes/debug/index.ts
// 🔍 디버깅 및 모니터링 API 라우트
// ============================================================================

import express, { Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { SupabaseService } from '../../services/database/SupabaseService';

const router = express.Router();

// 데이터베이스 서비스 선택
const db = process.env.USE_MOCK_DATABASE === 'true' || 
          !process.env.SUPABASE_URL || 
          process.env.SUPABASE_URL.includes('dummy')
  ? DatabaseService.getInstance()
  : SupabaseService.getInstance();

// ============================================================================
// 🔍 서버 통계 변수
// ============================================================================

let debugStats = {
  startTime: Date.now(),
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: {} as Record<string, number>
  },
  authentication: {
    attempts: 0,
    successes: 0,
    failures: 0,
    tokenValidations: 0
  },
  errors: {
    jwtMalformed: 0,
    unauthorized: 0,
    serverErrors: 0
  }
};

// ============================================================================
// 🔍 기본 디버그 정보 API
// ============================================================================

/**
 * GET /api/debug
 * 기본 디버그 정보 제공
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '🔍 Debug API Center',
    version: '2.1.0-enhanced',
    availableEndpoints: {
      token: 'GET /api/debug/token - JWT 토큰 분석',
      session: 'GET /api/debug/session - 세션 상태 분석',
      stats: 'GET /api/debug/stats - 성능 통계',
      system: 'GET /api/debug/system - 시스템 상태',
      logs: 'GET /api/debug/logs - 실시간 로그 (개발 환경)',
      analyzeToken: 'POST /api/debug/analyze-token - 심층 토큰 분석'
    },
    quickHelp: {
      jwtIssues: 'JWT 문제 시 /api/debug/token 사용',
      sessionIssues: '세션 문제 시 /api/debug/session 사용',
      performance: '성능 확인은 /api/debug/stats 사용',
      systemHealth: '시스템 상태는 /api/debug/system 사용'
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🔍 JWT 토큰 기본 분석 API
// ============================================================================

/**
 * GET /api/debug/token
 * JWT 토큰 기본 분석
 */
router.get('/token', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.json({
      success: false,
      message: 'No authorization header provided',
      expected: 'Bearer <JWT_TOKEN>',
      help: '요청 헤더에 "Authorization: Bearer <token>"을 포함해주세요'
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  
  res.json({
    success: true,
    tokenAnalysis: {
      provided: !!token,
      length: token.length,
      format: {
        hasBearerPrefix: authHeader.startsWith('Bearer '),
        partsCount: parts.length,
        expectedParts: 3,
        isValidFormat: parts.length === 3 && parts.every(p => p.length > 0)
      },
      parts: {
        header: parts[0]?.length || 0,
        payload: parts[1]?.length || 0,
        signature: parts[2]?.length || 0
      }
    },
    recommendations: parts.length !== 3 ? [
      'JWT should have exactly 3 parts separated by dots',
      'Check token generation on frontend',
      'Verify WebAuthn registration process'
    ] : [
      'Token format looks correct',
      'Try the session restore endpoint if authentication fails'
    ],
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🔍 세션 상태 분석 API
// ============================================================================

/**
 * GET /api/debug/session
 * 세션 상태 상세 분석
 */
router.get('/session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const sessionId = req.headers['x-session-id'] as string;
  
  const analysis = {
    timestamp: new Date().toISOString(),
    headers: {
      authorization: {
        present: !!authHeader,
        format: authHeader ? (authHeader.startsWith('Bearer ') ? 'Bearer' : 'Other') : 'Missing',
        length: authHeader?.length || 0,
        preview: authHeader?.substring(0, 30) + '...' || 'None'
      },
      sessionId: {
        present: !!sessionId,
        length: sessionId?.length || 0,
        preview: sessionId?.substring(0, 20) + '...' || 'None'
      }
    },
    recommendations: [] as string[]
  };

  // 분석 및 권장사항
  if (!authHeader && !sessionId) {
    analysis.recommendations.push('Authentication header required: "Authorization: Bearer <JWT>"');
    analysis.recommendations.push('Or provide X-Session-Id header');
  }

  if (authHeader && !authHeader.startsWith('Bearer ')) {
    analysis.recommendations.push('Authorization header should start with "Bearer "');
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      analysis.recommendations.push(`JWT should have 3 parts, found ${parts.length}`);
    }
    
    if (token.includes('force_token')) {
      analysis.recommendations.push('Invalid token detected - register/login again');
    }
  }

  res.json({
    success: true,
    sessionAnalysis: analysis,
    nextSteps: analysis.recommendations.length > 0 ? 
      analysis.recommendations : 
      ['Session format looks correct', 'Try authentication endpoints']
  });
});

// ============================================================================
// 🔍 성능 통계 API
// ============================================================================

/**
 * GET /api/debug/stats
 * 서버 성능 통계 제공
 */
router.get('/stats', (req: Request, res: Response) => {
  const uptime = Date.now() - debugStats.startTime;
  const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
  
  res.json({
    success: true,
    serverStats: {
      ...debugStats,
      uptime: {
        milliseconds: uptime,
        hours: uptimeHours,
        formatted: `${Math.floor(uptime / (1000 * 60 * 60))}h ${Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))}m`
      },
      performance: {
        requestsPerHour: debugStats.requests.total > 0 ? 
          (debugStats.requests.total / (uptime / (1000 * 60 * 60))).toFixed(2) : '0',
        successRate: debugStats.requests.total > 0 ? 
          (debugStats.requests.successful / debugStats.requests.total * 100).toFixed(2) + '%' : '0%',
        authSuccessRate: debugStats.authentication.attempts > 0 ? 
          (debugStats.authentication.successes / debugStats.authentication.attempts * 100).toFixed(2) + '%' : '0%',
        errorRate: debugStats.requests.total > 0 ? 
          (debugStats.requests.failed / debugStats.requests.total * 100).toFixed(2) + '%' : '0%'
      }
    },
    topEndpoints: Object.entries(debugStats.requests.byEndpoint)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, requests: count })),
    recommendations: generatePerformanceRecommendations(debugStats),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🔍 시스템 종합 상태 API
// ============================================================================

/**
 * GET /api/debug/system
 * 시스템 종합 상태 분석
 */
router.get('/system', async (req: Request, res: Response) => {
  try {
    const systemInfo = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      },
      application: {
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3001,
        baseURL: `http://localhost:${process.env.PORT || 3001}`,
        jwtConfigured: !!process.env.JWT_SECRET
      },
      database: {
        type: 'supabase',
        configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        connectionStatus: 'checking'
      },
      features: {
        webauthn: true,
        jwtEnhanced: true,
        sessionRestore: true,
        debugAPIs: true,
        errorTracking: true,
        performanceMonitoring: true
      },
      statistics: debugStats,
      healthChecks: {
        lastHealthCheck: new Date().toISOString(),
        status: 'healthy'
      }
    };

    // 데이터베이스 연결 확인 시도
    try {
      if (db && typeof db.runDiagnostics === 'function') {
        await db.runDiagnostics();
        systemInfo.database.connectionStatus = 'connected';
      } else {
        systemInfo.database.connectionStatus = 'mock';
      }
    } catch (dbError) {
      systemInfo.database.connectionStatus = 'error';
    }

    res.json({
      success: true,
      systemInfo,
      recommendations: generateSystemRecommendations(systemInfo),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'System analysis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🔧 POST 심층 토큰 분석 API
// ============================================================================

/**
 * POST /api/debug/analyze-token
 * JWT 토큰 심층 분석
 */
router.post('/analyze-token', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required',
        message: '분석할 토큰을 제공해주세요',
        example: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      });
    }

    const analysis = analyzeJWTTokenDeep(token);
    
    res.json({
      success: true,
      tokenAnalysis: analysis,
      recommendations: generateTokenRecommendations(analysis),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Token analysis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🔍 실시간 로그 스트림 API (개발 환경용)
// ============================================================================

/**
 * GET /api/debug/logs
 * 실시간 로그 스트림 (개발 환경만)
 */
router.get('/logs', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Logs not available in production',
      message: '프로덕션 환경에서는 로그 스트림을 사용할 수 없습니다'
    });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // 간단한 로그 스트림 시뮬레이션
  let logCount = 0;
  const logInterval = setInterval(() => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: `서버 정상 운영 중... (${++logCount})`,
      stats: {
        requests: debugStats.requests.total,
        uptime: Math.floor(process.uptime())
      }
    };

    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  }, 5000);

  req.on('close', () => {
    clearInterval(logInterval);
  });
});

// ============================================================================
// 🔧 통계 업데이트 함수들
// ============================================================================

/**
 * 요청 통계 업데이트
 */
export function updateRequestStats(path: string, success: boolean) {
  debugStats.requests.total++;
  debugStats.requests.byEndpoint[path] = (debugStats.requests.byEndpoint[path] || 0) + 1;
  
  if (success) {
    debugStats.requests.successful++;
  } else {
    debugStats.requests.failed++;
  }
}

/**
 * 인증 통계 업데이트
 */
export function updateAuthStats(success: boolean) {
  debugStats.authentication.attempts++;
  
  if (success) {
    debugStats.authentication.successes++;
  } else {
    debugStats.authentication.failures++;
  }
}

/**
 * 에러 통계 업데이트
 */
export function updateErrorStats(errorType: 'jwtMalformed' | 'unauthorized' | 'serverErrors') {
  debugStats.errors[errorType]++;
}

// ============================================================================
// 🔧 유틸리티 함수들
// ============================================================================

/**
 * 성능 권장사항 생성
 */
function generatePerformanceRecommendations(stats: any): string[] {
  const recommendations = [];
  
  const successRate = stats.requests.total > 0 ? 
    (stats.requests.successful / stats.requests.total) : 0;
  const authSuccessRate = stats.authentication.attempts > 0 ? 
    (stats.authentication.successes / stats.authentication.attempts) : 0;
    
  if (successRate < 0.8) {
    recommendations.push('낮은 성공률 감지 - 에러 로그를 확인하세요');
  }
  
  if (authSuccessRate < 0.7) {
    recommendations.push('인증 실패율이 높습니다 - JWT 토큰 형식을 확인하세요');
  }
  
  if (stats.errors.jwtMalformed > 5) {
    recommendations.push('JWT malformed 에러가 빈번합니다 - 토큰 생성 로직을 점검하세요');
  }
  
  if (stats.errors.unauthorized > 10) {
    recommendations.push('401 에러가 많습니다 - 세션 관리를 점검하세요');
  }
  
  if (stats.requests.total > 1000 && successRate > 0.95) {
    recommendations.push('우수한 성능을 보이고 있습니다!');
  }
  
  return recommendations.length > 0 ? recommendations : ['시스템이 정상적으로 운영되고 있습니다'];
}

/**
 * JWT 토큰 심층 분석 함수
 */
function analyzeJWTTokenDeep(token: string) {
  const analysis = {
    format: {
      provided: !!token,
      type: typeof token,
      length: token?.length || 0,
      hasBearer: token?.toLowerCase().includes('bearer') || false,
      startsWithBearer: token?.startsWith('Bearer ') || false
    },
    structure: {
      parts: 0,
      partsLengths: [] as number[],
      hasEmptyParts: false,
      isValidJWT: false
    },
    header: null as any,
    payload: null as any,
    signature: {
      present: false,
      length: 0,
      format: 'unknown'
    },
    validity: {
      formatValid: false,
      structureValid: false,
      decodingPossible: false,
      expired: false,
      expiryDate: null as string | null,
      issuedDate: null as string | null
    },
    issues: [] as string[],
    security: {
      algorithm: 'unknown',
      keyType: 'unknown',
      hasRequiredClaims: false
    }
  };

  try {
    // 기본 형식 검증
    if (!token || typeof token !== 'string') {
      analysis.issues.push('Token is not a valid string');
      return analysis;
    }

    // Bearer 접두사 처리
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    
    if (!cleanToken) {
      analysis.issues.push('Token is empty after removing Bearer prefix');
      return analysis;
    }

    // 구조 분석
    const parts = cleanToken.split('.');
    analysis.structure.parts = parts.length;
    analysis.structure.partsLengths = parts.map(p => p?.length || 0);
    analysis.structure.hasEmptyParts = parts.some(p => !p || p.length === 0);
    analysis.structure.isValidJWT = parts.length === 3 && !analysis.structure.hasEmptyParts;

    if (parts.length !== 3) {
      analysis.issues.push(`JWT should have 3 parts (header.payload.signature), found ${parts.length}`);
    }

    if (analysis.structure.hasEmptyParts) {
      analysis.issues.push('JWT has empty parts');
    }

    if (!analysis.structure.isValidJWT) {
      return analysis;
    }

    // 헤더 분석
    try {
      const headerDecoded = Buffer.from(parts[0], 'base64url').toString();
      analysis.header = JSON.parse(headerDecoded);
      analysis.security.algorithm = analysis.header.alg || 'unknown';
      analysis.security.keyType = analysis.header.typ || 'unknown';
      
      if (!analysis.header.alg || !analysis.header.typ) {
        analysis.issues.push('JWT header missing required fields (alg, typ)');
      } else if (analysis.header.typ !== 'JWT') {
        analysis.issues.push(`Expected token type 'JWT', found '${analysis.header.typ}'`);
      }
    } catch (headerError: any) {
      analysis.issues.push(`Failed to decode JWT header: ${headerError.message}`);
    }

    // 페이로드 분석
    try {
      const payloadDecoded = Buffer.from(parts[1], 'base64url').toString();
      analysis.payload = JSON.parse(payloadDecoded);
      
      // 표준 클레임 확인
      const requiredClaims = ['userId', 'iat', 'exp'];
      const hasClaims = requiredClaims.some(claim => analysis.payload[claim]);
      analysis.security.hasRequiredClaims = hasClaims;
      
      if (!hasClaims) {
        analysis.issues.push('JWT payload missing required claims (userId, iat, exp)');
      }

      // 만료 시간 확인
      if (analysis.payload.exp) {
        const expiry = new Date(analysis.payload.exp * 1000);
        analysis.validity.expiryDate = expiry.toISOString();
        analysis.validity.expired = Date.now() > analysis.payload.exp * 1000;
        
        if (analysis.validity.expired) {
          analysis.issues.push(`Token expired at ${expiry.toISOString()}`);
        }
      }

      // 발급 시간 확인
      if (analysis.payload.iat) {
        const issued = new Date(analysis.payload.iat * 1000);
        analysis.validity.issuedDate = issued.toISOString();
      }

    } catch (payloadError: any) {
      analysis.issues.push(`Failed to decode JWT payload: ${payloadError.message}`);
    }

    // 서명 분석
    analysis.signature.present = !!parts[2];
    analysis.signature.length = parts[2]?.length || 0;
    analysis.signature.format = /^[A-Za-z0-9_-]+$/.test(parts[2]) ? 'base64url' : 'invalid';

    if (!analysis.signature.present) {
      analysis.issues.push('JWT signature is missing');
    } else if (analysis.signature.format === 'invalid') {
      analysis.issues.push('JWT signature has invalid format');
    }

    // 전반적인 유효성 판단
    analysis.validity.formatValid = analysis.structure.isValidJWT;
    analysis.validity.structureValid = analysis.header && analysis.payload && analysis.signature.present;
    analysis.validity.decodingPossible = !analysis.issues.some(issue => 
      issue.includes('Failed to decode'));

  } catch (error: any) {
    analysis.issues.push(`Analysis failed: ${error.message}`);
  }

  return analysis;
}

/**
 * 토큰 권장사항 생성
 */
function generateTokenRecommendations(analysis: any): string[] {
  const recommendations = [];

  if (!analysis.format.provided) {
    recommendations.push('토큰을 제공해주세요');
    return recommendations;
  }

  if (!analysis.format.startsWithBearer) {
    recommendations.push('Authorization 헤더는 "Bearer <token>" 형식이어야 합니다');
  }

  if (analysis.structure.parts !== 3) {
    recommendations.push('유효한 JWT 토큰을 사용해주세요 (3개 부분 필요)');
    recommendations.push('WebAuthn 등록/로그인을 다시 시도해보세요');
  }

  if (analysis.structure.hasEmptyParts) {
    recommendations.push('JWT 토큰이 손상되었습니다 - 새로 로그인해주세요');
  }

  if (analysis.validity.expired) {
    recommendations.push('토큰이 만료되었습니다 - 세션 복원을 시도하세요');
    recommendations.push('POST /api/auth/session/restore 엔드포인트를 사용하세요');
  }

  if (analysis.issues.includes('JWT header missing required fields (alg, typ)')) {
    recommendations.push('토큰 생성 과정에 문제가 있습니다 - 백엔드 로그를 확인하세요');
  }

  if (analysis.payload && !analysis.payload.userId) {
    recommendations.push('토큰에 사용자 ID가 없습니다 - 인증 과정을 다시 시도하세요');
  }

  if (analysis.signature.format === 'invalid') {
    recommendations.push('토큰 서명이 손상되었습니다 - 새로 인증받으세요');
  }

  if (recommendations.length === 0) {
    if (analysis.validity.structureValid && !analysis.validity.expired) {
      recommendations.push('토큰 형식이 올바릅니다');
      recommendations.push('서버 인증을 시도해보세요');
    } else {
      recommendations.push('토큰에 문제가 있습니다 - 새로 로그인하세요');
    }
  }

  return recommendations;
}

/**
 * 시스템 권장사항 생성
 */
function generateSystemRecommendations(systemInfo: any): string[] {
  const recommendations = [];
  
  const memoryUsage = systemInfo.server.memory.heapUsed / systemInfo.server.memory.heapTotal;
  
  if (memoryUsage > 0.8) {
    recommendations.push('메모리 사용률이 높습니다 - 서버 재시작을 고려하세요');
  }
  
  if (!systemInfo.application.jwtConfigured) {
    recommendations.push('JWT_SECRET 환경변수를 설정하세요');
  }
  
  if (!systemInfo.database.configured) {
    recommendations.push('Supabase 환경변수를 설정하세요');
  }
  
  if (systemInfo.database.connectionStatus === 'mock') {
    recommendations.push('데이터베이스 연결을 확인하세요');
  }
  
  if (systemInfo.server.uptime < 300) { // 5분 미만
    recommendations.push('서버가 최근에 재시작되었습니다');
  }
  
  const successRate = debugStats.requests.total > 0 ? 
    (debugStats.requests.successful / debugStats.requests.total) : 1;
    
  if (successRate > 0.95 && systemInfo.server.uptime > 3600) {
    recommendations.push('시스템이 안정적으로 운영되고 있습니다');
  }
  
  return recommendations.length > 0 ? recommendations : ['시스템 상태가 양호합니다'];
}

// ============================================================================
// 📊 라우터 초기화 로그
// ============================================================================

console.log('🔍 Debug routes initialized successfully');

export default router;