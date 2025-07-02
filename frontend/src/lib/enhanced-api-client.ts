// ============================================================================
// 📁 src/lib/enhanced-api-client.ts
// 🔧 개선된 통합 API 클라이언트 - 안정성과 에러 처리 강화
// ============================================================================

import { 
  User, 
  AIPassport, 
  Message, 
  ConnectionStatus, 
  createMockPassport, 
  createMockUser,
  safePassportAccess 
} from '../types/unified.types';

// WebAuthn 라이브러리 동적 로드
let startRegistration: any = null;
let startAuthentication: any = null;

export const loadWebAuthn = async (): Promise<boolean> => {
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

export const checkWebAuthnSupport = () => {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering' };
  }
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'WebAuthn을 지원하지 않는 브라우저입니다.' };
  }
  return { supported: true };
};

export class EnhancedAPIClient {
  private baseURL: string;
  private websocket: WebSocket | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();
  private mockCredentialKey = 'cue_mock_credential';
  private requestId = 0;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log(`🔗 EnhancedAPIClient 초기화: ${this.baseURL}`);
  }

  // ============================================================================
  // 🔧 기본 HTTP 요청 메서드
  // ============================================================================

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const requestId = ++this.requestId;
    const url = `${this.baseURL}${endpoint}`;
    const sessionToken = this.getStoredSessionToken();
    
    console.log(`📞 API 요청 #${requestId}:`, {
      endpoint,
      method: options.method || 'GET',
      hasToken: !!sessionToken
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` }),
          ...options.headers
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        // 401 에러 시 토큰 삭제
        if (response.status === 401) {
          this.clearStoredTokens();
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ API 성공 #${requestId}:`, { endpoint, hasData: !!data });
      return data;

    } catch (error: any) {
      console.error(`❌ API 실패 #${requestId}:`, { endpoint, error: error.message });
      throw error;
    }
  }

  // ============================================================================
  // 🔧 토큰 관리
  // ============================================================================

  private getStoredSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cue_session_token');
  }

  private setSessionToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('cue_session_token', token);
    localStorage.setItem('cue_session_id', `session_${Date.now()}`);
  }

  private clearStoredTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('cue_session_token');
    localStorage.removeItem('cue_session_id');
  }

  // ============================================================================
  // 🔧 Mock 패스키 관리 (영구 저장)
  // ============================================================================

  private getOrCreateMockCredential() {
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
        return JSON.parse(existingCred);
      }

      // 디바이스 고유 fingerprint 생성
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
      console.log('🆕 새 Mock 패스키 생성:', credentialId);
      
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

  // ============================================================================
  // 🔧 WebAuthn 인증
  // ============================================================================

  async startWebAuthnRegistration(): Promise<any> {
    console.log('🚀 WebAuthn 등록 시작');

    try {
      // 1. 등록 시작 요청
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
      }).catch(() => ({
        success: true,
        sessionId: `mock_${Date.now()}`,
        options: { challenge: btoa(Math.random().toString()) }
      }));

      // 2. WebAuthn 실행 또는 Mock 사용
      const loaded = await loadWebAuthn();
      let credential;

      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 패스키 사용');
        credential = this.getOrCreateMockCredential();
      } else {
        try {
          credential = await startRegistration(startResponse.options);
        } catch (webauthnError) {
          console.error('❌ WebAuthn 실행 실패, Mock으로 폴백:', webauthnError);
          credential = this.getOrCreateMockCredential();
        }
      }

      // 3. 등록 완료 요청
      const completeResponse = await this.request('/api/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({ 
          credential, 
          sessionId: startResponse.sessionId 
        })
      }).catch(() => {
        // Mock 응답 생성
        const isExisting = Math.random() > 0.3;
        return {
          success: true,
          sessionId: `perm_${Date.now()}`,
          sessionToken: `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          isExistingUser: isExisting,
          action: isExisting ? 'login' : 'register',
          user: isExisting 
            ? { ...createMockUser('ExistingAgent'), id: 'existing_user_123', cueBalance: 8750 + Math.floor(Math.random() * 5000) }
            : createMockUser(),
          message: isExisting 
            ? '기존 계정으로 로그인되었습니다.' 
            : '새로운 AI Passport가 생성되었습니다!'
        };
      });

      // 세션 토큰 저장
      if (completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
      }

      return completeResponse;

    } catch (error) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔧 세션 복원
  // ============================================================================

  async restoreSession(): Promise<any> {
    console.log('🔧 세션 복원 시도');
    
    const sessionToken = this.getStoredSessionToken();
    if (!sessionToken) {
      console.log('❌ 저장된 세션 토큰 없음');
      return { success: false };
    }

    try {
      const response = await this.request('/api/auth/session/restore', {
        method: 'POST',
        body: JSON.stringify({ sessionToken })
      }).catch(() => {
        // Mock 세션 복원
        if (Math.random() > 0.3) {
          return {
            success: true,
            user: {
              ...createMockUser('RestoredAgent'),
              id: 'restored_user_123',
              cueBalance: 8750 + Math.floor(Math.random() * 5000)
            }
          };
        }
        return { success: false, error: 'No valid session found' };
      });

      return response;

    } catch (error) {
      console.error('💥 세션 복원 오류:', error);
      this.clearStoredTokens();
      return { success: false };
    }
  }

  // ============================================================================
  // 🔧 로그아웃
  // ============================================================================

  async logout(): Promise<any> {
    console.log('🔧 로그아웃 처리');
    
    try {
      await this.request('/api/auth/logout', { method: 'POST' }).catch(() => {
        console.warn('서버 로그아웃 실패, 로컬 토큰만 삭제');
      });
    } finally {
      this.clearStoredTokens();
    }

    return { success: true };
  }

  // ============================================================================
  // 🔧 AI 채팅
  // ============================================================================

  async sendChatMessage(message: string, model: string, userDid?: string): Promise<any> {
    try {
      const response = await this.request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, model, userDid })
      });

      return response;

    } catch (error) {
      // Mock AI 응답
      const responses = [
        "안녕하세요! CUE Protocol에서 개인화된 AI 어시스턴트입니다. 어떻게 도와드릴까요?",
        "흥미로운 질문이네요! 개인화 데이터를 기반으로 맞춤형 답변을 준비하고 있습니다.",
        "데이터 볼트에서 관련 정보를 찾고 있습니다. 잠시만 기다려주세요.",
        "WebAuthn 인증을 통해 안전하게 저장된 개인 정보를 활용하여 답변드리겠습니다.",
        "CUE Protocol의 개인화 AI를 통해 더 나은 서비스를 제공하겠습니다."
      ];
      
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      return {
        success: true,
        response: responses[Math.floor(Math.random() * responses.length)],
        model,
        timestamp: new Date().toISOString(),
        cueReward: Math.floor(Math.random() * 15) + 5,
        trustScore: 0.85 + Math.random() * 0.15,
        contextLearned: Math.random() > 0.7,
        qualityScore: 0.8 + Math.random() * 0.2,
        processingTime: Math.floor(Math.random() * 2000) + 500,
        tokensUsed: Math.floor(Math.random() * 150) + 50
      };
    }
  }

  // ============================================================================
  // 🔧 패스포트 관리 (안전한 접근)
  // ============================================================================

  async loadPassport(did: string): Promise<AIPassport> {
    try {
      const response = await this.request(`/api/passport/${did}`);
      return this.normalizePassportData(response);

    } catch (error) {
      console.warn('패스포트 로드 실패, Mock 데이터 사용:', error);
      return createMockPassport(did);
    }
  }

  private normalizePassportData(data: any): AIPassport {
    // 안전한 데이터 정규화
    return {
      did: data.did || `did:cue:${Date.now()}`,
      username: data.username || 'Unknown User',
      trustScore: data.trustScore || data.trust_score || 85,
      passportLevel: data.passportLevel || data.passport_level || 'Verified Agent',
      cueBalance: data.cueBalance || data.cue_tokens || 15428,
      totalMined: data.totalMined || data.total_mined || 25000, // 항상 기본값 제공
      
      // 배열들은 빈 배열로 기본값 설정
      dataVaults: Array.isArray(data.dataVaults) ? data.dataVaults : [],
      connectedPlatforms: Array.isArray(data.connectedPlatforms) ? data.connectedPlatforms : [],
      achievements: Array.isArray(data.achievements) ? data.achievements : [],
      recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
      
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
  }

  // ============================================================================
  // 🔧 CUE 마이닝
  // ============================================================================

  async mineCUE(userDid: string, activity: string): Promise<any> {
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

  // ============================================================================
  // 🔧 연결 상태 확인
  // ============================================================================

  async checkHealth(): Promise<ConnectionStatus> {
    try {
      const response = await this.request('/health');
      return { 
        connected: true, 
        mode: 'real', 
        status: 'Connected',
        timestamp: new Date().toISOString(),
        service: 'CUE Protocol API',
        version: '1.0.0',
        ...response 
      };
    } catch (error: any) {
      return { 
        connected: false, 
        mode: 'mock', 
        status: 'Mock Mode',
        timestamp: new Date().toISOString(),
        service: 'CUE Protocol API',
        version: '1.0.0',
        error: error.message 
      };
    }
  }

  // ============================================================================
  // 🔧 WebSocket 관리
  // ============================================================================

  connectWebSocket(): void {
    try {
      const wsURL = this.baseURL.replace('http', 'ws');
      this.websocket = new WebSocket(wsURL);
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach(callback => callback(data));
        } catch (error) {
          console.error('WebSocket 메시지 파싱 실패:', error);
        }
      };

      this.websocket.onopen = () => {
        console.log('✅ WebSocket 연결됨');
      };

      this.websocket.onerror = (error) => {
        console.warn('⚠️ WebSocket 에러:', error);
      };

    } catch (error) {
      console.warn('WebSocket 연결 실패, HTTP 폴백 사용:', error);
    }
  }

  onRealtimeUpdate(callback: (data: any) => void): () => void {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  cleanup(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.listeners.clear();
  }
}