// ============================================================================
// 📁 src/hooks/useWebAuthn.ts
// 🔐 WebAuthn 인증 관리 훅
// ============================================================================

import { useState, useCallback } from 'react';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';
import type { 
  AuthState, 
  RegistrationStep, 
  WebAuthnRegistrationResult, 
  WebAuthnLoginResult 
} from '../types/auth.types';

interface UseWebAuthnReturn extends AuthState {
  register: (userEmail?: string) => Promise<WebAuthnRegistrationResult>;
  login: () => Promise<WebAuthnLoginResult>;
  clearError: () => void;
}

export const useWebAuthn = (backendConnected: boolean = false): UseWebAuthnReturn => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isRegistering: false,
    registrationStep: 'waiting',
    registrationError: undefined,
    user: undefined
  });

  const api = new WebAuthnAPI();

  const register = useCallback(async (userEmail?: string): Promise<WebAuthnRegistrationResult> => {
    setState(prev => ({
      ...prev,
      isRegistering: true,
      registrationError: undefined,
      registrationStep: 'passkey'
    }));

    try {
      let result: WebAuthnRegistrationResult;

      if (backendConnected) {
        console.log('🔐 실제 WebAuthn 등록 시작...');
        result = await api.startWebAuthnRegistration(userEmail);
      } else {
        console.log('🔧 Mock WebAuthn 등록...');
        result = await api.mockWebAuthnRegistration();
      }

      if (result.success) {
        setState(prev => ({
          ...prev,
          registrationStep: 'wallet'
        }));

        // 지갑 생성 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 2000));

        setState(prev => ({
          ...prev,
          registrationStep: 'complete',
          isAuthenticated: true,
          user: result.user,
          isRegistering: false
        }));

        console.log('✅ WebAuthn 등록 완료:', result.user);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'WebAuthn 등록에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        isRegistering: false,
        registrationStep: 'waiting',
        registrationError: errorMessage
      }));

      console.error('❌ WebAuthn 등록 실패:', error);
      throw error;
    }
  }, [backendConnected]);

  const login = useCallback(async (): Promise<WebAuthnLoginResult> => {
    setState(prev => ({
      ...prev,
      registrationError: undefined
    }));

    try {
      let result: WebAuthnLoginResult;

      if (backendConnected) {
        console.log('🔐 실제 WebAuthn 로그인 시작...');
        result = await api.loginWithWebAuthn();
      } else {
        console.log('🔧 Mock WebAuthn 로그인...');
        result = await api.mockWebAuthnLogin();
      }

      if (result.success) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: result.user
        }));

        console.log('✅ WebAuthn 로그인 완료:', result.user);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'WebAuthn 로그인에 실패했습니다.';
      
      setState(prev => ({
        ...prev,
        registrationError: errorMessage
      }));

      console.error('❌ WebAuthn 로그인 실패:', error);
      throw error;
    }
  }, [backendConnected]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      registrationError: undefined
    }));
  }, []);

  return {
    ...state,
    register,
    login,
    clearError
  };
};