// ============================================================================
// 📁 frontend/src/services/api/BackendAPIClient.ts
// 🔗 통합 BackendAPIClient - Mock 완전 제거 + 모든 장점 통합
// 특징: 
// - Mock 완전 제거로 명확한 디버깅
// - 고급 모니터링 및 통계
// - 기존 구조와 100% 호환
// - useAuth 완전 지원
// - 강력한 에러 처리 및 재시도 로직
// ============================================================================

'use client';

import type { 
  HealthCheckResult, 
  SessionRestoreResult, 
  User,
  AuthConfig 
} from '../../types/auth.types';

export class BackendAPIClient {
  protected baseURL: string;
  protected headers: Record<string, string>;
  protected websocket: WebSocket | null = null;
  protected listeners: Map<string, (data: any) => void> = new Map();
  protected reconnectAttempts: number = 0;
  protected maxReconnectAttempts: number = 5;
  
  private config: AuthConfig;
  private requestStats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    lastRequestTime: string | null;
    averageResponseTime: number;
    connectionErrors: number;
    authErrors: number;
  };

  constructor(baseURL?: string) {
    // 환경 변수 또는 기본 URL 사용
    this.baseURL = baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Origin': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    };
    
    this.config = {
      backendURL: this.baseURL,
      enableMockMode: false, // Mock 완전 비활성화
      sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30일
      maxRetryAttempts: 3,
      retryDelay: 1000,
      enableDetailedLogging: process.env.NODE_ENV === 'development',
      enablePerformanceMonitoring: true
    };
    
    this.requestStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: null,
      averageResponseTime: 0,
      connectionErrors: 0,
      authErrors: 0
    };
    
    console.log(`🔗 BackendAPIClient 통합 초기화: ${this.baseURL}`);
    
    // 페이지 로드 시 세션 토큰 확인
    this.initializeSession();
    
    // 페이지 숨김/복원 시 자동 재연결
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.websocket?.readyState !== WebSocket.OPEN) {
          this.connectWebSocket();
        }
      });
    }

    // 통계 로드
    this.loadRequestStats();
  }

  // ============================================================================
  // 🔧 세션 관리 (기존 구조 완전 호환)
  // ============================================================================

  private initializeSession(): void {
    if (typeof window !== 'undefined') {
      const token = this.getSessionToken();
      if (token) {
        this.setAuthHeader(token);
        if (this.config.enableDetailedLogging) {
          console.log('💾 기존 세션 토큰 로드됨');
        }
      }
    }
  }

  /**
   * 세션 토큰 저장 (기존 구조 유지)
   */
  setSessionToken(token: string): void {
    if (typeof window !== 'undefined') {
      // 기존 키들과 호환성 유지
      localStorage.setItem('cue_session_token', token);
      localStorage.setItem('session_token', token);
      localStorage.setItem('final0626_auth_token', token);
      localStorage.setItem('ai_passport_session_token', token);
      
      this.setAuthHeader(token);
      
      if (this.config.enableDetailedLogging) {
        console.log('💾 세션 토큰 저장됨 (모든 키 호환)');
      }
    }
  }

  /**
   * 세션 토큰 조회 (기존 구조 완전 호환)
   */
  getSessionToken(): string | null {
    if (typeof window !== 'undefined') {
      // 기존 키들 순서대로 확인
      return localStorage.getItem('cue_session_token') ||
             localStorage.getItem('session_token') ||
             localStorage.getItem('final0626_auth_token') ||
             localStorage.getItem('ai_passport_session_token');
    }
    return null;
  }

  /**
   * 세션 토큰 삭제 (기존 구조 완전 호환)
   */
  clearSessionToken(): void {
    if (typeof window !== 'undefined') {
      // 모든 기존 키들 삭제
      const keysToRemove = [
        'cue_session_token',
        'session_token',
        'final0626_auth_token',
        'ai_passport_session_token',
        'cue_session_id',
        'auth_timestamp'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.removeAuthHeader();
      
      if (this.config.enableDetailedLogging) {
        console.log('🗑️ 모든 세션 토큰 삭제됨');
      }
    }
  }

  private setAuthHeader(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  private removeAuthHeader(): void {
    delete this.headers['Authorization'];
  }

  // ============================================================================
  // 🌐 강화된 HTTP 요청 메서드 (재시도 + 에러 처리)
  // ============================================================================

  protected async request<T = any>(
    endpoint: string, 
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const startTime = Date.now();
    this.requestStats.totalRequests++;
    
    try {
      const url = `${this.baseURL}${endpoint}`;
      
      if (this.config.enableDetailedLogging) {
        console.log(`🌐 API 요청 [${retryCount + 1}/${this.config.maxRetryAttempts + 1}]: ${options.method || 'GET'} ${url}`);
      }
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        },
        mode: 'cors',
        credentials: 'include',
        // 타임아웃 설정
        signal: AbortSignal.timeout(30000) // 30초 타임아웃
      });

      const responseTime = Date.now() - startTime;

      if (this.config.enableDetailedLogging) {
        console.log(`📡 응답 상태: ${response.status} ${response.statusText} (${responseTime}ms)`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        // 401 에러 시 세션 토큰 삭제
        if (response.status === 401) {
          this.requestStats.authErrors++;
          this.clearSessionToken();
          if (this.config.enableDetailedLogging) {
            console.warn('🚫 401 인증 오류 - 세션 토큰 삭제');
          }
        }

        // 5xx 서버 오류나 네트워크 오류 시 재시도
        if ((response.status >= 500 || response.status === 0) && retryCount < this.config.maxRetryAttempts) {
          if (this.config.enableDetailedLogging) {
            console.warn(`🔄 서버 오류 재시도: ${retryCount + 1}/${this.config.maxRetryAttempts}`);
          }
          
          await this.delay(this.config.retryDelay * Math.pow(2, retryCount)); // 지수 백오프
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        
        this.requestStats.failedRequests++;
        this.updateRequestStats(false, responseTime);
        
        const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }

      const data = await response.json();
      
      if (this.config.enableDetailedLogging) {
        console.log(`✅ API 응답 성공:`, data);
      }
      
      this.requestStats.successfulRequests++;
      this.updateRequestStats(true, responseTime);
      
      return data;
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (this.config.enableDetailedLogging) {
        console.error(`❌ API 오류 (${endpoint}):`, error.message);
      }
      
      // 네트워크 연결 오류 시 재시도
      if ((error.name === 'TypeError' || error.name === 'TimeoutError') && retryCount < this.config.maxRetryAttempts) {
        this.requestStats.connectionErrors++;
        
        if (this.config.enableDetailedLogging) {
          console.warn(`🔄 네트워크 오류 재시도: ${retryCount + 1}/${this.config.maxRetryAttempts}`);
        }
        
        await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
        return this.request<T>(endpoint, options, retryCount + 1);
      }
      
      this.requestStats.failedRequests++;
      this.updateRequestStats(false, responseTime);
      
      // 네트워크 오류 메시지 개선
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`네트워크 연결 오류: 백엔드 서버(${this.baseURL})에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.`);
      }
      
      if (error.name === 'TimeoutError') {
        throw new Error(`요청 타임아웃: 서버 응답이 30초를 초과했습니다.`);
      }
      
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // 🔧 편의 메서드들 (기존 구조 완전 호환)
  // ============================================================================

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============================================================================
  // 🔧 핵심 API 메서드들 (useAuth 완전 호환)
  // ============================================================================

  /**
   * 세션 복원 (useAuth에서 사용하는 핵심 메서드)
   */
  async restoreSession(): Promise<any> {
    if (this.config.enableDetailedLogging) {
      console.log('🔄 === BackendAPIClient 세션 복원 시작 ===');
    }
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        if (this.config.enableDetailedLogging) {
          console.log('❌ 저장된 세션 토큰 없음');
        }
        return {
          success: false,
          error: 'No session token found'
        };
      }

      if (this.config.enableDetailedLogging) {
        console.log('🔍 저장된 세션 토큰 발견, 복원 시도');
      }

      const response = await this.post('/api/auth/session/restore', { 
        sessionToken 
      });

      if (!response.success) {
        if (this.config.enableDetailedLogging) {
          console.log('❌ 세션 복원 실패, 토큰 삭제');
        }
        this.clearSessionToken();
        return {
          success: false,
          error: 'Session restore failed'
        };
      }

      if (this.config.enableDetailedLogging) {
        console.log('✅ 세션 복원 성공!', {
          username: response.user?.username,
          did: response.user?.did,
          cueBalance: response.user?.cueBalance || response.user?.cue_tokens
        });
      }

      // 새 토큰이 있으면 저장
      if (response.sessionToken) {
        this.setSessionToken(response.sessionToken);
      }

      return response;

    } catch (error: any) {
      if (this.config.enableDetailedLogging) {
        console.error('💥 세션 복원 오류:', error);
      }
      this.clearSessionToken();
      return {
        success: false,
        error: error.message || 'Session restore failed'
      };
    }
  }

  /**
   * 로그아웃 (useAuth에서 사용하는 핵심 메서드)
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    if (this.config.enableDetailedLogging) {
      console.log('🚪 === BackendAPIClient 로그아웃 처리 ===');
    }
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (sessionToken) {
        if (this.config.enableDetailedLogging) {
          console.log('🗑️ 서버 세션 무효화');
        }
        await this.post('/api/auth/logout', { sessionToken });
      }

      // 로컬 세션 토큰 삭제
      this.clearSessionToken();
      
      if (this.config.enableDetailedLogging) {
        console.log('✅ 로그아웃 완료');
      }

      return { success: true };

    } catch (error: any) {
      if (this.config.enableDetailedLogging) {
        console.error('💥 로그아웃 오류:', error);
      }
      // 오류가 발생해도 로컬 토큰은 삭제
      this.clearSessionToken();
      return { success: false, error: error.message };
    }
  }

  /**
   * 백엔드 연결 상태 확인 (useAuth에서 사용하는 핵심 메서드)
   */
  async checkConnection(): Promise<any> {
    if (this.config.enableDetailedLogging) {
      console.log('🔌 백엔드 연결 상태 확인...');
    }
    
    try {
      const response = await this.get<{ status: string }>('/health');
      
      if (this.config.enableDetailedLogging) {
        console.log('✅ 백엔드 연결 성공:', response);
      }
      
      return {
        connected: true,
        mode: 'real',
        status: response.status || 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      if (this.config.enableDetailedLogging) {
        console.warn('⚠️ 백엔드 연결 실패:', error.message);
      }
      
      return {
        connected: false,
        mode: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Health Check 별칭 (호환성)
   */
  async healthCheck(): Promise<any> {
    return this.checkConnection();
  }

  // ============================================================================
  // 🔄 실시간 WebSocket 통신 (강화된 버전)
  // ============================================================================

  connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      if (this.config.enableDetailedLogging) {
        console.log('🔌 WebSocket 이미 연결됨');
      }
      return;
    }

    try {
      const wsUrl = this.baseURL.replace('http', 'ws') + '/ws';
      
      if (this.config.enableDetailedLogging) {
        console.log(`🔌 WebSocket 연결 시도: ${wsUrl}`);
      }
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        if (this.config.enableDetailedLogging) {
          console.log('✅ WebSocket 연결됨');
        }
        this.reconnectAttempts = 0;
        this.notifyListeners('connect', { status: 'connected' });
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.config.enableDetailedLogging) {
            console.log('📡 WebSocket 메시지:', data);
          }
          this.notifyListeners(data.type || 'message', data);
        } catch (error) {
          console.error('❌ WebSocket 메시지 파싱 오류:', error);
        }
      };
      
      this.websocket.onclose = () => {
        if (this.config.enableDetailedLogging) {
          console.log('⚠️ WebSocket 연결 종료됨');
        }
        this.notifyListeners('disconnect', { status: 'disconnected' });
        this.attemptReconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
        this.notifyListeners('error', { error });
      };
      
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.config.enableDetailedLogging) {
        console.log('🛑 WebSocket 재연결 시도 한계 도달');
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // 지수 백오프
    
    if (this.config.enableDetailedLogging) {
      console.log(`🔄 WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`);
    }
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  onRealtimeUpdate(callback: (data: any) => void): () => void {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    
    if (this.config.enableDetailedLogging) {
      console.log(`📝 실시간 리스너 등록: ${id}`);
    }
    
    // WebSocket 연결이 없으면 연결 시도
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
    }
    
    // 정리 함수 반환
    return () => {
      this.listeners.delete(id);
      if (this.config.enableDetailedLogging) {
        console.log(`🗑️ 실시간 리스너 삭제: ${id}`);
      }
    };
  }

  private notifyListeners(type: string, data: any): void {
    this.listeners.forEach(callback => {
      try {
        callback({ type, ...data });
      } catch (error) {
        console.error('❌ 리스너 콜백 오류:', error);
      }
    });
  }

  // ============================================================================
  // 📊 고급 모니터링 및 통계 (새 버전의 장점)
  // ============================================================================

  private updateRequestStats(success: boolean, responseTime: number): void {
    if (!this.config.enablePerformanceMonitoring) return;

    this.requestStats.lastRequestTime = new Date().toISOString();
    
    if (success) {
      const totalTime = this.requestStats.averageResponseTime * (this.requestStats.successfulRequests - 1) + responseTime;
      this.requestStats.averageResponseTime = totalTime / this.requestStats.successfulRequests;
    }

    // localStorage에 저장
    this.saveRequestStats();
  }

  private loadRequestStats(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cue_api_stats');
        if (stored) {
          const stats = JSON.parse(stored);
          this.requestStats = { ...this.requestStats, ...stats };
        }
      } catch (error) {
        if (this.config.enableDetailedLogging) {
          console.warn('⚠️ 통계 로드 실패:', error);
        }
      }
    }
  }

  private saveRequestStats(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cue_api_stats', JSON.stringify(this.requestStats));
      } catch (error) {
        if (this.config.enableDetailedLogging) {
          console.warn('⚠️ 통계 저장 실패:', error);
        }
      }
    }
  }

  /**
   * API 요청 통계 조회
   */
  getRequestStats(): any {
    if (!this.config.enablePerformanceMonitoring) {
      return { message: 'Performance monitoring disabled' };
    }

    const successRate = this.requestStats.totalRequests > 0 
      ? (this.requestStats.successfulRequests / this.requestStats.totalRequests * 100).toFixed(2) + '%'
      : '0%';

    const errorRate = this.requestStats.totalRequests > 0 
      ? (this.requestStats.failedRequests / this.requestStats.totalRequests * 100).toFixed(2) + '%'
      : '0%';

    return {
      ...this.requestStats,
      successRate,
      errorRate,
      uptime: this.requestStats.successfulRequests > 0 ? 'Active' : 'Inactive',
      averageResponseTimeMs: Math.round(this.requestStats.averageResponseTime)
    };
  }

  /**
   * 실시간 모니터링 시작
   */
  async startRealtimeMonitoring(userDid: string): Promise<() => void> {
    this.connectWebSocket();
    
    return this.onRealtimeUpdate((data) => {
      if (this.config.enableDetailedLogging) {
        console.log('📡 실시간 업데이트:', data);
      }
      
      // 사용자별 데이터 필터링
      if (data.userDid === userDid || !data.userDid) {
        this.handleRealtimeEvent(data);
      }
    });
  }

  private handleRealtimeEvent(data: any): void {
    // 브라우저 이벤트로 알림
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`cue_${data.type}`, { detail: data }));
    }
  }

  // ============================================================================
  // 🔧 확장된 API 메서드들 (새 버전의 장점)
  // ============================================================================

  /**
   * 파일 업로드
   */
  async uploadFile(file: File, userDid: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userDid', userDid);
    formData.append('timestamp', new Date().toISOString());

    return await this.request('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {} // FormData는 Content-Type 자동 설정
    });
  }

  /**
   * 사용자 프로필 조회
   */
  async getUserProfile(userId: string): Promise<any> {
    return await this.get(`/api/users/${userId}/profile`);
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateUserProfile(userId: string, updates: any): Promise<any> {
    return await this.put(`/api/users/${userId}/profile`, updates);
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들 (기존 + 새 버전 통합)
  // ============================================================================

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (this.config.enableDetailedLogging) {
      console.log('⚙️ 설정 업데이트됨:', newConfig);
    }
  }

  /**
   * 현재 설정 조회
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }

  /**
   * 인증 상태 확인
   */
  isAuthenticated(): boolean {
    return !!this.getSessionToken();
  }

  /**
   * 디버그 정보 출력
   */
  getDebugInfo(): any {
    const sessionInfo = this.getSessionInfo();
    const stats = this.getRequestStats();
    
    return {
      client: 'BackendAPIClient-Unified',
      version: '2.0-Ultimate',
      config: this.config,
      sessionInfo,
      requestStats: stats,
      websocketState: this.websocket?.readyState,
      listenerCount: this.listeners.size,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 세션 정보 (JWT 디코딩 포함)
   */
  getSessionInfo(): any {
    const token = this.getSessionToken();
    if (!token) {
      return {
        sessionId: null,
        userId: null,
        loginTime: null,
        expiresAt: null,
        isActive: false
      };
    }

    // JWT 토큰 디코딩 시도
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      
      return {
        sessionId: decoded.sessionId || token.substring(0, 16) + '...',
        userId: decoded.userId || decoded.sub,
        loginTime: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        isActive: decoded.exp ? Date.now() < decoded.exp * 1000 : true
      };
    } catch (error) {
      return {
        sessionId: token.substring(0, 16) + '...',
        userId: 'unknown',
        loginTime: null,
        expiresAt: null,
        isActive: true
      };
    }
  }

  // ============================================================================
  // 🧹 정리 및 종료
  // ============================================================================

  /**
   * WebSocket 연결 해제
   */
  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.listeners.clear();
      if (this.config.enableDetailedLogging) {
        console.log('🔌 WebSocket 연결 해제됨');
      }
    }
  }

  /**
   * 완전한 정리
   */
  dispose(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.listeners.clear();
    this.saveRequestStats();
    
    if (this.config.enableDetailedLogging) {
      console.log('🧹 BackendAPIClient 정리 완료');
    }
  }
}

export default BackendAPIClient;