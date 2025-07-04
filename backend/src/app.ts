// ============================================================================
// 📁 backend/src/app.ts 
// 🎯 완전히 새로운 간단한 Express 서버 (DI 시스템 없이)
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

// 환경변수 로딩
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 간단한 Express 서버 시작...');
console.log(`📍 포트: ${PORT}`);
console.log(`🌍 환경: ${NODE_ENV}`);

// ============================================================================
// 🔧 기본 미들웨어 설정
// ============================================================================

// CORS 설정 (간단하게)
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 기본 미들웨어
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 로깅
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 요청/응답 로깅
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📞 ${req.method} ${req.originalUrl}`);
  
  res.on('finish', () => {
    console.log(`✅ ${req.method} ${req.originalUrl} - ${res.statusCode}`);
  });
  
  next();
});

console.log('✅ 기본 미들웨어 설정 완료');

// ============================================================================
// 🧪 테스트 라우트들
// ============================================================================

// 1. 가장 간단한 테스트
app.get('/test', (req: Request, res: Response) => {
  console.log('🧪 기본 테스트 라우트 실행됨');
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString() 
  });
});

// 2. 헬스체크
app.get('/health', (req: Request, res: Response) => {
  console.log('🏥 헬스체크 실행됨');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// 3. Ping
app.get('/ping', (req: Request, res: Response) => {
  console.log('🏓 Ping 실행됨');
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

console.log('✅ 기본 테스트 라우트 등록 완료');

// ============================================================================
// 🔐 WebAuthn API (Mock 버전)
// ============================================================================

// WebAuthn 테스트
app.get('/api/auth/webauthn/test', (req: Request, res: Response) => {
  console.log('🧪 WebAuthn 테스트 실행됨');
  res.json({
    success: true,
    message: 'WebAuthn API is working',
    timestamp: new Date().toISOString()
  });
});

// WebAuthn 등록 시작
app.post('/api/auth/webauthn/register/start', (req: Request, res: Response) => {
  console.log('🔥 WebAuthn 등록 시작 실행됨');
  console.log('📝 요청 데이터:', req.body);
  
  const { userName, displayName } = req.body;
  
  res.json({
    success: true,
    sessionId: `session_${Date.now()}`,
    options: {
      rp: { 
        name: 'AI Personal Assistant', 
        id: 'localhost' 
      },
      user: {
        id: Buffer.from(`user_${Date.now()}`).toString('base64'),
        name: userName || `user_${Date.now()}`,
        displayName: displayName || 'CUE User'
      },
      challenge: Buffer.from(`challenge_${Date.now()}`).toString('base64'),
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' }
      ],
      timeout: 60000,
      attestation: 'none'
    },
    message: '패스키 등록을 시작하세요'
  });
});

// WebAuthn 등록 완료
app.post('/api/auth/webauthn/register/complete', (req: Request, res: Response) => {
  console.log('🔥 WebAuthn 등록 완료 실행됨');
  console.log('📝 요청 데이터:', req.body);
  
  const { credential, sessionId } = req.body;
  
  const mockUser = {
    id: `user_${Date.now()}`,
    did: `did:cue:${Date.now()}`,
    username: `user_${Date.now()}`,
    email: null,
    displayName: 'CUE User',
    trustScore: 50,
    createdAt: new Date().toISOString()
  };
  
  const sessionToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  
  res.json({
    success: true,
    user: mockUser,
    sessionToken: sessionToken,
    sessionId: sessionId,
    message: '회원가입이 완료되었습니다',
    cueBalance: 100,
    timestamp: new Date().toISOString()
  });
});

// WebAuthn 로그인 시작
app.post('/api/auth/webauthn/login/start', (req: Request, res: Response) => {
  console.log('🔑 WebAuthn 로그인 시작 실행됨');
  
  res.json({
    success: true,
    sessionId: `login_session_${Date.now()}`,
    options: {
      challenge: Buffer.from(`challenge_${Date.now()}`).toString('base64'),
      timeout: 60000,
      rpId: 'localhost',
      allowCredentials: []
    },
    message: '등록된 패스키로 로그인하세요'
  });
});

// WebAuthn 로그인 완료
app.post('/api/auth/webauthn/login/complete', (req: Request, res: Response) => {
  console.log('🔑 WebAuthn 로그인 완료 실행됨');
  
  const mockUser = {
    id: 'existing_user_123',
    did: 'did:cue:existing:123',
    username: 'existing_user',
    email: 'user@example.com',
    displayName: 'Returning User',
    trustScore: 75,
    lastLogin: new Date().toISOString()
  };
  
  const sessionToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  
  res.json({
    success: true,
    user: mockUser,
    sessionToken: sessionToken,
    sessionId: req.body.sessionId,
    message: '로그인이 완료되었습니다',
    cueBalance: 250,
    timestamp: new Date().toISOString()
  });
});

console.log('✅ WebAuthn API 라우트 등록 완료');

// ============================================================================
// 🎫 Passport API (Mock 버전)
// ============================================================================

// Passport 조회
app.get('/api/passport/:did', (req: Request, res: Response) => {
  console.log('🎫 Passport 조회 실행됨');
  console.log('📝 DID:', req.params.did);
  
  const mockPassport = {
    did: req.params.did,
    personalityProfile: {
      traits: ['curious', 'analytical', 'creative'],
      preferences: {
        communication_style: 'detailed',
        information_depth: 'comprehensive',
        response_tone: 'professional'
      }
    },
    cueBalance: 150,
    trustScore: 75,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    passport: mockPassport,
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Passport API 라우트 등록 완료');

// ============================================================================
// 🤖 AI Chat API (Mock 버전)
// ============================================================================

app.post('/api/ai/chat', (req: Request, res: Response) => {
  console.log('🤖 AI 채팅 실행됨');
  console.log('📝 요청:', req.body);
  
  const { message, conversationId } = req.body;
  
  const mockResponse = {
    success: true,
    response: {
      content: `안녕하세요! "${message}"에 대한 개인화된 AI 응답입니다. 현재는 Mock 모드로 작동하고 있습니다.`,
      conversationId: conversationId || `conv_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      personalityContext: {
        adaptedFor: 'analytical_user',
        tone: 'professional',
        depth: 'comprehensive'
      }
    },
    cueEarned: 5,
    timestamp: new Date().toISOString()
  };
  
  res.json(mockResponse);
});

