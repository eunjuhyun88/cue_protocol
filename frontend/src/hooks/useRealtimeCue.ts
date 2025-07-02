
// ============================================================================
// 🎣 3단계: 간단한 CUE Hook
// frontend/src/hooks/useRealtimeCue.ts
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export function useRealtimeCue(userDid?: string) {
  const { connected, socket } = useSocket();
  const [balance, setBalance] = useState(15428); // 기본값
  const [lastMining, setLastMining] = useState<{
    amount: number;
    source: string;
    timestamp: Date;
  } | null>(null);

  useEffect(() => {
    if (!connected || !socket) return;

    const handleCueMined = (data: any) => {
      console.log('💎 실시간 CUE 마이닝:', data);
      
      const miningEvent = {
        amount: data.amount,
        source: data.source,
        timestamp: new Date()
      };

      setBalance(prev => prev + data.amount);
      setLastMining(miningEvent);

      // 로컬 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem('cue_balance', JSON.stringify({
          balance: balance + data.amount,
          lastUpdated: new Date().toISOString()
        }));
      }
    };

    socket.onCueMined(handleCueMined);

    return () => {
      socket.off('cue:mined', handleCueMined);
    };
  }, [connected, socket, balance]);

  const triggerMining = useCallback((amount: number, source: string) => {
    if (connected && socket) {
      socket.emitCueMining({ amount, source });
    } else {
      // Mock 마이닝
      console.log('💎 Mock CUE 마이닝:', { amount, source });
      setBalance(prev => prev + amount);
      setLastMining({
        amount,
        source,
        timestamp: new Date()
      });
    }
  }, [connected, socket]);

  // 초기 데이터 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cue_balance');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          setBalance(data.balance || 15428);
        } catch (error) {
          console.warn('로컬 데이터 파싱 실패:', error);
        }
      }
    }
  }, []);

  return {
    balance,
    lastMining,
    connected,
    triggerMining
  };
}