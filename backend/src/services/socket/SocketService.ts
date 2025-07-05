// ============================================================================
// 📡 SocketService - import 경로 수정
// 파일: backend/src/services/socket/SocketService.ts
// 
// 🔧 수정사항:
// ❌ 제거: import { DIContainer } from '../core/DIContainer'
// ✅ 올바른 import 경로들만 유지
// ✅ createSafeInstance와 initializeWithServer 메서드 포함
// ============================================================================

import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/DatabaseService';  // ✅ 올바른 경로

export class SocketService {
  private static instance: SocketService | null = null;
  private io: Server | null = null;
  private db: DatabaseService;
  private connectedUsers: Map<string, { socketId: string; userDid: string; username: string }> = new Map();
  private initialized: boolean = false;
  private server: HttpServer | null = null;

  constructor(databaseService?: DatabaseService) {
    this.db = databaseService || DatabaseService.getInstance();
    console.log('🔌 SocketService 인스턴스 생성됨');
  }

  // ============================================================================
  // 🛡️ 안전한 인스턴스 생성 (정적 메서드)
  // ============================================================================

  /**
   * 안전한 SocketService 인스턴스 생성
   */
  static createSafeInstance(databaseService?: DatabaseService): SocketService | null {
    try {
      if (!SocketService.instance) {
        SocketService.instance = new SocketService(databaseService);
      }
      return SocketService.instance;
    } catch (error) {
      console.error('❌ SocketService 인스턴스 생성 실패:', error);
      return null;
    }
  }

  /**
   * 기존 인스턴스 반환
   */
  static getInstance(): SocketService | null {
    return SocketService.instance;
  }

  // ============================================================================
  // 🚀 서버 초기화 메서드
  // ============================================================================

  /**
   * HTTP 서버와 함께 Socket.IO 초기화
   */
  initializeWithServer(server: HttpServer): boolean {
    try {
      if (this.initialized && this.io) {
        console.log('🔌 SocketService 이미 초기화됨');
        return true;
      }

      this.server = server;
      
      // Socket.IO 서버 생성
      this.io = new Server(server, {
        cors: {
          origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
          ],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
      });

      this.setupSocketHandlers();
      this.initialized = true;

      console.log('✅ SocketService 서버 초기화 완료');
      return true;

    } catch (error) {
      console.error('❌ SocketService 서버 초기화 실패:', error);
      this.initialized = false;
      return false;
    }
  }

  // ============================================================================
  // 🔧 Socket 핸들러 설정
  // ============================================================================

