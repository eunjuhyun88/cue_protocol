// ============================================================================
// 📁 frontend/src/hooks/useAuth.ts
// 🔐 Ultimate useAuth Hook - 모든 기능 통합 완성판
// 특징: 
// - 2번 파일 구조 기반 + 1번 파일의 모든 고급 기능 통합
// - 프로젝트 구조와 완전 호환
// - 백엔드 연결 + Mock 폴백 지원
// - DID 검증 + 세션 복원 루프 방지
// - WebAuthn 팝업 로그인 완전 지원
// 버전: v5.0 - Ultimate Integration
// ============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ✅ 기존 프로젝트 구조와 호환되는 import
import { apiClient } from '../lib/api-client';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';

// ✅ 타입 import
import type { 
  AuthState, 
  User, 
  WebAuthnRegistrationResult, 
  WebAuthnLoginResult 
} from '../types/auth.types';

// ============================================================================
// 🔧 확장된 상태 인터페이스 (1번 파일의 고급 기능 포함)
// ============================================================================

interface ExtendedAuthState extends AuthState {
  sessionId: string | null;
  sessionToken: string | null;
  lastRestoreTime: number;
  error: string | null;
}

interface TokenSyncCallback {
  (token: string | null): void;
}

interface UseAuthReturn extends ExtendedAuthState {
  // 인증 메서드 (2번 파일 기반)
  authenticateWithWebAuthn: (userEmail?: string) => Promise<WebAuthnRegistrationResult>;
  loginWithWebAuthn: (userEmail?: string) => Promise<WebAuthnLoginResult>;
  logout: () => Promise<void>;
  
  // 세션 관리 (1번 파일의 고급 기능)
  restoreSession: (force?: boolean) => Promise<boolean>;
  clearAuthData: () => void;
  clearAllAuthData: () => void;
  refresh: () => Promise<boolean>;
  clearError: () => void;
  
  // 백엔드 연결 상태
  backendConnected: boolean;
  isReady: boolean;
  
  // 하이브리드 연동 (1번 파일에서)
  registerTokenSyncCallback: (callback: TokenSyncCallback) => () => void;
  updateCueBalance: (newBalance: number, miningReward?: number) => void;
  updateWebSocketStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  websocketStatus: 'disconnected' | 'connecting' | 'connected';
  
  // DID 검증 (1번 파일에서)
  validateDID: (did: string) => boolean;
  handleInvalidDID: (did: string, reason?: string) => any;
  forceNewUser: () => any;
  
  // 디버그 정보
  debug: {
    lastRestoreTime: number;
    restoreInProgress: boolean;
    mountedRef: boolean;
    getDebugInfo: () => any;
  };
}

