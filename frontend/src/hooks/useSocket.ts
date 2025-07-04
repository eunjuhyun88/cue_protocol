// ============================================================================
// 📁 frontend/src/hooks/useSocket.ts
// 📡 실제 Socket.IO 실시간 통신 관리 훅
// ============================================================================
// Socket.IO 클라이언트를 사용한 실제 실시간 통신 구현
// CUE 마이닝 알림, AI 채팅 상태, 데이터 동기화 등을 처리

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// 📝 타입 정의
// ============================================================================
interface SocketEvents {
  // 연결 관련
  'connection:confirmed': (data: { success: boolean; userDid: string; connectedUsers: number }) => void;
  'connection:error': (error: { message: string }) => void;
  
  // CUE 마이닝 관련
  'cue:mined': (data: { success: boolean; amount: number; source: string; message: string }) => void;
  'cue:error': (error: { success: false; error: string }) => void;
  
  // AI 채팅 관련
  'ai:stream': (data: { chunk: string; messageId: string; isComplete: boolean }) => void;
  'ai:response': (data: { response: string; messageId: string; cueEarned: number }) => void;
  
  // 데이터 추출 관련
  'extraction:progress': (data: { step: string; progress: number; message: string }) => void;
  'extraction:complete': (data: { success: boolean; dataPoints: number; cueEarned: number }) => void;
  
  // 시스템 알림
  'system:notification': (data: { type: string; title: string; message: string }) => void;
  'system:update': (data: { version: string; features: string[] }) => void;
}

interface UseSocketReturn {
  // 연결 상태
  isConnected: boolean;
  socket: Socket | null;
  connectionId: string | null;
  lastPing: number;
  
  // 기본 소켓 메서드
  emit: <T extends keyof SocketEvents>(event: T, data?: any) => void;
  on: <T extends keyof SocketEvents>(event: T, callback: SocketEvents[T]) => () => void;
  off: <T extends keyof SocketEvents>(event: T, callback?: SocketEvents[T]) => void;
  
  // 연결 관리
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // 특화 메서드
  registerUser: (userDid: string, userInfo?: any) => void;
  sendCueMining: (activity: string, amount: number) => void;
  sendTypingStatus: (isTyping: boolean, messageId?: string) => void;
  sendExtractionProgress: (step: string, progress: number, message: string) => void;
  
  // 상태 정보
  getConnectionInfo: () => { isConnected: boolean; latency: number; reconnectAttempts: number };
}

interface SocketState {
  isConnected: boolean;
  socket: Socket | null;
  connectionId: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  lastPing: number;
  error: string | null;
}

