// ============================================================================
// 🔐 Hybrid useAuth Hook - 기존 구조 + 세션 관리 강화
// 경로: frontend/src/hooks/useAuth.ts
// ============================================================================
// 기존 WebAuthn API 구현을 유지하면서 세션 관리와 Zustand Store 연동 추가

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

// ============================================================================
// 📝 타입 정의 (기존 유지)
// ============================================================================
interface User {
  id: string;
  did: string;
  username: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  authMethod: 'webauthn' | 'password';
  biometricVerified: boolean;
  registrationStatus: 'pending' | 'verified' | 'complete';
  createdAt: Date;
  lastLoginAt: Date;
}

interface UseAuthReturn {
  // 상태
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // 메서드
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // 세션 관리 (새로 추가)
  restoreSession: () => Promise<boolean>;
  isSessionValid: () => boolean;
  
  // WebAuthn 관련
  checkWebAuthnSupport: () => { supported: boolean; reason?: string };
  getAvailableCredentials: () => Promise<any[]>;
}

// ============================================================================
// 🔧 AuthAPIService (기존 구조 유지)
// ============================================================================
class AuthAPIService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // API 요청 헬퍼 (기존 유지)
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const startTime = Date.now();
    
    try {
      console.log(`🌐 API 요청: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
      });

      const endTime = Date.now();
      console.log(`⚡ API 응답: ${response.status} (${endTime - startTime}ms)`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      const endTime = Date.now();
      console.error(`❌ API 에러: ${url} (${endTime - startTime}ms)`, error.message);
      throw error;
    }
  }

  // WebAuthn 지원 확인 (기존 유지)
  checkWebAuthnSupport(): { supported: boolean; reason?: string } {
    if (typeof window === 'undefined') {
      return { supported: false, reason: 'Server-side rendering' };
    }

    if (!window.PublicKeyCredential) {
      return { 
        supported: false, 
        reason: 'WebAuthn을 지원하지 않는 브라우저입니다.' 
      };
    }

    if (!navigator.credentials) {
      return { 
        supported: false, 
        reason: 'Credentials API를 지원하지 않습니다.' 
      };
    }

    return { supported: true };
  }

  // WebAuthn 등록 (기존 유지)
  async register(): Promise<User> {
    console.log('🔐 WebAuthn 등록 시작');
    
    const registrationOptions = await this.request('/api/auth/webauthn/register/begin', {
      method: 'POST',
    });

    const credential = await navigator.credentials.create({
      publicKey: {
        ...registrationOptions,
        challenge: new Uint8Array(registrationOptions.challenge),
        user: {
          ...registrationOptions.user,
          id: new Uint8Array(registrationOptions.user.id),
        },
        excludeCredentials: registrationOptions.excludeCredentials?.map((cred: any) => ({
          ...cred,
          id: new Uint8Array(cred.id),
        })),
      },
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Credential 생성에 실패했습니다.');
    }

    const result = await this.request('/api/auth/webauthn/register/complete', {
      method: 'POST',
      body: JSON.stringify({
        id: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        response: {
          attestationObject: Array.from(new Uint8Array(
            (credential.response as AuthenticatorAttestationResponse).attestationObject
          )),
          clientDataJSON: Array.from(new Uint8Array(
            credential.response.clientDataJSON
          )),
        },
        type: credential.type,
      }),
    });

    console.log('✅ WebAuthn 등록 완료:', result.user.did);
    return result.user;
  }

  // WebAuthn 로그인 (기존 유지)
  async login(): Promise<User> {
    console.log('🔐 WebAuthn 로그인 시작');
    
    const authenticationOptions = await this.request('/api/auth/webauthn/login/begin', {
      method: 'POST',
    });

    const assertion = await navigator.credentials.get({
      publicKey: {
        ...authenticationOptions,
        challenge: new Uint8Array(authenticationOptions.challenge),
        allowCredentials: authenticationOptions.allowCredentials?.map((cred: any) => ({
          ...cred,
          id: new Uint8Array(cred.id),
        })),
      },
    }) as PublicKeyCredential;

    if (!assertion) {
      throw new Error('인증에 실패했습니다.');
    }

    const result = await this.request('/api/auth/webauthn/login/complete', {
      method: 'POST',
      body: JSON.stringify({
        id: assertion.id,
        rawId: Array.from(new Uint8Array(assertion.rawId)),
        response: {
          authenticatorData: Array.from(new Uint8Array(
            (assertion.response as AuthenticatorAssertionResponse).authenticatorData
          )),
          clientDataJSON: Array.from(new Uint8Array(
            assertion.response.clientDataJSON
          )),
          signature: Array.from(new Uint8Array(
            (assertion.response as AuthenticatorAssertionResponse).signature
          )),
          userHandle: (assertion.response as AuthenticatorAssertionResponse).userHandle
            ? Array.from(new Uint8Array(
                (assertion.response as AuthenticatorAssertionResponse).userHandle!
              ))
            : null,
        },
        type: assertion.type,
      }),
    });

    console.log('✅ WebAuthn 로그인 완료:', result.user.did);
    return result.user;
  }

  // 세션 검증 API (새로 추가)
  async validateSession(sessionToken: string): Promise<{ success: boolean; user?: User }> {
    try {
      const result = await this.request('/api/auth/session/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false };
    }
  }

  // 기존 메서드들 유지
  async getCurrentUser(): Promise<User | null> {
    try {
      const result = await this.request('/api/auth/me');
      return result.user;
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
  }

  async getAvailableCredentials(): Promise<any[]> {
    try {
      const result = await this.request('/api/auth/webauthn/credentials');
      return result.credentials || [];
    } catch (error) {
      return [];
    }
  }
}

// ============================================================================
// 🎣 useAuth 훅 구현 (하이브리드)
// ============================================================================
export const useAuth = (): UseAuthReturn => {
  // ============================================================================
  // 🎛️ 상태 관리 (기존 + Zustand 연동)
  // ============================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionCheckDone, setSessionCheckDone] = useState(false);

  // Zustand Store 연동 (새로 추가)
  const authStore = useAuthStore();

  // API 서비스 (기존 유지)
  const apiServiceRef = useRef<AuthAPIService>();
  if (!apiServiceRef.current) {
    apiServiceRef.current = new AuthAPIService();
  }
  const apiService = apiServiceRef.current;

  // ============================================================================
  // 🔧 세션 관리 메서드 (새로 추가)
  // ============================================================================
  
  // 세션 유효성 확인
  const isSessionValid = useCallback((): boolean => {
    if (!user) return false;

    const sessionToken = localStorage.getItem('auth-session-token');
    if (!sessionToken) return false;

    const tokenExpiry = localStorage.getItem('auth-token-expiry');
    if (tokenExpiry) {
      const expiryTime = new Date(tokenExpiry).getTime();
      if (Date.now() > expiryTime) {
        console.warn('🕐 세션 토큰 만료됨');
        return false;
      }
    }

    return true;
  }, [user]);

  // 세션 복원
  const restoreSession = useCallback(async (): Promise<boolean> => {
    if (sessionCheckDone) return isAuthenticated;

    console.log('🔄 세션 복원 시도');

    try {
      // Zustand persist에서 사용자 정보 확인
      const storedUser = authStore.user;
      if (!storedUser) {
        setSessionCheckDone(true);
        return false;
      }

      if (!isSessionValid()) {
        console.warn('⚠️ 세션이 유효하지 않음');
        await logout();
        setSessionCheckDone(true);
        return false;
      }

      // 백엔드 세션 검증
      const sessionToken = localStorage.getItem('auth-session-token');
      if (sessionToken) {
        const validation = await apiService.validateSession(sessionToken);
        if (validation.success && validation.user) {
          setUser(validation.user);
          setIsAuthenticated(true);
          authStore.setUser(validation.user);
          console.log('✅ 세션 복원 성공');
          setSessionCheckDone(true);
          return true;
        }
      }

      // 백엔드 검증 실패시 로컬 세션 사용
      setUser(storedUser);
      setIsAuthenticated(true);
      setSessionCheckDone(true);
      return true;

    } catch (error: any) {
      console.error('❌ 세션 복원 실패:', error);
      await logout();
      setSessionCheckDone(true);
      return false;
    }
  }, [sessionCheckDone, isAuthenticated, isSessionValid, authStore]);

  // ============================================================================
  // 🔧 인증 메서드 (기존 + 세션 토큰 추가)
  // ============================================================================
  
  // 등록
  const register = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const support = apiService.checkWebAuthnSupport();
      if (!support.supported) {
        throw new Error(support.reason || 'WebAuthn을 지원하지 않습니다.');
      }

      const newUser = await apiService.register();
      
      // 세션 토큰 저장 (새로 추가)
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      localStorage.setItem('auth-session-token', sessionToken);
      localStorage.setItem('auth-token-expiry', expiryTime.toISOString());
      
      setUser(newUser);
      setIsAuthenticated(true);
      authStore.setUser(newUser); // Zustand에도 저장
      
      console.log('✅ 사용자 등록 완료:', newUser.did);
    } catch (error: any) {
      console.error('❌ 사용자 등록 실패:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authStore]);

  // 로그인
  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const support = apiService.checkWebAuthnSupport();
      if (!support.supported) {
        throw new Error(support.reason || 'WebAuthn을 지원하지 않습니다.');
      }

      const authenticatedUser = await apiService.login();
      
      // 세션 토큰 저장 (새로 추가)
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      localStorage.setItem('auth-session-token', sessionToken);
      localStorage.setItem('auth-token-expiry', expiryTime.toISOString());
      
      setUser(authenticatedUser);
      setIsAuthenticated(true);
      authStore.setUser(authenticatedUser); // Zustand에도 저장
      
      console.log('✅ 사용자 로그인 완료:', authenticatedUser.did);
    } catch (error: any) {
      console.error('❌ 사용자 로그인 실패:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [authStore]);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (error: any) {
      console.error('❌ 로그아웃 API 실패:', error.message);
    } finally {
      // 로컬 상태 정리
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      authStore.logout(); // Zustand 정리
      
      // 세션 토큰 정리
      localStorage.removeItem('auth-session-token');
      localStorage.removeItem('auth-token-expiry');
      
      console.log('✅ 로그아웃 완료');
    }
  }, [authStore]);

  // 사용자 정보 새로고침 (기존 유지)
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await apiService.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        authStore.setUser(currentUser);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        authStore.logout();
      }
    } catch (error: any) {
      console.error('❌ 사용자 정보 새로고침 실패:', error.message);
      setError(error.message);
    }
  }, [authStore]);

  // ============================================================================
  // 🔄 생명주기 관리 (세션 복원 추가)
  // ============================================================================
  
  // 초기화 (기존 + 세션 복원)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 인증 상태 초기화 중...');
        setIsLoading(true);

        // 세션 복원 시도
        const restored = await restoreSession();
        
        if (!restored) {
          // 세션 복원 실패시 서버에서 확인
          const currentUser = await apiService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsAuthenticated(true);
            authStore.setUser(currentUser);
          }
        }

        setError(null);
      } catch (error: any) {
        console.error('❌ 인증 상태 초기화 실패:', error.message);
        setError(error.message);
        setUser(null);
        setIsAuthenticated(false);
        authStore.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [restoreSession, authStore]);

  // 주기적 세션 유효성 확인 (새로 추가)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (!isSessionValid()) {
        console.warn('⏰ 주기적 확인에서 세션 무효 확인, 로그아웃 처리');
        logout();
      }
    }, 5 * 60 * 1000); // 5분마다

    return () => clearInterval(interval);
  }, [isAuthenticated, isSessionValid, logout]);

  // ============================================================================
  // 🎯 반환 (기존 + 세션 관리 메서드 추가)
  // ============================================================================
  return {
    isAuthenticated: isAuthenticated && sessionCheckDone,
    user,
    isLoading: isLoading || !sessionCheckDone,
    error,
    login,
    register,
    logout,
    refreshUser,
    restoreSession, // 새로 추가
    isSessionValid, // 새로 추가
    checkWebAuthnSupport: apiService.checkWebAuthnSupport.bind(apiService),
    getAvailableCredentials: apiService.getAvailableCredentials.bind(apiService),
  };
};