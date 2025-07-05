// ============================================================================
// 🔐 Ultimate useAuth Hook - 두 문서 모든 장점 통합
// 파일: frontend/src/hooks/useAuth.ts
// 특징: 세션 복원 루프 방지 + DID 검증 + 완전 데이터 정리 + 하이브리드 연동
// 버전: v4.0 - Ultimate Edition
// ============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BackendAPIClient } from '../services/api/BackendAPIClient';

// ============================================================================
// 🔧 인터페이스 정의
// ============================================================================

interface User {
  id: string;
  username: string;
  email?: string;
  did: string;
  walletAddress?: string;
  cueBalance: number;
  trustScore: number;
  passportLevel: number;
  biometricVerified: boolean;
  registeredAt: string;
  authenticated: boolean;
  cue_tokens?: number;
  trust_score?: number;
  passport_level?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  sessionToken: string | null;
  lastRestoreTime: number;
  error: string | null;
}

interface TokenSyncCallback {
  (token: string | null): void;
}

/**
 * 🔐 Ultimate useAuth Hook - 모든 기능 통합
 */
export function useAuth() {
  const apiClient = new BackendAPIClient();
  
  // ============================================================================
  // 🔧 상태 관리 (무한루프 방지 + 완전 통합)
  // ============================================================================
  
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionId: null,
    sessionToken: null,
    lastRestoreTime: 0,
    error: null
  });

  // 무한루프 방지용 플래그들 (문서 4에서)
  const restoreInProgress = useRef<boolean>(false);
  const restoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  // 하이브리드 연동용 상태들 (문서 5에서)
  const [tokenSyncCallbacks, setTokenSyncCallbacks] = useState<TokenSyncCallback[]>([]);
  const [websocketStatus, setWebsocketStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // ============================================================================
  // 🗑️ 완전한 데이터 정리 함수 (문서 5 + 강화)
  // ============================================================================
  
  const clearAllAuthData = useCallback(() => {
    console.log('🗑️ === Ultimate 완전한 인증 데이터 정리 시작 ===');
    
    if (typeof window === 'undefined') return;

    // 핵심 인증 토큰들
    const authKeys = [
      'session_token',
      'cue_session_token', 
      'cue_session_id',
      'final0626_auth_token',
      'auth_timestamp'
    ];

    // Zustand persist 스토어들 (최우선 정리 대상)
    const zustandKeys = [
      'auth-storage',          // 주된 문제 원인
      'passport-storage',      
      'user-storage',          
      'cue-storage'           
    ];

    // 레거시 및 추가 키들
    const legacyKeys = [
      'cue_user_data',
      'final0626_user',
      'user_data',
      'passport_data',
      'webauthn_user',
      'current_user_id'
    ];

    const allKeys = [...authKeys, ...zustandKeys, ...legacyKeys];
    let deletedCount = 0;

    // 실제 삭제 수행
    allKeys.forEach(key => {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          deletedCount++;
          console.log(`🗑️ 삭제됨: ${key}`);
        }
      } catch (error) {
        console.warn(`❌ 삭제 실패: ${key}`, error);
      }
    });

    // 의심스러운 추가 키들 검사 및 삭제
    try {
      const allLocalStorageKeys = Object.keys(localStorage);
      const suspiciousKeys = allLocalStorageKeys.filter(key => 
        key.includes('auth') || 
        key.includes('session') || 
        key.includes('token') || 
        key.includes('user') ||
        key.includes('cue') ||
        key.includes('webauthn') ||
        key.includes('passport') ||
        key.includes('final0626') ||
        key.includes('did:')
      );

      suspiciousKeys.forEach(key => {
        if (!allKeys.includes(key)) {
          try {
            localStorage.removeItem(key);
            deletedCount++;
            console.log(`🗑️ 추가 삭제: ${key}`);
          } catch (error) {
            console.warn(`❌ 추가 삭제 실패: ${key}`, error);
          }
        }
      });
    } catch (error) {
      console.warn('❌ 추가 키 검사 실패:', error);
    }

    console.log(`✅ 총 ${deletedCount}개 키 삭제 완료`);

    // 토큰 동기화 알림
    notifyTokenChange(null);

    // API Client 토큰도 정리
    if (apiClient && apiClient.clearSessionToken) {
      apiClient.clearSessionToken();
    }
  }, []);

  // ============================================================================
  // 🔍 엄격한 DID 검증 함수 (문서 5에서)
  // ============================================================================

  const validateDID = useCallback((did: string): boolean => {
    if (!did || typeof did !== 'string') {
      return false;
    }

    // 유효한 DID 패턴들
    const validPatterns = [
      /^did:final0626:[a-zA-Z0-9\-_]+$/,
      /^did:webauthn:[a-zA-Z0-9\-_]+$/,
      /^did:cue:[0-9]{13,}$/
    ];

    // 무효한 패턴들 (목 데이터 등)
    const invalidPatterns = [
      /^did:cue:existing:/,
      /^did:cue:mock:/,
      /^did:ai:mock:/,
      /^did:mock:/,
      /^did:test:/
    ];

    // 무효한 패턴 확인
    for (const pattern of invalidPatterns) {
      if (pattern.test(did)) {
        console.warn(`🚫 무효한 DID 패턴 감지: ${did}`);
        return false;
      }
    }

    // 유효한 패턴 확인
    for (const pattern of validPatterns) {
      if (pattern.test(did)) {
        console.log(`✅ 유효한 DID 확인: ${did}`);
        return true;
      }
    }

    console.warn(`🚫 알려지지 않은 DID 형식: ${did}`);
    return false;
  }, []);

  // ============================================================================
  // 🚨 DID 검증 실패 처리 (문서 5에서)
  // ============================================================================

  const handleInvalidDID = useCallback((did: string, reason: string = '형식 오류') => {
    console.warn(`❌ 유효하지 않은 DID: ${did} (${reason})`);
    console.warn(`🗑️ 전체 로컬 데이터 삭제 후 새 사용자 모드로 전환`);
    
    clearAllAuthData();
    
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionId: null,
      sessionToken: null,
      lastRestoreTime: 0,
      error: null
    });
    
    console.log('🆕 새 사용자 모드 준비 완료');
    
    return {
      success: false,
      shouldProceedAsNewUser: true,
      reason: `Invalid DID: ${reason}`
    };
  }, [clearAllAuthData]);

  // ============================================================================
  // 🔄 토큰 동기화 관리 (문서 5에서)
  // ============================================================================

  const registerTokenSyncCallback = useCallback((callback: TokenSyncCallback) => {
    setTokenSyncCallbacks(prev => [...prev, callback]);
    callback(authState.sessionToken);
    
    return () => {
      setTokenSyncCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, [authState.sessionToken]);

  const notifyTokenChange = useCallback((token: string | null) => {
    tokenSyncCallbacks.forEach(callback => {
      try {
        callback(token);
      } catch (error) {
        console.warn('토큰 동기화 콜백 오류:', error);
      }
    });
  }, [tokenSyncCallbacks]);

  // ============================================================================
  // 💰 실시간 CUE 업데이트 (문서 5에서)
  // ============================================================================

  const updateCueBalance = useCallback((newBalance: number, miningReward?: number) => {
    if (!authState.user) return;

    const updatedUser = {
      ...authState.user,
      cueBalance: newBalance,
      cue_tokens: newBalance
    };

    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }));

    // localStorage도 업데이트
    try {
      const storedUserData = localStorage.getItem('cue_user_data');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        userData.cueBalance = newBalance;
        userData.cue_tokens = newBalance;
        localStorage.setItem('cue_user_data', JSON.stringify(userData));
      }
    } catch (error) {
      console.warn('CUE 잔액 localStorage 업데이트 실패:', error);
    }

    console.log(`💰 CUE 잔액 업데이트: ${newBalance}${miningReward ? ` (+${miningReward})` : ''}`);
  }, [authState.user]);

  // ============================================================================
  // 🔐 강화된 세션 복원 (문서 4 + 문서 5 통합)
  // ============================================================================
  
  const restoreSession = useCallback(async (force: boolean = false): Promise<boolean> => {
    // 1. 중복 호출 방지 (문서 4에서)
    if (restoreInProgress.current && !force) {
      console.log('⏳ 세션 복원이 이미 진행 중입니다 - 건너뜀');
      return false;
    }

    // 2. 최근 복원 시도 시간 확인 (문서 4에서)
    const now = Date.now();
    const timeSinceLastRestore = now - authState.lastRestoreTime;
    const minimumInterval = 60 * 1000; // 1분

    if (timeSinceLastRestore < minimumInterval && !force) {
      console.log(`⏰ 최근 세션 복원 시도 후 ${Math.round(timeSinceLastRestore / 1000)}초 경과 - 건너뜀`);
      return false;
    }

    // 3. Zustand 데이터 검사 및 DID 검증 (문서 5에서)
    const authStorageData = localStorage.getItem('auth-storage');
    if (authStorageData) {
      try {
        const parsedData = JSON.parse(authStorageData);
        const user = parsedData.state?.user || parsedData.user;
        
        if (user && user.did && !validateDID(user.did)) {
          console.warn(`❌ Zustand의 무효한 DID 발견: ${user.did}`);
          return handleInvalidDID(user.did, 'Zustand persist 구형 DID');
        }
      } catch (error) {
        console.warn('⚠️ Zustand 데이터 파싱 실패, 삭제');
        localStorage.removeItem('auth-storage');
      }
    }

    // 4. 세션 토큰 확인
    const sessionToken = apiClient.getSessionToken();
    if (!sessionToken && !force) {
      console.log('❌ 세션 토큰 없음 - 복원 불가');
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null
      }));
      return false;
    }

    console.log('🔄 === Ultimate 세션 복원 시작 ===');
    
    restoreInProgress.current = true;
    
    try {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        lastRestoreTime: now
      }));

      // 5. API 호출 타임아웃 설정 (문서 4에서)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('세션 복원 요청 타임아웃')), 15000)
      );

      const restorePromise = apiClient.restoreSession();
      const response = await Promise.race([restorePromise, timeoutPromise]) as any;

      // 6. 컴포넌트 언마운트 확인 (문서 4에서)
      if (!mountedRef.current) {
        console.log('🔄 컴포넌트 언마운트됨 - 세션 복원 중단');
        return false;
      }

      if (response && response.success && response.user) {
        // 7. 서버 데이터 DID 검증 (문서 5에서)
        if (!validateDID(response.user.did)) {
          console.warn(`❌ 서버 DID 무효: ${response.user.did}`);
          return handleInvalidDID(response.user.did, '서버 구형 DID');
        }

        console.log('✅ Ultimate 세션 복원 성공:', {
          username: response.user.username,
          did: response.user.did,
          cueBalance: response.user.cueBalance
        });

        const user = {
          ...response.user,
          authenticated: true,
          cueBalance: response.user.cue_tokens || response.user.cueBalance || 0,
          trustScore: response.user.trust_score || response.user.trustScore || 50,
          passportLevel: response.user.passport_level || response.user.passportLevel || 'Basic'
        };

        setAuthState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          sessionId: sessionToken,
          sessionToken: sessionToken,
          error: null
        }));

        // 8. 토큰 동기화 (문서 5에서)
        notifyTokenChange(sessionToken);

        return true;

      } else {
        console.log('❌ 세션 복원 실패 - 토큰 정리');
        
        apiClient.clearSessionToken();
        clearAllAuthData();
        
        setAuthState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionId: null,
          sessionToken: null,
          error: '세션이 만료되었습니다'
        }));

        return false;
      }

    } catch (error: any) {
      console.error('💥 Ultimate 세션 복원 오류:', error);

      if (!mountedRef.current) return false;

      // 네트워크 오류 vs 인증 오류 구분 (문서 4에서)
      const isNetworkError = error.message.includes('fetch') || 
                           error.message.includes('network') || 
                           error.message.includes('타임아웃');

      if (isNetworkError) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: '네트워크 연결을 확인해주세요'
        }));
      } else {
        apiClient.clearSessionToken();
        clearAllAuthData();
        setAuthState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionId: null,
          sessionToken: null,
          error: '인증이 필요합니다'
        }));
      }

      return false;

    } finally {
      restoreInProgress.current = false;
    }
  }, [authState.lastRestoreTime, validateDID, handleInvalidDID, clearAllAuthData, notifyTokenChange]);

  // ============================================================================
  // 🆕 WebAuthn 등록 (문서 4 + DID 검증 추가)
  // ============================================================================
  
  const register = useCallback(async (): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> => {
    console.log('🆕 === Ultimate WebAuthn 등록 시작 ===');

    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const result = await apiClient.startWebAuthnRegistration();

      if (!mountedRef.current) return { success: false, error: '컴포넌트 언마운트됨' };

      if (result.success && result.user) {
        // DID 검증 추가
        if (!validateDID(result.user.did)) {
          throw new Error('서버에서 유효하지 않은 DID를 반환했습니다');
        }

        console.log('✅ Ultimate 등록 성공:', result.user.username);

        const user = {
          ...result.user,
          authenticated: true,
          cueBalance: result.user.cue_tokens || result.user.cueBalance || 0,
          trustScore: result.user.trust_score || result.user.trustScore || 50,
          passportLevel: result.user.passport_level || result.user.passportLevel || 'Basic'
        };

        setAuthState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          sessionId: result.sessionId || null,
          sessionToken: result.sessionToken || null,
          error: null
        }));

        // 토큰 동기화
        if (result.sessionToken) {
          notifyTokenChange(result.sessionToken);
        }

        return { success: true, user };

      } else {
        const errorMessage = result.message || '등록에 실패했습니다';
        
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));

        return { success: false, error: errorMessage };
      }

    } catch (error: any) {
      console.error('💥 Ultimate 등록 실패:', error);

      if (!mountedRef.current) return { success: false, error: '컴포넌트 언마운트됨' };

      const errorMessage = error.message || '등록 중 오류가 발생했습니다';
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      return { success: false, error: errorMessage };
    }
  }, [validateDID, notifyTokenChange]);

  // ============================================================================
  // 🚪 로그아웃 (완전 통합)
  // ============================================================================
  
  const logout = useCallback(async (): Promise<boolean> => {
    console.log('🚪 === Ultimate 로그아웃 시작 ===');

    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // 백엔드 로그아웃 API 호출
      await apiClient.logout();

      if (!mountedRef.current) return false;

      // 완전한 데이터 정리
      clearAllAuthData();

      // 상태 초기화
      setAuthState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: null,
        sessionToken: null,
        error: null,
        lastRestoreTime: 0
      }));

      console.log('✅ Ultimate 로그아웃 완료');
      return true;

    } catch (error: any) {
      console.error('💥 Ultimate 로그아웃 오류:', error);

      if (!mountedRef.current) return false;

      // 오류가 발생해도 로컬 상태는 초기화
      clearAllAuthData();
      setAuthState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: null,
        sessionToken: null,
        error: null
      }));

      return false;
    }
  }, [clearAllAuthData]);

  // ============================================================================
  // 🔄 주기적 세션 체크 (문서 4에서)
  // ============================================================================
  
  const startPeriodicSessionCheck = useCallback(() => {
    if (restoreTimeoutRef.current) {
      clearInterval(restoreTimeoutRef.current);
    }

    // 10분마다 세션 유효성 확인
    restoreTimeoutRef.current = setInterval(() => {
      if (authState.isAuthenticated && !restoreInProgress.current) {
        console.log('🕒 주기적 세션 체크');
        restoreSession(false).catch(() => {
          // 에러는 무시 (사용자에게 방해되지 않도록)
        });
      }
    }, 10 * 60 * 1000); // 10분

  }, [authState.isAuthenticated, restoreSession]);

  // ============================================================================
  // 🌐 WebSocket 상태 관리 (문서 5에서)
  // ============================================================================

  const updateWebSocketStatus = useCallback((status: 'disconnected' | 'connecting' | 'connected') => {
    setWebsocketStatus(status);
  }, []);

  // ============================================================================
  // 🔧 초기화 및 정리 (문서 4 + 문서 5 통합)
  // ============================================================================
  
  useEffect(() => {
    mountedRef.current = true;

    // 페이지 로드 시 한 번만 세션 복원 시도
    const initializeAuth = async () => {
      console.log('🚀 Ultimate useAuth 초기화');
      
      // 약간의 지연 후 세션 복원
      setTimeout(() => {
        restoreSession(true);
      }, 100);
    };

    initializeAuth();
    startPeriodicSessionCheck();

    // 정리 함수
    return () => {
      mountedRef.current = false;
      
      if (restoreTimeoutRef.current) {
        clearInterval(restoreTimeoutRef.current);
        restoreTimeoutRef.current = null;
      }
    };
  }, []); // 빈 배열로 한 번만 실행

  // 토큰 변경 감지 및 알림
  useEffect(() => {
    notifyTokenChange(authState.sessionToken);
  }, [authState.sessionToken, notifyTokenChange]);

  // ============================================================================
  // 🔧 수동 새로고침 및 유틸리티
  // ============================================================================
  
  const refresh = useCallback(() => {
    console.log('🔄 수동 세션 새로고침');
    return restoreSession(true);
  }, [restoreSession]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  const forceNewUser = useCallback(() => {
    console.log('🆕 강제 새 사용자 모드');
    return handleInvalidDID('manual-reset', '수동 초기화');
  }, [handleInvalidDID]);

  // ============================================================================
  // 📊 완전한 디버그 정보
  // ============================================================================

  const getDebugInfo = useCallback(() => {
    return {
      auth: {
        isAuthenticated: authState.isAuthenticated,
        hasUser: !!authState.user,
        hasToken: !!authState.sessionToken,
        username: authState.user?.username,
        userDID: authState.user?.did,
        cueBalance: authState.user?.cueBalance,
        error: authState.error,
        lastRestoreTime: authState.lastRestoreTime
      },
      flags: {
        restoreInProgress: restoreInProgress.current,
        mountedRef: mountedRef.current
      },
      tokens: {
        sessionToken: !!localStorage.getItem('session_token'),
        cueSessionToken: !!localStorage.getItem('cue_session_token'),
        authTimestamp: localStorage.getItem('auth_timestamp')
      },
      localStorage: {
        authStorage: !!localStorage.getItem('auth-storage'),
        suspiciousKeys: Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('session') || key.includes('did')
        )
      },
      websocket: {
        status: websocketStatus,
        callbacks: tokenSyncCallbacks.length
      },
      version: 'v4.0-Ultimate',
      timestamp: new Date().toISOString()
    };
  }, [authState, websocketStatus, tokenSyncCallbacks]);

  // ============================================================================
  // 📤 Ultimate Return 값
  // ============================================================================
  
  return {
    // 핵심 상태
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    sessionId: authState.sessionId,
    sessionToken: authState.sessionToken,
    
    // 인증 액션
    register,
    logout,
    refresh,
    
    // 세션 관리
    restoreSession,
    clearError,
    
    // 데이터 정리
    clearAllAuthData,
    forceNewUser,
    
    // 하이브리드 연동 (문서 5에서)
    registerTokenSyncCallback,
    updateCueBalance,
    updateWebSocketStatus,
    websocketStatus,
    
    // DID 검증 (문서 5에서)
    validateDID,
    handleInvalidDID,
    
    // 디버그 정보
    debug: {
      lastRestoreTime: authState.lastRestoreTime,
      restoreInProgress: restoreInProgress.current,
      mountedRef: mountedRef.current,
      getDebugInfo
    }
  };
}