  private setupSocketHandlers(): void {
    if (!this.io) {
      console.error('❌ Socket.IO 서버가 초기화되지 않음');
      return;
    }

    // 인증 미들웨어
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket 연결됨: ${socket.id}`);

      // 사용자 연결 등록
      socket.on('user:register', (data) => {
        this.registerUser(socket, data);
      });

      // CUE 마이닝 실시간 알림
      socket.on('cue:mine', (data) => {
        this.handleCueMining(socket, data);
      });

      // AI 채팅 상태 실시간 전송
      socket.on('chat:typing', (data) => {
        this.handleTypingStatus(socket, data);
      });

      // 데이터 추출 진행상황 실시간 전송
      socket.on('extraction:progress', (data) => {
        this.handleExtractionProgress(socket, data);
      });

      // 연결 해제
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // 연결 상태 확인
      socket.on('ping', () => {
        socket.emit('pong', {
          timestamp: new Date().toISOString(),
          server: 'ai-personal-backend',
          status: 'healthy'
        });
      });
    });
  }

  // ============================================================================
  // 🔐 인증 및 사용자 관리
  // ============================================================================

  private async authenticateSocket(socket: any, next: Function) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        // 토큰이 없어도 익명 연결 허용 (개발 모드)
        console.log('⚠️ 토큰 없는 Socket 연결 허용 (개발 모드)');
        socket.userId = 'anonymous';
        socket.userDid = `did:anonymous:${Date.now()}`;
        socket.username = 'Anonymous User';
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      socket.userId = decoded.userId;
      socket.userDid = decoded.did || decoded.userDid;
      socket.username = decoded.username || 'Unknown';

      console.log(`✅ Socket 인증 성공: ${socket.username}`);
      next();
    } catch (error) {
      console.warn('⚠️ Socket 인증 실패, 익명 연결 허용:', error.message);
      socket.userId = 'anonymous';
      socket.userDid = `did:anonymous:${Date.now()}`;
      socket.username = 'Anonymous User';
      next();
    }
  }

  private registerUser(socket: any, data: any): void {
    const userInfo = {
      socketId: socket.id,
      userDid: socket.userDid,
      username: socket.username
    };

    this.connectedUsers.set(socket.userDid, userInfo);
    
    // 사용자에게 연결 확인 전송
    socket.emit('connection:confirmed', {
      success: true,
      userDid: socket.userDid,
      connectedUsers: this.connectedUsers.size,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ 사용자 등록됨: ${socket.username} (${socket.userDid})`);
  }

  // ============================================================================
  // 🎯 실시간 이벤트 핸들러
  // ============================================================================

  private async handleCueMining(socket: any, data: any): Promise<void> {
    try {
      const miningData = {
        userDid: socket.userDid,
        amount: data.amount || 10,
        source: data.source || 'manual',
        timestamp: new Date().toISOString()
      };

      socket.emit('cue:mined', {
        success: true,
        ...miningData,
        message: `💎 ${miningData.amount} CUE tokens mined from ${miningData.source}!`
      });

      console.log(`💎 CUE 마이닝 알림 전송: ${socket.username} +${miningData.amount}`);

    } catch (error) {
      console.error('❌ CUE 마이닝 처리 오류:', error);
      socket.emit('cue:error', {
        success: false,
        error: 'Failed to process CUE mining'
      });
    }
  }

  private handleTypingStatus(socket: any, data: any): void {
    socket.emit('chat:typing:ack', {
      success: true,
      timestamp: new Date().toISOString()
    });
  }

  private handleExtractionProgress(socket: any, data: any): void {
    socket.emit('extraction:progress:update', {
      step: data.step || 'processing',
      progress: data.progress || 0,
      message: data.message || 'Processing...',
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnect(socket: any): void {
    if (socket.userDid && socket.userDid !== 'anonymous') {
      this.connectedUsers.delete(socket.userDid);
      console.log(`❌ 사용자 연결 해제: ${socket.username} (${socket.userDid})`);
    }
  }

  // ============================================================================
  // 📡 외부 API (다른 서비스에서 호출)
  // ============================================================================

  /**
   * 특정 사용자에게 메시지 전송
   */
  public sendToUser(userDid: string, event: string, data: any): void {
    if (!this.io || !this.initialized) {
      console.warn('⚠️ SocketService 초기화되지 않음, 메시지 전송 무시');
      return;
    }

    const userInfo = this.connectedUsers.get(userDid);
    if (userInfo) {
      this.io.to(userInfo.socketId).emit(event, data);
      console.log(`📡 메시지 전송: ${event} → ${userInfo.username}`);
    } else {
      console.log(`👻 사용자 오프라인: ${userDid}`);
    }
  }

  /**
   * 모든 연결된 사용자에게 브로드캐스트
   */
  public broadcast(event: string, data: any): void {
    if (!this.io || !this.initialized) {
      console.warn('⚠️ SocketService 초기화되지 않음, 브로드캐스트 무시');
      return;
    }

    this.io.emit(event, data);
    console.log(`📢 브로드캐스트: ${event} → ${this.connectedUsers.size}명`);
  }

  /**
   * CUE 업데이트 브로드캐스트
   */
  public broadcastCueUpdate(userDid: string, amount: number, source: string): void {
    const data = {
      userDid,
      amount,
      source,
      timestamp: new Date().toISOString(),
      message: `💎 +${amount} CUE from ${source}`
    };

    this.sendToUser(userDid, 'cue:balance:updated', data);

    this.broadcast('cue:activity', {
      type: 'mining',
      userDid: userDid.slice(-8), // 익명화
      amount,
      source,
      timestamp: data.timestamp
    });
  }

  /**
   * 특정 사용자의 CUE 밸런스 업데이트 알림
   */
  public notifyCueBalanceUpdate(userDid: string, newBalance: number, change: number): void {
    this.sendToUser(userDid, 'cue:balance:updated', {
      newBalance,
      change,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * AI 응답 실시간 스트리밍
   */
  public streamAIResponse(userDid: string, chunk: string): void {
    this.sendToUser(userDid, 'ai:response:chunk', {
      chunk,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // 📊 상태 확인 및 통계
  // ============================================================================

  /**
   * SocketService 상태 반환
   */
  public getStatus(): {
    connected: boolean;
    users: number;
    health: string;
    initialized: boolean;
    hasServer: boolean;
  } {
    return {
      connected: this.initialized && !!this.io,
      users: this.connectedUsers.size,
      health: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      hasServer: !!this.server
    };
  }

  /**
   * 연결된 사용자 목록 반환
   */
  public getConnectedUsers(): Array<{ userDid: string; username: string; socketId: string }> {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * 통계 정보 반환
   */
  public getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      initialized: this.initialized,
      hasSocket: !!this.io,
      hasServer: !!this.server,
      uptime: this.initialized ? 'running' : 'stopped'
    };
  }

  // ============================================================================
  // 🧹 정리 및 종료
  // ============================================================================

  /**
   * SocketService 정리
   */
  public dispose(): void {
    try {
      if (this.io) {
        this.io.close();
        console.log('🔌 Socket.IO 서버 종료됨');
      }

      this.connectedUsers.clear();
      this.initialized = false;
      this.io = null;
      this.server = null;
      SocketService.instance = null;

      console.log('✅ SocketService 정리 완료');
    } catch (error) {
      console.error('❌ SocketService 정리 중 오류:', error);
    }
  }

  /**
   * 서비스 재시작
   */
  public restart(server?: HttpServer): boolean {
    console.log('🔄 SocketService 재시작 중...');
    
    this.dispose();
    
    if (server) {
      return this.initializeWithServer(server);
    }
    
    return false;
  }
}

export default SocketService;