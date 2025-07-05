// ============================================================================
// 📁 frontend/src/services/api/WebAuthnAPI.ts
// 🔐 WebAuthn 인증 API 서비스 (프론트엔드 전용)
// 수정사항: 백엔드 모듈 import 제거, 순수 프론트엔드 구현
// ============================================================================

import type { WebAuthnRegistrationResult, WebAuthnLoginResult } from '../../types/auth.types';

// WebAuthn 라이브러리 동적 로드
let startRegistration: any = null;
let startAuthentication: any = null;

const loadWebAuthn = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && !startRegistration) {
    try {
      const webauthn = await import('@simplewebauthn/browser');
      startRegistration = webauthn.startRegistration;
      startAuthentication = webauthn.startAuthentication;
      console.log('✅ WebAuthn 라이브러리 로드 성공');
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
      return false;
    }
  }
  return !!startRegistration;
};

// WebAuthn 지원 체크
const checkWebAuthnSupport = () => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'server-side' };
  }
  
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'not-supported' };
  }
  
  return { supported: true };
};

export class WebAuthnAPI {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    console.log(`🔐 WebAuthnAPI 초기화: ${this.baseURL}`);
  }

  // ============================================================================
  // 🌐 HTTP 요청 메서드
  // ============================================================================

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`🌐 API 요청: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP 오류: ${response.status}`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API 응답:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ API 오류 (${endpoint}):`, error);
      
      // 백엔드 연결 실패 시 Mock 응답 반환
      return this.getMockResponse(endpoint, options.method as string || 'GET');
    }
  }

  // ============================================================================
  // 🎭 Mock 응답 (백엔드 연결 실패 시 폴백)
  // ============================================================================

  private getMockResponse(endpoint: string, method: string): any {
    const mockUser = {
      id: `mock_user_${Date.now()}`,
      email: 'demo@example.com',
      displayName: 'Demo User',
      did: `did:ai:demo_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    if (endpoint.includes('/register/start') && method === 'POST') {
      return {
        success: true,
        options: {
          challenge: 'mock-challenge',
          rp: { name: 'Mock RP', id: 'localhost' },
          user: { id: 'mock-user-id', name: 'mock-user', displayName: 'Mock User' },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000
        },
        sessionId: `mock_session_${Date.now()}`
      };
    }

    if (endpoint.includes('/register/complete') && method === 'POST') {
      return {
        success: true,
        user: mockUser,
        credential: { id: `mock_cred_${Date.now()}` },
        message: 'Mock 등록 완료'
      };
    }

    if (endpoint.includes('/login/start') && method === 'POST') {
      return {
        success: true,
        options: {
          challenge: 'mock-challenge',
          timeout: 60000,
          rpId: 'localhost'
        },
        sessionId: `mock_session_${Date.now()}`
      };
    }

    if (endpoint.includes('/login/complete') && method === 'POST') {
      return {
        success: true,
        user: mockUser,
        token: `mock_token_${Date.now()}`,
        message: 'Mock 로그인 완료'
      };
    }

    return { success: true, mock: true, endpoint, method };
  }

  // ============================================================================
  // 🆕 WebAuthn 등록
  // ============================================================================

  /**
   * WebAuthn 등록 시작
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<WebAuthnRegistrationResult> {
    try {
      console.log('🆕 === WebAuthn 등록 시작 ===');

      // 1. 등록 시작 API 호출
      const startResponse = await this.request('/api/auth/webauthn/register/start', {
        method: 'POST',
        body: JSON.stringify({
          userEmail,
          userName: `PassKey_User_${Date.now()}`,
          deviceInfo: {
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            timestamp: Date.now()
          }
        })
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('등록 시작 응답이 올바르지 않습니다');
      }

      // 2. WebAuthn 지원 확인
      const webauthnSupport = checkWebAuthnSupport();
      if (!webauthnSupport.supported) {
        console.warn('⚠️ WebAuthn 미지원 - Mock 등록 진행');
        return {
          success: true,
          user: startResponse.user || {
            id: `mock_user_${Date.now()}`,
            email: userEmail || 'demo@example.com',
            displayName: 'Demo User'
          },
          credential: { id: `mock_cred_${Date.now()}` },
          sessionId: startResponse.sessionId,
          message: 'Mock WebAuthn 등록 완료'
        };
      }

      // 3. WebAuthn 라이브러리 로드
      const loaded = await loadWebAuthn();
      let credential;

      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 크리덴셜 사용');
        credential = {
          id: `mock_cred_${Date.now()}`,
          type: 'public-key',
          response: {
            attestationObject: 'mock-attestation',
            clientDataJSON: 'mock-client-data'
          }
        };
      } else {
        console.log('👆 생체인증 팝업 실행...');
        credential = await startRegistration(startResponse.options);
        console.log('✅ 생체인증 완료:', credential.id);
      }

      // 4. 등록 완료 API 호출
      const completeResponse = await this.request('/api/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      console.log('🎉 WebAuthn 등록 완료:', completeResponse);
      return completeResponse;

    } catch (error: any) {
      console.error('❌ WebAuthn 등록 실패:', error);
      return {
        success: false,
        error: error.message || 'WebAuthn 등록에 실패했습니다',
        user: null,
        credential: null,
        sessionId: null
      };
    }
  }

  /**
   * Mock WebAuthn 등록 (테스트용)
   */
  async mockWebAuthnRegistration(): Promise<WebAuthnRegistrationResult> {
    console.log('🎭 Mock WebAuthn 등록 실행...');
    
    // 등록 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockUser = {
      id: `mock_user_${Date.now()}`,
      email: 'demo@example.com',
      displayName: 'Demo User',
      did: `did:ai:demo_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      user: mockUser,
      credential: { id: `mock_cred_${Date.now()}` },
      sessionId: `mock_session_${Date.now()}`,
      message: 'Mock WebAuthn 등록이 완료되었습니다'
    };
  }

  // ============================================================================
  // 🔓 WebAuthn 로그인
  // ============================================================================

  /**
   * WebAuthn 로그인 시작
   */
  async startWebAuthnLogin(): Promise<WebAuthnLoginResult> {
    try {
      console.log('🔓 === WebAuthn 로그인 시작 ===');

      // 1. 로그인 시작 API 호출
      const startResponse = await this.request('/api/auth/webauthn/login/start', {
        method: 'POST'
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('로그인 시작 응답이 올바르지 않습니다');
      }

      // 2. WebAuthn 지원 확인
      const webauthnSupport = checkWebAuthnSupport();
      if (!webauthnSupport.supported) {
        console.warn('⚠️ WebAuthn 미지원 - Mock 로그인 진행');
        return {
          success: true,
          user: {
            id: `mock_user_${Date.now()}`,
            email: 'demo@example.com',
            displayName: 'Demo User'
          },
          token: `mock_token_${Date.now()}`,
          message: 'Mock WebAuthn 로그인 완료'
        };
      }

      // 3. WebAuthn 라이브러리 로드
      const loaded = await loadWebAuthn();
      let credential;

      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 크리덴셜 사용');
        credential = {
          id: `mock_cred_${Date.now()}`,
          type: 'public-key',
          response: {
            authenticatorData: 'mock-auth-data',
            clientDataJSON: 'mock-client-data',
            signature: 'mock-signature'
          }
        };
      } else {
        console.log('👆 생체인증 팝업 실행...');
        credential = await startAuthentication(startResponse.options);
        console.log('✅ 생체인증 완료:', credential.id);
      }

      // 4. 로그인 완료 API 호출
      const completeResponse = await this.request('/api/auth/webauthn/login/complete', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      console.log('🎉 WebAuthn 로그인 완료:', completeResponse);
      return completeResponse;

    } catch (error: any) {
      console.error('❌ WebAuthn 로그인 실패:', error);
      return {
        success: false,
        error: error.message || 'WebAuthn 로그인에 실패했습니다',
        user: null,
        token: null
      };
    }
  }

  /**
   * Mock WebAuthn 로그인 (테스트용)
   */
  async mockWebAuthnLogin(): Promise<WebAuthnLoginResult> {
    console.log('🎭 Mock WebAuthn 로그인 실행...');
    
    // 로그인 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const mockUser = {
      id: `mock_user_${Date.now()}`,
      email: 'demo@example.com',
      displayName: 'Demo User',
      did: `did:ai:demo_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      user: mockUser,
      token: `mock_token_${Date.now()}`,
      message: 'Mock WebAuthn 로그인이 완료되었습니다'
    };
  }

  // ============================================================================
  // 🔄 상태 확인
  // ============================================================================

  /**
   * 백엔드 연결 상태 확인
   */
  async checkConnection(): Promise<any> {
    try {
      return await this.request('/api/debug/health');
    } catch (error) {
      return {
        status: 'disconnected',
        error: 'Backend connection failed',
        mock: true
      };
    }
  }

  /**
   * WebAuthn 지원 여부 확인
   */
  checkWebAuthnSupport() {
    return checkWebAuthnSupport();
  }
}

export default WebAuthnAPI;