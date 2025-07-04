// ============================================================================
// 📁 frontend/src/hooks/useAuth.ts - 수정된 인증 훅
// 🔧 세션 토큰 저장 및 자동 복원 개선
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
  trustScore?: number;
  passportLevel?: string;
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
      localStorage.setItem('session_token', token);
      localStorage.setItem('auth_timestamp', Date.now().toString());
      
      // WebAuthnAPI에도 토큰 설정
      webauthnAPI.setSessionToken(token);
      
      console.log('💾 세션 토큰 저장 완료');
    } catch (error) {
      console.error('❌ 세션 토큰 저장 실패:', error);
    }
  }, [webauthnAPI]);

  const getSessionToken = useCallback(() => {
    try {
      return localStorage.getItem('session_token');
    } catch (error) {
      console.error('❌ 세션 토큰 조회 실패:', error);
      return null;
    }
  }, []);

  const clearSessionToken = useCallback(() => {
    try {
      localStorage.removeItem('session_token');
      localStorage.removeItem('auth_timestamp');
      webauthnAPI.clearSessionToken();
      console.log('🗑️ 세션 토큰 삭제 완료');
    } catch (error) {
      console.error('❌ 세션 토큰 삭제 실패:', error);
    }
  }, [webauthnAPI]);

  // ============================================================================
  // 🔧 세션 복원
  // ============================================================================

  const restoreSession = useCallback(async () => {
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
        return;
      }

      console.log('🔄 세션 복원 시도 중...');
      
      // 1. WebAuthnAPI에 토큰 설정
      webauthnAPI.setSessionToken(savedToken);
      
      // 2. 세션 복원 API 호출
      const response = await fetch('http://localhost:3001/api/auth/session/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${savedToken}`
        },
        body: JSON.stringify({ sessionToken: savedToken })
      });

      const data = await response.json();

      if (data.success && data.user) {
        console.log('✅ 세션 복원 성공:', data.user.username);
        
        setAuthState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          sessionToken: savedToken
        });
      } else {
        console.warn('⚠️ 세션 복원 실패:', data.message);
        clearSessionToken();
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          sessionToken: null
        });
      }
    } catch (error) {
      console.error('💥 세션 복원 오류:', error);
      clearSessionToken();
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null
      });
    }
  }, [getSessionToken, clearSessionToken, webauthnAPI]);

  // ============================================================================
  // 🔧 로그인 함수들
  // ============================================================================

  const loginWithWebAuthn = useCallback(async (userEmail?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      console.log('🔐 WebAuthn 로그인 시작...');
      
      const result = await webauthnAPI.loginWithWebAuthn(userEmail);
      
      if (result.success && result.user) {
        // 세션 토큰 저장
        const token = result.sessionToken || result.token;
        if (token) {
          saveSessionToken(token);
        }
        
        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
          sessionToken: token
        });
        
        console.log('✅ WebAuthn 로그인 성공:', result.user.username);
        return result;
      } else {
        throw new Error(result.message || '로그인 실패');
      }
    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [webauthnAPI, saveSessionToken]);

  const registerWithWebAuthn = useCallback(async (userName?: string, userEmail?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      console.log('📝 WebAuthn 등록 시작...');
      
      const result = await webauthnAPI.registerWithWebAuthn(userName, userEmail);
      
      if (result.success && result.user) {
        // 세션 토큰 저장
        const token = result.sessionToken || result.token;
        if (token) {
          saveSessionToken(token);
        }
        
        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
          sessionToken: token
        });
        
        console.log('✅ WebAuthn 등록 성공:', result.user.username);
        return result;
      } else {
        throw new Error(result.message || '등록 실패');
      }
    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [webauthnAPI, saveSessionToken]);

  // ============================================================================
  // 🔧 로그아웃
  // ============================================================================

  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // 서버에 로그아웃 요청
      const token = getSessionToken();
      if (token) {
        try {
          await fetch('http://localhost:3001/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('⚠️ 서버 로그아웃 요청 실패:', error);
        }
      }
      
      // 로컬 세션 정리
      clearSessionToken();
      
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null
      });
      
      console.log('🚪 로그아웃 완료');
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
  }, [getSessionToken, clearSessionToken]);

  // ============================================================================
  // 🔧 사용자 정보 새로고침
  // ============================================================================

  const refreshUser = useCallback(async () => {
    try {
      const token = getSessionToken();
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        setAuthState(prev => ({
          ...prev,
          user: data.user
        }));
      }
    } catch (error) {
      console.error('💥 사용자 정보 새로고침 실패:', error);
    }
  }, [getSessionToken]);

  // ============================================================================
  // 🔧 초기화 Effect
  // ============================================================================

  useEffect(() => {
    // 앱 시작 시 세션 복원 시도
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
    
    // 함수
    loginWithWebAuthn,
    registerWithWebAuthn,
    logout,
    restoreSession,
    refreshUser,
    
    // 토큰 관리
    saveSessionToken,
    getSessionToken,
    clearSessionToken
  };
};

// ============================================================================
// 📁 frontend/src/components/auth/LoginForm.tsx - 수정된 로그인 폼
// 🔧 useAuth 훅 사용하여 세션 관리 개선
// ============================================================================

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  const { loginWithWebAuthn, registerWithWebAuthn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      
      if (mode === 'login') {
        console.log('🔐 로그인 시도...');
        result = await loginWithWebAuthn(email || undefined);
      } else {
        console.log('📝 회원가입 시도...');
        result = await registerWithWebAuthn(undefined, email || undefined);
      }

      if (result.success) {
        console.log(`✅ ${mode === 'login' ? '로그인' : '회원가입'} 성공!`);
        onSuccess?.(result.user);
      } else {
        throw new Error(result.message || `${mode === 'login' ? '로그인' : '회원가입'} 실패`);
      }
    } catch (error: any) {
      console.error(`💥 ${mode === 'login' ? '로그인' : '회원가입'} 실패:`, error);
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' ? '🔐 로그인' : '📝 회원가입'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            이메일 (선택사항)
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            `👆 ${mode === 'login' ? '생체인증으로 로그인' : '생체인증으로 회원가입'}`
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-blue-600 hover:underline"
            disabled={isLoading}
          >
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </form>
    </div>
  );
};