// ============================================================================
// 📁 frontend/src/hooks/useAuth.ts - 완전 통합 버전
// 🔧 1번(하이브리드 연동) + 2번(DID 검증) + 3번(완전 데이터 정리) 모든 기능 포함
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';

// 🔧 PersistentDataAPIClient와의 협력을 위한 토큰 동기화 인터페이스
interface TokenSyncCallback {
  (token: string | null): void;
}

interface User {
  id: string;
  username: string;
  did: string;
  email?: string;
  authenticated: boolean;
  cueBalance?: number;
  cue_tokens?: number;
  trustScore?: number;
  trust_score?: number;
  passportLevel?: string;
  passport_level?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    sessionToken: null,
    error: null
  });

  const webauthnAPI = new WebAuthnAPI();

  // 🔧 토큰 동기화 콜백 관리 (1번 기능)
  const [tokenSyncCallbacks, setTokenSyncCallbacks] = useState<TokenSyncCallback[]>([]);

  // 🔧 WebSocket 연결 상태 추적 (1번 기능)
  const [websocketStatus, setWebsocketStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // ============================================================================
  // 🔧 완전한 로컬 스토리지 정리 함수 (2번 + 3번 강화)
  // ============================================================================

  const clearAllAuthData = useCallback(() => {
    console.log('🗑️ === 완전한 인증 데이터 정리 시작 ===');
    
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

    // 삭제 전에 어떤 키들이 있는지 확인
    const foundKeys = allKeys.filter(key => localStorage.getItem(key) !== null);
    console.log('📋 삭제할 키 목록:', foundKeys);

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

    // 의심스러운 추가 키들 검사 및 삭제 (3번 강화 기능)
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

      console.log('🔍 의심스러운 추가 키들:', suspiciousKeys);
      
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

    // 🔧 PersistentDataAPIClient에도 토큰 삭제 알림 (1번 기능)
    notifyTokenChange(null);

    // WebAuthnAPI 토큰도 정리
    if (webauthnAPI && webauthnAPI.clearSessionToken) {
      webauthnAPI.clearSessionToken();
    }
  }, [webauthnAPI]);

  // ============================================================================
  // 🔧 엄격한 DID 검증 함수 (2번 + 3번 강화)
  // ============================================================================

  const validateDID = useCallback((did: string): boolean => {
    if (!did || typeof did !== 'string') {
      return false;
    }

    // 유효한 DID 패턴들 (현재 프로젝트 기준)
    const validPatterns = [
      /^did:final0626:[a-zA-Z0-9\-_]+$/,           // 메인 프로덕션 DID
      /^did:webauthn:[a-zA-Z0-9\-_]+$/,            // WebAuthn 기반 DID  
      /^did:cue:[0-9]{13,}$/                       // CUE 타임스탬프 DID
    ];

    // 목 데이터 및 구형 DID 패턴 (거부 대상) - 2번 + 3번 통합
    const invalidPatterns = [
      /^did:cue:existing:/,                        // 구형 목 데이터
      /^did:cue:mock:/,                           // 목 데이터
      /^did:ai:mock:/,                            // AI 목 데이터
      /^did:mock:/,                               // 일반 목 데이터
      /^did:test:/                                // 테스트 데이터
    ];

    // 무효한 패턴 확인 - 발견되면 즉시 false
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
  // 🔧 DID 검증 실패 처리 (2번 + 3번 강화)
  // ============================================================================

  const handleInvalidDID = useCallback((did: string, reason: string = '형식 오류') => {
    console.warn(`❌ 유효하지 않은 DID: ${did} (${reason})`);
    console.warn(`🗑️ 전체 로컬 데이터 삭제 후 새 사용자 모드로 전환`);
    
    // 완전한 데이터 정리
    clearAllAuthData();
    
    // 상태 초기화
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      sessionToken: null,
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
  // 🔧 토큰 동기화 관리 (1번 기능)
  // ============================================================================

  const registerTokenSyncCallback = useCallback((callback: TokenSyncCallback) => {
    setTokenSyncCallbacks(prev => [...prev, callback]);
    
    // 현재 토큰을 즉시 동기화
    callback(authState.sessionToken);
    
    // 언등록 함수 반환
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
  // 🔧 WebSocket 상태 관리 (1번 기능)
  // ============================================================================

  const updateWebSocketStatus = useCallback((status: 'disconnected' | 'connecting' | 'connected') => {
    setWebsocketStatus(status);
  }, []);

  // ============================================================================
  // 🔧 실시간 CUE 업데이트 (1번 기능)
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
  // 🔧 세션 토큰 관리 (1번 + 2번 통합)
  // ============================================================================

  const saveSessionToken = useCallback((token: string) => {
    try {
      if (!token || typeof token !== 'string' || token.length < 10) {
        console.error('❌ 잘못된 토큰 형식');
        return false;
      }

      // 테스트/목 토큰 거부
      if (token.startsWith('force_token') || 
          token.startsWith('test_') || 
          token.startsWith('mock_') ||
          token.includes('dummy')) {
        console.error('❌ 테스트 토큰 거부');
        return false;
      }

      localStorage.setItem('session_token', token);
      localStorage.setItem('cue_session_token', token);
      localStorage.setItem('auth_timestamp', Date.now().toString());
      
      webauthnAPI.setSessionToken(token);
      
      // 🔧 PersistentDataAPIClient에 토큰 변경 알림 (1번 기능)
      notifyTokenChange(token);
      
      console.log('✅ 세션 토큰 저장 및 동기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 세션 토큰 저장 실패:', error);
      return false;
    }
  }, [webauthnAPI, notifyTokenChange]);

  const getSessionToken = useCallback(() => {
    try {
      let token = localStorage.getItem('session_token') || 
                  localStorage.getItem('cue_session_token');
      
      if (!token) return null;

      // 토큰 만료 검사 (7일)
      const timestamp = localStorage.getItem('auth_timestamp');
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
        
        if (age > maxAge) {
          console.log('⏰ 세션 토큰 만료');
          clearAllAuthData();
          return null;
        }
      }
      
      return token;
    } catch (error) {
      console.error('❌ 세션 토큰 조회 실패:', error);
      return null;
    }
  }, [clearAllAuthData]);

  // ============================================================================
  // 🔧 향상된 세션 복원 (전체 기능 통합)
  // ============================================================================

  const restoreSession = useCallback(async () => {
    console.log('🔄 === 향상된 세션 복원 시작 (통합 버전) ===');
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 1. Zustand 데이터 검사 및 DID 검증
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

      // 2. 세션 토큰 확인
      const savedToken = getSessionToken();
      if (!savedToken) {
        console.log('📭 저장된 세션 토큰 없음');
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          sessionToken: null,
          error: null
        });
        return { success: false, reason: 'no_token' };
      }

      // 3. WebAuthn API 세션 복원
      webauthnAPI.setSessionToken(savedToken);
      const result = await webauthnAPI.restoreSession();
      
      if (result && result.success && result.user) {
        // 서버 데이터 DID 검증
        if (!validateDID(result.user.did)) {
          console.warn(`❌ 서버 DID 무효: ${result.user.did}`);
          return handleInvalidDID(result.user.did, '서버 구형 DID');
        }

        const user = {
          ...result.user,
          authenticated: true,
          cueBalance: result.user.cue_tokens || result.user.cueBalance || 0,
          trustScore: result.user.trust_score || result.user.trustScore || 50,
          passportLevel: result.user.passport_level || result.user.passportLevel || 'Basic'
        };

        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
          sessionToken: savedToken,
          error: null
        });

        // 🔧 PersistentDataAPIClient에 토큰 동기화 (1번 기능)
        notifyTokenChange(savedToken);
        
        console.log('✅ 세션 복원 성공:', user.username);
        return { success: true, user };
      } else {
        throw new Error('세션 복원 실패');
      }

    } catch (error: any) {
      console.error('💥 세션 복원 실패:', error.message);
      
      clearAllAuthData();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null,
        error: error.message
      });
      
      return { success: false, reason: error.message };
    }
  }, [getSessionToken, webauthnAPI, validateDID, handleInvalidDID, clearAllAuthData, notifyTokenChange]);

  // ============================================================================
  // 🔧 통합 WebAuthn 인증 (2번 기능 + 1번 동기화)
  // ============================================================================

  const authenticateWithWebAuthn = useCallback(async () => {
    try {
      console.log('🔐 === 통합 WebAuthn 인증 시작 ===');
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await webauthnAPI.unifiedWebAuthnAuth();
      
      if (result.success && result.user) {
        // DID 검증
        if (!validateDID(result.user.did)) {
          throw new Error('서버에서 유효하지 않은 DID를 반환했습니다');
        }

        // 세션 토큰 저장
        if (result.sessionToken && saveSessionToken(result.sessionToken)) {
          const user = {
            ...result.user,
            authenticated: true,
            cueBalance: result.user.cue_tokens || result.user.cueBalance || 0,
            trustScore: result.user.trust_score || result.user.trustScore || 50,
            passportLevel: result.user.passport_level || result.user.passportLevel || 'Basic'
          };

          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
            sessionToken: result.sessionToken,
            error: null
          });
          
          console.log('✅ WebAuthn 인증 성공:', user.username);
          return { ...result, user };
        } else {
          throw new Error('세션 토큰 저장 실패');
        }
      } else {
        throw new Error(result.message || '인증 실패');
      }
    } catch (error: any) {
      console.error('💥 WebAuthn 인증 실패:', error);
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message 
      }));
      throw error;
    }
  }, [webauthnAPI, saveSessionToken, validateDID]);

  // ============================================================================
  // 🔧 호환성 함수들 (2번 기능)
  // ============================================================================

  const registerWithWebAuthn = useCallback(async (userName?: string, userEmail?: string) => {
    const result = await authenticateWithWebAuthn();
    return {
      ...result,
      message: result.isExistingUser 
        ? '기존 계정으로 로그인되었습니다!' 
        : '새 계정이 등록되었습니다!'
    };
  }, [authenticateWithWebAuthn]);

  const loginWithWebAuthn = useCallback(async (userEmail?: string) => {
    const result = await authenticateWithWebAuthn();
    return {
      ...result,
      message: result.isExistingUser 
        ? '로그인되었습니다!' 
        : '새 계정이 생성되어 로그인되었습니다!'
    };
  }, [authenticateWithWebAuthn]);

  // ============================================================================
  // 🔧 로그아웃 (전체 기능 통합)
  // ============================================================================

  const logout = useCallback(async () => {
    try {
      console.log('🚪 === 로그아웃 시작 ===');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      try {
        await webauthnAPI.logout();
        console.log('✅ 서버 로그아웃 성공');
      } catch (error) {
        console.warn('⚠️ 서버 로그아웃 실패:', error);
      }
      
      clearAllAuthData();
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null,
        error: null
      });
      
      console.log('✅ 로그아웃 완료');
    } catch (error: any) {
      console.error('💥 로그아웃 오류:', error);
      // 오류가 있어도 로컬 상태는 정리
      clearAllAuthData();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null,
        error: null
      });
    }
  }, [webauthnAPI, clearAllAuthData]);

  // ============================================================================
  // 🔧 사용자 정보 새로고침 (2번 기능 + DID 검증)
  // ============================================================================

  const refreshUser = useCallback(async () => {
    try {
      const token = getSessionToken();
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        // DID 검증
        if (!validateDID(data.user.did)) {
          return handleInvalidDID(data.user.did, '새로고침 서버 데이터 구형 DID');
        }

        const user = {
          ...data.user,
          authenticated: true,
          cueBalance: data.user.cue_tokens || data.user.cueBalance || 0,
          trustScore: data.user.trust_score || data.user.trustScore || 50,
          passportLevel: data.user.passport_level || data.user.passportLevel || 'Basic'
        };

        setAuthState(prev => ({ ...prev, user }));
        console.log('✅ 사용자 정보 새로고침 완료');
      }
    } catch (error) {
      console.error('💥 사용자 정보 새로고침 실패:', error);
    }
  }, [getSessionToken, validateDID, handleInvalidDID]);

  // ============================================================================
  // 🔧 에러 처리 (2번 기능)
  // ============================================================================

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // 🔧 향상된 디버그 정보 (전체 기능 통합)
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
        error: authState.error
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
      sync: {
        tokenCallbacks: tokenSyncCallbacks.length,
        lastTokenSync: authState.sessionToken ? 'Synced' : 'No Token'
      },
      timestamp: new Date().toISOString()
    };
  }, [authState, websocketStatus, tokenSyncCallbacks]);

  // ============================================================================
  // 🔧 수동 초기화 (3번 기능)
  // ============================================================================

  const forceNewUser = useCallback(() => {
    console.log('🆕 강제 새 사용자 모드');
    return handleInvalidDID('manual-reset', '수동 초기화');
  }, [handleInvalidDID]);

  // ============================================================================
  // 🔧 초기화 Effect (개선됨)
  // ============================================================================

  useEffect(() => {
    console.log('🚀 useAuth 초기화 - 통합 버전 세션 복원');
    restoreSession();
  }, [restoreSession]);

  // 토큰 변경 감지 및 알림 (1번 기능)
  useEffect(() => {
    notifyTokenChange(authState.sessionToken);
  }, [authState.sessionToken, notifyTokenChange]);

  // ============================================================================
  // 🔧 통합 완성 반환 값
  // ============================================================================

  return {
    // 기존 상태
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    sessionToken: authState.sessionToken,
    error: authState.error,
    
    // 통합 인증 (권장)
    authenticateWithWebAuthn,
    
    // 호환성 인증 함수
    loginWithWebAuthn,
    registerWithWebAuthn,
    
    // 세션 관리
    logout,
    restoreSession,
    refreshUser,
    
    // 토큰 관리
    saveSessionToken,
    getSessionToken,
    
    // 데이터 정리
    clearAllAuthData,
    forceNewUser,
    
    // 에러 관리 (2번 기능)
    clearError,
    
    // 🔧 하이브리드 연동 인터페이스 (1번 기능)
    registerTokenSyncCallback,      // PersistentDataAPIClient가 토큰 동기화 등록
    updateCueBalance,               // 실시간 CUE 업데이트
    updateWebSocketStatus,          // WebSocket 상태 업데이트
    websocketStatus,                // WebSocket 상태 조회
    
    // 디버깅 및 유틸리티
    getDebugInfo,
    validateDID
  };
};