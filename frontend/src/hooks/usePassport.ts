// ============================================================================
// 📁 src/hooks/usePassport.ts
// 🎫 AI Passport 데이터 관리 훅
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { PassportAPI } from '../services/api/PassportAPI';
import type { UnifiedAIPassport } from '../types/passport.types';

interface UsePassportState {
  passport: UnifiedAIPassport | null;
  loading: boolean;
  error: string | null;
}

interface UsePassportReturn extends UsePassportState {
  loadPassport: (did: string) => Promise<void>;
  updatePassport: (updates: Partial<UnifiedAIPassport>) => Promise<void>;
  createPassport: (data: Partial<UnifiedAIPassport>) => Promise<void>;
  clearError: () => void;
  refreshPassport: () => Promise<void>;
}

export const usePassport = (backendConnected: boolean = false): UsePassportReturn => {
  const [state, setState] = useState<UsePassportState>({
    passport: null,
    loading: false,
    error: null
  });

  const api = new PassportAPI();

  const loadPassport = useCallback(async (did: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let passportData: UnifiedAIPassport;

      if (backendConnected) {
        console.log('📋 실제 백엔드에서 패스포트 로드:', did);
        passportData = await api.getPassport(did);
      } else {
        console.log('🔧 Mock 패스포트 데이터 생성:', did);
        passportData = api.createMockPassport(did);
      }

      setState(prev => ({
        ...prev,
        passport: passportData,
        loading: false
      }));

      console.log('✅ 패스포트 로드 완료:', passportData);
    } catch (error: any) {
      const errorMessage = error.message || '패스포트를 불러오는데 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('❌ 패스포트 로드 실패:', error);
      throw error;
    }
  }, [backendConnected]);

  const updatePassport = useCallback(async (updates: Partial<UnifiedAIPassport>) => {
    if (!state.passport) {
      throw new Error('업데이트할 패스포트가 없습니다.');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let updatedPassport: UnifiedAIPassport;

      if (backendConnected) {
        console.log('📝 실제 백엔드에서 패스포트 업데이트:', updates);
        updatedPassport = await api.updatePassport(state.passport.did, updates);
      } else {
        console.log('🔧 Mock 패스포트 업데이트:', updates);
        updatedPassport = {
          ...state.passport,
          ...updates
        };
        // Mock 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setState(prev => ({
        ...prev,
        passport: updatedPassport,
        loading: false
      }));

      console.log('✅ 패스포트 업데이트 완료:', updatedPassport);
    } catch (error: any) {
      const errorMessage = error.message || '패스포트 업데이트에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('❌ 패스포트 업데이트 실패:', error);
      throw error;
    }
  }, [state.passport, backendConnected]);

  const createPassport = useCallback(async (data: Partial<UnifiedAIPassport>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let newPassport: UnifiedAIPassport;

      if (backendConnected) {
        console.log('🆕 실제 백엔드에서 패스포트 생성:', data);
        newPassport = await api.createPassport(data);
      } else {
        console.log('🔧 Mock 패스포트 생성:', data);
        newPassport = api.createMockPassport(data.did || `did:mock:${Date.now()}`);
        // Mock 지연 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setState(prev => ({
        ...prev,
        passport: newPassport,
        loading: false
      }));

      console.log('✅ 패스포트 생성 완료:', newPassport);
    } catch (error: any) {
      const errorMessage = error.message || '패스포트 생성에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      console.error('❌ 패스포트 생성 실패:', error);
      throw error;
    }
  }, [backendConnected]);

  const refreshPassport = useCallback(async () => {
    if (state.passport?.did) {
      await loadPassport(state.passport.did);
    }
  }, [state.passport?.did, loadPassport]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 주기적 패스포트 새로고침 (5분마다)
  useEffect(() => {
    if (!state.passport?.did || !backendConnected) return;

    const interval = setInterval(() => {
      refreshPassport();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [state.passport?.did, backendConnected, refreshPassport]);

  return {
    ...state,
    loadPassport,
    updatePassport,
    createPassport,
    clearError,
    refreshPassport
  };
};