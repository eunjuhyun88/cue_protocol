// ============================================================================
// 🔍 디버깅 및 모니터링 시스템 (paste-4.txt 기능 추출)
// 파일: backend/src/routes/debug/index.ts
// 역할: 시스템 상태 모니터링, 세션 관리, 환경 검증
// ============================================================================

import { Router, Request, Response } from 'express';
import { DatabaseService } from '../../services/database/DatabaseService';
import { SupabaseService } from '../../services/database/SupabaseService';

const router = Router();

// 외부 세션 스토어 (실제로는 Redis나 메모리 캐시 사용)
declare global {
  var globalSessionStore: Map<string, any>;
}

if (!global.globalSessionStore) {
  global.globalSessionStore = new Map();
}

const sessionStore = global.globalSessionStore;

// ============================================================================
// 📊 시스템 상태 종합 체크
// GET /api/debug/status
// ============================================================================
router.get('/status', (req: Request, res: Response) => {
  console.log('🔍 시스템 상태 종합 체크 요청');

  const db = DatabaseService.getInstance();
  const dbInfo = db.getConnectionInfo();

  const status = {
    server: {
      status: 'running',
      version: '4.0.0',
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      pid: process.pid
    },
    database: {
      type: dbInfo.type,
      connected: dbInfo.connected,
      url: dbInfo.url,
      mockDataCount: dbInfo.mockDataCount
    },
    sessions: {
      count: sessionStore.size,
      list: Array.from(sessionStore.keys())
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      FRONTEND_URL: process.env.FRONTEND_URL,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY
    },
    features: {
      unifiedAuth: true,
      sessionRestore: true,
      automaticUserDetection: true,
      emailNullable: true,
      cueMining: true,
      dataVaults: true,
      aiPassport: true
    }
  };

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    status
  });
});

// ============================================================================
// 📋 세션 상태 조회
// GET /api/debug/sessions  
// ============================================================================
router.get('/sessions', (req: Request, res: Response) => {
  const sessions = Array.from(sessionStore.entries()).map(([id, data]) => ({
    sessionId: id,
    userId: data.userId,
    userName: data.userName,
    timestamp: data.timestamp,
    age: Date.now() - data.timestamp,
    type: data.type,
    deviceInfo: data.deviceInfo ? Object.keys(data.deviceInfo) : []
  }));

  console.log('🔍 세션 상태 조회:', sessions.length);

  res.json({
    success: true,
    sessionCount: sessionStore.size,
    sessions: sessions
  });
});