// ============================================================================
// 🎣 useSocket 훅 구현 (실제 Socket.IO)
// ============================================================================
export const useSocket = (
  serverUrl?: string,
  userToken?: string,
  autoConnect: boolean = true
): UseSocketReturn => {
  // ============================================================================
  // 🎛️ 상태 관리
  // ============================================================================
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    socket: null,
    connectionId: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    lastPing: 0,
    error: null
  });

  // 레퍼런스
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<Map<string, Function[]>>(new Map());

  // 기본 설정
  const socketURL = serverUrl || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
  const reconnectDelay = 2000; // 2초
  const pingInterval = 30000; // 30초

  // ============================================================================
  // 🔧 Socket.IO 연결 생성
  // ============================================================================
  const createSocket = useCallback((): Socket => {
    console.log(`🔌 Socket.IO 연결 생성: ${socketURL}`);

    const socketOptions = {
      transports: ['websocket', 'polling'],
      auth: userToken ? { token: userToken } : undefined,
      reconnection: false, // 수동 재연결 제어
      timeout: 10000,
      forceNew: true
    };

    const newSocket = io(socketURL, socketOptions);

    // ============================================================================
    // 🔧 Socket 이벤트 리스너 설정
    // ============================================================================
    
    // 연결 성공
    newSocket.on('connect', () => {
      console.log(`✅ Socket 연결 성공: ${newSocket.id}`);
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionId: newSocket.id,
        reconnectAttempts: 0,
        error: null
      }));

      // 핑 시작
      startPing(newSocket);
    });

    // 연결 실패
    newSocket.on('connect_error', (error) => {
      console.error(`❌ Socket 연결 실패:`, error.message);
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: error.message
      }));

      // 자동 재연결 시도
      handleReconnect();
    });

    // 연결 해제
    newSocket.on('disconnect', (reason) => {
      console.warn(`🔌 Socket 연결 해제: ${reason}`);
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionId: null
      }));

      stopPing();

      // 서버 측 연결 해제가 아닌 경우 재연결 시도
      if (reason !== 'io server disconnect') {
        handleReconnect();
      }
    });

    // 에러 처리
    newSocket.on('error', (error) => {
      console.error(`💥 Socket 에러:`, error);
      setState(prev => ({ ...prev, error: error.message || 'Socket error' }));
    });

    // 핑-퐁 응답
    newSocket.on('pong', (latency) => {
      setState(prev => ({ ...prev, lastPing: latency }));
    });

    return newSocket;
  }, [socketURL, userToken]);

  // ============================================================================
  // 🔧 연결 관리 메서드
  // ============================================================================
  
  const connect = useCallback(() => {
    if (state.socket?.connected) {
      console.log(`ℹ️ Socket이 이미 연결되어 있습니다`);
      return;
    }

    console.log(`🔌 Socket 연결 시도...`);
    
    try {
      const newSocket = createSocket();
      setState(prev => ({ ...prev, socket: newSocket }));
    } catch (error: any) {
      console.error(`❌ Socket 생성 실패:`, error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [state.socket, createSocket]);

  const disconnect = useCallback(() => {
    console.log(`🔌 Socket 연결 해제`);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopPing();

    if (state.socket) {
      state.socket.disconnect();
      setState(prev => ({
        ...prev,
        socket: null,
        isConnected: false,
        connectionId: null,
        reconnectAttempts: 0
      }));
    }
  }, [state.socket]);

  const reconnect = useCallback(() => {
    console.log(`🔄 Socket 재연결 시도`);
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  const handleReconnect = useCallback(() => {
    if (state.reconnectAttempts >= state.maxReconnectAttempts) {
      console.error(`❌ 최대 재연결 시도 횟수 초과: ${state.maxReconnectAttempts}`);
      return;
    }

    const delay = reconnectDelay * Math.pow(2, state.reconnectAttempts); // 지수적 백오프
    
    console.log(`🔄 ${delay}ms 후 재연결 시도 (${state.reconnectAttempts + 1}/${state.maxReconnectAttempts})`);
    
    setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [state.reconnectAttempts, state.maxReconnectAttempts, connect]);

  // ============================================================================
  // 🔧 핑-퐁 관리
  // ============================================================================
  
  const startPing = useCallback((socket: Socket) => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        const startTime = Date.now();
        socket.emit('ping', startTime);
      }
    }, pingInterval);
  }, []);

  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // ============================================================================
  // 🔧 이벤트 관리 메서드
  // ============================================================================
  
  const emit = useCallback(<T extends keyof SocketEvents>(event: T, data?: any) => {
    if (!state.socket || !state.isConnected) {
      console.warn(`⚠️ Socket이 연결되지 않음: ${String(event)}`);
      return;
    }

    console.log(`📤 Socket 이벤트 전송: ${String(event)}`, data);
    state.socket.emit(String(event), data);
  }, [state.socket, state.isConnected]);

  const on = useCallback(<T extends keyof SocketEvents>(
    event: T, 
    callback: SocketEvents[T]
  ): (() => void) => {
    if (!state.socket) {
      console.warn(`⚠️ Socket이 없음: ${String(event)}`);
      return () => {};
    }

    console.log(`📥 Socket 이벤트 리스너 등록: ${String(event)}`);
    
    // 리스너 목록에 추가
    const eventStr = String(event);
    const listeners = listenersRef.current.get(eventStr) || [];
    listeners.push(callback as Function);
    listenersRef.current.set(eventStr, listeners);
    
    state.socket.on(eventStr, callback as any);

    // cleanup 함수 반환
    return () => {
      if (state.socket) {
        state.socket.off(eventStr, callback as any);
      }
      
      // 리스너 목록에서 제거
      const currentListeners = listenersRef.current.get(eventStr) || [];
      const index = currentListeners.indexOf(callback as Function);
      if (index > -1) {
        currentListeners.splice(index, 1);
        listenersRef.current.set(eventStr, currentListeners);
      }
    };
  }, [state.socket]);

  const off = useCallback(<T extends keyof SocketEvents>(
    event: T, 
    callback?: SocketEvents[T]
  ) => {
    if (!state.socket) return;

    const eventStr = String(event);
    
    if (callback) {
      state.socket.off(eventStr, callback as any);
      
      // 리스너 목록에서 제거
      const listeners = listenersRef.current.get(eventStr) || [];
      const index = listeners.indexOf(callback as Function);
      if (index > -1) {
        listeners.splice(index, 1);
        listenersRef.current.set(eventStr, listeners);
      }
    } else {
      state.socket.off(eventStr);
      listenersRef.current.delete(eventStr);
    }

    console.log(`📥 Socket 이벤트 리스너 제거: ${eventStr}`);
  }, [state.socket]);

  // ============================================================================
  // 🔧 특화 메서드들
  // ============================================================================
  
  const registerUser = useCallback((userDid: string, userInfo?: any) => {
    console.log(`👤 사용자 등록: ${userDid}`);
    emit('user:register', { userDid, ...userInfo });
  }, [emit]);

  const sendCueMining = useCallback((activity: string, amount: number) => {
    console.log(`⛏️ CUE 마이닝 알림: ${activity} (+${amount})`);
    emit('cue:mine', { activity, amount, timestamp: new Date().toISOString() });
  }, [emit]);

  const sendTypingStatus = useCallback((isTyping: boolean, messageId?: string) => {
    emit('chat:typing', { isTyping, messageId, timestamp: new Date().toISOString() });
  }, [emit]);

  const sendExtractionProgress = useCallback((step: string, progress: number, message: string) => {
    console.log(`📊 추출 진행상황: ${step} (${progress}%)`);
    emit('extraction:progress', { step, progress, message });
  }, [emit]);

  // ============================================================================
  // 🔧 상태 정보 메서드
  // ============================================================================
  
  const getConnectionInfo = useCallback(() => {
    return {
      isConnected: state.isConnected,
      latency: state.lastPing,
      reconnectAttempts: state.reconnectAttempts
    };
  }, [state.isConnected, state.lastPing, state.reconnectAttempts]);

  // ============================================================================
  // 🔄 생명주기 관리
  // ============================================================================
  
  // 자동 연결
  useEffect(() => {
    if (autoConnect) {
      console.log(`🔄 자동 Socket 연결 시작`);
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // userToken 변경시 재연결
  useEffect(() => {
    if (userToken && state.socket) {
      console.log(`🔄 사용자 토큰 변경으로 인한 재연결`);
      reconnect();
    }
  }, [userToken, reconnect, state.socket]);

  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPing();
      disconnect();
    };
  }, [disconnect, stopPing]);

  // ============================================================================
  // 🎯 반환값
  // ============================================================================
  return {
    // 연결 상태
    isConnected: state.isConnected,
    socket: state.socket,
    connectionId: state.connectionId,
    lastPing: state.lastPing,
    
    // 기본 소켓 메서드
    emit,
    on,
    off,
    
    // 연결 관리
    connect,
    disconnect,
    reconnect,
    
    // 특화 메서드
    registerUser,
    sendCueMining,
    sendTypingStatus,
    sendExtractionProgress,
    
    // 상태 정보
    getConnectionInfo
  };
};

// ============================================================================
// 🔧 Socket.IO 설치 및 설정 가이드
// ============================================================================
/*
📦 설치 방법:
npm install socket.io-client

🔧 사용 예시:
const { isConnected, emit, on } = useSocket('http://localhost:3001', userToken);

// 사용자 등록
useEffect(() => {
  if (isConnected && userDid) {
    registerUser(userDid, { username: 'User123' });
  }
}, [isConnected, userDid]);

// CUE 마이닝 알림 수신
useEffect(() => {
  const cleanup = on('cue:mined', (data) => {
    console.log('CUE 마이닝:', data);
    toast.success(`${data.amount} CUE 토큰 획득!`);
  });
  
  return cleanup;
}, [on]);

🖥️ 백엔드 서버 설정:
backend/src/app.ts에 Socket.IO 서버 추가 필요
*/

export default useSocket;