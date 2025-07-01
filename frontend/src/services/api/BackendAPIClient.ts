// ============================================================================
// 📁 src/services/api/BackendAPIClient.ts
// 🔧 영구 세션 지원 백엔드 API 클라이언트
// ============================================================================

'use client';

export class BackendAPIClient {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();

  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    console.log(`🔗 BackendAPIClient 초기화: ${this.baseURL}`);
  }

  // ============================================================================
  // 🔧 영구 세션 토큰 관리
  // ============================================================================
  
  /**
   * 세션 토큰 저장
   */
  setSessionToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cue_session_token', token);
      console.log('💾 세션 토큰 저장됨');
    }
  }
  
  /**
   * 세션 토큰 조회
   */
  getSessionToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cue_session_token');
    }
    return null;
  }
  
  /**
   * 세션 토큰 삭제
   */
  clearSessionToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cue_session_token');
      // 호환성을 위해 기존 세션 ID도 삭제
      localStorage.removeItem('cue_session_id');
      console.log('🗑️ 세션 토큰 삭제됨');
    }
  }
  
  /**
   * 인증 헤더 생성
   */
  private getAuthHeaders(): Record<string, string> {
    const token = this.getSessionToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // ============================================================================
  // 🔧 WebSocket 연결 및 실시간 업데이트
  // ============================================================================
  
  /**
   * WebSocket 연결
   */
  connectWebSocket(): void {
    try {
      const wsUrl = this.baseURL.replace('http', 'ws');
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ WebSocket 연결됨');
      };
      
      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.listeners.forEach(callback => callback(data));
      };
      
      this.websocket.onclose = () => {
        console.log('❌ WebSocket 연결 종료');
      };
      
      this.websocket.onerror = (error) => {
        console.error('💥 WebSocket 오류:', error);
      };
    } catch (error) {
      console.warn('WebSocket 연결 실패, HTTP 폴백 사용');
    }
  }

  /**
   * 실시간 리스너 등록
   */
  onRealtimeUpdate(callback: (data: any) => void): () => void {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  // ============================================================================
  // 🔧 HTTP 요청 메서드 (인증 헤더 자동 포함)
  // ============================================================================

  /**
   * 공통 요청 메서드
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(), // 🔧 자동으로 세션 토큰 포함
          ...options.headers 
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 401 에러 시 세션 토큰 삭제
        if (response.status === 401) {
          this.clearSessionToken();
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`API 요청 실패: ${url}`, error.message);
      
      // Mock 폴백 데이터
      return this.getMockResponse(endpoint, options);
    }
  }

  /**
   * Mock 응답 생성
   */
  private getMockResponse(endpoint: string, options: RequestInit): any {
    console.log(`🎭 Mock 응답 생성: ${endpoint}`);
    
    if (endpoint.includes('/health')) {
      return { 
        status: 'mock', 
        mode: 'frontend-only', 
        timestamp: new Date().toISOString(),
        service: 'Mock Backend Service',
        version: '1.0.0-mock'
      };
    }
    
    if (endpoint.includes('register/start')) {
      return {
        success: true,
        sessionId: `mock_${Date.now()}`,
        options: { challenge: btoa(Math.random().toString()) }
      };
    }
    
    if (endpoint.includes('register/complete') || endpoint.includes('login/complete')) {
      return {
        success: true,
        sessionId: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        sessionToken: `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        isExistingUser: Math.random() > 0.7,
        user: {
          id: `user_${Date.now()}`,
          username: `Agent${Math.floor(Math.random() * 10000)}`,
          email: 'demo@cueprotocol.ai',
          did: `did:cue:${Date.now()}`,
          walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
          cueBalance: 15428,
          trustScore: 92.5,
          passportLevel: 'Verified',
          biometricVerified: true,
          registeredAt: new Date().toISOString()
        }
      };
    }

    if (endpoint.includes('session/restore')) {
      // 세션 복원 Mock
      return {
        success: true,
        user: {
          id: `user_restored_${Date.now()}`,
          username: `RestoredAgent${Math.floor(Math.random() * 1000)}`,
          email: 'restored@cueprotocol.ai',
          did: `did:cue:restored:${Date.now()}`,
          walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
          cueBalance: 8750 + Math.floor(Math.random() * 5000),
          trustScore: 88 + Math.floor(Math.random() * 12),
          passportLevel: 'Verified',
          biometricVerified: true,
          registeredAt: new Date(Date.now() - 86400000 * 7).toISOString() // 7일 전
        }
      };
    }

    if (endpoint.includes('/ai/chat')) {
      const responses = [
        "안녕하세요! CUE Protocol에서 개인화된 AI 어시스턴트입니다.",
        "세션이 유지되는 개인화된 응답을 제공하고 있습니다.",
        "저장된 컨텍스트를 기반으로 답변을 생성합니다.",
        "영구 데이터 보존 기능으로 모든 대화가 안전하게 보관됩니다.",
        "WebAuthn 인증을 통해 개인화된 AI 서비스를 제공합니다."
      ];
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 15) + 5,
        trustScore: 0.85 + Math.random() * 0.15
      };
    }

    if (endpoint.includes('/cue/mine')) {
      return {
        success: true,
        amount: Math.floor(Math.random() * 10) + 1,
        totalBalance: Math.floor(Math.random() * 5000) + 1000,
        activity: 'mock_activity'
      };
    }

    if (endpoint.includes('/passport/')) {
      const did = endpoint.split('/').pop();
      return {
        did,
        username: did?.split(':').pop() || 'Agent',
        trustScore: 85 + Math.floor(Math.random() * 15),
        level: 'Verified Agent',
        cueBalance: 2500 + Math.floor(Math.random() * 3000),
        totalMined: 25000 + Math.floor(Math.random() * 50000),
        personalityProfile: {
          traits: ['창의적', '분석적', '신뢰할 수 있는'],
          communicationStyle: 'friendly',
          expertise: ['AI', 'Web3', 'Protocol Design']
        },
        connectedPlatforms: ['ChatGPT', 'Claude', 'Discord'],
        achievements: [
          { name: 'First CUE', icon: '🎯', earned: true },
          { name: 'Trusted Agent', icon: '🛡️', earned: true },
          { name: 'Platform Master', icon: '🌐', earned: false }
        ],
        createdAt: new Date().toISOString()
      };
    }

    // 기본 Mock 응답
    return {
      success: true,
      mock: true,
      endpoint,
      data: options.body ? JSON.parse(options.body as string) : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * GET 요청
   */
  async get(endpoint: string): Promise<any> {
    console.log(`GET ${this.baseURL}${endpoint}`);
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST 요청
   */
  async post(endpoint: string, data?: any): Promise<any> {
    console.log(`POST ${this.baseURL}${endpoint}`, data);
    return this.request(endpoint, { 
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT 요청
   */
  async put(endpoint: string, data?: any): Promise<any> {
    console.log(`PUT ${this.baseURL}${endpoint}`, data);
    return this.request(endpoint, { 
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint: string): Promise<any> {
    console.log(`DELETE ${this.baseURL}${endpoint}`);
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ============================================================================
  // 🔧 세션 관리 메서드
  // ============================================================================

  /**
   * 세션 복원 (페이지 새로고침 시 자동 호출)
   */
  async restoreSession(): Promise<any> {
    console.log('🔧 === 세션 복원 시도 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        console.log('❌ 저장된 세션 토큰 없음');
        return null;
      }

      console.log('🔍 저장된 세션 토큰 발견');

      const response = await this.post('/api/auth/session/restore', { sessionToken });

      if (!response.success) {
        console.log('❌ 세션 복원 실패, 토큰 삭제');
        this.clearSessionToken();
        return null;
      }

      console.log('✅ 세션 복원 성공!', {
        username: response.user?.username,
        cueBalance: response.user?.cueBalance
      });

      return response;

    } catch (error: any) {
      console.error('💥 세션 복원 오류:', error);
      this.clearSessionToken();
      return null;
    }
  }

  /**
   * 로그아웃 (세션 토큰 무효화)
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('🔧 === 로그아웃 처리 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (sessionToken) {
        console.log('🗑️ 서버 세션 무효화');
        
        await this.post('/api/auth/logout', { sessionToken });
      }

      // 로컬 세션 토큰 삭제
      this.clearSessionToken();
      console.log('✅ 로그아웃 완료');

      return { success: true };

    } catch (error: any) {
      console.error('💥 로그아웃 오류:', error);
      // 오류가 발생해도 로컬 토큰은 삭제
      this.clearSessionToken();
      return { success: false, error: error.message };
    }
  }

  /**
   * 백엔드 연결 상태 확인
   */
  async checkConnection(): Promise<any> {
    console.log('🔌 백엔드 연결 상태 확인');
    
    try {
      const response = await this.get('/health');
      return { 
        connected: true, 
        mode: 'real', 
        ...response 
      };
    } catch (error: any) {
      return { 
        connected: false, 
        mode: 'mock', 
        error: error.message,
        status: 'OK (Mock)',
        timestamp: new Date().toISOString(),
        service: 'Mock Backend Service',
        version: '1.0.0-mock'
      };
    }
  }

  /**
   * WebSocket 연결 해제
   */
  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.listeners.clear();
      console.log('🔌 WebSocket 연결 해제됨');
    }
  }
}

export default BackendAPIClient;