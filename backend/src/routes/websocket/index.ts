// ============================================================================
// 🔌 WebSocket 라우트
// 경로: backend/src/routes/websocket/index.ts
// 용도: WebSocket 상태 확인 및 관리 API
// ============================================================================

import { Router, Request, Response } from 'express';

const router = Router();

// WebSocket 상태 확인
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    websocket: {
      enabled: true,
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true
      }
    },
    timestamp: new Date().toISOString()
  });
});

// WebSocket 연결 정보
router.get('/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    info: {
      message: 'WebSocket 서비스가 실행 중입니다',
      endpoint: '/socket.io/',
      supported_events: [
        'connection',
        'auth',
        'subscribe_cue',
        'subscribe_passport',
        'cue_update',
        'passport_update'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
