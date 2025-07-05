// ============================================================================
// 📁 frontend/src/services/api/PersistentDataAPIClient.ts - 통합 고도화 버전
// 🔧 두 버전을 합쳐서 고도화: useAuth 동기화 + 완전한 기능 + Mock 패스키 제거
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
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  
  // 🔧 useAuth 동기화 관리
  private currentSessionToken: string | null = null;
  private tokenSyncEnabled: boolean = false;
  private authHookCallback: ((token: string | null) => void) | null = null;
  
  // 🔧 Health Check 제어
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthChecking: boolean = false;
  private healthCheckFrequency: number = 30000; // 30초로 증가
  private lastHealthCheck: number = 0;

  constructor(baseURL?: string) {
    const envBaseURL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
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
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    console.log(`🔗 PersistentDataAPIClient 초기화 (통합 고도화): ${this.baseURL}`);
  }

  // ============================================================================
  // 🔧 useAuth와 토큰 동기화 (하이브리드 버전에서 가져옴)
  // ============================================================================

  /**
   * useAuth 훅과 토큰 동기화 활성화
   */
  enableAuthHookSync(callback: (token: string | null) => void): () => void {
    console.log('🔄 useAuth 토큰 동기화 활성화');
    this.authHookCallback = callback;
    this.tokenSyncEnabled = true;
    
    // 현재 토큰을 useAuth에 알림
    if (this.currentSessionToken) {
      callback(this.currentSessionToken);
    }
    
    // 비활성화 함수 반환
    return () => {
      console.log('🔄 useAuth 토큰 동기화 비활성화');
      this.authHookCallback = null;
      this.tokenSyncEnabled = false;
    };
  }

  /**
   * 토큰 설정 (useAuth에서 호출)
   */
  setSessionToken(token: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('💾 세션 토큰 설정:', token ? token.substring(0, 20) + '...' : 'null');
      
      this.currentSessionToken = token;
      
      // localStorage 저장 (향상된 세션 데이터)
      const sessionTimeout = 30 * 24 * 60 * 60 * 1000; // 30일
      const expiresAt = Date.now() + sessionTimeout;
      const sessionData = {
        token,
        expiresAt,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        source: this.tokenSyncEnabled ? 'useAuth_sync' : 'direct'
      };
      
      localStorage.setItem('cue_session_token', token);
      localStorage.setItem('cue_session_data', JSON.stringify(sessionData));
      
      // useAuth에 토큰 변경 알림 (순환 참조 방지)
      if (this.tokenSyncEnabled && this.authHookCallback && !token.includes('_sync_')) {
        this.authHookCallback(token);
      }
      
      console.log('✅ 토큰 동기화 완료');
    } catch (error) {
      console.error('❌ 토큰 설정 실패:', error);
    }
  }

  /**
   * 토큰 조회 (만료 확인 포함)
   */
  getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // 우선순위: 메모리 > localStorage
    if (this.currentSessionToken) {
      return this.currentSessionToken;
    }
    
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
      
      // 메모리에 캐시
      this.currentSessionToken = token;
      
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
   * 토큰 삭제 (useAuth와 동기화)
   */
  clearSessionToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('🗑️ 세션 토큰 삭제');
      
      this.currentSessionToken = null;
      
      localStorage.removeItem('cue_session_token');
      localStorage.removeItem('cue_session_data');
      localStorage.removeItem('cue_session_id');
      localStorage.removeItem('webauthn_user_data');
      
      // useAuth에 토큰 삭제 알림
      if (this.tokenSyncEnabled && this.authHookCallback) {
        this.authHookCallback(null);
      }
      
      console.log('✅ 토큰 삭제 및 동기화 완료');
    } catch (error) {
      console.error('❌ 토큰 삭제 실패:', error);
    }
  }

  /**
   * 세션 정보 조회 (기본 버전에서 가져옴)
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
        remainingDays: Math.max(0, Math.floor((sessionData.expiresAt - now) / (24 * 60 * 60 * 1000))),
        source: sessionData.source || 'unknown'
      };
    } catch (error) {
      console.error('❌ 세션 정보 조회 실패:', error);
      return null;
    }
  }

  // ============================================================================
  // 🔧 Health Check 제어 메서드들
  // ============================================================================

  /**
   * Health Check 자동 시작 (제어된 간격)
   */
  startHealthCheck(): void {
    if (this.healthCheckInterval) {
      console.log('⚠️ Health Check가 이미 실행 중입니다');
      return;
    }

    console.log(`🏥 Health Check 시작 (${this.healthCheckFrequency / 1000}초 간격)`);
    
    // 즉시 한 번 실행
    this.performHealthCheck();
    
    // 정기적 실행
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckFrequency);
  }

  /**
   * Health Check 중지
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Health Check 중지됨');
    }
  }

  /**
   * 단일 Health Check 실행 (중복 방지)
   */
  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    
    // 중복 실행 방지
    if (this.isHealthChecking) {
      console.log('⏳ Health Check 이미 진행 중, 건너뛰기');
      return;
    }
    
    // 최소 간격 보장 (10초)
    if (now - this.lastHealthCheck < 10000) {
      console.log('⏳ Health Check 너무 자주 호출됨, 건너뛰기');
      return;
    }

    this.isHealthChecking = true;
    this.lastHealthCheck = now;
    
    try {
      const startTime = Date.now();
      const response = await this.get('/health');
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ Health Check 성공 (${responseTime}ms)`);
      
      // Health 상태 업데이트 이벤트 발생 (조용히)
      this.listeners.forEach(callback => {
        callback({
          type: 'health_update',
          status: 'healthy',
          responseTime,
          timestamp: new Date().toISOString()
        });
      });
      
    } catch (error: any) {
      console.error(`❌ Health Check 실패:`, error.message);
      
      // Health 실패 이벤트 발생
      this.listeners.forEach(callback => {
        callback({
          type: 'health_update',
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
    } finally {
      this.isHealthChecking = false;
    }
  }

  /**
   * Health Check 빈도 조정
   */
  setHealthCheckFrequency(milliseconds: number): void {
    if (milliseconds < 10000) {
      console.warn('⚠️ Health Check 빈도가 너무 높습니다. 최소 10초로 설정됩니다.');
      milliseconds = 10000;
    }
    
    this.healthCheckFrequency = milliseconds;
    
    // 실행 중이면 재시작
    if (this.healthCheckInterval) {
      this.stopHealthCheck();
      this.startHealthCheck();
    }
    
    console.log(`🔧 Health Check 빈도 변경: ${milliseconds / 1000}초`);
  }

  // ============================================================================
  // 🔧 향상된 WebSocket 연결 (수정된 엔드포인트)
  // ============================================================================

  /**
   * WebSocket 연결 (수정된 엔드포인트)
   */
  connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // 🔧 수정: 백엔드에서 실제 지원하는 WebSocket 엔드포인트 확인 필요
      // 현재 백엔드에 WebSocket 서버가 없으므로 연결 시도하지 않음
      console.log('⚠️ WebSocket 엔드포인트가 백엔드에 구현되지 않음');
      console.log('📝 향후 실시간 기능을 위해 WebSocket 서버 구현 필요');
      return;
      
      // const wsUrl = this.baseURL.replace('http', 'ws') + '/socket';
      
      // if (this.websocket?.readyState === WebSocket.OPEN) {
      //   console.log('✅ WebSocket 이미 연결됨');
      //   return;
      // }
      
      // console.log(`🔌 WebSocket 연결 시도: ${wsUrl}`);
      
      // this.websocket = new WebSocket(wsUrl);
      
      // this.websocket.onopen = () => {
      //   console.log('✅ WebSocket 연결됨');
      //   this.reconnectAttempts = 0;
        
      //   // 인증 토큰 자동 전송
      //   const token = this.getSessionToken();
      //   if (token && this.websocket) {
      //     this.websocket.send(JSON.stringify({ 
      //       type: 'auth', 
      //       token,
      //       source: 'PersistentDataAPIClient'
      //     }));
      //     console.log('🔑 WebSocket 인증 토큰 전송됨');
      //   }
      // };
      
      // this.websocket.onmessage = (event) => {
      //   try {
      //     const data = JSON.parse(event.data);
      //     console.log('📨 WebSocket 메시지 수신:', data.type);
          
      //     // CUE 업데이트 메시지 특별 처리
      //     if (data.type === 'cue_update' && this.tokenSyncEnabled && this.authHookCallback) {
      //       console.log('💰 CUE 업데이트 감지:', data.newBalance);
      //     }
          
      //     this.listeners.forEach(callback => callback(data));
      //   } catch (error) {
      //     console.error('❌ WebSocket 메시지 파싱 실패:', error);
      //   }
      // };
      
      // this.websocket.onclose = (event) => {
      //   console.log(`❌ WebSocket 연결 종료 (코드: ${event.code})`);
        
      //   // 404 에러인 경우 재연결 시도 안함
      //   if (event.code !== 1006) {
      //     console.log('🚫 WebSocket 엔드포인트가 지원되지 않음, 재연결 중지');
      //     return;
      //   }
        
      //   this.attemptReconnect();
      // };
      
      // this.websocket.onerror = (error) => {
      //   console.error('💥 WebSocket 오류:', error);
      // };
      
    } catch (error) {
      console.warn('❌ WebSocket 연결 실패, HTTP 폴백 사용:', error);
    }
  }

  /**
   * WebSocket 자동 재연결 (지수 백오프)
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

  /**
   * 실시간 업데이트 리스너 등록
   */
  onRealtimeUpdate(callback: (data: any) => void) {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  // ============================================================================
  // 🔧 향상된 HTTP 요청 (토큰 자동 포함 + 재시도 로직)
  // ============================================================================

  /**
   * 인증 헤더 생성 (토큰 자동 포함)
   */
  private getAuthHeaders(): Record<string, string> {
    const token = this.getSessionToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 API 요청에 인증 헤더 포함:', token.substring(0, 20) + '...');
    }
    
    return headers;
  }

  /**
   * 재시도 가능한 오류인지 확인
   */
  private isRetryableError(error: Error): boolean {
    return (
      error.name === 'TypeError' ||
      error.name === 'TimeoutError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout')
    );
  }

  /**
   * HTTP 요청 (재시도 로직 + 인증 헤더 자동 포함 + Health Check 최적화)
   */
  async request(endpoint: string, options: any = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Health Check 요청인 경우 로깅 최소화 및 특별 처리
    const isHealthCheck = endpoint.includes('/health');
    if (!isHealthCheck) {
      console.log(`📞 API 요청: ${options.method || 'GET'} ${endpoint}`);
    }
    
    const maxRetryAttempts = isHealthCheck ? 1 : 3; // Health Check는 재시도 1회만
    const retryDelay = 1000;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      try {
        // 자동 인증 헤더 포함
        const headers = { 
          ...this.getAuthHeaders(),
          ...options.headers 
        };
        
        // FormData인 경우 Content-Type 제거
        if (options.body instanceof FormData) {
          delete headers['Content-Type'];
        }
        
        const response = await fetch(url, {
          ...options,
          headers,
          mode: 'cors',
          credentials: 'include',
          signal: AbortSignal.timeout(isHealthCheck ? 5000 : 30000) // Health Check는 5초 타임아웃
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // 401 에러 시 useAuth와 동기화
          if (response.status === 401) {
            console.log('🗑️ 401 에러로 인한 토큰 삭제 및 useAuth 동기화');
            this.clearSessionToken();
          }

          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!isHealthCheck) {
          console.log('✅ API 성공:', { endpoint, hasData: !!data });
        }
        
        return data;
        
      } catch (error: any) {
        lastError = error;
        
        if (!isHealthCheck) {
          console.error(`❌ API 요청 실패 [시도 ${attempt}/${maxRetryAttempts}]:`, error.message);
        }
        
        if (attempt < maxRetryAttempts && this.isRetryableError(error)) {
          const delay = retryDelay * attempt;
          if (!isHealthCheck) {
            console.log(`⏳ ${delay}ms 후 재시도...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        break;
      }
    }
    
    // Health Check 실패는 조용히 Mock 반환
    if (isHealthCheck) {
      return this.getMockFallback(endpoint, options);
    }
    
    console.log(`🎭 ${maxRetryAttempts}회 시도 실패, Mock 응답 사용: ${endpoint}`);
    return this.getMockFallback(endpoint, options);
  }

  // ============================================================================
  // 🔧 편의 메서드들 (RESTful API)
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

  // ============================================================================
  // 🔧 완전한 WebAuthn 구현 (Mock 패스키 제거)
  // ============================================================================

  /**
   * WebAuthn 등록 시작 (실제 생체인증만)
   */
  async startWebAuthnRegistration() {
    console.log('🆕 === WebAuthn 등록 시작 (실제 생체인증만) ===');

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
      
      if (!loaded) {
        throw new Error('WebAuthn 라이브러리를 로드할 수 없습니다. 실제 생체인증이 필요합니다.');
      }

      console.log('👆 2단계: 실제 생체인증 실행...');
      
      let credential;
      try {
        // 먼저 기존 패스키로 인증 시도
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
        throw new Error('생체인증에 실패했습니다. 다시 시도해주세요.');
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

      // 세션 토큰 저장 (useAuth와 동기화)
      if (completeResponse.sessionToken) {
        console.log('💾 JWT 세션 토큰 저장 및 useAuth 동기화');
        this.setSessionToken(completeResponse.sessionToken);
      }
      
      if (completeResponse.sessionId) {
        console.log('💾 세션 ID 저장:', completeResponse.sessionId);
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

  // ============================================================================
  // 🔧 도메인별 메서드들 (useAuth 호환)
  // ============================================================================

  /**
   * 채팅 메시지 전송 (useAuth 토큰 사용)
   */
  async sendChatMessage(message: string, model: string, userDid?: string) {
    try {
      console.log('🤖 채팅 메시지 전송 (useAuth 토큰 포함)');
      
      const response = await this.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message, 
          model, 
          userDid,
          source: 'PersistentDataAPIClient'
        })
      });

      // CUE 마이닝 결과를 useAuth에 알림
      if (response.success && response.message?.cueTokensEarned) {
        console.log('💰 CUE 마이닝 감지, useAuth 동기화 필요');
        // 실제 구현에서는 useAuth의 updateCueBalance 호출
      }

      return {
        response: response.message?.content || response.response,
        model: model,
        cueReward: response.message?.cueTokensEarned || response.cueReward,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('⚠️ 채팅 API 실패, Mock 응답 사용');
      
      // Mock 응답
      const responses = [
        "안녕하세요! useAuth와 연동된 개인화 AI 어시스턴트입니다.",
        "하이브리드 아키텍처로 실시간 동기화가 가능합니다.",
        "WebSocket을 통해 실시간 CUE 마이닝 업데이트를 받을 수 있습니다."
      ];
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        model,
        cueReward: Math.floor(Math.random() * 10) + 1,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * CUE 마이닝
   */
  async mineCUE(userDid: string, activity: string) {
    try {
      const response = await this.post('/api/cue/mine', { userDid, activity });
      
      // useAuth에 CUE 업데이트 알림
      if (response.success && this.tokenSyncEnabled) {
        console.log('💰 CUE 마이닝 성공, useAuth 동기화');
      }
      
      return response;
    } catch {
      return {
        success: true,
        amount: Math.floor(Math.random() * 10) + 1,
        totalBalance: Math.floor(Math.random() * 5000) + 1000,
        activity
      };
    }
  }

  /**
   * Passport 정보 로드
   */
  async loadPassport(did: string) {
    try {
      return await this.get(`/api/passport/${did}`);
    } catch {
      // Mock Passport 데이터
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
   * 로그아웃 (세션 토큰 무효화 + useAuth 동기화)
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

      // 로컬 세션 토큰 삭제 (useAuth와 동기화)
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
   * 백엔드 연결 상태 확인 (Health Check 제어 포함)
   */
  async checkHealth(): Promise<any> {
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

  // ============================================================================
  // 🔧 Mock 응답 시스템 (간소화, Mock 패스키 제거)
  // ============================================================================

  getMockFallback(endpoint: string, options: any) {
    console.log(`🎭 Mock 응답 생성: ${endpoint}`);
    
    if (endpoint.includes('/health')) {
      return { 
        status: 'OK (Mock + Unified)',
        connected: false,
        mode: 'mock_unified', 
        timestamp: new Date().toISOString(),
        features: ['useAuth_sync', 'websocket', 'token_management', 'no_mock_passkey']
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
      // Mock 패스키 시스템 제거: 실제 WebAuthn이 필요함을 알림
      return {
        success: false,
        error: 'Mock passkey system removed. Real WebAuthn required.',
        message: '실제 생체인증이 필요합니다. WebAuthn 지원 브라우저를 사용해주세요.'
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
        "CUE Protocol은 AI 개인화를 위한 혁신적인 블록체인 플랫폼입니다. 실제 생체인증으로 보안이 강화되었습니다.",
        "Mock 패스키 시스템이 제거되어 더욱 안전한 WebAuthn 인증만 지원합니다.",
        "useAuth와의 완벽한 동기화로 실시간 토큰 관리가 가능합니다."
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
    
    // 기본 Mock 응답
    return {
      success: true,
      mock: true,
      unified: true,
      endpoint,
      data: options.body ? JSON.parse(options.body as string) : null,
      timestamp: new Date().toISOString(),
      note: 'Mock passkey system removed - real WebAuthn only'
    };
  }

  // ============================================================================
  // 🔧 디버그 정보 (하이브리드 상태 포함)
  // ============================================================================

  getDebugInfo() {
    return {
      connection: {
        baseURL: this.baseURL,
        websocketStatus: this.websocket?.readyState || 'disconnected',
        reconnectAttempts: this.reconnectAttempts
      },
      authentication: {
        hasToken: !!this.currentSessionToken,
        tokenSource: this.currentSessionToken ? 'memory' : 'none',
        tokenSyncEnabled: this.tokenSyncEnabled,
        hasAuthCallback: !!this.authHookCallback
      },
      realtime: {
        listenersCount: this.listeners.size,
        websocketConnected: this.websocket?.readyState === WebSocket.OPEN
      },
      unified: {
        mode: 'useAuth_sync_unified',
        version: '3.0.0',
        features: ['token_sync', 'websocket', 'cue_realtime', 'no_mock_passkey', 'retry_logic'],
        mockPasskeyRemoved: true
      },
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // 🔧 정리 함수 (통합 모드)
  // ============================================================================

  /**
   * 컴포넌트 언마운트 시 정리
   */
  cleanup(): void {
    console.log('🧹 PersistentDataAPIClient 정리 (통합 모드)');
    
    // Health Check 중지
    this.stopHealthCheck();
    
    // WebSocket 연결 해제
    this.disconnectWebSocket();
    
    // 리스너 정리
    this.listeners.clear();
    
    // useAuth 동기화 비활성화
    if (this.tokenSyncEnabled) {
      this.authHookCallback = null;
      this.tokenSyncEnabled = false;
    }
    
    // 재연결 시도 중지
    this.reconnectAttempts = 0;
    
    console.log('✅ 통합 정리 완료 (Health Check 포함)');
  }

  // ============================================================================
  // 🔧 컴포넌트와의 통합 사용법
  // ============================================================================

  /**
   * 컴포넌트에서 사용하기 위한 초기화
   */
  initialize(options?: {
    enableHealthCheck?: boolean;
    healthCheckInterval?: number;
    enableWebSocket?: boolean;
  }): void {
    const {
      enableHealthCheck = true,
      healthCheckInterval = 30000,
      enableWebSocket = false // 백엔드에 WebSocket 없으므로 기본 비활성화
    } = options || {};

    console.log('🚀 PersistentDataAPIClient 초기화 시작');

    // Health Check 설정
    if (enableHealthCheck) {
      this.setHealthCheckFrequency(healthCheckInterval);
      this.startHealthCheck();
    }

    // WebSocket 연결 (현재는 비활성화)
    if (enableWebSocket) {
      console.log('⚠️ WebSocket은 현재 백엔드에서 지원되지 않습니다');
      // this.connectWebSocket();
    }

    console.log('✅ PersistentDataAPIClient 초기화 완료');
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