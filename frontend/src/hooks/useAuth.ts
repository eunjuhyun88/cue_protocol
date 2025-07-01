// ============================================================================
// 📁 src/hooks/useAuth.ts
// 🔐 Final0626 AI Passport 인증 상태 관리 훅
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';
import { BackendAPIClient } from '../services/api/BackendAPIClient';
import type { 
  User, 
  RegistrationStep, 
  AuthState,
  HealthCheckResult,
  SessionRestoreResult
} from '../types/auth.types';

export function useAuth() {
  // ============================================================================
  // 🔧 상태 관리
  // ============================================================================
  const [state, setState] = useState<AuthState>({
    isInitialized: false,
    isAuthenticated: false,
    isRegistering: false,
    user: null,
    sessionToken: null,
    error: null,
    registrationStep: 'waiting'
  });

  const [backendStatus, setBackendStatus] = useState<HealthCheckResult>({
    connected: false,
    mode: 'checking',
    status: 'checking'
  });

  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // ============================================================================
  // 🔧 API 클라이언트 인스턴스
  // ============================================================================
  const [webauthnAPI] = useState(() => new WebAuthnAPI());
  const [backendAPI] = useState(() => new BackendAPIClient());

  // ============================================================================
  // 🔧 상태 업데이트 헬퍼
  // ============================================================================
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string | null) => {
    updateState({ error });
  }, [updateState]);

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // ============================================================================
  // 🔧 초기화 및 세션 복원
  // ============================================================================
  const initialize = useCallback(async () => {
    try {
      console.log('🚀 === useAuth 초기화 시작 ===');

      // 1. 백엔드 연결 확인
      const health = await backendAPI.checkConnection();
      setBackendStatus(health);

      // 2. 세션 정보 확인
      const sessionInfo = backendAPI.getSessionInfo();
      setSessionInfo(sessionInfo);

      // 3. 세션 복원 시도
      if (sessionInfo?.isValid) {
        console.log('🔧 유효한 세션 발견, 복원 시도...');
        const restored = await backendAPI.restoreSession();
        
        if (restored.success && restored.user) {
          console.log('✅ 세션 복원 성공');
          updateState({
            isAuthenticated: true,
            user: restored.user,
            sessionToken: backendAPI.getSessionToken()
          });
        } else {
          console.log('❌ 세션 복원 실패');
          backendAPI.clearSessionToken();
        }
      }

      updateState({ isInitialized: true });
      console.log('✅ useAuth 초기화 완료');

    } catch (error: any) {
      console.error('❌ useAuth 초기화 실패:', error);
      updateState({ 
        isInitialized: true,
        error: '시스템 초기화에 실패했습니다'
      });
    }
  }, [backendAPI, updateState]);

  // ============================================================================
  // 🔧 등록 함수
  // ============================================================================
  const register = useCallback(async (email?: string) => {
    try {
      console.log('🚀 === useAuth 등록 시작 ===');
      
      clearError();
      updateState({ 
        isRegistering: true, 
        registrationStep: 'auth' 
      });

      const result = await webauthnAPI.startWebAuthnRegistration(email);
      
      if (!result.success || !result.user) {
        throw new Error('등록에 실패했습니다');
      }

      // 등록 단계 시뮬레이션
      if (!result.isExistingUser) {
        updateState({ registrationStep: 'wallet' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateState({ registrationStep: 'passport' });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      updateState({ registrationStep: 'complete' });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 최종 상태 업데이트
      updateState({
        isAuthenticated: true,
        isRegistering: false,
        registrationStep: 'waiting',
        user: result.user,
        sessionToken: result.sessionToken
      });

      // 세션 정보 갱신
      const newSessionInfo = backendAPI.getSessionInfo();
      setSessionInfo(newSessionInfo);

      console.log('✅ useAuth 등록 완료');

    } catch (error: any) {
      console.error('💥 useAuth 등록 실패:', error);
      updateState({
        isRegistering: false,
        registrationStep: 'waiting',
        error: error.message || '등록에 실패했습니다'
      });
    }
  }, [webauthnAPI, backendAPI, updateState, clearError]);

  // ============================================================================
  // 🔧 로그인 함수
  // ============================================================================
  const login = useCallback(async (email?: string) => {
    try {
      console.log('🔓 === useAuth 로그인 시작 ===');
      
      clearError();
      updateState({ isRegistering: true });

      const result = await webauthnAPI.loginWithWebAuthn(email);
      
      if (!result.success || !result.user) {
        throw new Error('로그인에 실패했습니다');
      }

      updateState({
        isAuthenticated: true,
        isRegistering: false,
        user: result.user,
        sessionToken: result.sessionToken || result.token
      });

      // 세션 정보 갱신
      const newSessionInfo = backendAPI.getSessionInfo();
      setSessionInfo(newSessionInfo);

      console.log('✅ useAuth 로그인 완료');

    } catch (error: any) {
      console.error('💥 useAuth 로그인 실패:', error);
      updateState({
        isRegistering: false,
        error: error.message || '로그인에 실패했습니다'
      });
    }
  }, [webauthnAPI, backendAPI, updateState, clearError]);

  // ============================================================================
  // 🔧 로그아웃 함수
  // ============================================================================
  const logout = useCallback(async () => {
    try {
      console.log('🔧 === useAuth 로그아웃 시작 ===');

      await backendAPI.logout();

      setState({
        isInitialized: true,
        isAuthenticated: false,
        isRegistering: false,
        user: null,
        sessionToken: null,
        error: null,
        registrationStep: 'waiting'
      });

      setSessionInfo(null);

      console.log('✅ useAuth 로그아웃 완료');

    } catch (error: any) {
      console.error('💥 useAuth 로그아웃 실패:', error);
      // 오류가 발생해도 로컬 상태는 초기화
      setState({
        isInitialized: true,
        isAuthenticated: false,
        isRegistering: false,
        user: null,
        sessionToken: null,
        error: null,
        registrationStep: 'waiting'
      });
      setSessionInfo(null);
    }
  }, [backendAPI]);

  // ============================================================================
  // 🔧 세션 복원 함수
  // ============================================================================
  const restoreSession = useCallback(async (): Promise<SessionRestoreResult> => {
    try {
      console.log('🔄 === useAuth 세션 복원 ===');

      const result = await backendAPI.restoreSession();
      
      if (result.success && result.user) {
        updateState({
          isAuthenticated: true,
          user: result.user,
          sessionToken: backendAPI.getSessionToken()
        });

        const newSessionInfo = backendAPI.getSessionInfo();
        setSessionInfo(newSessionInfo);
      }

      return result;

    } catch (error: any) {
      console.error('💥 useAuth 세션 복원 실패:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }, [backendAPI, updateState]);

  // ============================================================================
  // 🔧 백엔드 연결 재시도
  // ============================================================================
  const retryConnection = useCallback(async () => {
    console.log('🔄 백엔드 연결 재시도...');
    const health = await backendAPI.checkConnection();
    setBackendStatus(health);
    
    if (health.connected) {
      console.log('✅ 백엔드 재연결 성공');
      // 연결 복구 시 세션 복원 재시도
      await restoreSession();
    }
    
    return health.connected;
  }, [backendAPI, restoreSession]);

  // ============================================================================
  // 🔧 사용자 정보 업데이트
  // ============================================================================
  const updateUser = useCallback((updates: Partial<User>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...updates };
      updateState({ user: updatedUser });
    }
  }, [state.user, updateState]);

  // ============================================================================
  // 🔧 등록 단계 설정
  // ============================================================================
  const setRegistrationStep = useCallback((step: RegistrationStep) => {
    updateState({ registrationStep: step });
  }, [updateState]);

  // ============================================================================
  // 🔧 초기화 실행 (마운트 시)
  // ============================================================================
  useEffect(() => {
    initialize();
  }, [initialize]);

  // ============================================================================
  // 🔧 세션 만료 감지
  // ============================================================================
  useEffect(() => {
    if (!state.isAuthenticated || !sessionInfo) return;

    const checkSessionExpiry = () => {
      const currentSessionInfo = backendAPI.getSessionInfo();
      if (!currentSessionInfo?.isValid) {
        console.log('⏰ 세션 만료 감지, 자동 로그아웃');
        logout();
      }
    };

    // 1분마다 세션 유효성 확인
    const interval = setInterval(checkSessionExpiry, 60000);
    
    return () => clearInterval(interval);
  }, [state.isAuthenticated, sessionInfo, backendAPI, logout]);

  // ============================================================================
  // 🔧 WebSocket 연결 관리
  // ============================================================================
  useEffect(() => {
    if (backendStatus.connected && state.isAuthenticated) {
      backendAPI.connectWebSocket();
      
      return () => {
        backendAPI.disconnectWebSocket();
      };
    }
  }, [backendStatus.connected, state.isAuthenticated, backendAPI]);

  // ============================================================================
  // 🔧 정리 (언마운트 시)
  // ============================================================================
  useEffect(() => {
    return () => {
      backendAPI.cleanup();
    };
  }, [backendAPI]);

  // ============================================================================
  // 🎯 반환 값
  // ============================================================================
  return {
    // 상태
    ...state,
    backendStatus,
    sessionInfo,
    
    // 액션
    register,
    login,
    logout,
    restoreSession,
    clearError,
    setRegistrationStep,
    updateUser,
    retryConnection,
    
    // 유틸리티
    webauthnAPI,
    backendAPI,
    
    // 상태 체크
    isConnected: backendStatus.connected,
    hasValidSession: sessionInfo?.isValid || false,
    sessionDaysRemaining: sessionInfo?.remainingDays || 0
  };
}

export default useAuth;