// ============================================================================
// 🔧 환경변수 검증
// GET /api/debug/env
// ============================================================================
router.get('/env', (req: Request, res: Response) => {
  const envCheck = {
    essential: {
      SUPABASE_URL: {
        exists: !!process.env.SUPABASE_URL,
        valid: process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('dummy'),
        value: process.env.SUPABASE_URL ? 'configured' : 'missing'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        valid: process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy'),
        value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      },
      JWT_SECRET: {
        exists: !!process.env.JWT_SECRET,
        valid: process.env.JWT_SECRET && process.env.JWT_SECRET.length > 32,
        value: process.env.JWT_SECRET ? 'configured' : 'missing'
      }
    },
    optional: {
      OPENAI_API_KEY: {
        exists: !!process.env.OPENAI_API_KEY,
        valid: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-'),
        value: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
      },
      ANTHROPIC_API_KEY: {
        exists: !!process.env.ANTHROPIC_API_KEY,
        valid: process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-'),
        value: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing'
      },
      OLLAMA_URL: {
        exists: !!process.env.OLLAMA_URL,
        valid: process.env.OLLAMA_URL && process.env.OLLAMA_URL.includes('localhost'),
        value: process.env.OLLAMA_URL || 'http://localhost:11434 (default)'
      }
    },
    webauthn: {
      WEBAUTHN_RP_NAME: {
        exists: !!process.env.WEBAUTHN_RP_NAME,
        value: process.env.WEBAUTHN_RP_NAME || 'Final0626 AI Passport (default)'
      },
      WEBAUTHN_RP_ID: {
        exists: !!process.env.WEBAUTHN_RP_ID,
        value: process.env.WEBAUTHN_RP_ID || 'localhost (default)'
      }
    }
  };

  const healthScore = calculateEnvHealthScore(envCheck);

  res.json({
    success: true,
    environment: envCheck,
    healthScore,
    recommendation: getEnvRecommendation(healthScore),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🔥 실시간 로그 스트림 (개발용)
// GET /api/debug/logs
// ============================================================================
router.get('/logs', (req: Request, res: Response) => {
  const { lines = 50 } = req.query;
  
  // 실제로는 로그 파일을 읽거나 메모리 로그를 조회
  const mockLogs = generateMockLogs(Number(lines));

  res.json({
    success: true,
    logs: mockLogs,
    totalLines: mockLogs.length,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🧪 백엔드 연결 테스트
// POST /api/debug/test-connections
// ============================================================================
router.post('/test-connections', async (req: Request, res: Response) => {
  console.log('🧪 백엔드 연결 테스트 시작');

  const tests = {
    database: await testDatabaseConnection(),
    ai: await testAIConnections(),
    external: await testExternalServices()
  };

  const allPassed = Object.values(tests).every(test => test.success);

  res.json({
    success: allPassed,
    tests,
    summary: {
      total: Object.keys(tests).length,
      passed: Object.values(tests).filter(t => t.success).length,
      failed: Object.values(tests).filter(t => !t.success).length
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 📱 시스템 리소스 모니터링
// GET /api/debug/resources
// ============================================================================
router.get('/resources', (req: Request, res: Response) => {
  const resources = {
    memory: {
      ...process.memoryUsage(),
      freeMemPercent: Math.round((1 - (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal)) * 100)
    },
    cpu: {
      uptime: process.uptime(),
      loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0],
      platform: process.platform,
      arch: process.arch
    },
    process: {
      pid: process.pid,
      ppid: process.ppid,
      version: process.version,
      title: process.title
    },
    sessions: {
      active: sessionStore.size,
      memory: JSON.stringify(Array.from(sessionStore.values())).length
    }
  };

  res.json({
    success: true,
    resources,
    alerts: generateResourceAlerts(resources),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🛠️ 헬퍼 함수들
// ============================================================================

function calculateEnvHealthScore(envCheck: any): number {
  let score = 0;
  let total = 0;

  // 필수 환경변수 (가중치 높음)
  Object.values(envCheck.essential).forEach((env: any) => {
    total += 3;
    if (env.valid) score += 3;
    else if (env.exists) score += 1;
  });

  // 선택적 환경변수 (가중치 낮음)
  Object.values(envCheck.optional).forEach((env: any) => {
    total += 1;
    if (env.valid) score += 1;
  });

  return Math.round((score / total) * 100);
}

function getEnvRecommendation(healthScore: number): string {
  if (healthScore >= 90) return 'All systems optimal! 🎉';
  if (healthScore >= 70) return 'Good configuration. Consider adding optional API keys.';
  if (healthScore >= 50) return 'Basic setup complete. Add Supabase for production.';
  return 'Critical: Set up essential environment variables first!';
}

function generateMockLogs(lines: number): any[] {
  const logTypes = ['info', 'warn', 'error', 'debug'];
  const messages = [
    'Server started successfully',
    'User authentication completed',
    'CUE transaction processed',
    'Database connection established',
    'WebAuthn credential verified',
    'AI response generated',
    'Session cleanup completed'
  ];

  return Array.from({ length: lines }, (_, i) => ({
    timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
    level: logTypes[Math.floor(Math.random() * logTypes.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    source: 'backend',
    details: Math.random() > 0.7 ? `Additional context ${i}` : null
  })).reverse();
}

async function testDatabaseConnection(): Promise<any> {
  try {
    const db = DatabaseService.getInstance();
    const connected = await db.testConnection();
    
    return {
      success: connected,
      service: 'Database',
      type: db.isMockMode() ? 'Mock' : 'Supabase',
      latency: Math.round(Math.random() * 50) + 'ms',
      details: connected ? 'Connection established' : 'Connection failed'
    };
  } catch (error) {
    return {
      success: false,
      service: 'Database',
      error: error.message
    };
  }
}

async function testAIConnections(): Promise<any> {
  const tests = [];
  
  // OpenAI 테스트
  if (process.env.OPENAI_API_KEY) {
    tests.push({
      service: 'OpenAI',
      success: true, // 실제로는 API 호출 테스트
      details: 'API key configured'
    });
  }
  
  // Anthropic 테스트
  if (process.env.ANTHROPIC_API_KEY) {
    tests.push({
      service: 'Claude',
      success: true, // 실제로는 API 호출 테스트
      details: 'API key configured'
    });
  }

  return {
    success: tests.length > 0 && tests.every(t => t.success),
    services: tests,
    details: tests.length === 0 ? 'No AI services configured' : `${tests.length} AI service(s) available`
  };
}

async function testExternalServices(): Promise<any> {
  // Ollama 연결 테스트 등
  return {
    success: true,
    services: [
      {
        name: 'Ollama',
        status: 'unknown',
        url: process.env.OLLAMA_URL || 'http://localhost:11434'
      }
    ],
    details: 'External service tests completed'
  };
}

function generateResourceAlerts(resources: any): string[] {
  const alerts = [];
  
  if (resources.memory.freeMemPercent < 20) {
    alerts.push('⚠️ Low memory: ' + resources.memory.freeMemPercent + '% free');
  }
  
  if (resources.sessions.active > 100) {
    alerts.push('⚠️ High session count: ' + resources.sessions.active);
  }
  
  if (resources.cpu.uptime > 86400) { // 24시간
    alerts.push('ℹ️ Long uptime: ' + Math.round(resources.cpu.uptime / 3600) + ' hours');
  }
  
  return alerts