// ============================================================================
// 📁 frontend/src/lib/api-client.ts
// 🔗 통합 API 클라이언트 - Mock 완전 제거 + 모든 장점 통합
// 특징:
// - BackendAPIClient 기반으로 통합
// - Mock 완전 제거로 명확한 디버깅
// - 기존 구조와 100% 호환
// - useAuth 완전 지원
// - WebAuthn 통합 지원
// ============================================================================

'use client';

import { BackendAPIClient } from '../services/api/BackendAPIClient';

// WebAuthn 동적 로드
let startRegistration: any = null;
let startAuthentication: any = null;

const loadWebAuthn = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && !startRegistration) {
    try {
      const webauthn = await import('@simplewebauthn/browser');
      startRegistration = webauthn.startRegistration;
      startAuthentication = webauthn.startAuthentication;
      console.log('✅ WebAuthn 라이브러리 로드 성공');
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
      return false;
    }
  }
  return !!startRegistration;
};

export class UnifiedAPIClient extends BackendAPIClient {
  constructor() {
    super();
    console.log(`🔗 UnifiedAPIClient 통합 초기화`);
  }

  // ============================================================================
  // 🔐 WebAuthn 관련 메서드들 (기존 구조 완전 호환)
  // ============================================================================

  /**
   * WebAuthn 등록 시작 (useAuth 호환)
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<any> {
    console.log('🆕 WebAuthn 등록 시작');
    
    try {
      // 1. 서버에서 등록 옵션 받기
      const startResponse = await this.post('/api/auth/webauthn/register/start', {
        userEmail,
        userName: `PassKey_User_${Date.now()}`,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        }
      });

      if (!startResponse.success) {
        throw new Error(startResponse.message || 'Registration start failed');
      }

      console.log('✅ 등록 시작 성공:', startResponse.sessionId);

      // 2. WebAuthn 라이브러리 로드
      const loaded = await loadWebAuthn();
      let credential;

      if (!loaded) {
        throw new Error('WebAuthn이 지원되지 않는 환경입니다. 최신 브라우저를 사용해주세요.');
      }

      console.log('👆 생체인증 팝업 실행...');
      credential = await startRegistration(startResponse.options);
      console.log('✅ 생체인증 완료:', credential.id);

      // 3. 등록 완료
      console.log('📋 등록 완료 요청 전송');
      const completeResponse = await this.post('/api/auth/webauthn/register/complete', {
        credential,
        sessionId: startResponse.sessionId
      });

      if (completeResponse.success && completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
        console.log('💾 세션 토큰 저장 완료');
      }

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  /**
   * WebAuthn 로그인 (useAuth 호환)
   */
  async loginWithWebAuthn(userEmail?: string): Promise<any> {
    console.log('🔓 WebAuthn 로그인 시작');
    
    try {
      // 1. 서버에서 로그인 옵션 받기
      const startResponse = await this.post('/api/auth/webauthn/login/start', {
        userEmail
      });

      if (!startResponse.success) {
        throw new Error(startResponse.message || 'Login start failed');
      }

      console.log('✅ 로그인 시작 성공:', startResponse.sessionId);

      // 2. WebAuthn 라이브러리 로드
      const loaded = await loadWebAuthn();
      let credential;

      if (!loaded) {
        throw new Error('WebAuthn이 지원되지 않는 환경입니다. 최신 브라우저를 사용해주세요.');
      }

      console.log('👆 생체인증 팝업 실행...');
      credential = await startAuthentication(startResponse.options);
      console.log('✅ 생체인증 완료:', credential.id);

      // 3. 로그인 완료
      console.log('📋 로그인 완료 요청 전송');
      const completeResponse = await this.post('/api/auth/webauthn/login/complete', {
        credential,
        sessionId: startResponse.sessionId
      });

      if (completeResponse.success && completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
        console.log('💾 로그인 세션 토큰 저장 완료');
      }

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🤖 AI 관련 메서드들 (기존 구조 호환)
  // ============================================================================

  /**
   * AI 채팅 메시지 전송
   */
  async sendChatMessage(message: string, model: string, userDid: string): Promise<any> {
    try {
      console.log('🤖 AI 채팅 메시지 전송:', { model, message: message.substring(0, 50) + '...' });
      
      const response = await this.post('/api/ai/chat', {
        message,
        model,
        userDid,
        timestamp: new Date().toISOString()
      });

      console.log('✅ AI 응답 수신:', response.response?.substring(0, 100) + '...');
      return response;

    } catch (error: any) {
      console.error('💥 AI 채팅 실패:', error);
      throw new Error(`AI 채팅 서비스에 연결할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * AI 모델 목록 조회
   */
  async getAvailableModels(): Promise<any> {
    try {
      return await this.get('/api/ai/models');
    } catch (error: any) {
      console.error('💥 AI 모델 목록 조회 실패:', error);
      throw new Error(`AI 모델 정보를 가져올 수 없습니다: ${error.message}`);
    }
  }

  // ============================================================================
  // 💎 CUE 관련 메서드들 (기존 구조 호환)
  // ============================================================================

  /**
   * CUE 마이닝
   */
  async mineCUE(userDid: string, activity: string, messageContent?: string): Promise<any> {
    try {
      console.log('💎 CUE 마이닝 실행:', { userDid, activity });
      
      const response = await this.post('/api/cue/mine', {
        userDid,
        activity,
        messageContent,
        timestamp: new Date().toISOString()
      });

      console.log('✅ CUE 마이닝 완료:', response.amount);
      return response;

    } catch (error: any) {
      console.error('💥 CUE 마이닝 실패:', error);
      throw new Error(`CUE 마이닝에 실패했습니다: ${error.message}`);
    }
  }

  /**
   * CUE 잔액 조회
   */
  async getCueBalance(userDid: string): Promise<any> {
    try {
      return await this.get(`/api/cue/balance/${userDid}`);
    } catch (error: any) {
      console.error('💥 CUE 잔액 조회 실패:', error);
      throw new Error(`CUE 잔액을 조회할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * CUE 거래 내역 조회
   */
  async getCueTransactions(userDid: string, limit: number = 20): Promise<any> {
    try {
      return await this.get(`/api/cue/transactions/${userDid}?limit=${limit}`);
    } catch (error: any) {
      console.error('💥 CUE 거래 내역 조회 실패:', error);
      throw new Error(`CUE 거래 내역을 조회할 수 없습니다: ${error.message}`);
    }
  }

  // ============================================================================
  // 🎫 패스포트 관련 메서드들 (기존 구조 호환)
  // ============================================================================

  /**
   * 패스포트 데이터 로드
   */
  async loadPassport(did: string): Promise<any> {
    try {
      console.log('🎫 패스포트 데이터 로드:', did);
      
      const response = await this.get(`/api/passport/${did}`);
      
      console.log('✅ 패스포트 로드 완료:', response.username);
      return response;

    } catch (error: any) {
      console.error('💥 패스포트 로드 실패:', error);
      throw new Error(`패스포트 데이터를 로드할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * 패스포트 업데이트
   */
  async updatePassport(did: string, updates: any): Promise<any> {
    try {
      console.log('🎫 패스포트 업데이트:', did);
      
      const response = await this.put(`/api/passport/${did}`, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      console.log('✅ 패스포트 업데이트 완료');
      return response;

    } catch (error: any) {
      console.error('💥 패스포트 업데이트 실패:', error);
      throw new Error(`패스포트를 업데이트할 수 없습니다: ${error.message}`);
    }
  }

  // ============================================================================
  // 🔗 플랫폼 연결 관련 메서드들
  // ============================================================================

  /**
   * 연결된 플랫폼 조회
   */
  async getConnectedPlatforms(userDid: string): Promise<any> {
    try {
      return await this.get(`/api/platforms/${userDid}`);
    } catch (error: any) {
      console.error('💥 연결된 플랫폼 조회 실패:', error);
      throw new Error(`연결된 플랫폼 정보를 조회할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * 플랫폼 연결
   */
  async connectPlatform(userDid: string, platform: string, credentials: any): Promise<any> {
    try {
      console.log('🔗 플랫폼 연결:', platform);
      
      const response = await this.post('/api/platforms/connect', {
        userDid,
        platform,
        credentials,
        connected_at: new Date().toISOString()
      });

      console.log('✅ 플랫폼 연결 완료:', platform);
      return response;

    } catch (error: any) {
      console.error('💥 플랫폼 연결 실패:', error);
      throw new Error(`플랫폼 연결에 실패했습니다: ${error.message}`);
    }
  }

  /**
   * 플랫폼 연결 해제
   */
  async disconnectPlatform(userDid: string, platform: string): Promise<any> {
    try {
      console.log('🔌 플랫폼 연결 해제:', platform);
      
      const response = await this.delete(`/api/platforms/${userDid}/${platform}`);

      console.log('✅ 플랫폼 연결 해제 완료:', platform);
      return response;

    } catch (error: any) {
      console.error('💥 플랫폼 연결 해제 실패:', error);
      throw new Error(`플랫폼 연결 해제에 실패했습니다: ${error.message}`);
    }
  }

  // ============================================================================
  // 🗂️ 데이터 볼트 관련 메서드들
  // ============================================================================

  /**
   * 데이터 볼트 조회
   */
  async getDataVaults(userDid: string): Promise<any> {
    try {
      return await this.get(`/api/vaults/${userDid}`);
    } catch (error: any) {
      console.error('💥 데이터 볼트 조회 실패:', error);
      throw new Error(`데이터 볼트를 조회할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * 데이터 볼트 업데이트
   */
  async updateDataVault(userDid: string, vaultId: string, data: any): Promise<any> {
    try {
      console.log('🗂️ 데이터 볼트 업데이트:', vaultId);
      
      const response = await this.put(`/api/vaults/${userDid}/${vaultId}`, {
        ...data,
        updated_at: new Date().toISOString()
      });

      console.log('✅ 데이터 볼트 업데이트 완료');
      return response;

    } catch (error: any) {
      console.error('💥 데이터 볼트 업데이트 실패:', error);
      throw new Error(`데이터 볼트 업데이트에 실패했습니다: ${error.message}`);
    }
  }

  // ============================================================================
  // 🧠 RAG-DAG 관련 메서드들
  // ============================================================================

  /**
   * RAG-DAG 통계 조회
   */
  async getRAGDAGStats(userDid: string): Promise<any> {
    try {
      return await this.get(`/api/rag-dag/${userDid}/stats`);
    } catch (error: any) {
      console.error('💥 RAG-DAG 통계 조회 실패:', error);
      throw new Error(`RAG-DAG 통계를 조회할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * RAG-DAG 업데이트
   */
  async updateRAGDAG(userDid: string, conversationData: any): Promise<any> {
    try {
      console.log('🧠 RAG-DAG 업데이트');
      
      const response = await this.post(`/api/rag-dag/${userDid}/update`, {
        ...conversationData,
        timestamp: new Date().toISOString()
      });

      console.log('✅ RAG-DAG 업데이트 완료');
      return response;

    } catch (error: any) {
      console.error('💥 RAG-DAG 업데이트 실패:', error);
      throw new Error(`RAG-DAG 업데이트에 실패했습니다: ${error.message}`);
    }
  }

  // ============================================================================
  // 💬 메시지 관련 메서드들
  // ============================================================================

  /**
   * 메시지 조회
   */
  async getMessages(userDid: string, limit: number = 50, offset: number = 0): Promise<any> {
    try {
      return await this.get(`/api/messages/${userDid}?limit=${limit}&offset=${offset}`);
    } catch (error: any) {
      console.error('💥 메시지 조회 실패:', error);
      throw new Error(`메시지를 조회할 수 없습니다: ${error.message}`);
    }
  }

  /**
   * 메시지 저장
   */
  async saveMessage(userDid: string, message: any): Promise<any> {
    try {
      const response = await this.post('/api/messages', {
        userDid,
        ...message,
        saved_at: new Date().toISOString()
      });

      return response;

    } catch (error: any) {
      console.error('💥 메시지 저장 실패:', error);
      throw new Error(`메시지 저장에 실패했습니다: ${error.message}`);
    }
  }

  // ============================================================================
  // 🎯 고급 기능들 (새 버전의 장점)
  // ============================================================================

  /**
   * 실시간 모니터링 시작 (useAuth 호환)
   */
  async startRealtimeMonitoring(userDid: string): Promise<() => void> {
    console.log('📡 실시간 모니터링 시작:', userDid);
    
    return super.startRealtimeMonitoring(userDid);
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
  // 🔧 유틸리티 메서드들 (기존 구조 완전 호환)
  // ============================================================================

  /**
   * 세션 ID 조회 (호환성)
   */
  getSessionId(): string | null {
    return this.getSessionToken();
  }

  /**
   * 세션 ID 저장 (호환성)
   */
  setSessionId(sessionId: string): void {
    this.setSessionToken(sessionId);
  }

  /**
   * 세션 정리 (호환성)
   */
  clearSession(): void {
    this.clearSessionToken();
  }

  /**
   * 디버그 정보 (확장된 버전)
   */
  getDebugInfo(): any {
    const baseInfo = super.getDebugInfo();
    
    return {
      ...baseInfo,
      client: 'UnifiedAPIClient',
      webAuthnSupported: !!startRegistration,
      features: {
        webAuthn: true,
        realtime: true,
        monitoring: true,
        fileUpload: true,
        advancedAuth: true
      }
    };
  }
}

// ============================================================================
// 🚀 싱글톤 인스턴스 export (useAuth에서 사용)
// ============================================================================

export const apiClient = new UnifiedAPIClient();
export default apiClient;