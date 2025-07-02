//// ============================================================================
// 🎣 2단계: 수정된 useSocket Hook
// frontend/src/hooks/useSocket.ts
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { socketClient } from '@/lib/socket-client';

export interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export function useSocket(autoConnect = true) {
  const [state, setState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null
  });

  const connect = useCallback(async (token?: string) => {
    setState(prev => ({ ...prev, connecting: true, error: null }));
    
    try {
      const success = await socketClient.connect(token);
      setState({
        connected: success,
        connecting: false,
        error: success ? null : 'Backend offline - using mock mode'
      });
      
      return success;
    } catch (error) {
      setState({
        connected: false,
        connecting: false,
        error: 'Connection failed - mock mode active'
      });
      
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    socketClient.disconnect();
    setState({
      connected: false,
      connecting: false,
      error: null
    });
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (!autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    socket: socketClient
  };
}
frontend/src/hooks/useSocket.ts