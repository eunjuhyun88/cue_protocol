// ============================================================================
// 📁 src/services/api/BackendAPIClient.ts
// 🔧 완전한 백엔드 API 클라이언트 (영구 세션 + 자동 복원 + Mock 폴백)
// ============================================================================

'use client';

import { PersistentDataAPIClient } from './PersistentDataAPIClient';
import type { 
  HealthCheckResult, 
  SessionRestoreResult, 
  User,
  AuthConfig 
} from '../../types/auth.types';

export class BackendAPIClient extends PersistentDataAPIClient {
  private config: AuthConfig;
  private requestStats: any;

  constructor(baseURL = 'http://localhost:3001') {
    super(baseURL);
    
    this.config = {
      backendURL: baseURL,
      enableMockMode: true,
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
  // 🔧 확장된 API 메서드들
  // ============================================================================

  /**
   * 파일 업로드 (멀티파트 지원)
   */
  async uploadFile(file: File, userDid: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userDid', userDid);
      formData.append('timestamp', new Date().toISOString());

      return await this.request('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {} // FormData는 Content-Type 자동 설정
      });
    } catch (error) {
      return {
        success: false,
        error: 'File upload failed',
        fallback: true,
        mockUrl: `mock://uploads/${file.name}`,
        fileId: `mock_${Date.now()}_${file.name}`
      };
    }
  }

