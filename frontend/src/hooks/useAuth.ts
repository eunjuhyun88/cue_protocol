// ============================================================================
// 📁 frontend/src/hooks/useAuth.ts - 완전한 데이터 정리 포함
// 🔧 DID 검증 실패 시 모든 로컬 데이터 삭제하여 새 사용자로 처리
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';

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
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    sessionToken: null
  });

  const webauthnAPI = new WebAuthnAPI();

  // ============================================================================
  // 🔧 완전한 로컬 스토리지 정리 함수
  // ============================================================================

  const clearAllAuthData = useCallback(() => {
    console.log('🗑️ === 완전한 인증 데이터 정리 시작 ===');
    
    if (typeof window === 'undefined') return;

    // 주요 인증 토큰들
    const authKeys = [
      'session_token',
      'cue_session_token', 
      'cue_session_id',
      'final0626_auth_token',
      'auth_timestamp'
    ];

    // Zustand persist 스토어들 (가장 중요!)
    const zustandKeys = [
      'auth-storage',          // useAuthStore - 주범!
      'passport-storage',      
      'user-storage',          
      'cue-storage'           
    ];

    // 레거시 사용자 데이터 키들
    const legacyKeys = [
      'cue_user_data',
      'final0626_user',
      'user_data',
      'passport_data',
      'webauthn_user',
      'current_user_id'
    ];

    // 모든 키 합치기
    const allKeys = [...authKeys, ...zustandKeys, ...legacyKeys];

    let deletedCount = 0;
    let foundKeys = [];

    // 삭제 전에 어떤 키들이 있는지 확인
    allKeys.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        foundKeys.push(key);
      }
    });

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

    // 추가적으로 모든 로컬 스토리지 키를 검사
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
            console.log(`🗑️ 추가 삭제: ${key}`);
            localStorage.removeItem(key);
            deletedCount++;
          } catch (error) {
            console.warn(`❌ 추가 삭제 실패: ${key}`, error);
          }
        }
      });
    } catch (error) {
      console.warn('❌ 추가 키 검사 실패:', error);
    }

    console.log(`✅ 총 ${deletedCount}개 키 삭제 완료`);
    console.log('🔄 완전한 초기화 상태로 복원됨');

    // WebAuthnAPI 토큰도 정리
    if (webauthnAPI && webauthnAPI.clearSessionToken) {
      webauthnAPI.clearSessionToken();
    }
  }, [webauthnAPI]);

  // ============================================================================
  // 🔧 엄격한 DID 검증 함수
  // ============================================================================

  const validateDID = useCallback((did: string): boolean => {
    if (!did || typeof did !== 'string') {
      return false;
    }

    // 현재 프로젝트에서 사용하는 올바른 DID 형식만 허용
    const validPatterns = [
      /^did:final0626:[a-zA-Z0-9\-_]+$/,           // 실제 프로덕션 DID
      /^did:webauthn:[a-zA-Z0-9\-_]+$/,            // WebAuthn 기반 DID  
      /^did:cue:[0-9]{13,}$/                       // 새로운 CUE DID (타임스탬프 기반)
    ];

    // 목 데이터 DID는 거부 (새로가입 유도)
    const mockPatterns = [
      /^did:cue:existing:/,                        // 기존 목 데이터
      /^did:cue:mock:/,                           // 목 데이터
      /^did:ai:mock:/,                            // AI 목 데이터
      /^did:mock:/                                // 일반 목 데이터
    ];

    // 목 데이터 패턴 확인 - 발견되면 false 반환
    for (const pattern of mockPatterns) {
      if (pattern.test(did)) {
        console.warn(`🚫 목 데이터 DID 감지, 신규 등록 필요: ${did}`);
        return false;
      }
    }

    // 유효한 패턴 확인
    for (const pattern of validPatterns) {
      if (pattern.test(did)) {
        return true;
      }
    }

    console.warn(`🚫 알려지지 않은 DID 형식: ${did}`);
    return false;
  }, []);

  // ============================================================================
  // 🔧 DID 검증 실패 처리 함수
  // ============================================================================

  const handleInvalidDID = useCallback((did: string, reason: string = '형식 오류') => {
    console.warn(`❌ 유효하지 않은 DID 감지: ${did}`);
    console.warn(`📝 이유: ${reason}`);
    console.warn(`🗑️ 모든 로컬 데이터를 삭제하고 새 사용자로 시작합니다`);
    
    // 완전한 데이터 정리
    clearAllAuthData();
    
    // 상태 초기화
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      sessionToken: null
    });
    
    console.log('🆕 새 사용자 모드로 전환 완료');
    
    return {
      success: false,
      shouldProceedAsNewUser: true,
      reason: `Invalid DID: ${reason}`
    };
  }, [clearAllAuthData]);

  // ============================================================================
  // 🔧 세션 토큰 관리
  // ============================================================================

  const saveSessionToken = useCallback((token: string) => {
    try {
      console.log('💾 세션 토큰 저장 시도:', token ? token.substring(0, 20) + '...' : 'null');
      
      if (!token || typeof token !== 'string' || token.length < 10) {
        console.error('❌ 잘못된 토큰 형식:', token);
        return false;
      }

      // 테스트 토큰 거부
      if (token.startsWith('force_token') || token.startsWith('test_') || token.startsWith('mock_')) {
        console.error('❌ 테스트 토큰 거부:', token.substring(0, 20));
        return false;
      }

      localStorage.setItem('session_token', token);
      localStorage.setItem('cue_session_token', token);
      localStorage.setItem('auth_timestamp', Date.now().toString());
      
      // WebAuthnAPI에도 토큰 설정
      webauthnAPI.setSessionToken(token);
      
      console.log('✅ 세션 토큰 저장 완료');
      return true;
    } catch (error) {
      console.error('❌ 세션 토큰 저장 실패:', error);
      return false;
    }
  }, [webauthnAPI]);

  const getSessionToken = useCallback(() => {
    try {
      let token = localStorage.getItem('session_token');
      if (!token) {
        token = localStorage.getItem('cue_session_token');
      }
      
      if (!token) return null;

      // 토큰 만료 검사 (7일)
      const timestamp = localStorage.getItem('auth_timestamp');
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
        
        if (age > maxAge) {
          console.log('⏰ 세션 토큰 만료, 삭제 중...');
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
  // 🔧 수정된 세션 복원 (DID 검증 포함)
  // ============================================================================

  const restoreSession = useCallback(async () => {
    console.log('🔄 === 세션 복원 시작 (DID 검증 포함) ===');
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // 1단계: Zustand persist 데이터 확인 및 DID 검증
      const authStorageData = localStorage.getItem('auth-storage');
      if (authStorageData) {
        try {
          const parsedData = JSON.parse(authStorageData);
          const user = parsedData.state?.user || parsedData.user;
          
          if (user && user.did) {
            console.log(`📱 Zustand에서 사용자 발견: ${user.did}`);
            
            // DID 검증 - 실패 시 완전 삭제
            if (!validateDID(user.did)) {
              console.warn(`❌ 유효하지 않은 DID, 로컬 데이터 삭제: ${user.did}`);
              return handleInvalidDID(user.did, 'Zustand persist 데이터의 구형 DID');
            }
          }
        } catch (error) {
          console.warn('⚠️ Zustand 데이터 파싱 실패:', error);
          localStorage.removeItem('auth-storage');
        }
      }

      // 2단계: 세션 토큰으로 서버 검증
      const savedToken = getSessionToken();
      
      if (!savedToken) {
        console.log('📭 저장된 세션 토큰 없음');
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          sessionToken: null
        });
        return { success: false, reason: 'no_token' };
      }

      console.log('🔍 세션 토큰 복원 시도:', savedToken.substring(0, 20) + '...');
      
      // WebAuthnAPI에 토큰 설정
      webauthnAPI.setSessionToken(savedToken);
      
      // WebAuthnAPI의 restoreSession 메서드 사용
      const result = await webauthnAPI.restoreSession();
      
      if (result && result.success && result.user) {
        // 서버에서 받은 사용자 데이터의 DID도 검증
        if (!validateDID(result.user.did)) {
          console.warn(`❌ 서버 데이터의 유효하지 않은 DID: ${result.user.did}`);
          return handleInvalidDID(result.user.did, '서버 데이터의 구형 DID');
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
          sessionToken: savedToken
        });
        
        console.log('✅ 세션 복원 성공:', user.username);
        return { success: true, user };
      } else {
        console.log('❌ 세션 복원 실패');
        throw new Error('세션 복원 실패');
      }

    } catch (error: any) {
      console.error('💥 세션 복원 실패:', error.message);
      
      // 실패 시 완전한 토큰 정리
      clearAllAuthData();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null
      });
      
      return { success: false, reason: error.message };
    }
  }, [getSessionToken, webauthnAPI, validateDID, handleInvalidDID, clearAllAuthData]);

  // ============================================================================
  // 🔧 통합 WebAuthn 인증 (기존 로직 유지)
  // ============================================================================

  const authenticateWithWebAuthn = useCallback(async () => {
    try {
      console.log('🔐 === 통합 WebAuthn 인증 시작 ===');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const result = await webauthnAPI.unifiedWebAuthnAuth();
      
      console.log('📦 통합 인증 결과:', {
        success: result.success,
        action: result.action,
        isExisting: result.isExistingUser,
        hasUser: !!result.user,
        hasToken: !!result.sessionToken
      });
      
      if (result.success && result.user) {
        // 새로 받은 DID 검증
        if (!validateDID(result.user.did)) {
          console.warn(`❌ 새로 받은 DID가 유효하지 않음: ${result.user.did}`);
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
            sessionToken: result.sessionToken
          });
          
          if (result.isExistingUser) {
            console.log('✅ 기존 사용자 로그인 성공:', user.username);
          } else {
            console.log('✅ 새 사용자 등록 성공:', user.username);
          }
          
          return {
            ...result,
            user
          };
        } else {
          throw new Error('세션 토큰 저장 실패');
        }
      } else {
        throw new Error(result.message || '인증 실패');
      }
    } catch (error: any) {
      console.error('💥 통합 WebAuthn 인증 실패:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [webauthnAPI, saveSessionToken, validateDID]);

  // ============================================================================
  // 🔧 명시적 등록/로그인 (호환성을 위해 유지)
  // ============================================================================

  const registerWithWebAuthn = useCallback(async (userName?: string, userEmail?: string) => {
    try {
      console.log('📝 === WebAuthn 등록 (통합 인증 사용) ===');
      
      const result = await authenticateWithWebAuthn();
      
      return {
        ...result,
        message: result.isExistingUser 
          ? '기존 계정으로 성공적으로 로그인되었습니다!' 
          : '새 계정이 성공적으로 등록되었습니다!'
      };
    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }, [authenticateWithWebAuthn]);

  const loginWithWebAuthn = useCallback(async (userEmail?: string) => {
    try {
      console.log('🔐 === WebAuthn 로그인 (통합 인증 사용) ===');
      
      const result = await authenticateWithWebAuthn();
      
      return {
        ...result,
        message: result.isExistingUser 
          ? '성공적으로 로그인되었습니다!' 
          : '새 계정이 생성되어 로그인되었습니다!'
      };
    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      throw error;
    }
  }, [authenticateWithWebAuthn]);

  // ============================================================================
  // 🔧 로그아웃 (완전한 정리 포함)
  // ============================================================================

  const logout = useCallback(async () => {
    try {
      console.log('🚪 === 로그아웃 시작 ===');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // WebAuthnAPI의 logout 메서드 사용
      try {
        await webauthnAPI.logout();
        console.log('✅ 서버 로그아웃 성공');
      } catch (error) {
        console.warn('⚠️ 서버 로그아웃 실패:', error);
      }
      
      // 완전한 로컬 데이터 정리
      clearAllAuthData();
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null
      });
      
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('💥 로그아웃 오류:', error);
      // 오류가 있어도 로컬 상태는 정리
      clearAllAuthData();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null
      });
    }
  }, [webauthnAPI, clearAllAuthData]);

  // ============================================================================
  // 🔧 사용자 정보 새로고침
  // ============================================================================

  const refreshUser = useCallback(async () => {
    try {
      console.log('🔄 사용자 정보 새로고침...');
      const token = getSessionToken();
      if (!token) {
        console.log('📭 토큰 없음, 새로고침 불가');
        return;
      }

      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        // 새로고침된 데이터의 DID도 검증
        if (!validateDID(data.user.did)) {
          console.warn(`❌ 새로고침된 DID가 유효하지 않음: ${data.user.did}`);
          return handleInvalidDID(data.user.did, '새로고침된 서버 데이터의 구형 DID');
        }

        const user = {
          ...data.user,
          authenticated: true,
          cueBalance: data.user.cue_tokens || data.user.cueBalance || 0,
          trustScore: data.user.trust_score || data.user.trustScore || 50,
          passportLevel: data.user.passport_level || data.user.passportLevel || 'Basic'
        };

        setAuthState(prev => ({
          ...prev,
          user
        }));
        console.log('✅ 사용자 정보 새로고침 완료:', user.username);
      } else {
        console.warn('⚠️ 사용자 정보 새로고침 실패:', data.message);
      }
    } catch (error) {
      console.error('💥 사용자 정보 새로고침 실패:', error);
    }
  }, [getSessionToken, validateDID, handleInvalidDID]);

  // ============================================================================
  // 🔧 디버깅 및 유틸리티
  // ============================================================================

  const getDebugInfo = useCallback(() => {
    const webauthnDebug = webauthnAPI.getDebugInfo();
    
    return {
      auth: {
        isAuthenticated: authState.isAuthenticated,
        hasUser: !!authState.user,
        hasToken: !!authState.sessionToken,
        username: authState.user?.username,
        cueBalance: authState.user?.cueBalance,
        isLoading: authState.isLoading,
        userDID: authState.user?.did
      },
      tokens: {
        sessionToken: !!localStorage.getItem('session_token'),
        cueSessionToken: !!localStorage.getItem('cue_session_token'),
        cueSessionId: !!localStorage.getItem('cue_session_id'),
        authTimestamp: localStorage.getItem('auth_timestamp')
      },
      localStorage: {
        authStorage: !!localStorage.getItem('auth-storage'),
        allKeys: Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('session') || 
          key.includes('token') || key.includes('user') || 
          key.includes('cue')
        )
      },
      webauthn: webauthnDebug,
      timestamp: new Date().toISOString()
    };
  }, [authState, webauthnAPI]);

  const forceNewUser = useCallback(() => {
    console.log('🆕 강제 새 사용자 모드');
    return handleInvalidDID('manual-reset', '수동 초기화');
  }, [handleInvalidDID]);

  // ============================================================================
  // 🔧 초기화 Effect
  // ============================================================================

  useEffect(() => {
    console.log('🚀 useAuth 초기화 - 세션 복원 시도');
    restoreSession();
  }, [restoreSession]);

  // ============================================================================
  // 🔧 반환 값
  // ============================================================================

  return {
    // 상태
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    sessionToken: authState.sessionToken,
    
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
    
    // 디버깅 및 테스트
    getDebugInfo,
    validateDID
  };
};