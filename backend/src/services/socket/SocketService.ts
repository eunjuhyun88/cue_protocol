// ============================================================================
// 🔌 SocketService.ts - 의존성 주입 호환 실시간 통신 서비스
// 경로: backend/src/services/socket/SocketService.ts
// 목적: app 의존성 제거, DI Container 호환 구조
// ============================================================================

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

export class SocketService {
  private io?: SocketIOServer;
  private server?: HTTPServer;
  private connectedUsers: Map<string, { socketId: string; userDid: string; username: string }> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    console.log('🔌 SocketService 생성됨 (지연 초기화 방식)');
  }

  /**
   * HTTP 서버가 준비된 후에 초기화
   * DI Container에서 호출되는 시점에는 app이 없을 수 있으므로 지연 초기화 사용
   */
  public initializeWithServer(server: HTTPServer): void {
    if (this.isInitialized) {
      console.log('🔌 SocketService 이미 초기화됨');
      return;
    }

    this.server = server;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });
    
    this.setupEventHandlers();
    this.isInitialized = true;
    
    console.log('✅ SocketService 초기화 완료');
  }

  /**
   * 서버 없이도 기본 기능이 동작하도록 설계 (DI Container 호환)
   */
  private setupEventHandlers(): void {
    if (!this.io) {
      console.warn('⚠️ Socket.IO 서버가 초기화되지 않음');
      return;
    }

    // 인증 미들웨어
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket 연결됨: ${socket.id}`);

      // 사용자 등록
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
    });
  }

  /**
   * Socket 인증 미들웨어
   */
  private async authenticateSocket(socket: any, next: Function) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('🔌 토큰 없는 Socket 연결 허용 (익명 모드)');
        socket.userId = `anonymous_${Date.now()}`;
        socket.userDid = `anonymous_${Date.now()}`;
        socket.username = 'Anonymous';
        return next();
      }

      try {
        const JWT_SECRET = process.env.JWT_SECRET || 'temp-secret-key-for-development';
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        socket.userId = decoded.userId;
        socket.userDid = decoded.did || decoded.userId;
        socket.username = decoded.username || 'User';
        
        console.log(`✅ Socket 인증 성공: ${socket.username}`);
        next();
      } catch (jwtError) {
        console.warn('⚠️ JWT 검증 실패, 익명 모드로 연결:', jwtError.message);
        socket.userId = `anonymous_${Date.now()}`;
        socket.userDid = `anonymous_${Date.now()}`;
        socket.username = 'Anonymous';
        next();
      }
    } catch (error) {
      console.error('❌ Socket 인증 오류:', error);
      next(new Error('Socket authentication failed'));
    }
  }

  /**
   * 사용자 등록
   */
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

    console.log(`✅ 사용자 등록: ${socket.username} (${socket.userDid})`);
  }

  /**
   * CUE 마이닝 처리
   */
  private async handleCueMining(socket: any, data: any): Promise<void> {
    try {
      const miningData = {
        userDid: socket.userDid,
        amount: data.amount || Math.floor(Math.random() * 10) + 5,
        source: data.source || 'socket_mining',
        timestamp: new Date().toISOString()
      };

      // 해당 사용자에게 마이닝 완료 알림
      socket.emit('cue:mined', {
        success: true,
        ...miningData,
        message: `💎 ${miningData.amount} CUE tokens mined from ${miningData.source}!`
      });

      console.log(`⛏️ CUE 마이닝 알림 전송: ${socket.username} - ${miningData.amount} CUE`);

    } catch (error) {
      console.error('❌ CUE 마이닝 처리 오류:', error);
      socket.emit('cue:error', {
        success: false,
        error: 'Failed to process CUE mining',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 타이핑 상태 처리
   */
  private handleTypingStatus(socket: any, data: any): void {
    socket.emit('chat:typing:ack', {
      success: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 데이터 추출 진행상황 처리
   */
  private handleExtractionProgress(socket: any, data: any): void {
    socket.emit('extraction:progress:update', {
      step: data.step || 'processing',
      progress: data.progress || 0,
      message: data.message || 'Processing...',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 연결 해제 처리
   */
  private handleDisconnect(socket: any): void {
    if (socket.userDid) {
      this.connectedUsers.delete(socket.userDid);
      console.log(`❌ 사용자 연결 해제: ${socket.username} (${socket.userDid})`);
    }
  }

  // ============================================================================
  // 🔧 공용 메서드들 (DI Container 호환)
  // ============================================================================

  /**
   * 특정 사용자에게 메시지 전송
   */
  public sendToUser(userDid: string, event: string, data: any): void {
    if (!this.isInitialized || !this.io) {
      console.warn('⚠️ SocketService가 초기화되지 않아 메시지 전송 불가');
      return;
    }

    const userInfo = this.connectedUsers.get(userDid);
    if (userInfo) {
      this.io.to(userInfo.socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      console.log(`📤 메시지 전송: ${userDid} -> ${event}`);
    } else {
      console.warn(`⚠️ 사용자 ${userDid}가 연결되어 있지 않음`);
    }
  }

  /**
   * 모든 연결된 사용자에게 브로드캐스트
   */
  public broadcast(event: string, data: any): void {
    if (!this.isInitialized || !this.io) {
      console.warn('⚠️ SocketService가 초기화되지 않아 브로드캐스트 불가');
      return;
    }

    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 브로드캐스트: ${event} -> ${this.connectedUsers.size}명`);
  }

  /**
   * CUE 밸런스 업데이트 알림
   */
  public notifyCueBalanceUpdate(userDid: string, newBalance: number, change: number): void {
    this.sendToUser(userDid, 'cue:balance:updated', {
      newBalance,
      change,
      changeType: change > 0 ? 'increase' : 'decrease'
    });
  }

  /**
   * AI 응답 실시간 스트리밍
   */
  public streamAIResponse(userDid: string, chunk: string): void {
    this.sendToUser(userDid, 'ai:response:chunk', {
      chunk,
      chunkLength: chunk.length
    });
  }

  /**
   * 데이터 볼트 업데이트 알림
   */
  public notifyDataVaultUpdate(userDid: string, vaultInfo: any): void {
    this.sendToUser(userDid, 'vault:updated', {
      vaultId: vaultInfo.id,
      action: vaultInfo.action || 'updated',
      vaultName: vaultInfo.name
    });
  }

  /**
   * 개인화 프로필 업데이트 알림
   */
  public notifyProfileUpdate(userDid: string, profileChanges: any): void {
    this.sendToUser(userDid, 'profile:updated', {
      changes: profileChanges,
      changeCount: Array.isArray(profileChanges) ? profileChanges.length : 1
    });
  }

  /**
   * 시스템 알림 전송
   */
  public sendSystemNotification(userDid: string, notification: any): void {
    this.sendToUser(userDid, 'system:notification', {
      title: notification.title || 'System Notification',
      message: notification.message,
      type: notification.type || 'info',
      priority: notification.priority || 'normal'
    });
  }

  // ============================================================================
  // 🔧 상태 및 관리 메서드들
  // ============================================================================

  /**
   * 연결된 사용자 수 반환
   */
  public getConnectedUserCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * 특정 사용자의 연결 상태 확인
   */
  public isUserConnected(userDid: string): boolean {
    return this.connectedUsers.has(userDid);
  }

  /**
   * 연결된 모든 사용자 목록 반환
   */
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * SocketService 상태 반환
   */
  public getStatus(): any {
    return {
      initialized: this.isInitialized,
      connectedUsers: this.connectedUsers.size,
      hasServer: !!this.server,
      hasSocketIO: !!this.io,
      status: this.isInitialized ? 'operational' : 'pending-initialization'
    };
  }

  /**
   * SocketService 정리 (앱 종료시 호출)
   */
  public dispose(): void {
    if (this.io) {
      console.log('🧹 SocketService 정리 중...');
      
      // 모든 연결된 사용자에게 서버 종료 알림
      this.broadcast('server:shutdown', {
        message: 'Server is shutting down',
        reconnectAfter: 5000
      });
      
      // Socket.IO 서버 종료
      this.io.close();
      this.io = undefined;
    }
    
    this.connectedUsers.clear();
    this.isInitialized = false;
    
    console.log('✅ SocketService 정리 완료');
  }

  // ============================================================================
  // 🔧 DI Container 호환 정적 메서드들
  // ============================================================================

  /**
   * DI Container에서 안전하게 사용할 수 있는 더미 인스턴스 생성
   * 실제 서버가 준비되기 전까지 에러 없이 동작
   */
  public static createSafeInstance(): SocketService {
    const instance = new SocketService();
    
    // 모든 메서드가 안전하게 동작하도록 오버라이드
    const originalMethods = [
      'sendToUser', 'broadcast', 'notifyCueBalanceUpdate', 
      'streamAIResponse', 'notifyDataVaultUpdate', 
      'notifyProfileUpdate', 'sendSystemNotification'
    ];
    
    originalMethods.forEach(methodName => {
      const originalMethod = (instance as any)[methodName];
      (instance as any)[methodName] = function(...args: any[]) {
        if (!instance.isInitialized) {
          console.log(`🔌 ${methodName} 호출됨 (미초기화 상태) - 무시`);
          return;
        }
        return originalMethod.apply(instance, args);
      };
    });
    
    return instance;
  }
}

// ============================================================================
// 🔧 기본 내보내기
// ============================================================================

export default SocketService;

// ============================================================================
// 📝 사용 예시 (주석)
// ============================================================================

/*
// DI Container에서 사용:
const socketService = SocketService.createSafeInstance();

// 서버 준비 후 초기화:
const server = app.listen(PORT, () => {
  socketService.initializeWithServer(server);
});

// 사용:
socketService.notifyCueBalanceUpdate('user123', 2500, 100);
socketService.sendSystemNotification('user123', {
  title: 'Welcome!',
  message: 'Your AI Passport is ready'
});
*/