  /**
   * 사용자 프로필 조회
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      return await this.get(`/api/users/${userId}/profile`);
    } catch (error) {
      return {
        id: userId,
        username: `User_${userId.slice(-4)}`,
        email: 'mock@cueprotocol.ai',
        display_name: 'Mock User',
        avatar_url: null,
        bio: 'Mock user profile for testing',
        location: 'Virtual Space',
        website: 'https://cueprotocol.ai',
        twitter_handle: null,
        github_username: null,
        preferences: {
          theme: 'auto',
          language: 'ko',
          notifications: true,
          privacy_level: 'private'
        },
        stats: {
          total_conversations: Math.floor(Math.random() * 500) + 50,
          cue_tokens_earned: Math.floor(Math.random() * 10000) + 1000,
          platforms_connected: Math.floor(Math.random() * 5) + 1,
          achievements_unlocked: Math.floor(Math.random() * 10) + 3
        },
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date().toISOString(),
        fallback: true
      };
    }
  }

  /**
   * 사용자 프로필 업데이트
   */
  async updateUserProfile(userId: string, updates: any): Promise<any> {
    try {
      return await this.put(`/api/users/${userId}/profile`, updates);
    } catch (error) {
      return {
        success: false,
        error: 'Profile update failed',
        fallback: true,
        updatedFields: Object.keys(updates),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 메시지 조회 (채팅 기록)
   */
  async getMessages(userDid: string, limit: number = 50, offset: number = 0): Promise<any> {
    try {
      return await this.get(`/api/messages/${userDid}?limit=${limit}&offset=${offset}`);
    } catch (error) {
      return {
        messages: this.generateMockMessages(limit),
        total: limit * 3,
        hasMore: offset + limit < limit * 3,
        pagination: {
          limit,
          offset,
          total: limit * 3,
          pages: Math.ceil((limit * 3) / limit)
        },
        fallback: true
      };
    }
  }

  /**
   * 메시지 저장
   */
  async saveMessage(userDid: string, message: any): Promise<any> {
    try {
      return await this.post('/api/messages', {
        userDid,
        ...message,
        saved_at: new Date().toISOString()
      });
    } catch (error) {
      return {
        success: false,
        error: 'Message save failed',
        messageId: `mock_${Date.now()}`,
        fallback: true
      };
    }
  }

  /**
   * CUE 거래 내역 조회
   */
  async getCueTransactions(userDid: string, limit: number = 20): Promise<any> {
    try {
      return await this.get(`/api/cue/transactions/${userDid}?limit=${limit}`);
    } catch (error) {
      return {
        transactions: this.generateMockCueTransactions(limit),
        summary: {
          total_earned: Math.floor(Math.random() * 50000) + 10000,
          total_spent: Math.floor(Math.random() * 10000) + 1000,
          average_daily: Math.floor(Math.random() * 200) + 50,
          best_day: Math.floor(Math.random() * 500) + 100,
          streak_days: Math.floor(Math.random() * 30) + 5
        },
        total: limit * 2,
        fallback: true
      };
    }
  }

  /**
   * 연결된 플랫폼 조회
   */
  async getConnectedPlatforms(userDid: string): Promise<any> {
    try {
      return await this.get(`/api/platforms/${userDid}`);
    } catch (error) {
      return {
        platforms: [
          { 
            id: 'chatgpt',
            name: 'ChatGPT', 
            connected: true, 
            lastSync: new Date().toISOString(),
            status: 'active',
            data_synced: Math.floor(Math.random() * 1000) + 100,
            cue_earned: Math.floor(Math.random() * 5000) + 500,
            health: 'good'
          },
          { 
            id: 'claude',
            name: 'Claude', 
            connected: true, 
            lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            data_synced: Math.floor(Math.random() * 800) + 200,
            cue_earned: Math.floor(Math.random() * 3000) + 300,
            health: 'good'
          },
          { 
            id: 'discord',
            name: 'Discord', 
            connected: false, 
            lastSync: null,
            status: 'disconnected',
            data_synced: 0,
            cue_earned: 0,
            health: 'disconnected'
          }
        ],
        total_connected: 2,
        total_available: 8,
        sync_status: 'healthy',
        fallback: true
      };
    }
  }

  /**
   * 플랫폼 연결
   */
  async connectPlatform(userDid: string, platform: string, credentials: any): Promise<any> {
    try {
      return await this.post('/api/platforms/connect', {
        userDid,
        platform,
        credentials,
        connected_at: new Date().toISOString()
      });
    } catch (error) {
      return {
        success: false,
        error: 'Platform connection failed',
        platform,
        retry_after: 60000, // 1분 후 재시도
        fallback: true
      };
    }
  }

  /**
   * 데이터 볼트 조회
   */
  async getDataVaults(userDid: string): Promise<any> {
    try {
      return await this.get(`/api/vaults/${userDid}`);
    } catch (error) {
      return {
        vaults: [
          {
            id: 'identity_vault',
            name: 'Identity Vault',
            type: 'identity',
            size: '2.3MB',
            items: 47,
            encrypted: true,
            access_level: 'private',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            lastUpdated: new Date().toISOString(),
            health: 'excellent',
            backup_status: 'synced'
          },
          {
            id: 'knowledge_vault',
            name: 'Knowledge Vault',
            type: 'knowledge',
            size: '15.7MB',
            items: 234,
            encrypted: true,
            access_level: 'private',
            created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            health: 'good',
            backup_status: 'synced'
          },
          {
            id: 'preference_vault',
            name: 'Preference Vault',
            type: 'preference',
            size: '1.2MB',
            items: 89,
            encrypted: true,
            access_level: 'private',
            created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            health: 'excellent',
            backup_status: 'synced'
          }
        ],
        total_size: '19.2MB',
        total_items: 370,
        encryption_status: 'all_encrypted',
        backup_health: 'excellent',
        fallback: true
      };
    }
  }

  /**
   * 데이터 볼트 업데이트
   */
  async updateDataVault(userDid: string, vaultId: string, data: any): Promise<any> {
    try {
      return await this.put(`/api/vaults/${userDid}/${vaultId}`, data);
    } catch (error) {
      return {
        success: false,
        error: 'Vault update failed',
        vaultId,
        attempted_changes: Object.keys(data),
        fallback: true
      };
    }
  }

  /**
   * RAG-DAG 통계 조회
   */
  async getRAGDAGStats(userDid: string): Promise<any> {
    try {
      return await this.get(`/api/rag-dag/${userDid}/stats`);
    } catch (error) {
      return {
        learning_stats: {
          learned_concepts: 247 + Math.floor(Math.random() * 100),
          connection_strength: 0.87 + Math.random() * 0.13,
          knowledge_nodes: 1456 + Math.floor(Math.random() * 500),
          personality_accuracy: 0.94 + Math.random() * 0.06,
          adaptation_rate: 0.82 + Math.random() * 0.18
        },
        recent_activity: {
          last_learning: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          concepts_today: Math.floor(Math.random() * 10) + 3,
          quality_score: 0.91 + Math.random() * 0.09,
          learning_velocity: 'accelerating'
        },
        knowledge_graph: {
          total_nodes: 1456 + Math.floor(Math.random() * 500),
          total_edges: 3420 + Math.floor(Math.random() * 1000),
          cluster_count: 23 + Math.floor(Math.random() * 10),
          avg_connectivity: 0.68 + Math.random() * 0.32
        },
        fallback: true
      };
    }
  }

  /**
   * RAG-DAG 업데이트
   */
  async updateRAGDAG(userDid: string, conversationData: any): Promise<any> {
    try {
      return await this.post(`/api/rag-dag/${userDid}/update`, conversationData);
    } catch (error) {
      return {
        success: false,
        error: 'RAG-DAG update failed',
        processed_concepts: Math.floor(Math.random() * 5) + 1,
        new_connections: Math.floor(Math.random() * 3),
        fallback: true
      };
    }
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
        const health = await this.checkHealth();
        console.log(`💓 Health Check: ${health.connected ? '✅' : '❌'} ${health.mode}`);
        
        // 연결 복구 시 WebSocket 재연결
        if (health.connected && !this.websocket) {
          this.connectWebSocket();
        }

        // 통계 업데이트
        this.updateRequestStats(health.connected, health.responseTime || 0);
        
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
    this.requestStats.totalRequests++;
    this.requestStats.lastRequestTime = new Date().toISOString();
    
    if (success) {
      this.requestStats.successfulRequests++;
      const totalTime = this.requestStats.averageResponseTime * (this.requestStats.successfulRequests - 1) + responseTime;
      this.requestStats.averageResponseTime = totalTime / this.requestStats.successfulRequests;
    } else {
      this.requestStats.failedRequests++;
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
    const mockCredential = this.getOrCreateMockCredential();
    
    return {
      client: 'BackendAPIClient',
      config: this.config,
      sessionInfo,
      requestStats: stats,
      websocketState: this.websocket?.readyState,
      listenerCount: this.listeners.size,
      reconnectAttempts: this.reconnectAttempts,
      mockCredential,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // 🔧 Mock 데이터 생성 헬퍼들
  // ============================================================================

  /**
   * Mock 메시지 생성
   */
  private generateMockMessages(count: number): any[] {
    const messages = [];
    const sampleContents = [
      'CUE Protocol에 대해 설명해줘',
      'AI 개인화가 어떻게 작동하나요?',
      'RAG-DAG 시스템의 장점은 무엇인가요?',
      'WebAuthn 인증이 안전한 이유는?',
      '블록체인과 AI가 어떻게 결합되나요?'
    ];

    for (let i = 0; i < count; i++) {
      const isUser = i % 2 === 0;
      messages.push({
        id: `mock_msg_${i}`,
        userDid: 'mock_user_did',
        type: isUser ? 'user' : 'ai',
        content: isUser 
          ? sampleContents[i % sampleContents.length]
          : `AI 응답: ${sampleContents[i % sampleContents.length]}에 대한 상세한 설명입니다.`,
        timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
        model: isUser ? null : 'gpt-4o',
        cue_earned: isUser ? 0 : Math.floor(Math.random() * 10) + 1,
        quality_score: isUser ? null : 0.8 + Math.random() * 0.2
      });
    }

    return messages;
  }

  /**
   * Mock CUE 거래 내역 생성
   */
  private generateMockCueTransactions(count: number): any[] {
    const transactions = [];
    const activities = [
      'AI 채팅 마이닝', '고품질 대화 보너스', '연속 활동 보너스',
      '새로운 플랫폼 연결', 'RAG-DAG 기여', '데이터 볼트 업데이트',
      '친구 추천 보너스', '일일 로그인 보너스', '업적 달성 보너스'
    ];

    for (let i = 0; i < count; i++) {
      const isEarned = Math.random() > 0.2; // 80% earned, 20% spent
      transactions.push({
        id: `mock_tx_${i}`,
        userDid: 'mock_user_did',
        type: isEarned ? 'earned' : 'spent',
        amount: Math.floor(Math.random() * 20) + 1,
        activity: activities[Math.floor(Math.random() * activities.length)],
        description: isEarned ? '마이닝으로 획득' : '기능 사용으로 소모',
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        quality_score: isEarned ? 0.7 + Math.random() * 0.3 : null,
        platform: Math.random() > 0.5 ? 'ChatGPT' : 'Claude'
      });
    }

    return transactions.reverse(); // 최신순 정렬
  }
}

export default BackendAPIClient;