// src/hooks/useBackendConnection.ts
import { useState, useEffect, useCallback } from 'react';
import { BackendAPIClient } from '../services/api/BackendAPIClient';

interface UseBackendConnectionReturn {
  connectionStatus: 'checking' | 'connected' | 'disconnected';
  isConnected: boolean;
  connectionDetails: any;
  lastChecked: Date | null;
  retryConnection: () => Promise<void>;
}

export const useBackendConnection = (
  checkInterval: number = 30000 // 30초마다 체크
): UseBackendConnectionReturn => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const api = new BackendAPIClient();

  const checkConnection = useCallback(async () => {
    try {
      setConnectionStatus('checking');
      
      const health = await api.healthCheck();
      
      setConnectionStatus('connected');
      setIsConnected(true);
      setConnectionDetails(health);
      setLastChecked(new Date());
      
      console.log('✅ 백엔드 연결 성공:', health);
    } catch (error) {
      setConnectionStatus('disconnected');
      setIsConnected(false);
      setConnectionDetails(null);
      setLastChecked(new Date());
      
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

  return {
    connectionStatus,
    isConnected,
    connectionDetails,
    lastChecked,
    retryConnection
  };
};