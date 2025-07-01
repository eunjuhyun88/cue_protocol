// ============================================================================
// 🔌 Final0626 프론트엔드 API 클라이언트 (완전 통합 버전)
// 경로: frontend/src/lib/api.ts
// 용도: 백엔드 API와의 모든 통신 처리
// ============================================================================

// WebAuthn 타입 정의
interface WebAuthnRegistrationOptions {
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ alg: number; type: string }>;
  timeout: number;
  attestation: string;
  authenticatorSelection: {
    authenticatorAttachment: string;
    userVerification: string;
    residentKey: string;
  };
}

interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  userVerification: string;
}

// API 응답 타입
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// 사용자 타입
interface User {
  id: string;
  did: string;
  username: string;
  email?: string;
  wallet_address?: string;
  cueBalance?: number;
  trustScore?: number;
  passportLevel?: string;
  created_at?: string;
  last_login_at?: string;
}

// 채팅 관련 타입
interface ChatResponse {
  success: boolean;
  response: string;
  cueEarned: number;
  model: string;
  conversationId: string;
  timestamp: string;
}

// CUE 관련 타입
interface CUEBalance {
  success: boolean;
  balance: number;
  did: string;
  timestamp: string;
}

interface CUETransaction {
  id: string;
  user_did: string;
  transaction_type: 'mining' | 'spending' | 'reward' | 'transfer';
  amount: number;
  status: string;
  source: string;
  description: string;
  created_at: string;
  metadata?: any;
}

// Passport 타입
interface AIPassport {
  id: string;
  did: string;
  passport_level: string;
  registration_status: string;
  trust_score: number;
  biometric_verified: boolean;
  personality_profile: any;
  total_interactions: number;
  created_at: string;
  updated_at: string;
}

export class Final0626APIClient {
  private baseURL: string;
  private headers: Record<string, string>;
  
  constructor() {
    // 환경에 따른 API URL 설정
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // 브라우저 환경에서만 Origin 헤더 추가
    if (typeof window !== 'undefined') {
      this.headers['Origin'] = window.location.origin;
    }
    
    console.log(`🔗 API Client initialized: ${this.baseURL}`);
  }

  // ============================================================================
  // 💡 유틸리티 메서드
  // ============================================================================

