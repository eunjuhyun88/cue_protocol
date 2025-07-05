// ============================================================================
// 📁 frontend/src/hooks/useAuth.ts - 통합 WebAuthn API 사용
// 🔧 실제 WebAuthnAPI 메서드에 맞춘 인증 훅
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
      localStorage.setItem('cue_session_token', token); // WebAuthnAPI가 사용하는 키
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
      // 먼저 새로운 키에서 토큰 확인
      let token = localStorage.getItem('session_token');
      
      // 없으면 WebAuthnAPI가 사용하는 키에서 확인
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
          clearSessionToken();
          return null;
        }
      }
      
      return token;
    } catch (error) {
      console.error('❌ 세션 토큰 조회 실패:', error);
      return null;
    }
  }, []);

  const clearSessionToken = useCallback(() => {
    try {
      localStorage.removeItem('session_token');
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      localStorage.removeItem('auth_timestamp');
      webauthnAPI.clearSessionToken();
      console.log('🗑️ 세션 토큰 삭제 완료');
    } catch (error) {
      console.error('❌ 세션 토큰 삭제 실패:', error);
    }
  }, [webauthnAPI]);

  // ============================================================================
  // 🔧 세션 복원 (WebAuthnAPI 메서드 사용)
  // ============================================================================

  const restoreSession = useCallback(async () => {
    console.log('🔄 === 세션 복원 시작 ===');
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
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
      
      // 실패 시 토큰 정리
      clearSessionToken();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null
      });
      
      return { success: false, reason: error.message };
    }
  }, [getSessionToken, clearSessionToken, webauthnAPI]);

  // ============================================================================
  // 🔧 통합 WebAuthn 인증 (등록/로그인 자동 처리)
  // ============================================================================

  const authenticateWithWebAuthn = useCallback(async () => {
    try {
      console.log('🔐 === 통합 WebAuthn 인증 시작 ===');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // WebAuthnAPI의 unifiedWebAuthnAuth 메서드 사용
      const result = await webauthnAPI.unifiedWebAuthnAuth();
      
      console.log('📦 통합 인증 결과:', {
        success: result.success,
        action: result.action,
        isExisting: result.isExistingUser,
        hasUser: !!result.user,
        hasToken: !!result.sessionToken
      });
      
      if (result.success && result.user) {
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
  }, [webauthnAPI, saveSessionToken]);

  // ============================================================================
  // 🔧 명시적 등록/로그인 (호환성을 위해 유지)
  // ============================================================================

  const registerWithWebAuthn = useCallback(async (userName?: string, userEmail?: string) => {
    try {
      console.log('📝 === WebAuthn 등록 (통합 인증 사용) ===');
      
      // 통합 인증을 사용하되, 사용자에게는 "등록"으로 표시
      const result = await authenticateWithWebAuthn();
      
      // 결과를 등록 형식으로 반환
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
      
      // 통합 인증을 사용하되, 사용자에게는 "로그인"으로 표시
      const result = await authenticateWithWebAuthn();
      
      // 결과를 로그인 형식으로 반환
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
  // 🔧 로그아웃 (WebAuthnAPI 메서드 사용)
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
      
      // 로컬 세션 정리
      clearSessionToken();
      
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
      clearSessionToken();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null
      });
    }
  }, [webauthnAPI, clearSessionToken]);

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

      // API 엔드포인트로 직접 호출
      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.user) {
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
  }, [getSessionToken]);

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
        isLoading: authState.isLoading
      },
      tokens: {
        sessionToken: !!localStorage.getItem('session_token'),
        cueSessionToken: !!localStorage.getItem('cue_session_token'),
        cueSessionId: !!localStorage.getItem('cue_session_id'),
        authTimestamp: localStorage.getItem('auth_timestamp')
      },
      webauthn: webauthnDebug,
      timestamp: new Date().toISOString()
    };
  }, [authState, webauthnAPI]);

  const testAuthentication = useCallback(async () => {
    try {
      console.log('🧪 인증 테스트 시작...');
      return await webauthnAPI.testAuthentication();
    } catch (error) {
      console.error('🧪 인증 테스트 실패:', error);
      return { success: false, error: error.message };
    }
  }, [webauthnAPI]);

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
    
    // 호환성 인증 함수 (내부적으로 통합 인증 사용)
    loginWithWebAuthn,
    registerWithWebAuthn,
    
    // 세션 관리
    logout,
    restoreSession,
    refreshUser,
    
    // 토큰 관리
    saveSessionToken,
    getSessionToken,
    clearSessionToken,
    
    // 디버깅 및 테스트
    getDebugInfo,
    testAuthentication
  };
};