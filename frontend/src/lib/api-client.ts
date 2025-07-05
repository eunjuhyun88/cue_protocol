// ============================================================================
// 📁 frontend/src/lib/api-client.ts
// 🔗 완전한 API 클라이언트 - useAuth 호환 버전
// 특징: restoreSession 메서드 포함 + Mock 폴백 지원
// ============================================================================

'use client';

// WebAuthn 동적 로드
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

export class UnifiedAPIClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('final0626_auth_token') || 
                      localStorage.getItem('cue_session_token') ||
                      localStorage.getItem('session_token');
    }
    
    console.log(`🔗 UnifiedAPIClient 초기화: ${this.baseURL}`);
  }

  // ============================================================================
  // 🔧 세션 토큰 관리
  // ============================================================================
  
  /**
   * 세션 토큰 저장
   */
  setSessionToken(token: string): void {
    if (typeof window !== 'undefined') {
      this.authToken = token;
      localStorage.setItem('cue_session_token', token);
      localStorage.setItem('session_token', token);
      localStorage.setItem('final0626_auth_token', token);
      console.log('💾 세션 토큰 저장됨');
    }
  }
  
  /**
   * 세션 토큰 조회
   */
  getSessionToken(): string | null {
    if (typeof window !== 'undefined') {
      return this.authToken || 
             localStorage.getItem('cue_session_token') ||
             localStorage.getItem('session_token') ||
             localStorage.getItem('final0626_auth_token');
    }
    return this.authToken;
  }
  
  /**
   * 세션 토큰 삭제
   */
  clearSessionToken(): void {
    if (typeof window !== 'undefined') {
      this.authToken = null;
      const keysToRemove = [
        'cue_session_token',
        'session_token', 
        'final0626_auth_token',
        'cue_session_id',
        'auth_timestamp'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('🗑️ 모든 세션 토큰 삭제됨');
    }
  }

  // ============================================================================
  // 🌐 기본 HTTP 요청 메서드
  // ============================================================================

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      console.log(`🌐 API 요청: ${options.method || 'GET'} ${url}`);
      
      const token = this.getSessionToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers as Record<string, string>
      };
      
      // 토큰이 있으면 Authorization 헤더 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'include'
      });

      console.log(`📡 응답 상태: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ HTTP 오류:`, errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API 응답 성공:`, data);
      return data;
      
    } catch (error: any) {
      console.error(`❌ API 오류 (${endpoint}):`, error.message);
      
      // Mock 폴백 데이터 제공 (개발 중 백엔드 없어도 동작)
      return this.getMockResponse(endpoint, options.method as string);
    }
  }

  // ============================================================================
  // 🎭 Mock 응답 (백엔드 없을 때 폴백)
  // ============================================================================

  private getMockResponse(endpoint: string, method: string = 'GET'): any {
    console.log(`🎭 Mock 응답 생성: ${method} ${endpoint}`);
    
    // Health Check
    if (endpoint.includes('/health')) {
      return {
        status: 'OK (Mock)',
        timestamp: new Date().toISOString(),
        service: 'Mock Backend Service',
        version: '1.0.0-mock',
        mock: true
      };
    }

    // 세션 복원
    if (endpoint.includes('/session/restore') || endpoint.includes('/auth/session')) {
      const token = this.getSessionToken();
      if (token) {
        return {
          success: true,
          user: {
            id: 'mock_user_' + Date.now(),
            username: 'MockUser_' + Math.floor(Math.random() * 1000),
            email: 'mock@example.com',
            did: `did:final0626:mock_${Date.now()}`,
            walletAddress: '0x' + Math.random().toString(16).substr(2, 8),
            cueBalance: 1500 + Math.floor(Math.random() * 2000),
            cue_tokens: 1500 + Math.floor(Math.random() * 2000),
            trustScore: 75 + Math.floor(Math.random() * 25),
            trust_score: 75 + Math.floor(Math.random() * 25),
            passportLevel: 'Verified',
            passport_level: 'Verified',
            biometricVerified: true,
            registeredAt: new Date().toISOString(),
            authenticated: true
          },
          sessionToken: token,
          sessionId: token,
          mock: true
        };
      } else {
        return {
          success: false,
          error: 'No session token found',
          mock: true
        };
      }
    }

    // WebAuthn 등록 시작
    if (endpoint.includes('/webauthn/register/start')) {
      return {
        success: true,
        options: {
          challenge: btoa(Math.random().toString()),
          rp: { name: 'Mock RP', id: 'localhost' },
          user: {
            id: btoa('mock_user'),
            name: 'mock@example.com',
            displayName: 'Mock User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000
        },
        sessionId: 'mock_session_' + Date.now(),
        mock: true
      };
    }

    // WebAuthn 등록 완료
    if (endpoint.includes('/webauthn/register/complete')) {
      const newToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        user: {
          id: 'mock_user_' + Date.now(),
          username: 'NewUser_' + Math.floor(Math.random() * 1000),
          email: 'new@example.com',
          did: `did:final0626:new_${Date.now()}`,
          walletAddress: '0x' + Math.random().toString(16).substr(2, 8),
          cueBalance: 1000,
          cue_tokens: 1000,
          trustScore: 50,
          trust_score: 50,
          passportLevel: 'Basic',
          passport_level: 'Basic',
          biometricVerified: true,
          registeredAt: new Date().toISOString(),
          authenticated: true
        },
        sessionToken: newToken,
        sessionId: newToken,
        message: 'Registration successful (Mock)',
        mock: true
      };
    }

    // WebAuthn 로그인 시작
    if (endpoint.includes('/webauthn/login/start')) {
      return {
        success: true,
        options: {
          challenge: btoa(Math.random().toString()),
          timeout: 60000,
          rpId: 'localhost',
          allowCredentials: []
        },
        sessionId: 'mock_login_session_' + Date.now(),
        mock: true
      };
    }

    // WebAuthn 로그인 완료
    if (endpoint.includes('/webauthn/login/complete')) {
      const loginToken = `mock_login_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        user: {
          id: 'mock_user_existing',
          username: 'ExistingUser_' + Math.floor(Math.random() * 1000),
          email: 'existing@example.com',
          did: `did:final0626:existing_${Date.now()}`,
          walletAddress: '0x' + Math.random().toString(16).substr(2, 8),
          cueBalance: 2500 + Math.floor(Math.random() * 2000),
          cue_tokens: 2500 + Math.floor(Math.random() * 2000),
          trustScore: 80 + Math.floor(Math.random() * 20),
          trust_score: 80 + Math.floor(Math.random() * 20),
          passportLevel: 'Verified',
          passport_level: 'Verified',
          biometricVerified: true,
          registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          authenticated: true
        },
        sessionToken: loginToken,
        sessionId: loginToken,
        message: 'Login successful (Mock)',
        mock: true
      };
    }

    // 로그아웃
    if (endpoint.includes('/logout')) {
      return {
        success: true,
        message: 'Logout successful (Mock)',
        mock: true
      };
    }

    // 기본 Mock 응답
    return {
      success: true,
      data: null,
      message: 'Mock response',
      timestamp: new Date().toISOString(),
      mock: true
    };
  }

  // ============================================================================
  // 🔧 편의 메서드들
  // ============================================================================

  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ============================================================================
  // 🔐 인증 관련 메서드들 (useAuth가 사용)
  // ============================================================================

  /**
   * 세션 복원 (페이지 새로고침 시 자동 호출)
   * ✅ useAuth에서 사용하는 핵심 메서드
   */
  async restoreSession(): Promise<any> {
    console.log('🔄 === API Client 세션 복원 시작 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        console.log('❌ 저장된 세션 토큰 없음');
        return {
          success: false,
          error: 'No session token found'
        };
      }

      console.log('🔍 저장된 세션 토큰 발견, 복원 시도');

      const response = await this.post('/api/auth/session/restore', { sessionToken });

      if (!response.success) {
        console.log('❌ 세션 복원 실패, 토큰 삭제');
        this.clearSessionToken();
        return {
          success: false,
          error: 'Session restore failed'
        };
      }

      console.log('✅ 세션 복원 성공!', {
        username: response.user?.username,
        did: response.user?.did,
        cueBalance: response.user?.cueBalance || response.user?.cue_tokens
      });

      // 새 토큰이 있으면 저장
      if (response.sessionToken) {
        this.setSessionToken(response.sessionToken);
      }

      return response;

    } catch (error: any) {
      console.error('💥 세션 복원 오류:', error);
      this.clearSessionToken();
      return {
        success: false,
        error: error.message || 'Session restore failed'
      };
    }
  }

  /**
   * 로그아웃 (세션 토큰 무효화)
   * ✅ useAuth에서 사용하는 핵심 메서드
   */
  async logout(): Promise<any> {
    console.log('🚪 === API Client 로그아웃 처리 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (sessionToken) {
        console.log('🗑️ 서버 세션 무효화');
        await this.post('/api/auth/logout', { sessionToken });
      }

      // 로컬 세션 토큰 삭제
      this.clearSessionToken();
      console.log('✅ 로그아웃 완료');

      return { 
        success: true,
        message: 'Logout successful'
      };

    } catch (error: any) {
      console.error('💥 로그아웃 오류:', error);
      // 오류가 발생해도 로컬 토큰은 삭제
      this.clearSessionToken();
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * 백엔드 연결 상태 확인
   * ✅ useAuth에서 사용하는 핵심 메서드
   */
  async checkConnection(): Promise<any> {
    console.log('🔌 백엔드 연결 상태 확인');
    
    try {
      const response = await this.get('/health');
      return { 
        connected: !response.mock,
        mode: response.mock ? 'mock' : 'real',
        ...response 
      };
    } catch (error: any) {
      return { 
        connected: false, 
        mode: 'error',
        error: error.message,
        status: 'Connection Failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // 🔐 WebAuthn 관련 메서드들
  // ============================================================================

  /**
   * WebAuthn 등록 시작
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<any> {
    console.log('🆕 WebAuthn 등록 시작');
    
    try {
      // 1. 서버에서 등록 옵션 받기
      const startResponse = await this.post('/api/auth/webauthn/register/start', {
        userEmail,
        userName: `PassKey_User_${Date.now()}`,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      });

      if (!startResponse.success) {
        throw new Error('Registration start failed');
      }

      // 2. WebAuthn 라이브러리 로드
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
      }

      // 3. 등록 완료
      console.log('📋 등록 완료 요청 전송');
      const completeResponse = await this.post('/api/auth/webauthn/register/complete', {
        credential,
        sessionId: startResponse.sessionId
      });

      if (completeResponse.success && completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
      }

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  /**
   * WebAuthn 로그인
   */
  async loginWithWebAuthn(userEmail?: string): Promise<any> {
    console.log('🔓 WebAuthn 로그인 시작');
    
    try {
      // 1. 서버에서 로그인 옵션 받기
      const startResponse = await this.post('/api/auth/webauthn/login/start', {
        userEmail
      });

      if (!startResponse.success) {
        throw new Error('Login start failed');
      }

      // 2. WebAuthn 라이브러리 로드
      const loaded = await loadWebAuthn();
      let credential;

      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 크리덴셜 사용');
        credential = {
          id: `mock_login_cred_${Date.now()}`,
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
      }

      // 3. 로그인 완료
      console.log('📋 로그인 완료 요청 전송');
      const completeResponse = await this.post('/api/auth/webauthn/login/complete', {
        credential,
        sessionId: startResponse.sessionId
      });

      if (completeResponse.success && completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
      }

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🎯 기타 유틸리티 메서드들
  // ============================================================================

  /**
   * 인증 상태 확인
   */
  isAuthenticated(): boolean {
    return !!this.getSessionToken();
  }

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(): Promise<any> {
    if (!this.isAuthenticated()) {
      return null;
    }
    
    try {
      return await this.get('/api/auth/me');
    } catch (error) {
      return null;
    }
  }

  /**
   * CUE 마이닝
   */
  async mineCUE(userDid: string, activity: string): Promise<any> {
    return this.post('/api/cue/mine', { userDid, activity });
  }

  /**
   * AI 채팅
   */
  async sendChatMessage(message: string, model: string, userDid: string): Promise<any> {
    return this.post('/api/ai/chat', { message, model, userDid });
  }

  /**
   * 패스포트 데이터 로드
   */
  async loadPassport(did: string): Promise<any> {
    return this.get(`/api/passport/${did}`);
  }
}

// ============================================================================
// 🚀 싱글톤 인스턴스 export (useAuth에서 사용)
// ============================================================================

export const apiClient = new UnifiedAPIClient();
export default apiClient;