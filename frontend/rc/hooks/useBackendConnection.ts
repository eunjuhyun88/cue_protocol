// ============================================================================
// 📁 src/hooks/useBackendConnection.ts
// 🌐 백엔드 연결 상태 관리 훅
// ============================================================================
//// 이 훅은 백엔드 서버와의 연결 상태를 관리하고,
// 주기적으로 연결 상태를 확인합니다.
// 사용자가 페이지를 포커스할 때도 연결 상태를 확인합니다.
// 네트워크 상태 변화에 따라 연결 상태를 업데이트합니다.
// 이 훅은 백엔드 API 클라이언트를 사용하여 연결 상태를 확인합니다.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { BackendAPIClient } from '../services/api/BackendAPIClient';
import type { ConnectionStatus, BackendConnectionState } from '../types/auth.types';

interface UseBackendConnectionReturn {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  connectionDetails: any;
  lastChecked: Date | null;
  retryConnection: () => Promise<void>;
}

export const useBackendConnection = (
  checkInterval: number = 30000 // 30초마다 체크
): UseBackendConnectionReturn => {
  const [state, setState] = useState<BackendConnectionState>({
    status: 'checking',
    isConnected: false,
    connectionDetails: null,
    lastChecked: null
  });

  const api = new BackendAPIClient();

  const checkConnection = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'checking' }));
      
      const health = await api.checkConnection();
      
      setState({
        status: 'connected',
        isConnected: true,
        connectionDetails: health,
        lastChecked: new Date()
      });
      
      console.log('✅ 백엔드 연결 성공:', health);
    } catch (error) {
      setState({
        status: 'disconnected',
        isConnected: false,
        connectionDetails: null,
        lastChecked: new Date()
      });
      
      console.warn('❌ 백엔드 연결 실패:', error);
    }
  }, []);

  const retryConnection = useCallback(async () => {
    console.log('🔄 백엔드 연결 재시도...');
    await checkConnection();
  }, [checkConnection]);

  // 초기 연결 체크
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // 주기적 연결 체크
  useEffect(() => {
    const interval = setInterval(checkConnection, checkInterval);
    return () => clearInterval(interval);
  }, [checkConnection, checkInterval]);

  // 페이지 포커스시 연결 체크
  useEffect(() => {
    const handleFocus = () => {
      // 마지막 체크로부터 5분 이상 지났으면 다시 체크
      if (state.lastChecked && Date.now() - state.lastChecked.getTime() > 5 * 60 * 1000) {
        checkConnection();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkConnection, state.lastChecked]);

  // 온라인/오프라인 이벤트 리스너
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 네트워크 온라인 - 백엔드 연결 체크');
      checkConnection();
    };

    const handleOffline = () => {
      console.log('📵 네트워크 오프라인');
      setState(prev => ({
        ...prev,
        status: 'disconnected',
        isConnected: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return {
    connectionStatus: state.status,
    isConnected: state.isConnected,
    connectionDetails: state.connectionDetails,
    lastChecked: state.lastChecked,
    retryConnection
  };
};