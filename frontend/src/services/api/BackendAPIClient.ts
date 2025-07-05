// ============================================================================
// 📁 frontend/src/services/api/BackendAPIClient.ts
// 🔧 완전한 백엔드 API 클라이언트 (Mock 응답 제거, 모든 기능 유지)
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
  private requestStats: any;

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
      enableMockMode: false, // Mock 비활성화
      sessionTimeout: 30 * 24 * 60 * 60 * 1000, // 30일
      maxRetryAttempts: 3,
      retryDelay: 1000
    };
    
    this.requestStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastRequestTime: null,
      averageResponseTime: 0
    };
    
    console.log(`🔗 BackendAPIClient 초기화: ${this.baseURL}`);
    
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
  }

  // ============================================================================
  // 🔧 세션 관리
  // ============================================================================

  private initializeSession(): void {
    if (typeof window !== 'undefined') {
      const token = this.getSessionToken();
      if (token) {
        this.setAuthHeader(token);
        console.log('💾 기존 세션 토큰 로드됨');
      }
    }
  }

  setSessionToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_passport_session_token', token);
      this.setAuthHeader(token);
      console.log('💾 세션 토큰 저장됨');
    }
  }

  getSessionToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai_passport_session_token');
    }
    return null;
  }

  clearSessionToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ai_passport_session_token');
      this.removeAuthHeader();
      console.log('🗑️ 세션 토큰 삭제됨');
    }
  }

  private setAuthHeader(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  private removeAuthHeader(): void {
    delete this.headers['Authorization'];
  }

  // ============================================================================
  // 🌐 기본 HTTP 메서드들
  // ============================================================================

  protected async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const startTime = Date.now();
    this.requestStats.totalRequests++;
    
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

      const responseTime = Date.now() - startTime;
      console.log(`📡 응답 상태: ${response.status} ${response.statusText} (${responseTime}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP 오류: ${response.status}`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        this.requestStats.failedRequests++;
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API 응답 성공:`, data);
      
      this.requestStats.successfulRequests++;
      this.updateRequestStats(true, responseTime);
      
      return data;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ API 오류 (${endpoint}):`, error);
      
      this.requestStats.failedRequests++;
      this.updateRequestStats(false, responseTime);
      
      // 네트워크 오류 처리
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`네트워크 연결 오류: 백엔드 서버(${this.baseURL})에 연결할 수 없습니다.`);
      }
      
      throw error;
    }
  }

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
  // 🔧 확장된 API 메서드들 (실제 구현만)
  // ============================================================================

  /**
   * 파일 업로드 (멀티파트 지원)
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

  /**
   * 메시지 조회 (채팅 기록)
   */
  async getMessages(userDid: string, limit: number = 50, offset: number = 0): Promise<any> {
    return await this.get(`/api/messages/${userDid}?limit=${limit}&offset=${offset}`);
  }

  /**
   * 메시지 저장
   */
  async saveMessage(userDid: string, message: any): Promise<any> {
    return await this.post('/api/messages', {
      userDid,
      ...message,
      saved_at: new Date().toISOString()
    });
  }

  /**
   * CUE 거래 내역 조회
   */
  async getCueTransactions(userDid: string, limit: number = 20): Promise<any> {
    return await this.get(`/api/cue/transactions/${userDid}?limit=${limit}`);
  }

  /**
   * 연결된 플랫폼 조회
   */
  async getConnectedPlatforms(userDid: string): Promise<any> {
    return await this.get(`/api/platforms/${userDid}`);
  }

  /**
   * 플랫폼 연결
   */
  async connectPlatform(userDid: string, platform: string, credentials: any): Promise<any> {
    return await this.post('/api/platforms/connect', {
      userDid,
      platform,
      credentials,
      connected_at: new Date().toISOString()
    });
  }

  /**
   * 데이터 볼트 조회
   */
  async getDataVaults(userDid: string): Promise<any> {
    return await this.get(`/api/vaults/${userDid}`);
  }

  /**
   * 데이터 볼트 업데이트
   */
  async updateDataVault(userDid: string, vaultId: string, data: any): Promise<any> {
    return await this.put(`/api/vaults/${userDid}/${vaultId}`, data);
  }

  /**
   * RAG-DAG 통계 조회
   */
  async getRAGDAGStats(userDid: string): Promise<any> {
    return await this.get(`/api/rag-dag/${userDid}/stats`);
  }

  /**
   * RAG-DAG 업데이트
   */
  async updateRAGDAG(userDid: string, conversationData: any): Promise<any> {
    return await this.post(`/api/rag-dag/${userDid}/update`, conversationData);
  }

  // ============================================================================
  // 🔌 연결 상태 확인
  // ============================================================================

  async checkConnection(): Promise<{ 
    connected: boolean; 
    status?: string; 
    error?: string;
    timestamp: string;
  }> {
    try {
      console.log('🔌 백엔드 연결 상태 확인...');
      
      const response = await this.get<{ status: string }>('/api/debug/health');
      
      console.log('✅ 백엔드 연결 성공:', response);
      
      return {
        connected: true,
        status: response.status || 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.warn('⚠️ 백엔드 연결 실패:', error.message);
      
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async healthCheck(): Promise<any> {
    return this.checkConnection();
  }

  // ============================================================================
  // 🔄 WebSocket 실시간 통신
  // ============================================================================

  connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket 이미 연결됨');
      return;
    }

    try {
      const wsUrl = this.baseURL.replace('http', 'ws') + '/ws';
      console.log(`🔌 WebSocket 연결 시도: ${wsUrl}`);
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ WebSocket 연결됨');
        this.reconnectAttempts = 0;
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 WebSocket 메시지:', data);
          this.listeners.forEach(callback => callback(data));
        } catch (error) {
          console.error('❌ WebSocket 메시지 파싱 오류:', error);
        }
      };
      
      this.websocket.onclose = () => {
        console.log('⚠️ WebSocket 연결 종료됨');
        this.attemptReconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
      };
      
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🛑 WebSocket 재연결 시도 한계 도달');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // 지수 백오프
    
    console.log(`🔄 WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  onRealtimeUpdate(callback: (data: any) => void): () => void {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    console.log(`📝 실시간 리스너 등록: ${id}`);
    
    // WebSocket 연결이 없으면 연결 시도
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
    }
    
    // 정리 함수 반환
    return () => {
      this.listeners.delete(id);
      console.log(`🗑️ 실시간 리스너 삭제: ${id}`);
    };
  }

  // ============================================================================
  // 🔧 실시간 모니터링 및 고급 기능
  // ============================================================================

  /**
   * 실시간 모니터링 시작
   */
  async startRealtimeMonitoring(userDid: string): Promise<() => void> {
    this.connectWebSocket();
    
    return this.onRealtimeUpdate((data) => {
      console.log('📡 실시간 업데이트:', data);
      
      // 사용자별 데이터 필터링
      if (data.userDid === userDid || !data.userDid) {
        this.handleRealtimeEvent(data);
      }
    });
  }

  /**
   * 실시간 이벤트 처리
   */
  private handleRealtimeEvent(data: any): void {
    switch (data.type) {
      case 'cue_mined':
        console.log('💰 CUE 마이닝:', data.amount);
        this.notifyEvent('cue_mined', data);
        break;
      case 'message_response':
        console.log('💬 AI 응답:', data.response?.substring(0, 50) + '...');
        this.notifyEvent('message_response', data);
        break;
      case 'rag_dag_updated':
        console.log('🧠 RAG-DAG 업데이트:', data.stats);
        this.notifyEvent('rag_dag_updated', data);
        break;
      case 'platform_sync':
        console.log('🔗 플랫폼 동기화:', data.platform);
        this.notifyEvent('platform_sync', data);
        break;
      case 'achievement_unlocked':
        console.log('🏆 새 업적:', data.achievement);
        this.notifyEvent('achievement_unlocked', data);
        break;
      default:
        console.log('📡 기타 이벤트:', data);
    }
  }

  /**
   * 이벤트 알림 (확장 가능)
   */
  private notifyEvent(type: string, data: any): void {
    // 여기에 토스트, 알림 등을 추가할 수 있음
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`cue_${type}`, { detail: data }));
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
        console.log(`💓 Health Check: ${health.connected ? '✅' : '❌'}`);
        
        // 연결 복구 시 WebSocket 재연결
        if (health.connected && !this.websocket) {
          this.connectWebSocket();
        }

        // 통계 업데이트
        this.updateRequestStats(health.connected, 0);
        
      } catch (error) {
        console.warn('⚠️ Health Check 실패:', error);
        this.updateRequestStats(false, 0);
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
  // 🔧 유틸리티 및 통계 메서드들
  // ============================================================================

  /**
   * 요청 통계 업데이트
   */
  private updateRequestStats(success: boolean, responseTime: number): void {
    this.requestStats.lastRequestTime = new Date().toISOString();
    
    if (success) {
      const totalTime = this.requestStats.averageResponseTime * (this.requestStats.successfulRequests - 1) + responseTime;
      this.requestStats.averageResponseTime = totalTime / this.requestStats.successfulRequests;
    }

    // localStorage에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('cue_api_stats', JSON.stringify(this.requestStats));
    }
  }

  /**
   * API 요청 통계 조회
   */
  getRequestStats(): any {
    return {
      ...this.requestStats,
      successRate: this.requestStats.totalRequests > 0 
        ? (this.requestStats.successfulRequests / this.requestStats.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      uptime: this.requestStats.successfulRequests > 0 ? 'Active' : 'Inactive'
    };
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
      client: 'BackendAPIClient',
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
   * 세션 정보 (실제 데이터 기반)
   */
  getSessionInfo(): any {
    const token = this.getSessionToken();
    if (!token) {
      return {
        sessionId: null,
        userId: null,
        loginTime: null,
        expiresAt: null,
        isActive: false,
        deviceInfo: {
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }
      };
    }

    // JWT 토큰 디코딩 시도 (간단한 버전)
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      
      return {
        sessionId: decoded.sessionId || token.substring(0, 16) + '...',
        userId: decoded.userId || decoded.sub,
        loginTime: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        isActive: decoded.exp ? Date.now() < decoded.exp * 1000 : true,
        deviceInfo: {
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }
      };
    } catch (error) {
      // JWT 디코딩 실패 시 기본 정보
      return {
        sessionId: token.substring(0, 16) + '...',
        userId: 'unknown',
        loginTime: null,
        expiresAt: null,
        isActive: true,
        deviceInfo: {
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }
      };
    }
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들
  // ============================================================================

  getBaseURL(): string {
    return this.baseURL;
  }

  setCustomHeader(key: string, value: string): void {
    this.headers[key] = value;
    console.log(`📝 커스텀 헤더 설정: ${key} = ${value}`);
  }

  getHeaders(): Record<string, string> {
    return { ...this.headers };
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

  // ============================================================================
  // 🧹 정리 및 종료
  // ============================================================================

  dispose(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.listeners.clear();
    console.log('🧹 BackendAPIClient 정리 완료');
  }
}

export default BackendAPIClient;