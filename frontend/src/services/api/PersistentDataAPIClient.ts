// ============================================================================
// 📁 src/services/api/PersistentDataAPIClient.ts
// 🔧 완전한 데이터 유지 API 클라이언트 (영구 패스키 지원 + 강화된 로깅)
// ============================================================================

// WebAuthn 라이브러리 동적 로드
let startRegistration: any = null;
let startAuthentication: any = null;

export const loadWebAuthn = async () => {
  if (typeof window !== 'undefined' && !startRegistration) {
    try {
      const webauthn = await import('@simplewebauthn/browser');
      startRegistration = webauthn.startRegistration;
      startAuthentication = webauthn.startAuthentication;
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
      return false;
    }
  }
  return !!startRegistration;
};

export class PersistentDataAPIClient {
  baseURL: string;
  websocket: WebSocket | null;
  listeners: Map<string, (data: any) => void>;
  mockCredentialKey: string;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;

  constructor(baseURL?: string) {
  // 환경변수 우선 확인
  const envBaseURL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  
  // 개발 환경 감지 (더 포괄적)
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       (typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost')));

  this.baseURL = baseURL || 
                 envBaseURL || 
                 (isDevelopment ? 'http://localhost:3001' : 'https://api.cueprotocol.com');
                 
  this.websocket = null;
  this.listeners = new Map();
  this.mockCredentialKey = 'cue_mock_credential';
  this.reconnectAttempts = 0;
  this.maxReconnectAttempts = 5;
  this.reconnectDelay = 1000;
  
  console.log(`🔗 PersistentDataAPIClient 초기화: ${this.baseURL}`);
  console.log(`🔍 환경 정보:`, {
    NODE_ENV: process.env.NODE_ENV,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
    envBaseURL: envBaseURL,
    isDevelopment: isDevelopment
  });
}
  // ============================================================================
  // 🔧 영구 세션 토큰 관리 (BackendAPIClient 호환)
  // ============================================================================
  
  /**
   * 세션 토큰 저장 (만료 시간 포함)
   */
  setSessionToken(token: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessionTimeout = 30 * 24 * 60 * 60 * 1000; // 30일
      const expiresAt = Date.now() + sessionTimeout;
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
      localStorage.removeItem('cue_session_id'); // 호환성
      localStorage.removeItem('webauthn_user_data'); // 기존 데이터 정리
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

  onRealtimeUpdate(callback: (data: any) => void) {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  getOrCreateMockCredential() {
    if (typeof window === 'undefined') {
      return {
        id: 'temp_mock_credential',
        type: 'public-key',
        response: {
          attestationObject: 'temp-attestation',
          clientDataJSON: 'temp-client-data'
        }
      };
    }

    try {
      const existingCred = localStorage.getItem(this.mockCredentialKey);
      if (existingCred) {
        const parsed = JSON.parse(existingCred);
        console.log('🔄 기존 Mock 패스키 재사용:', parsed.id);
        return parsed;
      }

      const deviceFingerprint = [
        navigator.userAgent,
        navigator.platform,
        window.screen.width,
        window.screen.height,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ].join('|');

      let hash = 0;
      for (let i = 0; i < deviceFingerprint.length; i++) {
        const char = deviceFingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const credentialId = `mock_passkey_${Math.abs(hash).toString(36)}`;
      const newCredential = {
        id: credentialId,
        type: 'public-key',
        response: {
          attestationObject: 'mock-attestation-object',
          clientDataJSON: 'mock-client-data-json'
        }
      };

      localStorage.setItem(this.mockCredentialKey, JSON.stringify(newCredential));
      console.log('🆕 새 Mock 패스키 생성 및 저장:', credentialId);
      
      return newCredential;

    } catch (error) {
      console.error('❌ Mock 패스키 관리 실패:', error);
      return {
        id: 'fallback_mock_credential',
        type: 'public-key',
        response: {
          attestationObject: 'fallback-attestation',
          clientDataJSON: 'fallback-client-data'
        }
      };
    }
  }

  async request(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const maxRetryAttempts = 3;
    const retryDelay = 1000;
    let lastError: Error | null = null;
    
    // 재시도 로직
    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      try {
        console.log(`📞 API 요청 [시도 ${attempt}/${maxRetryAttempts}]: ${options.method || 'GET'} ${endpoint}`);
        
        const headers = { 
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(), // 🔧 자동으로 세션 토큰 포함
          ...options.headers 
        };
        
        // FormData인 경우 Content-Type 제거 (자동 설정)
        if (options.body instanceof FormData) {
          delete headers['Content-Type'];
        }
        
        const response = await fetch(url, {
          ...options,
          headers,
          mode: 'cors',
          credentials: 'include',
          signal: AbortSignal.timeout(30000) // 30초 타임아웃
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // 🔧 401 에러 시 세션 토큰 자동 삭제
          if (response.status === 401) {
            console.log('🗑️ 401 에러로 인한 세션 토큰 삭제');
            this.clearSessionToken();
          }

          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API 성공:', { endpoint, hasData: !!data });
        return data;
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ API 요청 실패 [시도 ${attempt}/${maxRetryAttempts}]:`, error.message);
        
        // 네트워크 오류이고 재시도 가능한 경우
        if (attempt < maxRetryAttempts && this.isRetryableError(error)) {
          const delay = retryDelay * attempt;
          console.log(`⏳ ${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        break;
      }
    }
    
    // 모든 재시도 실패시 Mock 응답 제공
    console.log(`🎭 ${maxRetryAttempts}회 시도 실패, Mock 응답 사용: ${endpoint}`);
    return this.getMockFallback(endpoint, options);
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

  getMockFallback(endpoint: string, options: any) {
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
          rp: { name: 'CUE Protocol AI Passport', id: 'localhost' },
          user: {
            id: new Uint8Array(32),
            name: 'demo@cueprotocol.ai',
            displayName: 'Demo User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
          allowCredentials: []
        }
      };
    }
    
    if (endpoint.includes('register/complete') || endpoint.includes('login/complete') || endpoint.includes('webauthn/complete')) {
      const isExisting = Math.random() > 0.3;
      
      return {
        success: true,
        sessionId: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        sessionToken: `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        isExistingUser: isExisting,
        action: isExisting ? 'login' : 'register',
        user: {
          id: isExisting ? 'existing_user_123' : `user_${Date.now()}`,
          username: isExisting ? 'ExistingAgent' : `Agent${Math.floor(Math.random() * 10000)}`,
          email: Math.random() > 0.5 ? 'demo@cueprotocol.ai' : null, // email nullable 지원
          userEmail: Math.random() > 0.5 ? 'demo@cueprotocol.ai' : null,
          display_name: isExisting ? 'Existing User' : 'New User',
          did: isExisting ? 'did:cue:existing:123' : `did:cue:${Date.now()}`,
          wallet_address: isExisting ? '0x1234567890123456789012345678901234567890' : `0x${Math.random().toString(16).substring(2, 42)}`,
          walletAddress: isExisting ? '0x1234567890123456789012345678901234567890' : `0x${Math.random().toString(16).substring(2, 42)}`,
          cue_tokens: isExisting ? 8750 + Math.floor(Math.random() * 5000) : 15428,
          cueBalance: isExisting ? 8750 + Math.floor(Math.random() * 5000) : 15428,
          trust_score: isExisting ? 88 + Math.floor(Math.random() * 12) : 85,
          trustScore: isExisting ? 88 + Math.floor(Math.random() * 12) : 85,
          passport_level: 'Verified',
          passportLevel: 'Verified',
          biometric_verified: true,
          biometricVerified: true,
          auth_method: 'passkey',
          status: 'active',
          created_at: isExisting 
            ? new Date(Date.now() - 86400000 * 14).toISOString()
            : new Date().toISOString(),
          registeredAt: isExisting 
            ? new Date(Date.now() - 86400000 * 14).toISOString() 
            : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        },
        message: isExisting 
          ? '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
          : '새로운 AI Passport가 생성되었습니다!',
        rewards: isExisting ? undefined : { welcomeCUE: 15428 }
      };
    }
    
    if (endpoint.includes('session/restore')) {
      if (Math.random() > 0.5) {
        return {
          success: true,
          user: {
            id: 'restored_user_123',
            username: 'RestoredAgent',
            email: Math.random() > 0.3 ? 'restored@cueprotocol.ai' : null,
            userEmail: Math.random() > 0.3 ? 'restored@cueprotocol.ai' : null,
            did: 'did:cue:restored:123',
            wallet_address: '0x1234567890123456789012345678901234567890',
            walletAddress: '0x1234567890123456789012345678901234567890',
            cue_tokens: 8750 + Math.floor(Math.random() * 5000),
            cueBalance: 8750 + Math.floor(Math.random() * 5000),
            trust_score: 90 + Math.floor(Math.random() * 10),
            trustScore: 90 + Math.floor(Math.random() * 10),
            passport_level: 'Verified',
            passportLevel: 'Verified',
            biometric_verified: true,
            biometricVerified: true,
            auth_method: 'passkey',
            created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
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
        "CUE Protocol은 AI 개인화를 위한 혁신적인 블록체인 플랫폼입니다. RAG-DAG 시스템으로 당신의 대화를 학습하여 더욱 정확한 개인화 AI를 제공합니다.",
        "블록체인 기반 신원 인증과 WebAuthn 생체인증으로 보호되는 개인 데이터 볼트에서 안전하게 문맥을 학습합니다. 매 대화마다 CUE 토큰을 획득하세요!",
        "RAG-DAG(Retrieval-Augmented Generation with Directed Acyclic Graph) 시스템은 당신의 대화 패턴과 선호도를 지속적으로 학습합니다. 시간이 지날수록 더욱 정확해집니다.",
        "실시간 문맥 학습과 품질 기반 CUE 마이닝이 진행 중입니다. 고품질 대화일수록 더 많은 CUE 토큰을 획득할 수 있습니다.",
        "AI Passport를 통해 당신의 디지털 정체성과 학습 패턴을 안전하게 관리합니다. 크로스 플랫폼 동기화로 어디서든 일관된 AI 경험을 제공합니다."
      ];
      
      return {
        success: true,
        response: responses[Math.floor(Math.random() * responses.length)],
        model: 'gpt-4o-cue',
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 20) + 5,
        trustScore: 0.85 + Math.random() * 0.15,
        contextLearned: true,
        qualityScore: 0.88 + Math.random() * 0.12,
        tokensUsed: Math.floor(Math.random() * 500) + 100,
        processingTime: Math.floor(Math.random() * 2000) + 500
      };
    }
    
    if (endpoint.includes('/cue/mine')) {
      return {
        success: true,
        amount: Math.floor(Math.random() * 10) + 1,
        totalBalance: Math.floor(Math.random() * 5000) + 1000,
        activity: options.body ? JSON.parse(options.body).activity : 'mock_activity',
        breakdown: {
          baseReward: Math.floor(Math.random() * 3) + 1,
          qualityBonus: Math.floor(Math.random() * 2),
          conversationBonus: Math.floor(Math.random() * 1),
          personalityBonus: Math.random() * 0.5
        }
      };
    }

    if (endpoint.includes('/passport/') && !endpoint.includes('/platforms') && !endpoint.includes('/vaults')) {
      const did = endpoint.split('/passport/')[1]?.split('/')[0] || 'mock_did';
      return {
        success: true,
        did,
        username: did.split(':').pop() || 'Agent',
        trustScore: 85 + Math.floor(Math.random() * 15),
        passportLevel: 'Verified Agent',
        cueBalance: 2500 + Math.floor(Math.random() * 3000),
        totalMined: 25000 + Math.floor(Math.random() * 50000),
        dataVaults: [
          { name: 'Identity Vault', type: 'identity', size: '2.3MB', items: 47 },
          { name: 'Knowledge Vault', type: 'knowledge', size: '15.7MB', items: 234 },
          { name: 'Preference Vault', type: 'preference', size: '1.2MB', items: 89 }
        ],
        connectedPlatforms: ['ChatGPT', 'Claude', 'Discord', 'GitHub', 'Notion'],
        personalityProfile: {
          traits: ['창의적', '분석적', '신뢰할 수 있는'],
          communicationStyle: 'friendly',
          expertise: ['AI', 'Web3', 'Protocol Design']
        },
        achievements: [
          { name: 'First CUE', icon: '🎯', earned: true, description: '첫 CUE 마이닝' },
          { name: 'Trusted Agent', icon: '🛡️', earned: true, description: '신뢰도 90% 달성' },
          { name: 'Platform Master', icon: '🌐', earned: false, description: '5개 플랫폼 연결' }
        ],
        ragDagStats: {
          learnedConcepts: 247,
          connectionStrength: 0.87,
          lastLearningActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          knowledgeNodes: 1456,
          personalityAccuracy: 0.94
        },
        recentActivity: [
          { type: 'chat', description: 'AI와 Web3 주제로 대화', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
          { type: 'mining', description: '15 CUE 토큰 마이닝', timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
          { type: 'learning', description: 'Protocol Design 개념 학습', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() }
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

  async startWebAuthnRegistration() {
    console.log('🆕 === WebAuthn 등록 시작 (영구 패스키 지원) ===');

    try {
      console.log('📞 1단계: /register/start 호출');
      const startResponse = await this.request('/api/auth/webauthn/register/start', {
        method: 'POST',
        body: JSON.stringify({
          userName: `PassKey_User_${Date.now()}`,
          deviceInfo: { 
            userAgent: navigator.userAgent, 
            platform: navigator.platform,
            timestamp: Date.now()
          }
        })
      });

      console.log('✅ 1단계 성공:', { 
        success: startResponse.success, 
        sessionId: startResponse.sessionId 
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('등록 시작 응답이 올바르지 않습니다');
      }

      console.log('📦 2단계: WebAuthn 라이브러리 로드 확인');
      const loaded = await loadWebAuthn();
      
      let credential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - 영구 Mock 패스키 사용');
        credential = this.getOrCreateMockCredential();
        console.log('🔑 사용 중인 Mock 패스키:', credential.id);
      } else {
        console.log('👆 2단계: 실제 생체인증 실행...');
        
        try {
          try {
            const authOptions = {
              ...startResponse.options,
              allowCredentials: []
            };
            credential = await startAuthentication(authOptions);
            console.log('✅ 기존 패스키 인증 성공:', credential.id);
          } catch (authError) {
            console.log('🆕 기존 패스키 없음, 새 패스키 등록 중...');
            credential = await startRegistration(startResponse.options);
            console.log('✅ 새 패스키 등록 성공:', credential.id);
          }
        } catch (webauthnError) {
          console.error('❌ WebAuthn 실행 실패:', webauthnError);
          throw webauthnError;
        }
      }

      console.log('📞 3단계: /register/complete 호출');
      console.log('🔑 사용 중인 credential_id:', credential.id);
      
      const completeResponse = await this.request('/api/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          credential, 
          sessionId: startResponse.sessionId 
        })
      });

      console.log('✅ 3단계 완료:', { 
        success: completeResponse.success,
        hasUser: !!completeResponse.user,
        isExisting: completeResponse.isExistingUser,
        action: completeResponse.action,
        sessionToken: !!completeResponse.sessionToken
      });

      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '등록 완료 처리 실패');
      }

      if (!completeResponse.user) {
        throw new Error('사용자 정보가 응답에 포함되지 않았습니다');
      }

      if (completeResponse.sessionToken) {
        console.log('💾 JWT 세션 토큰 localStorage 저장');
        localStorage.setItem('cue_session_token', completeResponse.sessionToken);
      }
      
      if (completeResponse.sessionId) {
        console.log('💾 세션 ID localStorage 저장:', completeResponse.sessionId);
        localStorage.setItem('cue_session_id', completeResponse.sessionId);
      }

      console.log('🎉 WebAuthn 등록 완료!', {
        userId: completeResponse.user.id,
        username: completeResponse.user.username,
        did: completeResponse.user.did,
        action: completeResponse.action,
        isExisting: completeResponse.isExistingUser || false
      });

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  async restoreSession() {
    console.log('🔧 === 세션 복원 시도 ===');
    
    try {
      const sessionToken = localStorage.getItem('cue_session_token');
      const sessionId = localStorage.getItem('cue_session_id');
      
      if (!sessionToken && !sessionId) {
        console.log('❌ 저장된 세션 토큰/ID 없음');
        return null;
      }

      console.log('🔍 저장된 세션 발견:', {
        hasToken: !!sessionToken,
        hasId: !!sessionId
      });

      if (sessionToken) {
        try {
          const response = await this.request('/api/auth/session/restore', {
            method: 'POST',
            body: JSON.stringify({ sessionToken })
          });

          if (response.success) {
            console.log('✅ JWT 토큰 기반 세션 복원 성공!');
            return response;
          }
        } catch (error: any) {
          console.warn('⚠️ JWT 토큰 복원 실패, 세션 ID로 시도:', error.message);
          localStorage.removeItem('cue_session_token');
        }
      }

      if (sessionId) {
        try {
          const response = await this.request('/api/auth/session/restore', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
          });

          if (response.success) {
            console.log('✅ 세션 ID 기반 복원 성공!');
            return response;
          }
        } catch (error: any) {
          console.warn('⚠️ 세션 ID 복원도 실패:', error.message);
          localStorage.removeItem('cue_session_id');
        }
      }

      console.log('❌ 모든 세션 복원 실패');
      return null;

    } catch (error: any) {
      console.error('💥 세션 복원 오류:', error);
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      return null;
    }
  }

  async logout() {
    console.log('🔧 === 로그아웃 처리 ===');
    
    try {
      const sessionToken = localStorage.getItem('cue_session_token');
      const sessionId = localStorage.getItem('cue_session_id');
      
      if (sessionToken || sessionId) {
        console.log('🗑️ 서버 세션 무효화 시도');
        
        try {
          await this.request('/api/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ sessionToken, sessionId })
          });
        } catch (error: any) {
          console.warn('⚠️ 서버 로그아웃 실패 (로컬 토큰은 삭제)', error);
        }
      }

      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      console.log('✅ 로그아웃 완료');

      return { success: true };

    } catch (error: any) {
      console.error('💥 로그아웃 오류:', error);
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_id');
      return { success: false, error: error.message };
    }
  }

  async sendChatMessage(message: string, model: string, userDid?: string) {
    try {
      return await this.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, model, userDid })
      });
    } catch {
      const responses = [
        "안녕하세요! CUE Protocol에서 개인화된 AI 어시스턴트입니다. 어떻게 도와드릴까요?",
        "흥미로운 질문이네요! 개인화 데이터를 기반으로 맞춤형 답변을 준비하고 있습니다.",
        "데이터 볼트에서 관련 정보를 찾고 있습니다. 잠시만 기다려주세요.",
        "WebAuthn 인증을 통해 안전하게 저장된 개인 정보를 활용하여 답변드리겠습니다."
      ];
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        model,
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 15) + 5,
        trustScore: 0.85 + Math.random() * 0.15
      };
    }
  }

  async mineCUE(userDid: string, activity: string) {
    try {
      return await this.request('/api/cue/mine', {
        method: 'POST',
        body: JSON.stringify({ userDid, activity })
      });
    } catch {
      return {
        success: true,
        amount: Math.floor(Math.random() * 10) + 1,
        totalBalance: Math.floor(Math.random() * 5000) + 1000,
        activity
      };
    }
  }

  async loadPassport(did: string) {
    try {
      return await this.request(`/api/passport/${did}`);
    } catch {
      return {
        did,
        username: did.split(':').pop(),
        trustScore: 85 + Math.floor(Math.random() * 15),
        passportLevel: 'Verified Agent',
        cueBalance: 2500 + Math.floor(Math.random() * 3000),
        totalMined: 25000 + Math.floor(Math.random() * 50000),
        dataVaults: [
          { name: 'Identity Vault', type: 'identity', size: '2.3MB', items: 47 },
          { name: 'Knowledge Vault', type: 'knowledge', size: '15.7MB', items: 234 },
          { name: 'Preference Vault', type: 'preference', size: '1.2MB', items: 89 }
        ],
        connectedPlatforms: ['ChatGPT', 'Claude', 'Discord', 'GitHub', 'Notion'],
        personalityProfile: {
          traits: ['창의적', '분석적', '신뢰할 수 있는'],
          communicationStyle: 'friendly',
          expertise: ['AI', 'Web3', 'Protocol Design']
        },
        achievements: [
          { name: 'First CUE', icon: '🎯', earned: true, description: '첫 CUE 마이닝' },
          { name: 'Trusted Agent', icon: '🛡️', earned: true, description: '신뢰도 90% 달성' },
          { name: 'Platform Master', icon: '🌐', earned: false, description: '5개 플랫폼 연결' }
        ],
        ragDagStats: {
          learnedConcepts: 247,
          connectionStrength: 0.87,
          lastLearningActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          knowledgeNodes: 1456,
          personalityAccuracy: 0.94
        },
        recentActivity: [
          { type: 'chat', description: 'AI와 Web3 주제로 대화', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
          { type: 'mining', description: '15 CUE 토큰 마이닝', timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
          { type: 'learning', description: 'Protocol Design 개념 학습', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() }
        ],
        createdAt: new Date().toISOString()
      };
    }
  }

  async checkHealth() {
    try {
      const response = await this.request('/health');
      return { connected: true, mode: 'real', ...response };
    } catch (error: any) {
      return { connected: false, mode: 'mock', error: error.message };
    }
  }

  // ============================================================================
  // 🔧 편의 메서드들 (기존 API와 호환성)
  // ============================================================================

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

  /**
   * 세션 복원 (페이지 새로고침 시 자동 호출)
   */
  async restoreSession(): Promise<any> {
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
  async checkHealth(): Promise<any> {
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
   * 정리 (컴포넌트 언마운트 시 호출)
   */
  cleanup(): void {
    console.log('🧹 PersistentDataAPIClient 정리 중...');
    this.disconnectWebSocket();
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }
}

// WebAuthn 지원 확인
export const checkWebAuthnSupport = () => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering' };
  }
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'WebAuthn을 지원하지 않는 브라우저입니다.' };
  }
  return { supported: true };
};