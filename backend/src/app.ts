// ============================================================================
// 🚀 Final0626 AI Passport + CUE Backend Server (WebSocket 통합)
// 경로: backend/src/app.ts
// 용도: Express 서버 메인 애플리케이션 + WebSocket
// 수정사항: WebSocket 서비스 통합, /ws 경로 문제 해결
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { DatabaseService } from './services/database/DatabaseService';
import WebSocketService from './services/socket/WebSocketService';

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// HTTP 서버 생성
const httpServer = createServer(app);

console.log('🚀 Starting Final0626 AI Passport Backend with WebSocket...');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);

// ============================================================================
// 🛡️ 보안 및 미들웨어 설정
// ============================================================================

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(morgan('📡 :method :url from :req[origin]', {
  skip: (req) => req.url === '/health' && req.method === 'GET'
}));

// ============================================================================
// 🔌 WebSocket 서비스 초기화
// ============================================================================

let websocketService: WebSocketService;

try {
  websocketService = new WebSocketService(httpServer);
  console.log('✅ WebSocket 서비스 초기화 성공');
  
  // WebSocket 서비스를 전역에서 사용할 수 있도록 설정
  app.set('websocketService', websocketService);
} catch (error) {
  console.error('❌ WebSocket 서비스 초기화 실패:', error);
}

// ============================================================================
// 📊 헬스 체크 API (WebSocket 정보 포함)
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  try {
    const connectedClients = websocketService ? websocketService.getConnectedClientsCount() : 0;
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      server: 'Final0626 AI Passport Backend',
      version: '2.0.0',
      database: 'DatabaseService',
      websocket: {
        enabled: !!websocketService,
        connectedClients,
        endpoint: '/socket.io/'
      },
      services: {
        webauthn: true,
        ai: true,
        cue: true,
        vault: true,
        websocket: !!websocketService
      }
    });
  } catch (error) {
    console.error('❌ Health check 오류:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// 🔧 /ws 경로 처리 (404 에러 해결)
// ============================================================================

// /ws 요청을 /socket.io/로 리다이렉트
app.get('/ws', (req: Request, res: Response) => {
  res.json({
    message: 'WebSocket은 /socket.io/ 경로를 사용합니다',
    redirect: '/socket.io/',
    info: 'Socket.IO 클라이언트를 사용해주세요',
    example: 'const socket = io("http://localhost:3001");'
  });
});

// WebSocket 상태 API
app.use('/api/websocket', require('./routes/websocket').default);

// ============================================================================
// 🛣️ API 라우트 등록
// ============================================================================

// 인증 라우트
try {
  const authWebAuthnRoutes = require('./routes/auth/webauthn').default;
  app.use('/api/auth/webauthn', authWebAuthnRoutes);
  console.log('✅ WebAuthn 라우트 등록됨: /api/auth/webauthn');
} catch (error) {
  console.error('❌ WebAuthn 라우트 로딩 실패:', error);
}

// AI 라우트
try {
  const aiChatRoutes = require('./routes/ai/chat').default;
  app.use('/api/ai/chat', aiChatRoutes);
  console.log('✅ AI 채팅 라우트 등록됨: /api/ai/chat');
} catch (error) {
  console.error('❌ AI 채팅 라우트 로딩 실패:', error);
}

// CUE 라우트
try {
  const cueRoutes = require('./routes/cue/cue').default;
  app.use('/api/cue', cueRoutes);
  console.log('✅ CUE 라우트 등록됨: /api/cue');
} catch (error) {
  console.error('❌ CUE 라우트 로딩 실패:', error);
}

// Vault 라우트
try {
  const vaultRoutes = require('./routes/vault').default;
  app.use('/api/vault', vaultRoutes);
  console.log('✅ Vault 라우트 등록됨: /api/vault');
} catch (error) {
  console.error('❌ Vault 라우트 로딩 실패:', error);
}

// Debug 라우트
try {
  const debugRoutes = require('./routes/debug').default;
  app.use('/api/debug', debugRoutes);
  console.log('✅ Debug 라우트 등록됨: /api/debug');
} catch (error) {
  console.error('❌ Debug 라우트 로딩 실패:', error);
}

// ============================================================================
// 🚨 에러 핸들링
// ============================================================================

app.use((req: Request, res: Response) => {
  console.log(`❌ 404 - 찾을 수 없는 경로: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'API 경로를 찾을 수 없습니다',
    method: req.method,
    path: req.path,
    suggestion: req.path === '/ws' ? 'Socket.IO는 /socket.io/ 경로를 사용합니다' : '올바른 API 경로를 확인해주세요',
    timestamp: new Date().toISOString()
  });
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 서버 오류:', error);
  res.status(500).json({
    success: false,
    error: '내부 서버 오류가 발생했습니다',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 🚀 서버 시작
// ============================================================================

const server = httpServer.listen(PORT, () => {
  console.log('\n🎉 ================================');
  console.log('🚀 Final0626 Backend Server Started!');
  console.log('🎉 ================================');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io/`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔍 WebSocket Info: http://localhost:${PORT}/api/websocket/info`);
  console.log('🎉 ================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM 신호 수신, 서버 종료 중...');
  
  if (websocketService) {
    websocketService.close();
  }
  
  server.close(() => {
    console.log('✅ 서버가 정상적으로 종료되었습니다');
    process.exit(0);
  });
});

export default app;
