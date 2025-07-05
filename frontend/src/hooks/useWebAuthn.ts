// ============================================================================
// 📁 frontend/src/hooks/useWebAuthn.ts - 프론트엔드 전용 버전
// 🔐 브라우저에서만 작동하는 WebAuthn Hook (ioredis 제거)
// 수정 위치: 기존 파일을 이 내용으로 완전 교체
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// 🔧 타입 정의 (브라우저 전용)
// ============================================================================

interface WebAuthnState {
  isSupported: boolean;
  isPlatformAvailable: boolean;
  isRegistering: boolean;
  isAuthenticating: boolean;
  isLoading: boolean;
  currentStep: WebAuthnStep;
  error: WebAuthnError | null;
  user: WebAuthnUser | null;
  credentials: WebAuthnCredential[];
}

type WebAuthnStep = 
  | 'idle' 
  | 'checking' 
  | 'registering' 
  | 'authenticating' 
  | 'success' 
  | 'error';

interface WebAuthnError {
  code: string;
  message: string;
  details?: string;
  userFriendly: string;
  retryable: boolean;
}

interface WebAuthnUser {
  id: string;
  name: string;
  displayName: string;
  email?: string;
  did?: string;
}

interface WebAuthnCredential {
  id: string;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string;
  nickname?: string;
  isActive: boolean;
}

interface RegistrationOptions {
  userEmail?: string;
  userName?: string;
  userDisplayName?: string;
  deviceInfo?: Record<string, any>;
}

interface UseWebAuthnReturn extends WebAuthnState {
  register: (options?: RegistrationOptions) => Promise<WebAuthnResult>;
  authenticate: (userIdentifier?: string) => Promise<WebAuthnResult>;
  listCredentials: (userID: string) => Promise<WebAuthnCredential[]>;
  deleteCredential: (credentialID: string) => Promise<boolean>;
  updateCredentialNickname: (credentialID: string, nickname: string) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
  checkSupport: () => Promise<void>;
}

interface WebAuthnResult {
  success: boolean;
  user?: WebAuthnUser;
  credential?: WebAuthnCredential;
  session?: {
    token: string;
    expiresAt: string;
  };
  error?: WebAuthnError;
}

// ============================================================================
// 🛠️ WebAuthn API Client (브라우저 전용)
// ============================================================================

class WebAuthnAPIClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}/api/auth/webauthn${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  async startRegistration(options: RegistrationOptions): Promise<any> {
    return this.request('/register/start', {
      method: 'POST',
      body: JSON.stringify({
        ...options,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenResolution: `${screen.width}x${screen.height}`,
          ...options.deviceInfo,
        },
      }),
    });
  }

  async completeRegistration(credential: any, sessionId: string): Promise<any> {
    return this.request('/register/complete', {
      method: 'POST',
      body: JSON.stringify({ credential, sessionId }),
    });
  }

  async startAuthentication(userIdentifier?: string): Promise<any> {
    return this.request('/login/start', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier }),
    });
  }

  async completeAuthentication(credential: any, sessionId: string): Promise<any> {
    return this.request('/login/complete', {
      method: 'POST',
      body: JSON.stringify({ credential, sessionId }),
    });
  }

  async getCredentials(userID: string): Promise<any> {
    return this.request(`/credentials/${userID}`);
  }

  async deleteCredential(credentialID: string): Promise<any> {
    return this.request(`/credentials/${credentialID}`, {
      method: 'DELETE',
    });
  }

  async updateCredential(credentialID: string, updates: { nickname?: string }): Promise<any> {
    return this.request(`/credentials/${credentialID}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getStatus(): Promise<any> {
    return this.request('/status');
  }
}

// ============================================================================
// 🧠 에러 처리 유틸리티
// ============================================================================

const createWebAuthnError = (error: any): WebAuthnError => {
  // SimpleWebAuthn 브라우저 에러 처리
  if (error.name) {
    switch (error.name) {
      case 'NotAllowedError':
        return {
          code: 'USER_CANCELLED',
          message: error.message,
          userFriendly: '사용자가 인증을 취소했습니다.',
          retryable: true,
        };
      case 'InvalidStateError':
        return {
          code: 'CREDENTIAL_EXISTS',
          message: error.message,
          userFriendly: '이미 등록된 기기입니다. 다른 인증 방법을 사용해 주세요.',
          retryable: false,
        };
      case 'NotSupportedError':
        return {
          code: 'NOT_SUPPORTED',
          message: error.message,
          userFriendly: '이 브라우저나 기기에서는 지원되지 않는 인증 방식입니다.',
          retryable: false,
        };
      case 'SecurityError':
        return {
          code: 'SECURITY_ERROR',
          message: error.message,
          userFriendly: '보안 오류가 발생했습니다. 페이지를 새로고침하고 다시 시도해 주세요.',
          retryable: true,
        };
      case 'AbortError':
        return {
          code: 'TIMEOUT',
          message: error.message,
          userFriendly: '인증 시간이 초과되었습니다. 다시 시도해 주세요.',
          retryable: true,
        };
      case 'UnknownError':
        return {
          code: 'UNKNOWN_ERROR',
          message: error.message,
          userFriendly: '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.',
          retryable: true,
        };
    }
  }

  // API 에러 처리
  if (typeof error === 'string') {
    return {
      code: 'API_ERROR',
      message: error,
      userFriendly: error,
      retryable: true,
    };
  }

  // 기본 에러
  return {
    code: 'UNKNOWN',
    message: error.message || 'Unknown error',
    userFriendly: '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    retryable: true,
  };
};

// ============================================================================
// 🔍 브라우저 지원 여부 확인 (동적 로딩)
// ============================================================================

const checkWebAuthnSupport = async () => {
  try {
    // @simplewebauthn/browser 동적 임포트
    const webauthn = await import('@simplewebauthn/browser');
    
    const isSupported = webauthn.browserSupportsWebAuthn();
    const isPlatformAvailable = await webauthn.platformAuthenticatorIsAvailable();
    
    return {
      isSupported,
      isPlatformAvailable,
      startRegistration: webauthn.startRegistration,
      startAuthentication: webauthn.startAuthentication
    };
  } catch (error) {
    console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
    return {
      isSupported: false,
      isPlatformAvailable: false,
      startRegistration: null,
      startAuthentication: null
    };
  }
};

// ============================================================================
// 🎯 WebAuthn Hook (메인)
// ============================================================================

export const useWebAuthn = (): UseWebAuthnReturn => {
  const [state, setState] = useState<WebAuthnState>({
    isSupported: false,
    isPlatformAvailable: false,
    isRegistering: false,
    isAuthenticating: false,
    isLoading: false,
    currentStep: 'idle',
    error: null,
    user: null,
    credentials: [],
  });

  const apiClient = new WebAuthnAPIClient();

  // ============================================================================
  // 🔍 브라우저 지원 여부 확인
  // ============================================================================

  const checkSupport = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, currentStep: 'checking' }));

    try {
      const support = await checkWebAuthnSupport();

      setState(prev => ({
        ...prev,
        isSupported: support.isSupported,
        isPlatformAvailable: support.isPlatformAvailable,
        isLoading: false,
        currentStep: 'idle',
        error: !support.isSupported ? {
          code: 'NOT_SUPPORTED',
          message: 'WebAuthn not supported',
          userFriendly: '이 브라우저는 패스키를 지원하지 않습니다.',
          retryable: false,
        } : null,
      }));

      console.log('🔍 WebAuthn 지원 확인:', {
        isSupported: support.isSupported,
        isPlatformAvailable: support.isPlatformAvailable,
        userAgent: navigator.userAgent,
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentStep: 'error',
        error: createWebAuthnError(error),
      }));
    }
  }, []);

  // 초기 지원 여부 확인
  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  // ============================================================================
  // 🆕 패스키 등록
  // ============================================================================

  const register = useCallback(async (options: RegistrationOptions = {}): Promise<WebAuthnResult> => {
    if (!state.isSupported) {
      const error = createWebAuthnError(new Error('WebAuthn not supported'));
      setState(prev => ({ ...prev, error }));
      return { success: false, error };
    }

    setState(prev => ({
      ...prev,
      isRegistering: true,
      isLoading: true,
      currentStep: 'registering',
      error: null,
    }));

    try {
      console.log('🆕 패스키 등록 시작...', options);

      // 1. 등록 옵션 요청
      const startResponse = await apiClient.startRegistration(options);
      
      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Registration start failed');
      }

      console.log('✅ 등록 옵션 수신:', startResponse.sessionId);

      // 2. WebAuthn 라이브러리 동적 로딩 및 등록 수행
      const support = await checkWebAuthnSupport();
      
      if (!support.startRegistration) {
        throw new Error('WebAuthn library not available');
      }

      console.log('👆 생체 인증 실행 중...');
      const credential = await support.startRegistration(startResponse.options);
      
      console.log('✅ 패스키 생성 완료:', credential.id);

      // 3. 등록 완료
      const completeResponse = await apiClient.completeRegistration(
        credential,
        startResponse.sessionId
      );

      if (!completeResponse.success) {
        throw new Error(completeResponse.error || 'Registration completion failed');
      }

      const result: WebAuthnResult = {
        success: true,
        user: completeResponse.user,
        credential: completeResponse.credential,
      };

      setState(prev => ({
        ...prev,
        isRegistering: false,
        isLoading: false,
        currentStep: 'success',
        user: completeResponse.user,
      }));

      console.log('🎉 패스키 등록 완료:', completeResponse.user);
      return result;

    } catch (error: any) {
      const webauthnError = createWebAuthnError(error);
      
      setState(prev => ({
        ...prev,
        isRegistering: false,
        isLoading: false,
        currentStep: 'error',
        error: webauthnError,
      }));

      console.error('❌ 패스키 등록 실패:', webauthnError);
      return { success: false, error: webauthnError };
    }
  }, [state.isSupported]);

  // ============================================================================
  // 🔓 패스키 인증
  // ============================================================================

  const authenticate = useCallback(async (userIdentifier?: string): Promise<WebAuthnResult> => {
    if (!state.isSupported) {
      const error = createWebAuthnError(new Error('WebAuthn not supported'));
      setState(prev => ({ ...prev, error }));
      return { success: false, error };
    }

    setState(prev => ({
      ...prev,
      isAuthenticating: true,
      isLoading: true,
      currentStep: 'authenticating',
      error: null,
    }));

    try {
      console.log('🔓 패스키 인증 시작...', userIdentifier);

      // 1. 인증 옵션 요청
      const startResponse = await apiClient.startAuthentication(userIdentifier);
      
      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Authentication start failed');
      }

      console.log('✅ 인증 옵션 수신:', startResponse.sessionId);

      // 2. WebAuthn 라이브러리 동적 로딩 및 인증 수행
      const support = await checkWebAuthnSupport();
      
      if (!support.startAuthentication) {
        throw new Error('WebAuthn library not available');
      }

      console.log('👆 생체 인증 실행 중...');
      const credential = await support.startAuthentication(startResponse.options);
      
      console.log('✅ 패스키 인증 완료:', credential.id);

      // 3. 인증 완료
      const completeResponse = await apiClient.completeAuthentication(
        credential,
        startResponse.sessionId
      );

      if (!completeResponse.success) {
        throw new Error(completeResponse.error || 'Authentication completion failed');
      }

      const result: WebAuthnResult = {
        success: true,
        user: completeResponse.user,
        session: completeResponse.session,
      };

      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        isLoading: false,
        currentStep: 'success',
        user: completeResponse.user,
      }));

      // 세션 토큰 저장 (선택적)
      if (completeResponse.session?.token) {
        localStorage.setItem('webauthn_token', completeResponse.session.token);
        localStorage.setItem('webauthn_expires', completeResponse.session.expiresAt);
      }

      console.log('🎉 패스키 인증 완료:', completeResponse.user);
      return result;

    } catch (error: any) {
      const webauthnError = createWebAuthnError(error);
      
      setState(prev => ({
        ...prev,
        isAuthenticating: false,
        isLoading: false,
        currentStep: 'error',
        error: webauthnError,
      }));

      console.error('❌ 패스키 인증 실패:', webauthnError);
      return { success: false, error: webauthnError };
    }
  }, [state.isSupported]);

  // ============================================================================
  // 📋 자격 증명 관리
  // ============================================================================

  const listCredentials = useCallback(async (userID: string): Promise<WebAuthnCredential[]> => {
    try {
      const response = await apiClient.getCredentials(userID);
      
      if (response.success) {
        setState(prev => ({ ...prev, credentials: response.credentials }));
        return response.credentials;
      }
      
      return [];
    } catch (error) {
      console.error('❌ 자격 증명 목록 조회 실패:', error);
      return [];
    }
  }, []);

  const deleteCredential = useCallback(async (credentialID: string): Promise<boolean> => {
    try {
      const response = await apiClient.deleteCredential(credentialID);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          credentials: prev.credentials.filter(cred => cred.id !== credentialID),
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ 자격 증명 삭제 실패:', error);
      return false;
    }
  }, []);

  const updateCredentialNickname = useCallback(async (
    credentialID: string, 
    nickname: string
  ): Promise<boolean> => {
    try {
      const response = await apiClient.updateCredential(credentialID, { nickname });
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          credentials: prev.credentials.map(cred =>
            cred.id === credentialID ? { ...cred, nickname } : cred
          ),
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ 자격 증명 업데이트 실패:', error);
      return false;
    }
  }, []);

  // ============================================================================
  // 🛠️ 유틸리티 함수
  // ============================================================================

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRegistering: false,
      isAuthenticating: false,
      isLoading: false,
      currentStep: 'idle',
      error: null,
      user: null,
      credentials: [],
    }));
  }, []);

  return {
    ...state,
    register,
    authenticate,
    listCredentials,
    deleteCredential,
    updateCredentialNickname,
    clearError,
    reset,
    checkSupport,
  };
};

// ============================================================================
// 📤 유틸리티 함수 내보내기
// ============================================================================

export const webauthnUtils = {
  /**
   * 브라우저 지원 여부 확인
   */
  checkBrowserSupport: async () => {
    const support = await checkWebAuthnSupport();
    
    return {
      isSupported: support.isSupported,
      isPlatformAvailable: support.isPlatformAvailable,
      canRegister: support.isSupported && support.isPlatformAvailable,
      message: !support.isSupported 
        ? '이 브라우저는 패스키를 지원하지 않습니다.'
        : !support.isPlatformAvailable
        ? '이 기기에서는 생체 인증을 사용할 수 없습니다.'
        : '패스키를 사용할 수 있습니다.',
    };
  },

  /**
   * 에러 메시지 번역
   */
  translateError: (error: any): string => {
    return createWebAuthnError(error).userFriendly;
  },

  /**
   * 세션 토큰 확인
   */
  checkSession: (): { isValid: boolean; token?: string; expiresAt?: string } => {
    const token = localStorage.getItem('webauthn_token');
    const expiresAt = localStorage.getItem('webauthn_expires');
    
    if (!token || !expiresAt) {
      return { isValid: false };
    }
    
    const isValid = new Date(expiresAt) > new Date();
    
    if (!isValid) {
      localStorage.removeItem('webauthn_token');
      localStorage.removeItem('webauthn_expires');
    }
    
    return { isValid, token: isValid ? token : undefined, expiresAt };
  },

  /**
   * 세션 토큰 삭제
   */
  clearSession: () => {
    localStorage.removeItem('webauthn_token');
    localStorage.removeItem('webauthn_expires');
  },
};

export type { 
  WebAuthnState, 
  WebAuthnError, 
  WebAuthnUser, 
  WebAuthnCredential, 
  WebAuthnResult,
  RegistrationOptions,
  UseWebAuthnReturn 
};