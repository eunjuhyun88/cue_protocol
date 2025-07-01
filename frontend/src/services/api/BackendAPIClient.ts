// ============================================================================
// 📁 src/services/api/BackendAPIClient.ts
// 🔧 완전한 백엔드 API 클라이언트 (영구 세션 + 자동 복원 + Mock 폴백)
// ============================================================================

'use client';

import type { 
  HealthCheckResult, 
  SessionRestoreResult, 
  User,
  AuthConfig 
} from '../../types/auth.types';

export class BackendAPIClient {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private config: AuthConfig;

  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.config = {
      backendURL: baseURL,
      enableMockMode: true,
      sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30일
      maxRetryAttempts: 3,
      retryDelay: 1000
    };
    
    console.log(`🔗 BackendAPIClient 초기화: ${this.baseURL}`);
    
    // 페이지 숨김/복원 시 자동 재연결
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.websocket?.readyState !== WebSocket.OPEN) {
          this.connectWebSocket();
        }
      });
    }
  }

  // ============================================================================
  // 🔧 영구 세션 토큰 관리 (향상됨)
  // ============================================================================
  
  /**
   * 세션 토큰 저장 (만료 시간 포함)
   */
  setSessionToken(token: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const expiresAt = Date.now() + this.config.sessionTimeout;
      const sessionData = {
        token,
        expiresAt,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };
      
      localStorage.setItem('cue_session_token', token);
      localStorage.setItem('cue_session_data', JSON.stringify(sessionData));
      console.log('💾 세션 토큰 저장됨 (만료: 30일)');
    } catch (error) {
      console.error('❌ 세션 토큰 저장 실패:', error);
    }
  }
  
  /**
   * 세션 토큰 조회 (만료 확인 포함)
   */
  getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const token = localStorage.getItem('cue_session_token');
      const sessionDataStr = localStorage.getItem('cue_session_data');
      
      if (!token || !sessionDataStr) return null;
      
      const sessionData = JSON.parse(sessionDataStr);
      
      // 만료 확인
      if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
        console.log('⏰ 세션 토큰 만료됨');
        this.clearSessionToken();
        return null;
      }
      
      // 마지막 사용 시간 업데이트
      sessionData.lastUsed = Date.now();
      localStorage.setItem('cue_session_data', JSON.stringify(sessionData));
      
      return token;
    } catch (error) {
      console.error('❌ 세션 토큰 조회 실패:', error);
      return null;
    }
  }
  
  /**
   * 세션 토큰 삭제 (완전 정리)
   */
  clearSessionToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_data');
      // 호환성을 위해 기존 세션 ID도 삭제
      localStorage.removeItem('cue_session_id');
      localStorage.removeItem('webauthn_user_data'); // 기존 데이터도 정리
      console.log('🗑️ 모든 세션 데이터 삭제됨');
    } catch (error) {
      console.error('❌ 세션 토큰 삭제 실패:', error);
    }
  }
  
  /**
   * 세션 토큰 정보 조회
   */
  getSessionInfo(): any {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionDataStr = localStorage.getItem('cue_session_data');
      if (!sessionDataStr) return null;
      
      const sessionData = JSON.parse(sessionDataStr);
      const now = Date.now();
      
      return {
        isValid: sessionData.expiresAt > now,
        expiresAt: new Date(sessionData.expiresAt),
        createdAt: new Date(sessionData.createdAt),
        lastUsed: new Date(sessionData.lastUsed),
        remainingTime: Math.max(0, sessionData.expiresAt - now),
        remainingDays: Math.max(0, Math.floor((sessionData.expiresAt - now) / (24 * 60 * 60 * 1000)))
      };
    } catch (error) {
      console.error('❌ 세션 정보 조회 실패:', error);
      return null;
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
  // 🔧 WebSocket 연결 및 실시간 업데이트 (자동 재연결)
  // ============================================================================
  
  /**
   * WebSocket 연결 (자동 재연결 지원)
   */
  connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const wsUrl = this.baseURL.replace('http', 'ws') + '/ws';
      
      if (this.websocket?.readyState === WebSocket.OPEN) {
        console.log('✅ WebSocket 이미 연결됨');
        return;
      }
      
      console.log(`🔌 WebSocket 연결 시도: ${wsUrl}`);
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ WebSocket 연결됨');
        this.reconnectAttempts = 0;
        
        // 인증 정보 전송
        const token = this.getSessionToken();
        if (token && this.websocket) {
          this.websocket.send(JSON.stringify({ 
            type: 'auth', 
            token 
          }));
        }
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket 메시지 수신:', data.type);
          this.listeners.forEach(callback => callback(data));
        } catch (error) {
          console.error('❌ WebSocket 메시지 파싱 실패:', error);
        }
      };
      
      this.websocket.onclose = (event) => {
        console.log(`❌ WebSocket 연결 종료 (코드: ${event.code})`);
        this.attemptReconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('💥 WebSocket 오류:', error);
      };
      
    } catch (error) {
      console.warn('❌ WebSocket 연결 실패, HTTP 폴백 사용:', error);
    }
  }

  /**
   * WebSocket 자동 재연결
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ WebSocket 재연결 시도 횟수 초과');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 지수 백오프
    
    console.log(`🔄 WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  /**
   * 실시간 리스너 등록
   */
  onRealtimeUpdate(callback: (data: any) => void): () => void {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  /**
   * WebSocket 연결 해제
   */
  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.listeners.clear();
      this.reconnectAttempts = 0;
      console.log('🔌 WebSocket 연결 해제됨');
    }
  }

  // ============================================================================
  // 🔧 HTTP 요청 메서드 (재시도 + 자동 폴백)
  // ============================================================================

  /**
   * 공통 요청 메서드 (재시도 로직 포함)
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    let lastError: Error | null = null;
    
    // 재시도 로직
    for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
      try {
        console.log(`📞 API 요청 [시도 ${attempt}/${this.config.maxRetryAttempts}]: ${options.method || 'GET'} ${url}`);
        
        const response = await fetch(url, {
          ...options,
          headers: { 
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(), // 🔧 자동으로 세션 토큰 포함
            ...options.headers 
          },
          mode: 'cors',
          credentials: 'include',
          signal: AbortSignal.timeout(30000) // 30초 타임아웃
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // 401 에러 시 세션 토큰 삭제
          if (response.status === 401) {
            console.log('🔒 인증 만료, 세션 토큰 삭제');
            this.clearSessionToken();
          }
          
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API 요청 성공: ${options.method || 'GET'} ${endpoint}`);
        return data;
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ API 요청 실패 [시도 ${attempt}/${this.config.maxRetryAttempts}]:`, error.message);
        
        // 네트워크 오류이고 재시도 가능한 경우
        if (attempt < this.config.maxRetryAttempts && this.isRetryableError(error)) {
          const delay = this.config.retryDelay * attempt;
          console.log(`⏳ ${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        break;
      }
    }
    
    // 모든 재시도 실패시 Mock 응답 제공
    if (this.config.enableMockMode) {
      console.log(`🎭 ${this.config.maxRetryAttempts}회 시도 실패, Mock 응답 사용: ${endpoint}`);
      return this.getMockResponse(endpoint, options);
    }
    
    throw lastError;
  }

  /**
   * 재시도 가능한 오류인지 확인
   */
  private isRetryableError(error: Error): boolean {
    return (
      error.name === 'TypeError' || // 네트워크 오류
      error.name === 'TimeoutError' || // 타임아웃
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout')
    );
  }

  /**
   * Mock 응답 생성 (개선됨)
   */
  private getMockResponse(endpoint: string, options: RequestInit): any {
    console.log(`🎭 Mock 응답 생성: ${endpoint}`);
    
    if (endpoint.includes('/health')) {
      return { 
        status: 'OK (Mock)',
        connected: false,
        mode: 'mock', 
        timestamp: new Date().toISOString(),
        service: 'Mock Backend Service',
        version: '1.0.0-mock',
        database: 'mock',
        supabaseConnected: false,
        services: {
          webauthn: true,
          ai: true,
          cue: true,
          vault: true
        }
      };
    }
    
    if (endpoint.includes('register/start') || endpoint.includes('webauthn/start')) {
      return {
        success: true,
        sessionId: `mock_${Date.now()}`,
        options: { 
          challenge: btoa(Math.random().toString()),
          rp: { name: 'Final0626 AI Passport', id: 'localhost' },
          user: {
            id: new Uint8Array(32),
            name: 'demo@example.com',
            displayName: 'Demo User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000
        }
      };
    }
    
    if (endpoint.includes('register/complete') || endpoint.includes('login/complete') || endpoint.includes('webauthn/complete')) {
      const isExisting = Math.random() > 0.7;
      
      return {
        success: true,
        sessionId: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        sessionToken: `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        isExistingUser: isExisting,
        action: isExisting ? 'login' : 'register',
        user: {
          id: `user_${Date.now()}`,
          username: `Agent${Math.floor(Math.random() * 10000)}`,
          email: Math.random() > 0.5 ? 'demo@cueprotocol.ai' : null, // email nullable 지원
          did: `did:cue:${Date.now()}`,
          wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
          walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
          cue_tokens: isExisting ? 8750 + Math.floor(Math.random() * 5000) : 15428,
          cueBalance: isExisting ? 8750 + Math.floor(Math.random() * 5000) : 15428,
          trust_score: isExisting ? 88 + Math.floor(Math.random() * 12) : 85,
          trustScore: isExisting ? 88 + Math.floor(Math.random() * 12) : 85,
          passport_level: 'Verified',
          passportLevel: 'Verified',
          biometric_verified: true,
          biometricVerified: true,
          auth_method: 'passkey',
          created_at: isExisting 
            ? new Date(Date.now() - 86400000 * 14).toISOString() // 14일 전
            : new Date().toISOString(),
          registeredAt: isExisting 
            ? new Date(Date.now() - 86400000 * 14).toISOString() 
            : new Date().toISOString()
        },
        message: isExisting 
          ? '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
          : '새로운 AI Passport가 생성되었습니다!',
        rewards: isExisting ? undefined : { welcomeCUE: 15428 }
      };
    }

    if (endpoint.includes('session/restore')) {
      // 50% 확률로 성공적인 세션 복원
      if (Math.random() > 0.5) {
        return {
          success: true,
          user: {
            id: `user_restored_${Date.now()}`,
            username: `RestoredAgent${Math.floor(Math.random() * 1000)}`,
            email: Math.random() > 0.3 ? 'restored@cueprotocol.ai' : null,
            did: `did:cue:restored:${Date.now()}`,
            wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
            walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
            cue_tokens: 8750 + Math.floor(Math.random() * 5000),
            cueBalance: 8750 + Math.floor(Math.random() * 5000),
            trust_score: 88 + Math.floor(Math.random() * 12),
            trustScore: 88 + Math.floor(Math.random() * 12),
            passport_level: 'Verified',
            passportLevel: 'Verified',
            biometric_verified: true,
            biometricVerified: true,
            auth_method: 'passkey',
            created_at: new Date(Date.now() - 86400000 * 7).toISOString(), // 7일 전
            registeredAt: new Date(Date.now() - 86400000 * 7).toISOString()
          },
          message: '세션이 복원되었습니다'
        };
      } else {
        return { success: false, error: 'No valid session found' };
      }
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
        success: true,
        response: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 15) + 5,
        trustScore: 0.85 + Math.random() * 0.15,
        model: 'mock-gpt-4o'
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
        success: true,
        passport: {
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
        }
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
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST 요청
   */
  async post(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, { 
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT 요청
   */
  async put(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, { 
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ============================================================================
  // 🔧 세션 관리 메서드 (개선됨)
  // ============================================================================

  /**
   * 세션 복원 (페이지 새로고침 시 자동 호출)
   */
  async restoreSession(): Promise<SessionRestoreResult> {
    console.log('🔧 === 세션 복원 시도 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        console.log('❌ 저장된 세션 토큰 없음');
        return { success: false, error: 'No session token found' };
      }

      console.log('🔍 저장된 세션 토큰 발견, 유효성 검증 중...');
      
      // 세션 정보 확인
      const sessionInfo = this.getSessionInfo();
      if (sessionInfo && !sessionInfo.isValid) {
        console.log('⏰ 세션 토큰 만료됨');
        this.clearSessionToken();
        return { success: false, error: 'Session token expired' };
      }

      const response = await this.post('/api/auth/session/restore', { sessionToken });

      if (!response.success) {
        console.log('❌ 세션 복원 실패, 토큰 삭제');
        this.clearSessionToken();
        return { success: false, error: response.error || 'Session restore failed' };
      }

      console.log('✅ 세션 복원 성공!', {
        username: response.user?.username,
        cueBalance: response.user?.cueBalance || response.user?.cue_tokens,
        remainingDays: sessionInfo?.remainingDays
      });

      return {
        success: true,
        user: response.user,
        message: response.message || '세션이 복원되었습니다'
      };

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
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('🔧 === 로그아웃 처리 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (sessionToken) {
        console.log('🗑️ 서버 세션 무효화');
        
        try {
          await this.post('/api/auth/logout', { sessionToken });
        } catch (error) {
          console.warn('⚠️ 서버 로그아웃 실패 (로컬 토큰은 삭제)', error);
        }
      }

      // WebSocket 연결 해제
      this.disconnectWebSocket();

      // 로컬 세션 토큰 삭제
      this.clearSessionToken();
      console.log('✅ 로그아웃 완료');

      return { success: true };

    } catch (error: any) {
      console.error('💥 로그아웃 오류:', error);
      // 오류가 발생해도 로컬 토큰은 삭제
      this.clearSessionToken();
      this.disconnectWebSocket();
      return { success: false, error: error.message };
    }
  }

  /**
   * 백엔드 연결 상태 확인 (향상됨)
   */
  async checkConnection(): Promise<HealthCheckResult> {
    console.log('🔌 백엔드 연결 상태 확인');
    
    try {
      const startTime = Date.now();
      const response = await this.get('/health');
      const responseTime = Date.now() - startTime;
      
      return { 
        connected: true, 
        mode: 'real',
        status: response.status,
        timestamp: response.timestamp,
        version: response.version,
        database: response.database,
        services: response.services,
        responseTime,
        ...response 
      };
    } catch (error: any) {
      return { 
        connected: false, 
        mode: 'mock', 
        status: 'OK (Mock)',
        error: error.message,
        timestamp: new Date().toISOString(),
        service: 'Mock Backend Service',
        version: '1.0.0-mock',
        database: 'mock',
        supabaseConnected: false,
        services: {
          webauthn: true,
          ai: true,
          cue: true,
          vault: true
        }
      };
    }
  }

  /**
   * 세션 토큰 갱신
   */
  async refreshSession(): Promise<{ success: boolean; newToken?: string; error?: string }> {
    console.log('🔄 세션 토큰 갱신 시도');
    
    try {
      const currentToken = this.getSessionToken();
      if (!currentToken) {
        return { success: false, error: 'No session token to refresh' };
      }

      const response = await this.post('/api/auth/session/refresh', { 
        sessionToken: currentToken 
      });

      if (response.success && response.newToken) {
        this.setSessionToken(response.newToken);
        console.log('✅ 세션 토큰 갱신 성공');
        return { success: true, newToken: response.newToken };
      }

      return { success: false, error: response.error || 'Token refresh failed' };

    } catch (error: any) {
      console.error('❌ 세션 토큰 갱신 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 백엔드 상태 모니터링 시작
   */
  startHealthMonitoring(interval = 60000): () => void {
    console.log(`🏥 백엔드 상태 모니터링 시작 (${interval}ms 간격)`);
    
    const healthCheck = async () => {
      try {
        const health = await this.checkConnection();
        console.log(`💓 Health Check: ${health.connected ? '✅' : '❌'} ${health.mode}`);
        
        // 연결 복구 시 WebSocket 재연결
        if (health.connected && !this.websocket) {
          this.connectWebSocket();
        }
      } catch (error) {
        console.warn('⚠️ Health Check 실패:', error);
      }
    };

    // 즉시 실행
    healthCheck();
    
    // 주기적 실행
    const intervalId = setInterval(healthCheck, interval);
    
    // 정리 함수 반환
    return () => {
      clearInterval(intervalId);
      console.log('🛑 백엔드 상태 모니터링 중지');
    };
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들
  // ============================================================================

  /**
   * API 요청 통계
   */
  getRequestStats(): any {
    if (typeof window === 'undefined') return null;
    
    try {
      const statsStr = localStorage.getItem('cue_api_stats');
      return statsStr ? JSON.parse(statsStr) : {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastRequestTime: null,
        averageResponseTime: 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 설정 업데이트됨:', newConfig);
  }

  /**
   * 디버그 정보 출력
   */
  getDebugInfo(): any {
    const sessionInfo = this.getSessionInfo();
    const stats = this.getRequestStats();
    
    return {
      config: this.config,
      sessionInfo,
      stats,
      websocketState: this.websocket?.readyState,
      listenerCount: this.listeners.size,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 정리 (컴포넌트 언마운트 시 호출)
   */
  cleanup(): void {
    console.log('🧹 BackendAPIClient 정리 중...');
    this.disconnectWebSocket();
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }
}

export default BackendAPIClient;