console.log('✅ AI Chat API 라우트 등록 완료');

// ============================================================================
// 💰 CUE API (Mock 버전)
// ============================================================================

app.get('/api/cue/balance/:did', (req: Request, res: Response) => {
  console.log('💰 CUE 잔액 조회 실행됨');
  
  res.json({
    success: true,
    balance: Math.floor(Math.random() * 1000) + 100,
    did: req.params.did,
    lastUpdated: new Date().toISOString()
  });
});

app.post('/api/cue/mine', (req: Request, res: Response) => {
  console.log('⛏️ CUE 마이닝 실행됨');
  
  const earned = Math.floor(Math.random() * 10) + 1;
  
  res.json({
    success: true,
    earned: earned,
    newBalance: Math.floor(Math.random() * 1000) + 100 + earned,
    timestamp: new Date().toISOString()
  });
});

console.log('✅ CUE API 라우트 등록 완료');

// ============================================================================
// 🔍 Debug API
// ============================================================================

app.get('/api/debug/routes', (req: Request, res: Response) => {
  console.log('🔍 라우트 디버그 실행됨');
  
  const routes = [
    'GET /test',
    'GET /health', 
    'GET /ping',
    'GET /api/auth/webauthn/test',
    'POST /api/auth/webauthn/register/start',
    'POST /api/auth/webauthn/register/complete',
    'POST /api/auth/webauthn/login/start',
    'POST /api/auth/webauthn/login/complete',
    'GET /api/passport/:did',
    'POST /api/ai/chat',
    'GET /api/cue/balance/:did',
    'POST /api/cue/mine',
    'GET /api/debug/routes'
  ];
  
  res.json({
    success: true,
    routes: routes,
    total: routes.length,
    timestamp: new Date().toISOString()
  });
});

console.log('✅ Debug API 라우트 등록 완료');

// ============================================================================
// 🚫 404 핸들러
// ============================================================================

app.use('*', (req: Request, res: Response) => {
  console.log(`❌ 404 - 경로를 찾을 수 없음: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /test',
      'GET /health',
      'GET /ping',
      'GET /api/auth/webauthn/test',
      'POST /api/auth/webauthn/register/*',
      'GET /api/passport/:did',
      'POST /api/ai/chat'
    ]
  });
});

// ============================================================================
// 🚀 서버 시작
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log('🚀 간단한 AI Personal 백엔드 시작됨');
  console.log('🚀 ================================');
  console.log(`📍 서버: http://localhost:${PORT}`);
  console.log(`🏥 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🧪 테스트: http://localhost:${PORT}/test`);
  console.log('📋 주요 API:');
  console.log('  🔐 WebAuthn: /api/auth/webauthn/*');
  console.log('  🎫 Passport: /api/passport/:did');
  console.log('  🤖 AI Chat: /api/ai/chat');
  console.log('  💰 CUE: /api/cue/*');
  console.log('  🔍 Debug: /api/debug/routes');
  console.log('🚀 ================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 서버 종료 중...');
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다');
    process.exit(0);
  });
});

export default app;