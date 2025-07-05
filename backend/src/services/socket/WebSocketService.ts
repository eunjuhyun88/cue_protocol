// ============================================================================
// 🔌 WebSocket 서비스
// 경로: backend/src/services/socket/WebSocketService.ts
// 용도: 실시간 WebSocket 연결 관리
// ============================================================================

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { DatabaseService } from '../database/DatabaseService';

export class WebSocketService {
  private io: SocketIOServer;
  private db: DatabaseService;

  constructor(httpServer: HTTPServer) {
    this.db = DatabaseService.getInstance();
    
    // Socket.IO 서버 초기화
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io/', // 기본 Socket.IO 경로
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('🔌 WebSocket 서비스 초기화 완료');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('📡 클라이언트 연결됨:', socket.id);

      // 인증 처리
      socket.on('auth', async (data) => {
        try {
          console.log('🔑 WebSocket 인증 요청:', data.token ? '토큰 있음' : '토큰 없음');
          
          if (data.token) {
            // JWT 토큰 검증 (실제 구현에서는 JWT 라이브러리 사용)
            socket.data.authenticated = true;
            socket.data.token = data.token;
            socket.emit('auth_success', { message: '인증 성공' });
          }
        } catch (error) {
          console.error('❌ WebSocket 인증 실패:', error);
          socket.emit('auth_error', { message: '인증 실패' });
        }
      });

      // CUE 업데이트 구독
      socket.on('subscribe_cue', (data) => {
        if (data.userId) {
          socket.join(`cue_${data.userId}`);
          console.log(`💰 CUE 업데이트 구독: ${data.userId}`);
        }
      });

      // 패스포트 업데이트 구독
      socket.on('subscribe_passport', (data) => {
        if (data.did) {
          socket.join(`passport_${data.did}`);
          console.log(`📋 패스포트 업데이트 구독: ${data.did}`);
        }
      });

      // 연결 해제
      socket.on('disconnect', () => {
        console.log('📡 클라이언트 연결 해제:', socket.id);
      });
    });
  }

  // CUE 업데이트 브로드캐스트
  public broadcastCueUpdate(userId: string, newBalance: number, miningReward?: number): void {
    this.io.to(`cue_${userId}`).emit('cue_update', {
      type: 'cue_update',
      userId,
      newBalance,
      miningReward,
      timestamp: new Date().toISOString()
    });
    console.log(`💰 CUE 업데이트 브로드캐스트: ${userId} -> ${newBalance}`);
  }

  // 패스포트 업데이트 브로드캐스트
  public broadcastPassportUpdate(did: string, updateData: any): void {
    this.io.to(`passport_${did}`).emit('passport_update', {
      type: 'passport_update',
      did,
      updateData,
      timestamp: new Date().toISOString()
    });
    console.log(`📋 패스포트 업데이트 브로드캐스트: ${did}`);
  }

  // 연결된 클라이언트 수 조회
  public getConnectedClientsCount(): number {
    return this.io.engine.clientsCount;
  }

  // 서비스 종료
  public close(): void {
    this.io.close();
    console.log('🔌 WebSocket 서비스 종료됨');
  }
}

export default WebSocketService;
