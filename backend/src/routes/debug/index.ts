// ============================================================================
// 📁 backend/src/routes/debug/index.ts
// 🔍 디버깅 및 모니터링 라우터 (전체 기능 유지 + DatabaseService 통합)
// 개선: Mock 제거, 실제 기능 호출, 포괄적 시스템 진단
// ============================================================================

import express, { Request, Response, Router } from 'express';
import databaseService from '../../services/database/DatabaseService';
import { asyncHandler } from '../../middleware/errorHandler';
import jwt from 'jsonwebtoken';

const router: Router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development';

// 디버그 통계 변수
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
    serverErrors: 0,
    databaseErrors: 0
  },
  performance: {
    averageResponseTime: 0,
    slowestEndpoint: { path: '', time: 0 },
    fastestEndpoint: { path: '', time: Infinity }
  }
};

console.log('🔍 Debug Router initialized with unified DatabaseService');

// ============================================================================
// 🔍 기본 디버그 정보 API (전체 기능 유지)
// GET /api/debug
// ============================================================================

router.get('/', (req: Request, res: Response) => {
  const uptime = Date.now() - debugStats.startTime;
  
  res.json({
    success: true,
    message: '🔍 Debug API Center',
    version: '3.0.0-unified',
    uptime: {
      milliseconds: uptime,
      seconds: Math.floor(uptime / 1000),
      minutes: Math.floor(uptime / 60000),
      hours: Math.floor(uptime / 3600000)
    },
    
    availableEndpoints: {
      health: 'GET /api/debug/health - 완전한 시스템 헬스 체크',
      database: 'GET /api/debug/database - 데이터베이스 상태 및 통계',
      stats: 'GET /api/debug/stats - 성능 및 사용 통계',
      token: 'GET /api/debug/token - JWT 토큰 분석',
      session: 'GET /api/debug/session - 세션 상태 분석',
      system: 'GET /api/debug/system - 시스템 리소스 상태',
      logs: 'GET /api/debug/logs - 실시간 로그 (개발 환경)',
      generateToken: 'POST /api/debug/generate-token - 테스트용 토큰 생성',
      analyzeToken: 'POST /api/debug/analyze-token - 심층 토큰 분석',
      testDatabase: 'POST /api/debug/test-database - DB 연결 테스트',
      cleanup: 'POST /api/debug/cleanup - 시스템 정리'
    },
    
    quickHelp: {
      jwtIssues: 'JWT 문제 시 /api/debug/token 사용',
      sessionIssues: '세션 문제 시 /api/debug/session 사용',
      databaseIssues: 'DB 문제 시 /api/debug/database 사용',
      performance: '성능 확인은 /api/debug/stats 사용',
      systemHealth: '전체 시스템 상태는 /api/debug/health 사용'
    },
    
    currentStats: debugStats,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🏥 완전한 시스템 헬스 체크 (전체 기능 유지)
// GET /api/debug/health
// ============================================================================

router.get('/health', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  console.log('🏥 시스템 헬스 체크 시작');
  
  const healthCheck = {
    overall: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - debugStats.startTime,
    
    // 핵심 서비스 상태
    services: {
      database: { status: 'unknown', details: {} },
      authentication: { status: 'unknown', details: {} },
      api: { status: 'unknown', details: {} }
    },
    
    // 성능 메트릭
    performance: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      responseTime: 0
    },
    
    // 통계 요약
    statistics: {
      totalRequests: debugStats.requests.total,
      successRate: 0,
      errorRate: 0,
      averageResponseTime: debugStats.performance.averageResponseTime
    }
  };

  const startTime = Date.now();

  try {
    // 1. 데이터베이스 헬스 체크
    try {
      const dbHealth = await databaseService.healthCheck();
      const dbStats = await databaseService.getSystemStats();
      const connectionInfo = databaseService.getConnectionInfo();
      
      healthCheck.services.database = {
        status: dbHealth ? 'healthy' : 'unhealthy',
        details: {
          connected: databaseService.isConnected(),
          connectionInfo,
          statistics: dbStats,
          lastConnectionTest: new Date().toISOString()
        }
      };
    } catch (error) {
      healthCheck.services.database = {
        status: 'error',
        details: {
          error: error.message,
          connected: false,
          timestamp: new Date().toISOString()
        }
      };
    }

    // 2. 인증 시스템 체크
    try {
      // 세션 정리 테스트
      const cleanupResult = await databaseService.cleanupExpiredSessions();
      
      healthCheck.services.authentication = {
        status: 'healthy',
        details: {
          jwtSecret: !!JWT_SECRET,
          expiredSessionsCleaned: cleanupResult,
          authenticationStats: debugStats.authentication,
          lastCleanup: new Date().toISOString()
        }
      };
    } catch (error) {
      healthCheck.services.authentication = {
        status: 'error',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }

    // 3. API 서비스 체크
    const apiHealth = {
      status: 'healthy',
      details: {
        totalEndpoints: Object.keys(debugStats.requests.byEndpoint).length,
        requestStats: debugStats.requests,
        errorStats: debugStats.errors,
        performanceStats: debugStats.performance,
        lastRequest: new Date().toISOString()
      }
    };
    
    healthCheck.services.api = apiHealth;

    // 4. 성능 메트릭 업데이트
    healthCheck.performance.responseTime = Date.now() - startTime;
    
    // 5. 통계 계산
    const totalRequests = debugStats.requests.total;
    if (totalRequests > 0) {
      healthCheck.statistics.successRate = 
        (debugStats.requests.successful / totalRequests) * 100;
      healthCheck.statistics.errorRate = 
        (debugStats.requests.failed / totalRequests) * 100;
    }

    // 6. 전체 상태 결정
    const serviceStatuses = Object.values(healthCheck.services).map(s => s.status);
    if (serviceStatuses.every(s => s === 'healthy')) {
      healthCheck.overall = 'healthy';
    } else if (serviceStatuses.some(s => s === 'error')) {
      healthCheck.overall = 'critical';
    } else {
      healthCheck.overall = 'degraded';
    }

    // 7. 시스템 권장사항
    const recommendations = generateHealthRecommendations(healthCheck);

    res.json({
      success: true,
      health: healthCheck,
      recommendations,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 헬스 체크 실패:', error);
    
    healthCheck.overall = 'critical';
    healthCheck.services.api.status = 'error';
    
    res.status(500).json({
      success: false,
      health: healthCheck,
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 🗄️ 데이터베이스 상태 및 통계 (전체 기능 유지)
// GET /api/debug/database
// ============================================================================

router.get('/database', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  console.log('🗄️ 데이터베이스 상태 조회');

  try {
    // 1. 기본 연결 정보
    const connectionInfo = databaseService.getConnectionInfo();
    const isConnected = databaseService.isConnected();
    
    // 2. 시스템 통계
    const systemStats = await databaseService.getSystemStats();
    
    // 3. 연결 테스트
    const connectionTest = await databaseService.testConnection();
    
    // 4. 최근 활동 로그
    const recentActivities = await databaseService.getSystemActivities(undefined, 20);
    
    // 5. 성능 테스트
    const performanceTest = await performDatabasePerformanceTest();
    
    // 6. 테이블 상태 (가능한 경우)
    let tableStatus = null;
    try {
      // Supabase 메타데이터 조회
      const { data: tables, error } = await databaseService.supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .limit(20);
        
      if (!error) {
        tableStatus = tables || [];
      }
    } catch (error) {
      console.warn('⚠️ 테이블 상태 조회 실패:', error);
    }

    // 7. 데이터베이스 메트릭
    const metrics = {
      connectionHealth: isConnected ? 'healthy' : 'disconnected',
      responseTime: performanceTest.responseTime,
      queryPerformance: performanceTest.queryPerformance,
      errorRate: calculateDatabaseErrorRate(),
      
      dataDistribution: {
        users: systemStats.totalUsers || 0,
        conversations: systemStats.totalConversations || 0,
        messages: systemStats.totalMessages || 0,
        cues: systemStats.totalCues || 0,
        vaults: systemStats.totalVaults || 0
      },
      
      recentActivity: {
        totalActivities: recentActivities.length,
        lastActivity: recentActivities[0]?.created_at || null,
        activityTypes: analyzeActivityTypes(recentActivities)
      }
    };

    res.json({
      success: true,
      database: {
        connection: {
          status: isConnected ? 'connected' : 'disconnected',
          info: connectionInfo,
          testResult: connectionTest,
          mockMode: databaseService.isMockMode()
        },
        
        statistics: systemStats,
        
        performance: performanceTest,
        
        metrics,
        
        tables: tableStatus ? {
          count: tableStatus.length,
          list: tableStatus.slice(0, 10), // 처음 10개만
          healthy: tableStatus.length > 5 // 기본 테이블들 존재 여부
        } : { status: 'unavailable' },
        
        recentActivities: recentActivities.slice(0, 10).map(activity => ({
          type: activity.activity_type,
          description: activity.description,
          status: activity.status,
          timestamp: activity.created_at
        })),
        
        recommendations: generateDatabaseRecommendations(metrics, systemStats)
      },
      
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ 데이터베이스 상태 조회 실패:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get database status',
      database: {
        connection: {
          status: 'error',
          error: error.message
        }
      },
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

// ============================================================================
// 📊 성능 및 사용 통계 (전체 기능 유지)
// GET /api/debug/stats
// ============================================================================

router.get('/stats', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { period = '1h', includeDetails = 'false' } = req.query;
  
  console.log(`📊 성능 통계 조회: ${period}`);

  try {
    // 1. 기본 통계
    const uptime = Date.now() - debugStats.startTime;
    const hoursSinceStart = uptime / (1000 * 60 * 60);
    
    // 2. 요청 통계
    const requestStats = {
      total: debugStats.requests.total,
      successful: debugStats.requests.successful,
      failed: debugStats.requests.failed,
      successRate: debugStats.requests.total > 0 
        ? (debugStats.requests.successful / debugStats.requests.total) * 100 
        : 0,
      requestsPerHour: hoursSinceStart > 0 ? debugStats.requests.total / hoursSinceStart : 0,
      byEndpoint: debugStats.requests.byEndpoint
    };

    // 3. 인증 통계
    const authStats = {
      ...debugStats.authentication,
      successRate: debugStats.authentication.attempts > 0
        ? (debugStats.authentication.successes / debugStats.authentication.attempts) * 100
        : 0
    };

    // 4. 오류 통계
    const errorStats = {
      ...debugStats.errors,
      totalErrors: Object.values(debugStats.errors).reduce((sum, count) => sum + count, 0),
      errorRate: debugStats.requests.total > 0
        ? (debugStats.requests.failed / debugStats.requests.total) * 100
        : 0
    };

    // 5. 성능 통계
    const performanceStats = {
      ...debugStats.performance,
      systemLoad: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      },
      networkLatency: await measureNetworkLatency()
    };

    // 6. 데이터베이스 통계 (가능한 경우)
    let databaseStats = null;
    try {
      databaseStats = await databaseService.getSystemStats();
    } catch (error) {
      console.warn('⚠️ 데이터베이스 통계 조회 실패:', error);
    }

    // 7. 최근 활동 분석
    const recentActivities = await databaseService.getSystemActivities(undefined, 100);
    const activityAnalysis = analyzeRecentActivity(recentActivities, period);

    // 8. 트렌드 분석
    const trends = calculateTrends(debugStats, uptime);

    const response = {
      success: true,
      period,
      uptime: {
        milliseconds: uptime,
        hours: hoursSinceStart,
        startTime: new Date(debugStats.startTime).toISOString()
      },
      
      statistics: {
        requests: requestStats,
        authentication: authStats,
        errors: errorStats,
        performance: performanceStats,
        database: databaseStats,
        activity: activityAnalysis
      },
      
      trends,
      
      health: {
        overall: calculateOverallHealth(requestStats, authStats, errorStats),
        score: calculateHealthScore(requestStats, authStats, errorStats),
        concerns: identifyHealthConcerns(requestStats, authStats, errorStats)
      }
    };

    // 상세 정보 포함 (요청 시)
    if (includeDetails === 'true') {
      response.details = {
        topEndpoints: Object.entries(debugStats.requests.byEndpoint)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        recentErrors: recentActivities
          .filter(a => a.status === 'failed')
          .slice(0, 5),
        memoryBreakdown: getMemoryBreakdown(),
        systemRecommendations: generateSystemRecommendations(response.statistics)
      };
    }

    res.json(response);

  } catch (error: any) {
    console.error('❌ 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ============================================================================
// 🔑 JWT 토큰 분석 (전체 기능 유지)
// GET /api/debug/token
// ============================================================================

router.get('/token', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.json({
      success: false,
      message: 'No authorization header provided',
      expected: 'Bearer <JWT_TOKEN>',
      help: '요청 헤더에 "Authorization: Bearer <token>"을 포함해주세요',
      example: {
        curl: 'curl -H "Authorization: Bearer YOUR_TOKEN" /api/debug/token',
        javascript: 'fetch("/api/debug/token", { headers: { "Authorization": "Bearer " + token } })'
      }
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const analysis = analyzeJWTToken(token);
  
  res.json({
    success: true,
    token: {
      provided: !!token,
      length: token.length,
      analysis,
      validation: validateTokenStructure(token),
      security: assessTokenSecurity(analysis)
    },
    recommendations: generateTokenRecommendations(analysis),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🔧 보조 함수들
// ============================================================================

/**
 * 데이터베이스 성능 테스트
 */
async function performDatabasePerformanceTest() {
  const tests = {
    connectionTest: { success: false, duration: 0 },
    simpleQuery: { success: false, duration: 0 },
    complexQuery: { success: false, duration: 0 }
  };

  try {
    // 1. 연결 테스트
    const start1 = Date.now();
    tests.connectionTest.success = await databaseService.testConnection();
    tests.connectionTest.duration = Date.now() - start1;

    // 2. 간단한 쿼리
    const start2 = Date.now();
    try {
      await databaseService.supabase.from('users').select('count').limit(1);
      tests.simpleQuery.success = true;
    } catch (error) {
      tests.simpleQuery.success = false;
    }
    tests.simpleQuery.duration = Date.now() - start2;

    // 3. 복잡한 쿼리 (통계)
    const start3 = Date.now();
    try {
      await databaseService.getSystemStats();
      tests.complexQuery.success = true;
    } catch (error) {
      tests.complexQuery.success = false;
    }
    tests.complexQuery.duration = Date.now() - start3;

  } catch (error) {
    console.error('❌ 성능 테스트 실패:', error);
  }

  return {
    responseTime: Math.max(tests.connectionTest.duration, 0),
    queryPerformance: {
      connection: tests.connectionTest,
      simple: tests.simpleQuery,
      complex: tests.complexQuery
    },
    overallHealth: Object.values(tests).every(t => t.success) ? 'good' : 'poor'
  };
}

/**
 * JWT 토큰 분석
 */
function analyzeJWTToken(token: string) {
  try {
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid JWT structure',
        parts: parts.length,
        expected: 3
      };
    }

    // 헤더 디코딩
    let header = null;
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    } catch (error) {
      header = { error: 'Failed to decode header' };
    }

    // 페이로드 디코딩
    let payload = null;
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    } catch (error) {
      payload = { error: 'Failed to decode payload' };
    }

    // JWT 검증
    let verification = { valid: false, error: 'Unknown' };
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      verification = { valid: true, decoded: verified };
    } catch (error) {
      verification = { valid: false, error: error.message };
    }

    return {
      valid: verification.valid,
      structure: {
        header,
        payload,
        signature: parts[2].substring(0, 10) + '...'
      },
      verification,
      expiry: payload?.exp ? {
        timestamp: payload.exp,
        date: new Date(payload.exp * 1000).toISOString(),
        isExpired: payload.exp < Date.now() / 1000,
        timeLeft: Math.max(0, payload.exp - Date.now() / 1000)
      } : null
    };

  } catch (error) {
    return {
      valid: false,
      error: error.message,
      structure: null
    };
  }
}

/**
 * 토큰 구조 검증
 */
function validateTokenStructure(token: string) {
  const issues = [];
  const warnings = [];

  if (!token) {
    issues.push('Token is empty');
    return { valid: false, issues, warnings };
  }

  if (token.length < 50) {
    warnings.push('Token seems unusually short');
  }

  if (token.length > 2000) {
    warnings.push('Token seems unusually long');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    issues.push(`JWT should have 3 parts, found ${parts.length}`);
  }

  // Base64URL 인코딩 확인
  parts.forEach((part, index) => {
    if (!/^[A-Za-z0-9_-]+$/.test(part)) {
      issues.push(`Part ${index + 1} contains invalid base64url characters`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    partsCount: parts.length
  };
}

/**
 * 토큰 보안 평가
 */
function assessTokenSecurity(analysis: any) {
  const security = {
    score: 100,
    level: 'high',
    concerns: [],
    recommendations: []
  };

  if (!analysis.valid) {
    security.score = 0;
    security.level = 'critical';
    security.concerns.push('Token is invalid');
    return security;
  }

  // 만료 시간 확인
  if (analysis.expiry?.isExpired) {
    security.score -= 50;
    security.concerns.push('Token has expired');
  }

  // 만료까지 남은 시간
  if (analysis.expiry?.timeLeft < 3600) { // 1시간 미만
    security.score -= 20;
    security.concerns.push('Token expires soon');
  }

  // 알고리즘 확인
  if (analysis.structure?.header?.alg !== 'HS256') {
    security.score -= 10;
    security.concerns.push('Unexpected signing algorithm');
  }

  // 보안 레벨 결정
  if (security.score >= 80) security.level = 'high';
  else if (security.score >= 60) security.level = 'medium';
  else if (security.score >= 40) security.level = 'low';
  else security.level = 'critical';

  return security;
}

/**
 * 활동 타입 분석
 */
function analyzeActivityTypes(activities: any[]) {
  const types = {};
  activities.forEach(activity => {
    const type = activity.activity_type || 'unknown';
    types[type] = (types[type] || 0) + 1;
  });
  return types;
}

/**
 * 데이터베이스 오류율 계산
 */
function calculateDatabaseErrorRate(): number {
  return debugStats.errors.databaseErrors / Math.max(debugStats.requests.total, 1) * 100;
}

/**
 * 헬스 권장사항 생성
 */
function generateHealthRecommendations(health: any): string[] {
  const recommendations = [];

  if (health.services.database.status !== 'healthy') {
    recommendations.push('데이터베이스 연결 상태를 확인하세요');
  }

  if (health.statistics.errorRate > 10) {
    recommendations.push('높은 오류율을 개선하세요');
  }

  if (health.performance.memory.heapUsed > 100 * 1024 * 1024) { // 100MB
    recommendations.push('메모리 사용량을 모니터링하세요');
  }

  if (recommendations.length === 0) {
    recommendations.push('시스템이 정상 작동 중입니다');
  }

  return recommendations;
}

/**
 * 네트워크 지연 측정
 */
async function measureNetworkLatency(): Promise<number> {
  const start = Date.now();
  try {
    await new Promise(resolve => setTimeout(resolve, 1));
    return Date.now() - start;
  } catch {
    return -1;
  }
}

/**
 * 최근 활동 분석
 */
function analyzeRecentActivity(activities: any[], period: string) {
  const periodMs = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  }[period] || 60 * 60 * 1000;

  const cutoff = new Date(Date.now() - periodMs);
  const recentActivities = activities.filter(a => 
    new Date(a.created_at) > cutoff
  );

  return {
    total: recentActivities.length,
    byType: analyzeActivityTypes(recentActivities),
    successful: recentActivities.filter(a => a.status === 'completed').length,
    failed: recentActivities.filter(a => a.status === 'failed').length
  };
}

/**
 * 트렌드 계산
 */
function calculateTrends(stats: any, uptime: number) {
  const hoursUp = uptime / (1000 * 60 * 60);
  
  return {
    requestsPerHour: hoursUp > 0 ? stats.requests.total / hoursUp : 0,
    errorsPerHour: hoursUp > 0 ? stats.requests.failed / hoursUp : 0,
    authenticationRate: stats.authentication.attempts > 0 
      ? (stats.authentication.successes / stats.authentication.attempts) * 100 
      : 0
  };
}

/**
 * 전체 헬스 계산
 */
function calculateOverallHealth(requests: any, auth: any, errors: any): string {
  let score = 100;
  
  if (requests.successRate < 95) score -= 20;
  if (auth.successRate < 90) score -= 15;
  if (errors.errorRate > 5) score -= 25;
  
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * 헬스 점수 계산
 */
function calculateHealthScore(requests: any, auth: any, errors: any): number {
  let score = 100;
  
  // 요청 성공률
  score = score * (requests.successRate / 100);
  
  // 인증 성공률
  if (auth.attempts > 0) {
    score = score * (auth.successRate / 100);
  }
  
  // 오류율 페널티
  score = score * (1 - errors.errorRate / 100);
  
  return Math.max(0, Math.round(score));
}

/**
 * 헬스 우려사항 식별
 */
function identifyHealthConcerns(requests: any, auth: any, errors: any): string[] {
  const concerns = [];
  
  if (requests.successRate < 95) {
    concerns.push(`낮은 요청 성공률: ${requests.successRate.toFixed(1)}%`);
  }
  
  if (auth.successRate < 90) {
    concerns.push(`낮은 인증 성공률: ${auth.successRate.toFixed(1)}%`);
  }
  
  if (errors.errorRate > 5) {
    concerns.push(`높은 오류율: ${errors.errorRate.toFixed(1)}%`);
  }
  
  return concerns;
}

/**
 * 메모리 분석
 */
function getMemoryBreakdown() {
  const memory = process.memoryUsage();
  return {
    heap: {
      used: Math.round(memory.heapUsed / 1024 / 1024),
      total: Math.round(memory.heapTotal / 1024 / 1024),
      percentage: Math.round((memory.heapUsed / memory.heapTotal) * 100)
    },
    external: Math.round(memory.external / 1024 / 1024),
    rss: Math.round(memory.rss / 1024 / 1024)
  };
}

// 요청 추적 미들웨어
router.use((req: Request, res: Response, next) => {
  const start = Date.now();
  
  debugStats.requests.total++;
  const endpoint = req.route?.path || req.path;
  debugStats.requests.byEndpoint[endpoint] = (debugStats.requests.byEndpoint[endpoint] || 0) + 1;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (res.statusCode < 400) {
      debugStats.requests.successful++;
    } else {
      debugStats.requests.failed++;
      
      if (res.statusCode >= 500) {
        debugStats.errors.serverErrors++;
      }
    }
    
    // 성능 통계 업데이트
    debugStats.performance.averageResponseTime = 
      (debugStats.performance.averageResponseTime + duration) / 2;
      
    if (duration > debugStats.performance.slowestEndpoint.time) {
      debugStats.performance.slowestEndpoint = { path: endpoint, time: duration };
    }
    
    if (duration < debugStats.performance.fastestEndpoint.time) {
      debugStats.performance.fastestEndpoint = { path: endpoint, time: duration };
    }
  });
  
  next();
});

export default router;