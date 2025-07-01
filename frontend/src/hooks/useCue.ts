// ============================================================================
// 📁 src/hooks/useCue.ts
// 💎 CUE 토큰 관리 훅
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { CueAPI } from '../services/api/CueAPI';
import type { 
  CueBalance, 
  CueHistory, 
  CueMiningResult, 
  CueMiningState,
  CueTransaction 
} from '../types/cue.types';

interface UseCueState {
  balance: CueBalance | null;
  history: CueHistory | null;
  miningState: CueMiningState;
  loading: boolean;
  error: string | null;
}

interface UseCueReturn extends UseCueState {
  loadBalance: (userDid: string) => Promise<void>;
  loadHistory: (userDid: string) => Promise<void>;
  mineCue: (data: any) => Promise<CueMiningResult>;
  spendCue: (userDid: string, amount: number, purpose: string) => Promise<void>;
  toggleMining: () => void;
  clearError: () => void;
}

export const useCue = (
  userDid?: string,
  backendConnected: boolean = false
): UseCueReturn => {
  const [state, setState] = useState<UseCueState>({
    balance: null,
    history: null,
    miningState: {
      isActive: false,
      canMine: true,
      cooldownUntil: undefined,
      multiplier: 1.0,
      streakDays: 0
    },
    loading: false,
    error: null
  });

  const api = new CueAPI();

  const loadBalance = useCallback(async (did: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let balance: CueBalance;

      if (backendConnected) {
        console.log('💎 실제 백엔드에서 CUE 잔액 로드:', did);
        balance = await api.getCueBalance(did);
      } else {
        console.log('🔧 Mock CUE 잔액 생성:', did);
        balance = api.generateMockBalance();
        // Mock 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setState(prev => ({
        ...prev,
        balance,
        loading: false
      }));

      console.log('✅ CUE 잔액 로드 완료:', balance);
    } catch (error: any) {
      const errorMessage = error.message || 'CUE 잔액을 불러오는데 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('❌ CUE 잔액 로드 실패:', error);
    }
  }, [backendConnected]);

  const loadHistory = useCallback(async (did: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let history: CueHistory;

      if (backendConnected) {
        console.log('📊 실제 백엔드에서 CUE 히스토리 로드:', did);
        history = await api.getCueHistory(did);
      } else {
        console.log('🔧 Mock CUE 히스토리 생성:', did);
        history = api.generateMockHistory();
        // Mock 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      setState(prev => ({
        ...prev,
        history,
        loading: false
      }));

      console.log('✅ CUE 히스토리 로드 완료:', history.transactions.length, '개 거래');
    } catch (error: any) {
      const errorMessage = error.message || 'CUE 히스토리를 불러오는데 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('❌ CUE 히스토리 로드 실패:', error);
    }
  }, [backendConnected]);

  const mineCue = useCallback(async (miningData: any): Promise<CueMiningResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let result: CueMiningResult;

      if (backendConnected) {
        console.log('⛏️ 실제 CUE 마이닝 실행:', miningData);
        result = await api.mineCue(miningData);
      } else {
        console.log('🔧 Mock CUE 마이닝:', miningData);
        // Mock 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500));
        result = api.generateMockMiningResult();
      }

      // 마이닝 완료 후 잔액 업데이트
      if (state.balance && userDid) {
        setState(prev => ({
          ...prev,
          balance: prev.balance ? {
            ...prev.balance,
            total: prev.balance.total + result.cueEarned,
            available: prev.balance.available + result.cueEarned,
            lastUpdated: new Date()
          } : null,
          loading: false
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }

      console.log('✅ CUE 마이닝 완료:', result);
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'CUE 마이닝에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('❌ CUE 마이닝 실패:', error);
      throw error;
    }
  }, [backendConnected, state.balance, userDid]);

  const spendCue = useCallback(async (did: string, amount: number, purpose: string) => {
    if (!state.balance || state.balance.available < amount) {
      throw new Error('잔액이 부족합니다.');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (backendConnected) {
        console.log('💸 실제 CUE 사용:', { did, amount, purpose });
        await api.spendCue(did, amount, purpose);
      } else {
        console.log('🔧 Mock CUE 사용:', { did, amount, purpose });
        // Mock 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 잔액 업데이트
      setState(prev => ({
        ...prev,
        balance: prev.balance ? {
          ...prev.balance,
          total: prev.balance.total - amount,
          available: prev.balance.available - amount,
          lastUpdated: new Date()
        } : null,
        loading: false
      }));

      console.log('✅ CUE 사용 완료:', { amount, purpose });
    } catch (error: any) {
      const errorMessage = error.message || 'CUE 사용에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('❌ CUE 사용 실패:', error);
      throw error;
    }
  }, [backendConnected, state.balance]);

  const toggleMining = useCallback(() => {
    setState(prev => ({
      ...prev,
      miningState: {
        ...prev.miningState,
        isActive: !prev.miningState.isActive
      }
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    if (userDid) {
      loadBalance(userDid);
      loadHistory(userDid);
    }
  }, [userDid, loadBalance, loadHistory]);

  // 주기적 잔액 업데이트 (1분마다)
  useEffect(() => {
    if (!userDid || !backendConnected) return;

    const interval = setInterval(() => {
      loadBalance(userDid);
    }, 60 * 1000); // 1분

    return () => clearInterval(interval);
  }, [userDid, backendConnected, loadBalance]);

  // 마이닝 상태 시뮬레이션
  useEffect(() => {
    if (state.miningState.isActive) {
      const interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          miningState: {
            ...prev.miningState,
            streakDays: Math.min(prev.miningState.streakDays + 1, 30),
            multiplier: Math.min(prev.miningState.multiplier + 0.1, 3.0)
          }
        }));
      }, 10000); // 10초마다 업데이트

      return () => clearInterval(interval);
    }
  }, [state.miningState.isActive]);

  return {
    ...state,
    loadBalance,
    loadHistory,
    mineCue,
    spendCue,
    toggleMining,
    clearError
  };
};