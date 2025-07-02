// ============================================================================
// 🔧 1단계: 에러 수정된 Socket.IO 클라이언트
// frontend/src/lib/socket-client.ts
// ============================================================================

import { io, Socket } from 'socket.io-client';

interface SocketEvents {
  'connection:confirmed': (data: { success: boolean; socketId: string }) => void;
  'auth:success': (data: { userId: string; userDid: string }) => void;
  'cue:mined': (data: { amount: number; source: string; message: string }) => void;
  'cue:balance:updated': (data: { newBalance: number; change: number }) => void;
  'ai:response:chunk': (data: { chunk: string; timestamp: string }) => void;
  'ai:response:complete': (data: { fullResponse: string }) => void;
}

class FixedSocketClient {
  private socket: Socket | null = null;
  private isConnecting = false;

  async connect(token?: string): Promise<boolean> {
    if (this.socket?.connected) {
      console.log('✅ 이미 연결됨');
      return true;
    }

    if (this.isConnecting) {
      console.log('⏳ 연결 시도 중...');
      return false;
    }

    try {
      this.isConnecting = true;
      console.log('🔌 Socket.IO 연결 시도...');

      this.socket = io('http://localhost:3001', {
        auth: { token: token || this.getStoredToken() },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        autoConnect: true
      });

      return new Promise((resolve) => {
        if (!this.socket) {
          resolve(false);
          return;
        }

        const timeout = setTimeout(() => {
          console.log('⏰ 연결 타임아웃');
          this.isConnecting = false;
          resolve(false);
        }, 5000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('✅ Socket.IO 연결 성공:', this.socket?.id);
          this.isConnecting = false;
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.log('❌ Socket.IO 연결 실패 (Mock 모드로 계속):', error.message);
          this.isConnecting = false;
          resolve(false);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('📴 연결 해제:', reason);
        });
      });

    } catch (error) {
      console.error('❌ Socket 연결 중 오류:', error);
      this.isConnecting = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('📴 Socket 연결 해제됨');
    }
  }

  // CUE 마이닝 이벤트
  onCueMined(callback: (data: any) => void): void {
    this.socket?.on('cue:mined', callback);
  }

  emitCueMining(data: { amount: number; source: string }): void {
    if (this.socket?.connected) {
      console.log('💎 CUE 마이닝 이벤트 발생:', data);
      this.socket.emit('cue:mine', data);
    } else {
      console.log('💎 Mock CUE 마이닝:', data);
    }
  }

  // AI 응답 스트리밍
  onAIResponseChunk(callback: (data: any) => void): void {
    this.socket?.on('ai:response:chunk', callback);
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || localStorage.getItem('cue_session_token') || null;
    }
    return null;
  }

  on(event: string, callback: Function): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: Function): void {
    this.socket?.off(event, callback);
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket 연결되지 않음 - Mock 모드');
    }
  }
}

export const socketClient = new FixedSocketClient();
