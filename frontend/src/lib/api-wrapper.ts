// ============================================================================
// 📁 src/lib/api-wrapper.ts  
// 🔧 기존 API들을 보존하면서 에러만 수정하는 Wrapper
// ============================================================================

// 기존 API 클라이언트들 그대로 import
import { PersistentDataAPIClient } from '../services/api/PersistentDataAPIClient';
import { BackendAPIClient } from '../services/api/BackendAPIClient';
import { ChatAPI } from '../services/api/ChatAPI';
import { CueAPI } from '../services/api/CueAPI';
import { PassportAPI } from '../services/api/PassportAPI';
import { WebAuthnAPI } from '../services/api/WebAuthnAPI';

// 안전한 타입 정의 (기존 타입 확장)
import { 
  User as ExistingUser,
  AIPassport as ExistingAIPassport,
  safePassportAccess,
  createMockPassport,
  createMockUser
} from '../types/unified.types';

// ============================================================================
// 🛡️ 기존 API들을 감싸는 안전한 Wrapper 클래스
// ============================================================================

export class EnhancedAPIWrapper {
  // 기존 API 클라이언트들을 그대로 사용
  private persistentClient: PersistentDataAPIClient;
  private backendClient: BackendAPIClient;
  private chatAPI: ChatAPI;
  private cueAPI: CueAPI;  
  private passportAPI: PassportAPI;
  private webauthnAPI: WebAuthnAPI;

  constructor() {
    // 기존 클라이언트들 초기화 (변경 없음)
    this.persistentClient = new PersistentDataAPIClient();
    this.backendClient = new BackendAPIClient();
    this.chatAPI = new ChatAPI();
    this.cueAPI = new CueAPI();
    this.passportAPI = new PassportAPI();
    this.webauthnAPI = new WebAuthnAPI();

    console.log('🔗 Enhanced API Wrapper 초기화 - 기존 API들 보존');
  }

  // ============================================================================
  // 🔧 기존 메서드들을 그대로 노출 (Proxy 패턴)
  // ============================================================================

