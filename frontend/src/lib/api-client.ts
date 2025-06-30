// ============================================================================
// 🌐 실제 백엔드 API 클라이언트 (WebAuthn + DB 연동)
// ============================================================================

export class RealBackendAPIClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('final0626_auth_token');
    }
  }

  private async makeRequest(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    try {
      console.log(`🌐 실제 API 요청: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      console.log(`✅ 실제 API 응답:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ 실제 API 오류 (${endpoint}):`, error);
      throw error;
    }
  }

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('final0626_auth_token', token);
    }
  }

  // ============================================================================
  // 🏥 Health Check
  // ============================================================================

  async healthCheck() {
    return this.makeRequest('/health');
  }

  // ============================================================================
  // 🔐 실제 WebAuthn 인증
  // ============================================================================

  async startWebAuthnRegistration(userData: { username: string; email: string; displayName?: string }) {
    return this.makeRequest('/api/auth/webauthn/register/start', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async completeWebAuthnRegistration(credential: any, challengeId: string, userData: any) {
    return this.makeRequest('/api/auth/webauthn/register/complete', {
      method: 'POST',
      body: JSON.stringify({ 
        credential, 
        challengeId,
        username: userData.username,
        email: userData.email
      })
    });
  }

  async startWebAuthnLogin() {
    return this.makeRequest('/api/auth/webauthn/login/start', {
      method: 'POST'
    });
  }

  async completeWebAuthnLogin(credential: any, challengeId: string) {
    return this.makeRequest('/api/auth/webauthn/login/complete', {
      method: 'POST',
      body: JSON.stringify({ credential, challengeId })
    });
  }

  // ============================================================================
  // 🤖 실제 AI 채팅
  // ============================================================================

  async sendChatMessage(message: string, model: string = 'personalized-agent') {
    return this.makeRequest('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, model })
    });
  }

  // ============================================================================
  // 💎 실제 CUE 토큰 마이닝
  // ============================================================================

  async mineCUETokens(activity: string, data: any) {
    return this.makeRequest('/api/cue/mine', {
      method: 'POST',
      body: JSON.stringify({ activity, data })
    });
  }

  // ============================================================================
  // 🗄️ 실제 데이터 추출
  // ============================================================================

  async extractData(platform: string, data: any) {
    return this.makeRequest('/api/vault/extract', {
      method: 'POST',
      body: JSON.stringify({ platform, data })
    });
  }

  // ============================================================================
  // 👤 사용자 프로필
  // ============================================================================

  async getUserProfile() {
    return this.makeRequest('/api/passport/profile');
  }

  // ============================================================================
  // 🔓 로그아웃
  // ============================================================================

  logout() {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('final0626_auth_token');
    }
  }

  isAuthenticated() {
    return !!this.authToken;
  }
}

export const realAPIClient = new RealBackendAPIClient();