export const useAuth = (): UseAuthReturn => {
  // ============================================================================
  // 🏠 통합된 상태 관리 (1번 + 2번 파일 합침)
  // ============================================================================
  
  const [state, setState] = useState<ExtendedAuthState>({
    isAuthenticated: false,
    isRegistering: false,
    registrationStep: 'waiting',
    registrationError: undefined,
    user: undefined,
    sessionId: null,
    sessionToken: null,
    lastRestoreTime: 0,
    error: null
  });

  const [backendConnected, setBackendConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tokenSyncCallbacks, setTokenSyncCallbacks] = useState<TokenSyncCallback[]>([]);
  const [websocketStatus, setWebsocketStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // ============================================================================
  // 🔧 무한루프 방지 플래그들 (1번 파일에서)
  // ============================================================================
  
  const restoreInProgress = useRef<boolean>(false);
  const restoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);

  // ============================================================================
  // 🔧 API 클라이언트 초기화 (기존 구조 유지)
  // ============================================================================
  
  const webAuthnAPI = new WebAuthnAPI();

  // ============================================================================
  // 🗑️ 완전한 데이터 정리 함수 (1번 파일의 강화된 버전)
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

    // 레거시 및 추가 키들 (2번 파일 기존 키들 포함)
    const legacyKeys = [
      'cue_user_data',
      'final0626_user',
      'user_data',
      'passport_data',
      'webauthn_user',
      'current_user_id',
      'webauthn_credential',
      'ai_passport_data',
      'user_session',
      'auth_state'
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

    // 의심스러운 추가 키들 검사 및 삭제 (1번 파일에서)
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
    if (apiClient && typeof apiClient.clearSessionToken === 'function') {
      apiClient.clearSessionToken();
    }
  }, []);

  // 기존 clearAuthData는 호환성을 위해 유지
  const clearAuthData = clearAllAuthData;

  // ============================================================================
  // 🔍 엄격한 DID 검증 함수 (1번 파일에서)
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
  // 🚨 DID 검증 실패 처리 (1번 파일에서)
  // ============================================================================

  const handleInvalidDID = useCallback((did: string, reason: string = '형식 오류') => {
    console.warn(`❌ 유효하지 않은 DID: ${did} (${reason})`);
    console.warn(`🗑️ 전체 로컬 데이터 삭제 후 새 사용자 모드로 전환`);
    
    clearAllAuthData();
    
    setState({
      isAuthenticated: false,
      isRegistering: false,
      registrationStep: 'waiting',
      registrationError: undefined,
      user: undefined,
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
  // 🔄 토큰 동기화 관리 (1번 파일에서)
  // ============================================================================

  const registerTokenSyncCallback = useCallback((callback: TokenSyncCallback) => {
    setTokenSyncCallbacks(prev => [...prev, callback]);
    callback(state.sessionToken);
    
    return () => {
      setTokenSyncCallbacks(prev => prev.filter(cb => cb !== callback));
    };
  }, [state.sessionToken]);

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
  // 💰 실시간 CUE 업데이트 (1번 파일에서)
  // ============================================================================

  const updateCueBalance = useCallback((newBalance: number, miningReward?: number) => {
    if (!state.user) return;

    const updatedUser = {
      ...state.user,
      cueBalance: newBalance,
      cue_tokens: newBalance
    };

    setState(prev => ({
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
  }, [state.user]);

  // ============================================================================
  // 🌐 WebSocket 상태 관리 (1번 파일에서)
  // ============================================================================

  const updateWebSocketStatus = useCallback((status: 'disconnected' | 'connecting' | 'connected') => {
    setWebsocketStatus(status);
  }, []);

  // ============================================================================
  // 🔌 백엔드 연결 상태 확인 (2번 파일 기반 + apiClient 메서드 확인 강화)
  // ============================================================================
  
  const checkBackendConnection = useCallback(async () => {
    try {
      console.log('🔌 백엔드 연결 상태 확인 중...');
      
      // apiClient의 health check 메서드 사용 (여러 메서드 시도)
      let response;
      
      if (typeof apiClient.get === 'function') {
        response = await apiClient.get('/health');
      } else if (typeof apiClient.checkConnection === 'function') {
        response = await apiClient.checkConnection();
      } else {
        // 직접 fetch 시도
        response = await fetch('http://localhost:3001/health', {
          method: 'GET',
          mode: 'cors',
          credentials: 'include'
        }).then(res => res.json());
      }
      
      if (response && (response.status || response.success)) {
        console.log('✅ 백엔드 연결 성공:', response);
        setBackendConnected(true);
        return true;
      } else {
        console.log('⚠️ 백엔드 연결 실패 - Mock 모드로 전환');
        setBackendConnected(false);
        return false;
      }
    } catch (error) {
      console.log('⚠️ 백엔드 연결 실패:', error);
      setBackendConnected(false);
      return false;
    }
  }, []);

  // ============================================================================
  // 🔄 강화된 세션 복원 (1번 + 2번 파일 통합)
  // ============================================================================
  
  const restoreSession = useCallback(async (force: boolean = false): Promise<boolean> => {
    // 1. 중복 호출 방지 (1번 파일에서)
    if (restoreInProgress.current && !force) {
      console.log('⏳ 세션 복원이 이미 진행 중입니다 - 건너뜀');
      return false;
    }

    // 2. 최근 복원 시도 시간 확인 (1번 파일에서)
    const now = Date.now();
    const timeSinceLastRestore = now - state.lastRestoreTime;
    const minimumInterval = 60 * 1000; // 1분

    if (timeSinceLastRestore < minimumInterval && !force) {
      console.log(`⏰ 최근 세션 복원 시도 후 ${Math.round(timeSinceLastRestore / 1000)}초 경과 - 건너뜀`);
      return false;
    }

    // 3. Zustand 데이터 검사 및 DID 검증 (1번 파일에서)
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

    console.log('🔄 === Ultimate 세션 복원 시작 ===');
    
    restoreInProgress.current = true;
    
    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        lastRestoreTime: now
      }));

      let response;

      // 4. API 호출 (여러 메서드 시도)
      if (typeof apiClient.restoreSession === 'function') {
        response = await apiClient.restoreSession();
      } else if (typeof webAuthnAPI.restoreSession === 'function') {
        response = await webAuthnAPI.restoreSession();
      } else {
        console.warn('⚠️ restoreSession 메서드가 없어서 건너뜀');
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
        return false;
      }

      // 5. 컴포넌트 언마운트 확인 (1번 파일에서)
      if (!mountedRef.current) {
        console.log('🔄 컴포넌트 언마운트됨 - 세션 복원 중단');
        return false;
      }

      if (response && response.success && response.user) {
        // 6. 서버 데이터 DID 검증 (1번 파일에서)
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

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          registrationStep: 'complete',
          sessionId: response.sessionId || response.sessionToken,
          sessionToken: response.sessionToken || response.sessionId,
          error: null
        }));

        // 7. 토큰 동기화 (1번 파일에서)
        notifyTokenChange(response.sessionToken || response.sessionId);

        return true;

      } else {
        console.log('❌ 세션 복원 실패 - 상태 초기화');
        
        setState(prev => ({
          ...prev,
          user: undefined,
          isAuthenticated: false,
          isLoading: false,
          registrationStep: 'waiting',
          sessionId: null,
          sessionToken: null,
          error: null
        }));

        return false;
      }

    } catch (error: any) {
      console.error('💥 Ultimate 세션 복원 오류:', error);

      if (!mountedRef.current) return false;

      // 네트워크 오류 vs 인증 오류 구분 (1번 파일에서)
      const isNetworkError = error.message.includes('fetch') || 
                           error.message.includes('network') || 
                           error.message.includes('타임아웃');

      if (isNetworkError) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: '네트워크 연결을 확인해주세요'
        }));
      } else {
        clearAllAuthData();
        setState(prev => ({
          ...prev,
          user: undefined,
          isAuthenticated: false,
          isLoading: false,
          registrationStep: 'waiting',
          sessionId: null,
          sessionToken: null,
          error: '인증이 필요합니다'
        }));
      }

      return false;

    } finally {
      restoreInProgress.current = false;
    }
  }, [state.lastRestoreTime, validateDID, handleInvalidDID, clearAllAuthData, notifyTokenChange]);

  // ============================================================================
  // 🆕 WebAuthn 등록 (2번 파일 기반 + 1번 파일의 DID 검증 추가)
  // ============================================================================
  
  const authenticateWithWebAuthn = useCallback(async (userEmail?: string): Promise<WebAuthnRegistrationResult> => {
    console.log('🆕 === Ultimate WebAuthn 등록 시작 ===');
    
    setState(prev => ({
      ...prev,
      isRegistering: true,
      registrationError: undefined,
      registrationStep: 'passkey'
    }));

    try {
      let result: WebAuthnRegistrationResult;

      if (backendConnected) {
        console.log('🔐 실제 WebAuthn 등록 실행...');
        result = await webAuthnAPI.startWebAuthnRegistration(userEmail);
      } else {
        console.log('🎭 Mock WebAuthn 등록 실행...');
        result = await webAuthnAPI.mockWebAuthnRegistration();
      }

      if (result.success && result.user) {
        // DID 검증 추가 (1번 파일에서)
        if (!validateDID(result.user.did)) {
          throw new Error('서버에서 유효하지 않은 DID를 반환했습니다');
        }

        console.log('✅ Ultimate 등록 성공:', result.user.username);
        
        setState(prev => ({
          ...prev,
          registrationStep: 'wallet'
        }));

        // 지갑 생성 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1500));

        const user = {
          ...result.user,
          authenticated: true,
          cueBalance: result.user.cue_tokens || result.user.cueBalance || 0,
          trustScore: result.user.trust_score || result.user.trustScore || 50,
          passportLevel: result.user.passport_level || result.user.passportLevel || 'Basic'
        };

        setState(prev => ({
          ...prev,
          registrationStep: 'complete',
          isAuthenticated: true,
          user,
          isRegistering: false,
          sessionId: result.sessionId || null,
          sessionToken: result.sessionToken || null,
          error: null
        }));

        // 토큰 동기화 (1번 파일에서)
        if (result.sessionToken) {
          notifyTokenChange(result.sessionToken);
        }
      }

      return result;

    } catch (error: any) {
      console.error('💥 Ultimate 등록 실패:', error);

      if (!mountedRef.current) {
        throw new Error('컴포넌트 언마운트됨');
      }

      const errorMessage = error.message || 'WebAuthn 등록에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        registrationError: errorMessage,
        registrationStep: 'waiting',
        isRegistering: false,
        error: errorMessage
      }));

      throw new Error(errorMessage);
    }
  }, [backendConnected, webAuthnAPI, validateDID, notifyTokenChange]);

  // ============================================================================
  // 🔓 WebAuthn 로그인 (2번 파일 기반 + 1번 파일의 DID 검증 추가)
  // ============================================================================
  
  const loginWithWebAuthn = useCallback(async (userEmail?: string): Promise<WebAuthnLoginResult> => {
    console.log('🔓 === Ultimate WebAuthn 로그인 시작 ===');
    
    setState(prev => ({
      ...prev,
      isRegistering: true,
      registrationError: undefined,
      registrationStep: 'passkey'
    }));

    try {
      let result: WebAuthnLoginResult;

      if (backendConnected) {
        console.log('🔐 실제 WebAuthn 로그인 실행...');
        result = await webAuthnAPI.loginWithWebAuthn(userEmail);
      } else {
        console.log('🎭 Mock WebAuthn 로그인 실행...');
        result = await webAuthnAPI.mockWebAuthnLogin();
      }

      if (result.success && result.user) {
        // DID 검증 추가 (1번 파일에서)
        if (!validateDID(result.user.did)) {
          throw new Error('서버에서 유효하지 않은 DID를 반환했습니다');
        }

        console.log('✅ Ultimate 로그인 성공:', result.user.username);
        
        const user = {
          ...result.user,
          authenticated: true,
          cueBalance: result.user.cue_tokens || result.user.cueBalance || 0,
          trustScore: result.user.trust_score || result.user.trustScore || 50,
          passportLevel: result.user.passport_level || result.user.passportLevel || 'Basic'
        };

        setState(prev => ({
          ...prev,
          registrationStep: 'complete',
          isAuthenticated: true,
          user,
          isRegistering: false,
          sessionId: result.sessionId || null,
          sessionToken: result.sessionToken || null,
          error: null
        }));

        // 토큰 동기화 (1번 파일에서)
        if (result.sessionToken) {
          notifyTokenChange(result.sessionToken);
        }
      }

      return result;

    } catch (error: any) {
      console.error('💥 Ultimate 로그인 실패:', error);

      if (!mountedRef.current) {
        throw new Error('컴포넌트 언마운트됨');
      }

      const errorMessage = error.message || 'WebAuthn 로그인에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        registrationError: errorMessage,
        registrationStep: 'waiting',
        isRegistering: false,
        error: errorMessage
      }));

      throw new Error(errorMessage);
    }
  }, [backendConnected, webAuthnAPI, validateDID, notifyTokenChange]);

  // ============================================================================
  // 🚪 로그아웃 (완전 통합)
  // ============================================================================
  
  const logout = useCallback(async (): Promise<void> => {
    console.log('🚪 === Ultimate 로그아웃 시작 ===');
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // 백엔드에 로그아웃 요청
      if (backendConnected && typeof apiClient.logout === 'function') {
        await apiClient.logout();
      }

      if (!mountedRef.current) return;

      // 완전한 데이터 정리
      clearAllAuthData();

      // 상태 초기화
      setState({
        isAuthenticated: false,
        isRegistering: false,
        registrationStep: 'waiting',
        registrationError: undefined,
        user: undefined,
        sessionId: null,
        sessionToken: null,
        lastRestoreTime: 0,
        error: null
      });

      console.log('✅ Ultimate 로그아웃 완료');

    } catch (error: any) {
      console.error('💥 Ultimate 로그아웃 오류:', error);

      if (!mountedRef.current) return;

      // 에러가 발생해도 로컬 상태는 정리
      clearAllAuthData();
      setState({
        isAuthenticated: false,
        isRegistering: false,
        registrationStep: 'waiting',
        registrationError: undefined,
        user: undefined,
        sessionId: null,
        sessionToken: null,
        lastRestoreTime: 0,
        error: null
      });
    }
  }, [backendConnected, clearAllAuthData]);

  // ============================================================================
  // 🔄 주기적 세션 체크 (1번 파일에서)
  // ============================================================================
  
  const startPeriodicSessionCheck = useCallback(() => {
    if (restoreTimeoutRef.current) {
      clearInterval(restoreTimeoutRef.current);
    }

    // 10분마다 세션 유효성 확인
    restoreTimeoutRef.current = setInterval(() => {
      if (state.isAuthenticated && !restoreInProgress.current) {
        console.log('🕒 주기적 세션 체크');
        restoreSession(false).catch(() => {
          // 에러는 무시 (사용자에게 방해되지 않도록)
        });
      }
    }, 10 * 60 * 1000); // 10분

  }, [state.isAuthenticated, restoreSession]);

  // ============================================================================
  // 🔧 수동 새로고침 및 유틸리티 (1번 파일에서)
  // ============================================================================
  
  const refresh = useCallback(() => {
    console.log('🔄 수동 세션 새로고침');
    return restoreSession(true);
  }, [restoreSession]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null, registrationError: undefined }));
  }, []);

  const forceNewUser = useCallback(() => {
    console.log('🆕 강제 새 사용자 모드');
    return handleInvalidDID('manual-reset', '수동 초기화');
  }, [handleInvalidDID]);

  // ============================================================================
  // 📊 완전한 디버그 정보 (1번 파일에서)
  // ============================================================================

  const getDebugInfo = useCallback(() => {
    return {
      auth: {
        isAuthenticated: state.isAuthenticated,
        hasUser: !!state.user,
        hasToken: !!state.sessionToken,
        username: state.user?.username,
        userDID: state.user?.did,
        cueBalance: state.user?.cueBalance,
        error: state.error,
        lastRestoreTime: state.lastRestoreTime,
        registrationStep: state.registrationStep
      },
      flags: {
        restoreInProgress: restoreInProgress.current,
        mountedRef: mountedRef.current,
        backendConnected,
        isReady
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
      version: 'v5.0-Ultimate-Integration',
      timestamp: new Date().toISOString()
    };
  }, [state, websocketStatus, tokenSyncCallbacks, backendConnected, isReady]);

  // ============================================================================
  // 🚀 초기화 이펙트 (완전 통합)
  // ============================================================================
  
  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      console.log('🚀 Ultimate useAuth 초기화');
      
      try {
        // 1. 백엔드 연결 확인
        await checkBackendConnection();
        
        // 2. 세션 복원 시도 (약간의 지연 후)
        setTimeout(() => {
          restoreSession(true);
        }, 100);
        
        setIsReady(true);
        console.log('✅ Ultimate useAuth 초기화 완료');
        
      } catch (error: any) {
        console.error('💥 Ultimate useAuth 초기화 오류:', error);
        setIsReady(true); // 에러가 발생해도 ready 상태로 전환
      }
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
    notifyTokenChange(state.sessionToken);
  }, [state.sessionToken, notifyTokenChange]);

  // ============================================================================
  // 📤 Ultimate Return 값 (완전한 인터페이스)
  // ============================================================================
  
  return {
    // 핵심 상태 (2번 파일 기반)
    ...state,
    backendConnected,
    isReady,
    
    // 인증 메서드 (2번 파일 이름 유지 + 기능 강화)
    authenticateWithWebAuthn,
    loginWithWebAuthn,
    logout,
    
    // 세션 관리 (1번 + 2번 파일 통합)
    restoreSession,
    clearAuthData,
    clearAllAuthData,
    refresh,
    clearError,
    
    // 하이브리드 연동 (1번 파일에서)
    registerTokenSyncCallback,
    updateCueBalance,
    updateWebSocketStatus,
    websocketStatus,
    
    // DID 검증 (1번 파일에서)
    validateDID,
    handleInvalidDID,
    forceNewUser,
    
    // 디버그 정보 (1번 파일에서)
    debug: {
      lastRestoreTime: state.lastRestoreTime,
      restoreInProgress: restoreInProgress.current,
      mountedRef: mountedRef.current,
      getDebugInfo
    }
  };
};