  private async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        },
        mode: 'cors',
        credentials: 'include'
      });

      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP Error: ${response.status}`, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response Success:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ API Error (${endpoint}):`, error);
      
      // 네트워크 오류 처리
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`네트워크 연결 오류: 백엔드 서버(${this.baseURL})에 연결할 수 없습니다.`);
      }
      
      throw error;
    }
  }

  // 백엔드 연결 상태 확인
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('/health');
      return response.status === 'healthy';
    } catch (error) {
      console.warn('⚠️ Backend connection check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // 🔐 WebAuthn 인증 메서드
  // ============================================================================

  // WebAuthn 라이브러리 동적 로드
  private async loadWebAuthn() {
    if (typeof window === 'undefined') {
      throw new Error('WebAuthn is only available in browser environment');
    }

    try {
      const webauthn = await import('@simplewebauthn/browser');
      return {
        startRegistration: webauthn.startRegistration,
        startAuthentication: webauthn.startAuthentication
      };
    } catch (error) {
      console.error('❌ WebAuthn library load failed:', error);
      throw new Error('WebAuthn library not available. Please install @simplewebauthn/browser');
    }
  }

  // 패스키 회원가입
  async signUpWithPasskey(userEmail?: string, deviceInfo: any = {}): Promise<User> {
    try {
      console.log('🆕 Starting passkey registration...');
      
      // 1. 등록 시작 요청
      const startResponse = await this.request<{
        success: boolean;
        options: WebAuthnRegistrationOptions;
        sessionId: string;
        user: { id: string; username: string; email?: string };
      }>('/api/auth/webauthn/register/start', {
        method: 'POST',
        body: JSON.stringify({ userEmail, deviceInfo })
      });

      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Failed to start registration');
      }

      console.log('✅ Registration options received');

      // 2. WebAuthn 라이브러리 로드 및 등록 수행
      const { startRegistration } = await this.loadWebAuthn();
      
      console.log('🔐 Starting WebAuthn registration ceremony...');
      const credential = await startRegistration(startResponse.options);
      console.log('✅ WebAuthn registration completed');

      // 3. 등록 완료 요청
      const finishResponse = await this.request<{
        success: boolean;
        user: User;
        message: string;
      }>('/api/auth/webauthn/register/finish', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      if (!finishResponse.success) {
        throw new Error(finishResponse.error || 'Registration verification failed');
      }

      console.log('🎉 Registration completed successfully!');
      return finishResponse.user;

    } catch (error: any) {
      console.error('❌ Passkey registration failed:', error);
      
      // 사용자 친화적 오류 메시지
      if (error.name === 'NotSupportedError') {
        throw new Error('이 브라우저는 패스키를 지원하지 않습니다.');
      } else if (error.name === 'SecurityError') {
        throw new Error('보안 오류가 발생했습니다. HTTPS 연결을 확인해주세요.');
      } else if (error.name === 'NotAllowedError') {
        throw new Error('사용자가 인증을 취소했습니다.');
      }
      
      throw new Error(error.message || '패스키 등록에 실패했습니다.');
    }
  }

  // 패스키 로그인
  async signInWithPasskey(): Promise<User> {
    try {
      console.log('🔓 Starting passkey authentication...');
      
      // 1. 인증 시작 요청
      const startResponse = await this.request<{
        success: boolean;
        options: WebAuthnAuthenticationOptions;
        sessionId: string;
      }>('/api/auth/webauthn/login/start', {
        method: 'POST'
      });

      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Failed to start authentication');
      }

      console.log('✅ Authentication options received');

      // 2. WebAuthn 라이브러리 로드 및 인증 수행
      const { startAuthentication } = await this.loadWebAuthn();
      
      console.log('🔐 Starting WebAuthn authentication ceremony...');
      const credential = await startAuthentication(startResponse.options);
      console.log('✅ WebAuthn authentication completed');

      // 3. 인증 완료 요청
      const finishResponse = await this.request<{
        success: boolean;
        user: User;
        message: string;
      }>('/api/auth/webauthn/login/finish', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      if (!finishResponse.success) {
        throw new Error(finishResponse.error || 'Authentication verification failed');
      }

      console.log('🎉 Authentication completed successfully!');
      return finishResponse.user;

    } catch (error: any) {
      console.error('❌ Passkey authentication failed:', error);
      
      // 사용자 친화적 오류 메시지
      if (error.name === 'NotSupportedError') {
        throw new Error('이 브라우저는 패스키를 지원하지 않습니다.');
      } else if (error.name === 'SecurityError') {
        throw new Error('보안 오류가 발생했습니다. HTTPS 연결을 확인해주세요.');
      } else if (error.name === 'NotAllowedError') {
        throw new Error('사용자가 인증을 취소했습니다.');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('등록된 패스키를 찾을 수 없습니다.');
      }
      
      throw new Error(error.message || '패스키 로그인에 실패했습니다.');
    }
  }

  // ============================================================================
  // 🤖 AI 채팅 메서드
  // ============================================================================

  async sendChatMessage(params: {
    message: string;
    userDid: string;
    model?: string;
    conversationId?: string;
    usePersonalization?: boolean;
  }): Promise<ChatResponse> {
    try {
      console.log('🤖 Sending chat message...');
      
      const response = await this.request<ChatResponse>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: params.message,
          userDid: params.userDid,
          model: params.model || 'personalized-agent',
          conversationId: params.conversationId,
          usePersonalization: params.usePersonalization ?? true
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'AI chat failed');
      }

      console.log(`✅ Chat response received. CUE earned: ${response.cueEarned}`);
      return response;

    } catch (error: any) {
      console.error('❌ Chat message failed:', error);
      throw new Error(error.message || 'AI 채팅 요청에 실패했습니다.');
    }
  }

  // ============================================================================
  // 💎 CUE 토큰 메서드
  // ============================================================================

  // CUE 잔액 조회
  async getCUEBalance(userDid: string): Promise<number> {
    try {
      const response = await this.request<CUEBalance>(`/api/cue/balance/${userDid}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get CUE balance');
      }
      
      return response.balance;
    } catch (error: any) {
      console.error('❌ Get CUE balance failed:', error);
      throw new Error(error.message || 'CUE 잔액 조회에 실패했습니다.');
    }
  }

  // CUE 거래 내역 조회
  async getCUETransactions(userDid: string, limit: number = 50): Promise<CUETransaction[]> {
    try {
      const response = await this.request<{
        success: boolean;
        transactions: CUETransaction[];
        total: number;
      }>(`/api/cue/transactions/${userDid}?limit=${limit}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get CUE transactions');
      }
      
      return response.transactions;
    } catch (error: any) {
      console.error('❌ Get CUE transactions failed:', error);
      throw new Error(error.message || 'CUE 거래 내역 조회에 실패했습니다.');
    }
  }

  // CUE 마이닝
  async mineCUE(params: {
    userDid: string;
    activity: string;
    amount?: number;
    metadata?: any;
  }): Promise<number> {
    try {
      const response = await this.request<{
        success: boolean;
        amount: number;
        activity: string;
      }>('/api/cue/mine', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      if (!response.success) {
        throw new Error(response.error || 'CUE mining failed');
      }
      
      console.log(`⛏️ CUE mined: ${response.amount} tokens`);
      return response.amount;
    } catch (error: any) {
      console.error('❌ CUE mining failed:', error);
      throw new Error(error.message || 'CUE 마이닝에 실패했습니다.');
    }
  }

  // ============================================================================
  // 🎫 AI Passport 메서드
  // ============================================================================

  // Passport 조회
  async getPassport(userDid: string): Promise<AIPassport> {
    try {
      const response = await this.request<{
        success: boolean;
        passport: AIPassport;
      }>(`/api/passport/${userDid}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get passport');
      }
      
      return response.passport;
    } catch (error: any) {
      console.error('❌ Get passport failed:', error);
      throw new Error(error.message || 'AI Passport 조회에 실패했습니다.');
    }
  }

  // Passport 업데이트
  async updatePassport(userDid: string, updates: Partial<AIPassport>): Promise<AIPassport> {
    try {
      const response = await this.request<{
        success: boolean;
        passport: AIPassport;
      }>(`/api/passport/${userDid}/update`, {
        method: 'POST',
        body: JSON.stringify(updates)
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update passport');
      }
      
      console.log('✅ Passport updated successfully');
      return response.passport;
    } catch (error: any) {
      console.error('❌ Update passport failed:', error);
      throw new Error(error.message || 'AI Passport 업데이트에 실패했습니다.');
    }
  }

  // ============================================================================
  // 🗄️ 데이터 볼트 메서드
  // ============================================================================

  // 볼트 목록 조회
  async getDataVaults(userDid: string): Promise<any[]> {
    try {
      const response = await this.request<{
        success: boolean;
        vaults: any[];
        total: number;
      }>(`/api/vault/${userDid}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get vaults');
      }
      
      return response.vaults;
    } catch (error: any) {
      console.error('❌ Get vaults failed:', error);
      throw new Error(error.message || '데이터 볼트 조회에 실패했습니다.');
    }
  }

  // 볼트 생성
  async createDataVault(params: {
    owner_did: string;
    name: string;
    description?: string;
    category?: string;
  }): Promise<any> {
    try {
      const response = await this.request<{
        success: boolean;
        vault: any;
      }>('/api/vault/create', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create vault');
      }
      
      console.log('✅ Vault created successfully');
      return response.vault;
    } catch (error: any) {
      console.error('❌ Create vault failed:', error);
      throw new Error(error.message || '데이터 볼트 생성에 실패했습니다.');
    }
  }

  // ============================================================================
  // 🔧 개발 도구 메서드
  // ============================================================================

  // API 상태 조회
  async getAPIStatus(): Promise<any> {
    try {
      return await this.request('/health');
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        connected: false
      };
    }
  }

  // 연결 테스트
  async testConnection(): Promise<{ connected: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.request('/health');
      const latency = Date.now() - startTime;
      
      return {
        connected: true,
        latency
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}

// 기본 인스턴스 생성 및 내보내기
export const apiClient = new Final0626APIClient();

// 타입들도 내보내기
export type {
  User,
  ChatResponse,
  CUEBalance,
  CUETransaction,
  AIPassport,
  APIResponse
};

export default Final0626APIClient;