  // WebAuthn 관련 (기존 메서드 그대로)
  async startWebAuthnRegistration() {
    try {
      return await this.persistentClient.startWebAuthnRegistration();
    } catch (error) {
      console.error('WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  async restoreSession() {
    try {
      return await this.persistentClient.restoreSession();
    } catch (error) {
      console.error('세션 복원 실패:', error);
      return { success: false };
    }
  }

  async logout() {
    try {
      return await this.persistentClient.logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
      return { success: true }; // 로컬에서라도 로그아웃 처리
    }
  }

  // 채팅 관련 (기존 ChatAPI 사용)
  async sendChatMessage(message: string, model: string, userDid?: string) {
    try {
      return await this.chatAPI.sendChatMessage(message, model, userDid);
    } catch (error) {
      console.warn('채팅 API 실패, PersistentClient로 폴백:', error);
      return await this.persistentClient.sendChatMessage(message, model, userDid);
    }
  }

  // CUE 관련 (기존 CueAPI 사용)
  async mineCUE(userDid: string, activity: string) {
    try {
      return await this.cueAPI.mineCUE(userDid, activity);
    } catch (error) {
      console.warn('CUE API 실패, PersistentClient로 폴백:', error);
      return await this.persistentClient.mineCUE(userDid, activity);
    }
  }

  // ============================================================================
  // 🛡️ 안전한 패스포트 로드 (에러 방지 핵심!)
  // ============================================================================

  async loadPassport(did: string): Promise<ExistingAIPassport> {
    try {
      console.log('📋 패스포트 로드 시도:', did);
      
      // 1차: 기존 PassportAPI 시도
      let passportData = await this.passportAPI.getPassport(did);
      
      // 2차: 데이터 안전성 검증 및 정규화
      return this.normalizePassportData(passportData, did);
      
    } catch (error) {
      console.warn('⚠️ 패스포트 API 실패, Mock 데이터로 폴백:', error);
      
      // 3차: Mock 데이터 생성 (항상 안전한 데이터)
      return createMockPassport(did, 'MockUser');
    }
  }

  /**
   * 🛡️ 패스포트 데이터 정규화 - 모든 undefined 방지
   */
  private normalizePassportData(data: any, did: string): ExistingAIPassport {
    if (!data) {
      console.warn('패스포트 데이터가 null/undefined, Mock 생성');
      return createMockPassport(did, 'MockUser');
    }

    // 필수 필드들 안전하게 설정
    const normalized: ExistingAIPassport = {
      did: data.did || did,
      username: data.username || 'Unknown User',
      trustScore: this.safeNumber(data.trustScore || data.trust_score, 85),
      passportLevel: data.passportLevel || data.passport_level || 'Verified Agent',
      cueBalance: this.safeNumber(data.cueBalance || data.cue_tokens, 15428),
      totalMined: this.safeNumber(data.totalMined || data.total_mined, 25000), // 🔑 핵심!
      
      // 배열들은 항상 빈 배열로 초기화 (🔑 핵심!)
      dataVaults: Array.isArray(data.dataVaults) ? data.dataVaults : [],
      connectedPlatforms: Array.isArray(data.connectedPlatforms) ? data.connectedPlatforms : [],
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
      
      // 객체들은 기본값 제공
      personalityProfile: data.personalityProfile || {
        traits: [],
        communicationStyle: 'friendly',
        expertise: []
      },
      
      ragDagStats: data.ragDagStats || {
        learnedConcepts: 0,
        connectionStrength: 0,
        lastLearningActivity: new Date().toISOString(),
        knowledgeNodes: 0,
        personalityAccuracy: 0
      },
      
      createdAt: data.createdAt || data.created_at || new Date().toISOString()
    };

    console.log('✅ 패스포트 데이터 정규화 완료:', {
      did: normalized.did,
      totalMined: normalized.totalMined,
      dataVaultsLength: normalized.dataVaults?.length || 0
    });

    return normalized;
  }

  /**
   * 🔢 숫자 값 안전 처리
   */
  private safeNumber(value: any, defaultValue: number): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  }

  // ============================================================================
  // 🔧 기존 메서드들 그대로 노출
  // ============================================================================

  // 연결 상태 확인
  async checkHealth() {
    try {
      return await this.persistentClient.checkHealth();
    } catch (error) {
      return { 
        connected: false, 
        mode: 'mock' as const,
        error: error.message 
      };
    }
  }

  // WebSocket 연결
  connectWebSocket() {
    try {
      this.persistentClient.connectWebSocket();
    } catch (error) {
      console.warn('WebSocket 연결 실패:', error);
    }
  }

  // 실시간 업데이트 리스너
  onRealtimeUpdate(callback: (data: any) => void) {
    return this.persistentClient.onRealtimeUpdate(callback);
  }

  // 클린업
  cleanup() {
    try {
      this.persistentClient.cleanup?.();
    } catch (error) {
      console.warn('클린업 실패:', error);
    }
  }

  // ============================================================================
  // 🎯 기존 API들에 직접 접근 (필요한 경우)
  // ============================================================================

  get persistent() {
    return this.persistentClient;
  }

  get backend() {
    return this.backendClient;
  }

  get chat() {
    return this.chatAPI;
  }

  get cue() {
    return this.cueAPI;
  }

  get passport() {
    return this.passportAPI;
  }

  get webauthn() {
    return this.webauthnAPI;
  }
}

// ============================================================================
// 🔧 기존 함수들 re-export (호환성 유지)
// ============================================================================

// 기존에 사용하던 함수들 그대로 노출
export { checkWebAuthnSupport } from '../services/api/PersistentDataAPIClient';
export { safePassportAccess, createMockPassport, createMockUser } from '../types/unified.types';

// 기본 export
export default EnhancedAPIWrapper;