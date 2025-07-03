// ============================================================================
// 📁 frontend/src/lib/unified-api.ts
// 🔧 기존 API들을 통합하는 레이어 (기존 구조 그대로 활용)
// ============================================================================

// 기존 API 클라이언트들 재사용
import { PersistentDataAPIClient } from '../services/api/PersistentDataAPIClient';
import { BackendAPIClient } from '../services/api/BackendAPIClient';
import { ChatAPI } from '../services/api/ChatAPI';
import { CueAPI } from '../services/api/CueAPI';
import { PassportAPI } from '../services/api/PassportAPI';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';

// 기존 타입들 재사용
import { 
  User, 
  ChatResponse, 
  AIPassport 
} from '../types/unified.types';

/**
 * 🎯 기존 API들을 하나로 통합하는 Facade 패턴
 * - 기존 구현은 그대로 유지
 * - 사용하기 쉬운 단일 인터페이스 제공
 */
export class UnifiedAPIClient {
  // 기존 클라이언트들을 그대로 활용
  private persistent: PersistentDataAPIClient;
  private backend: BackendAPIClient;
  private chat: ChatAPI;
  private cue: CueAPI;
  private passport: PassportAPI;
  private webauthn: WebAuthnAPI;

  constructor() {
    // 기존 구현 그대로 초기화
    this.persistent = new PersistentDataAPIClient();
    this.backend = new BackendAPIClient();
    this.chat = new ChatAPI();
    this.cue = new CueAPI();
    this.passport = new PassportAPI();
    this.webauthn = new WebAuthnAPI();

    console.log('🔗 UnifiedAPIClient 초기화 - 기존 API들 통합');
  }

  // ============================================================================
  // 🔐 인증 관련 (기존 구현 활용)
  // ============================================================================

  /**
   * WebAuthn 등록 시작 (기존 구현 그대로)
   */
  async startRegistration() {
    return this.persistent.startWebAuthnRegistration();
  }

  /**
   * 세션 복원 (기존 구현 그대로)  
   */
  async restoreSession() {
    return this.persistent.restoreSession();
  }

  /**
   * 로그아웃 (기존 구현 그대로)
   */
  async logout() {
    return this.persistent.logout();
  }

  // ============================================================================
  // 💬 채팅 관련 (기존 ChatAPI 활용)
  // ============================================================================

  /**
   * AI 채팅 (기존 구현 + 향상된 에러 처리)
   */
  async sendMessage(message: string, model: string = 'gpt-4o', userDid?: string): Promise<ChatResponse> {
    try {
      // 먼저 기존 chat API 사용
      return await this.chat.sendMessage(message, model, userDid);
    } catch (error) {
      console.warn('ChatAPI 실패, PersistentDataAPIClient로 폴백');
      // 폴백으로 persistent API 사용
      return await this.persistent.sendChatMessage(message, model, userDid);
    }
  }

  /**
   * 스트리밍 채팅 (기존 구현 활용)
   */
  async sendStreamingMessage(
    message: string, 
    options: {
      model?: string;
      userDid?: string;
      onChunk?: (chunk: string) => void;
      onComplete?: (response: ChatResponse) => void;
    } = {}
  ) {
    return this.chat.sendStreamingMessage(message, options);
  }

  // ============================================================================
  // 💰 CUE 토큰 관련 (기존 CueAPI 활용)
  // ============================================================================

  /**
   * CUE 잔액 조회 (기존 구현 그대로)
   */
  async getCueBalance(userDid: string) {
    return this.cue.getBalance(userDid);
  }

  /**
   * CUE 마이닝 (기존 구현 그대로)
   */
  async mineTokens(userDid: string, amount: number, description: string) {
    return this.cue.mineTokens(userDid, amount, description);
  }

  /**
   * 거래 내역 조회 (기존 구현 그대로)
   */
  async getTransactionHistory(userDid: string, limit: number = 20) {
    return this.cue.getTransactionHistory(userDid, limit);
  }

  // ============================================================================
  // 🎫 패스포트 관련 (기존 PassportAPI 활용)
  // ============================================================================

  /**
   * 패스포트 조회 (기존 구현 그대로)
   */
  async getPassport(userDid: string): Promise<AIPassport> {
    return this.passport.getPassport(userDid);
  }

  /**
   * 패스포트 업데이트 (기존 구현 그대로)
   */
  async updatePassport(userDid: string, updates: Partial<AIPassport>) {
    return this.passport.updatePassport(userDid, updates);
  }

  // ============================================================================
  // 🔄 실시간 업데이트 (기존 WebSocket 활용)
  // ============================================================================

  /**
   * WebSocket 연결 (기존 구현 그대로)
   */
  connectWebSocket() {
    return this.persistent.connectWebSocket();
  }

  /**
   * 실시간 이벤트 구독 (기존 구현 그대로)
   */
  subscribeToUpdates(event: string, callback: (data: any) => void) {
    return this.persistent.subscribeToUpdates(event, callback);
  }

  // ============================================================================
  // 🎯 기존 API에 직접 접근 (필요한 경우)
  // ============================================================================

  /**
   * 기존 API 클라이언트들에 직접 접근 가능
   */
  get apis() {
    return {
      persistent: this.persistent,
      backend: this.backend,
      chat: this.chat,
      cue: this.cue,
      passport: this.passport,
      webauthn: this.webauthn
    };
  }

  // ============================================================================
  // 🔧 시스템 상태 (기존 구현 통합)
  // ============================================================================

  /**
   * 전체 시스템 상태 체크
   */
  async getSystemStatus() {
    try {
      const [
        backendHealth,
        sessionStatus,
        webSocketStatus
      ] = await Promise.allSettled([
        this.backend.checkHealth(),
        this.persistent.checkSessionStatus(),
        this.persistent.getWebSocketStatus()
      ]);

      return {
        backend: backendHealth.status === 'fulfilled' ? backendHealth.value : null,
        session: sessionStatus.status === 'fulfilled' ? sessionStatus.value : null,
        websocket: webSocketStatus.status === 'fulfilled' ? webSocketStatus.value : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('시스템 상태 체크 실패:', error);
      return {
        error: 'System status check failed',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// ============================================================================
// 🎯 기존 컴포넌트들과의 호환성을 위한 export
// ============================================================================

// 싱글톤 인스턴스 (기존 사용 패턴 유지)
export const apiClient = new UnifiedAPIClient();

// 기존 import 방식도 지원
export { PersistentDataAPIClient };
export { BackendAPIClient };
export { ChatAPI };
export { CueAPI };
export { PassportAPI };
export { WebAuthnAPI };

// 기본 export는 UnifiedAPIClient
export default UnifiedAPIClient;