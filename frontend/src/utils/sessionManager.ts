// ============================================================================
// 🔧 프론트엔드 세션 관리 유틸리티 (새로 생성)
// 파일: frontend/src/utils/sessionManager.ts
// 용도: 클라이언트 사이드 세션 상태 관리, localStorage 연동, 자동 복원
// 연관파일: useAuth.ts, BackendAPIClient.ts, AIPassportSystem.tsx
// ============================================================================

'use client';

export interface SessionUser {
  id: string;
  did: string;
  username: string;
  email: string;
  cueBalance: number;
  cue_tokens?: number;
  trustScore: number;
  trust_score?: number;
  passportLevel: string;
  passport_level?: string;
  biometricVerified: boolean;
  biometric_verified?: boolean;
  passkey_registered: boolean;
  registeredAt: string;
  walletAddress?: string;
  wallet_address?: string;
  last_login_at?: string;
  metadata?: any;
}

export interface SessionState {
  isAuthenticated: boolean;
  user: SessionUser | null;
  sessionToken: string | null;
  sessionId: string | null;
  lastActivity: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface SessionResult {
  success: boolean;
  user?: SessionUser;
  sessionToken?: string;
  sessionId?: string;
  message: string;
  error?: string;
  restoredFrom?: string;
}

/**
 * 세션 관리자 클래스
 * - localStorage 기반 세션 영속성
 * - 자동 세션 복원
 * - 백엔드 API 연동
 * - 세션 상태 변화 이벤트
 */
export class SessionManager {
  private static instance: SessionManager;
  private baseURL: string;
  private sessionState: SessionState;
  private listeners: Set<(state: SessionState) => void> = new Set();
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEYS = {
    SESSION_TOKEN: 'cue_session_token',
    SESSION_ID: 'cue_session_id',
    USER_DATA: 'cue_user_data',
    LAST_ACTIVITY: 'cue_last_activity'
  };

  private constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.sessionState = {
      isAuthenticated: false,
      user: null,
      sessionToken: null,
      sessionId: null,
      lastActivity: null,
      isLoading: false,
      error: null
    };

    console.log('🔧 SessionManager 초기화:', this.baseURL);
    
    // 브라우저 환경에서만 초기화
    if (typeof window !== 'undefined') {
      this.initializeFromStorage();
      this.startSessionMonitoring();
      this.setupBeforeUnloadHandler();
    }
  }

  public static getInstance(baseURL?: string): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(baseURL);
    }
    return SessionManager.instance;
  }

  // ============================================================================
  // 🔧 초기화 및 설정
  // ============================================================================

  /**
   * localStorage에서 세션 데이터 복원
   */
  private initializeFromStorage(): void {
    try {
      const sessionToken = this.getFromStorage(this.STORAGE_KEYS.SESSION_TOKEN);
      const sessionId = this.getFromStorage(this.STORAGE_KEYS.SESSION_ID);
      const userData = this.getFromStorage(this.STORAGE_KEYS.USER_DATA);
      const lastActivity = this.getFromStorage(this.STORAGE_KEYS.LAST_ACTIVITY);

      if (sessionToken || sessionId) {
        this.sessionState = {
          ...this.sessionState,
          sessionToken,
          sessionId,
          lastActivity,
          user: userData ? JSON.parse(userData) : null,
          isAuthenticated: !!(userData && (sessionToken || sessionId))
        };

        console.log('🔄 localStorage에서 세션 데이터 복원:', {
          hasToken: !!sessionToken,
          hasSessionId: !!sessionId,
          hasUser: !!userData,
          lastActivity
        });
      }
    } catch (error) {
      console.warn('⚠️ localStorage 세션 복원 실패:', error);
      this.clearStorage();
    }
  }

  /**
   * 세션 모니터링 시작 (5분마다 체크)
   */
  private startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.sessionCheckInterval = setInterval(() => {
      if (this.sessionState.isAuthenticated) {
        this.validateSession();
      }
    }, 5 * 60 * 1000); // 5분마다
  }

  /**
   * 페이지 종료 시 세션 정보 저장
   */
  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      if (this.sessionState.isAuthenticated) {
        this.updateLastActivity();
      }
    });
  }

  // ============================================================================
  // 🔐 세션 인증 메서드
  // ============================================================================

  /**
   * 세션 복원 시도 (페이지 새로고침 시 자동 호출)
   */
  async restoreSession(): Promise<SessionResult> {
    console.log('🔧 === 세션 복원 시도 ===');
    
    this.updateState({ isLoading: true, error: null });

    try {
      const { sessionToken, sessionId } = this.sessionState;

      if (!sessionToken && !sessionId) {
        console.log('❌ 저장된 세션 정보 없음');
        return this.handleSessionFailure('저장된 세션 정보가 없습니다');
      }

      console.log('🔍 백엔드 세션 복원 요청:', {
        hasToken: !!sessionToken,
        hasSessionId: !!sessionId
      });

      const response = await this.apiRequest('/api/auth/session/restore', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken,
          sessionId
        })
      });

      if (!response.success) {
        console.log('❌ 세션 복원 실패:', response.message);
        return this.handleSessionFailure(response.message || '세션 복원 실패');
      }

      console.log('✅ 세션 복원 성공!', {
        username: response.user?.username,
        cueBalance: response.user?.cueBalance
      });

      return this.handleSessionSuccess(response.user, sessionToken, sessionId, '세션 복원 성공');

    } catch (error: any) {
      console.error('💥 세션 복원 오류:', error);
      return this.handleSessionFailure(`세션 복원 오류: ${error.message}`);
    } finally {
      this.updateState({ isLoading: false });
    }
  }

  /**
   * WebAuthn 로그인/등록
   */
  async authenticateWithWebAuthn(credential: any, type: 'login' | 'register' = 'login'): Promise<SessionResult> {
    console.log('🔐 WebAuthn 인증 시작:', type);
    
    this.updateState({ isLoading: true, error: null });

    try {
      const endpoint = type === 'login' 
        ? '/api/auth/webauthn/login/complete'
        : '/api/auth/webauthn/register/complete';

      const response = await this.apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(credential)
      });

      if (!response.success) {
        console.log('❌ WebAuthn 인증 실패:', response.message);
        return this.handleSessionFailure(response.message || 'WebAuthn 인증 실패');
      }

      console.log('✅ WebAuthn 인증 성공!', {
        username: response.user?.username,
        action: response.action || type
      });

      return this.handleSessionSuccess(
        response.user, 
        response.sessionToken, 
        response.sessionId,
        `WebAuthn ${type === 'login' ? '로그인' : '등록'} 성공`
      );

    } catch (error: any) {
      console.error('💥 WebAuthn 인증 오류:', error);
      return this.handleSessionFailure(`WebAuthn 인증 오류: ${error.message}`);
    } finally {
      this.updateState({ isLoading: false });
    }
  }

  /**
   * 통합 인증 (로그인/등록 자동 판별)
   */
  async authenticateUnified(credential: any): Promise<SessionResult> {
    console.log('🔐 통합 인증 시작');
    
    this.updateState({ isLoading: true, error: null });

    try {
      const response = await this.apiRequest('/api/auth/unified', {
        method: 'POST',
        body: JSON.stringify(credential)
      });

      if (!response.success) {
        console.log('❌ 통합 인증 실패:', response.message);
        return this.handleSessionFailure(response.message || '통합 인증 실패');
      }

      console.log('✅ 통합 인증 성공!', {
        username: response.user?.username,
        isNew: response.isNewUser || false
      });

      return this.handleSessionSuccess(
        response.user, 
        response.sessionToken, 
        response.sessionId,
        response.isNewUser ? '회원가입 완료' : '로그인 성공'
      );

    } catch (error: any) {
      console.error('💥 통합 인증 오류:', error);
      return this.handleSessionFailure(`통합 인증 오류: ${error.message}`);
    } finally {
      this.updateState({ isLoading: false });
    }
  }

  // ============================================================================
  // 🔄 세션 상태 관리
  // ============================================================================

  /**
   * 세션 성공 처리
   */
  private handleSessionSuccess(
    user: SessionUser, 
    sessionToken?: string, 
    sessionId?: string,
    message: string = '인증 성공'
  ): SessionResult {
    
    const normalizedUser = this.normalizeUser(user);
    
    // 상태 업데이트
    this.updateState({
      isAuthenticated: true,
      user: normalizedUser,
      sessionToken: sessionToken || this.sessionState.sessionToken,
      sessionId: sessionId || this.sessionState.sessionId,
      error: null
    });

    // localStorage에 저장
    this.saveToStorage(normalizedUser, sessionToken, sessionId);
    this.updateLastActivity();

    return {
      success: true,
      user: normalizedUser,
      sessionToken: sessionToken || this.sessionState.sessionToken || undefined,
      sessionId: sessionId || this.sessionState.sessionId || undefined,
      message
    };
  }

  /**
   * 세션 실패 처리
   */
  private handleSessionFailure(message: string): SessionResult {
    this.updateState({
      isAuthenticated: false,
      user: null,
      sessionToken: null,
      sessionId: null,
      error: message
    });

    this.clearStorage();

    return {
      success: false,
      message,
      error: message
    };
  }

  /**
   * 사용자 데이터 정규화
   */
  private normalizeUser(user: any): SessionUser {
    return {
      id: user.id,
      did: user.did || user.userDid || `did:ai-personal:${user.id}`,
      username: user.username || user.name || user.email?.split('@')[0] || 'Unknown',
      email: user.email || 'unknown@example.com',
      cueBalance: user.cueBalance || user.cue_tokens || 0,
      cue_tokens: user.cue_tokens || user.cueBalance || 0,
      trustScore: user.trustScore || user.trust_score || 0,
      trust_score: user.trust_score || user.trustScore || 0,
      passportLevel: user.passportLevel || user.passport_level || 'Basic',
      passport_level: user.passport_level || user.passportLevel || 'Basic',
      biometricVerified: user.biometricVerified || user.biometric_verified || false,
      biometric_verified: user.biometric_verified || user.biometricVerified || false,
      passkey_registered: user.passkey_registered || true,
      registeredAt: user.registeredAt || user.created_at || new Date().toISOString(),
      walletAddress: user.walletAddress || user.wallet_address,
      wallet_address: user.wallet_address || user.walletAddress,
      last_login_at: user.last_login_at || new Date().toISOString(),
      metadata: user.metadata || {}
    };
  }

  // ============================================================================
  // 🗂️ 로컬 스토리지 관리
  // ============================================================================

  /**
   * localStorage에 세션 데이터 저장
   */
  private saveToStorage(user: SessionUser, sessionToken?: string, sessionId?: string): void {
    try {
      if (sessionToken) {
        this.setToStorage(this.STORAGE_KEYS.SESSION_TOKEN, sessionToken);
      }
      if (sessionId) {
        this.setToStorage(this.STORAGE_KEYS.SESSION_ID, sessionId);
      }
      
      this.setToStorage(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      this.updateLastActivity();
      
      console.log('💾 세션 데이터 localStorage 저장 완료');
    } catch (error) {
      console.warn('⚠️ localStorage 저장 실패:', error);
    }
  }

  /**
   * localStorage에서 값 가져오기
   */
  private getFromStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`⚠️ localStorage 읽기 실패 (${key}):`, error);
      return null;
    }
  }

  /**
   * localStorage에 값 저장하기
   */
  private setToStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`⚠️ localStorage 저장 실패 (${key}):`, error);
    }
  }

  /**
   * localStorage 전체 클리어
   */
  private clearStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🗑️ localStorage 세션 데이터 삭제 완료');
    } catch (error) {
      console.warn('⚠️ localStorage 클리어 실패:', error);
    }
  }

  /**
   * 마지막 활동 시간 업데이트
   */
  private updateLastActivity(): void {
    const now = new Date().toISOString();
    this.setToStorage(this.STORAGE_KEYS.LAST_ACTIVITY, now);
    this.updateState({ lastActivity: now });
  }

  // ============================================================================
  // 🌐 API 통신
  // ============================================================================

  /**
   * 백엔드 API 요청
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 인증 헤더 추가 (필요한 경우)
    if (this.sessionState.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionState.sessionToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // ============================================================================
  // 🔍 세션 검증 및 관리
  // ============================================================================

  /**
   * 현재 세션 유효성 검증
   */
  async validateSession(): Promise<boolean> {
    try {
      if (!this.sessionState.isAuthenticated) {
        return false;
      }

      const response = await this.apiRequest('/api/auth/session/validate', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: this.sessionState.sessionToken,
          sessionId: this.sessionState.sessionId
        })
      });

      if (!response.success) {
        console.log('⚠️ 세션 검증 실패, 로그아웃 처리');
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.warn('⚠️ 세션 검증 오류:', error);
      return false;
    }
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<SessionResult> {
    console.log('🚪 로그아웃 시작');
    
    try {
      // 백엔드에 로그아웃 요청
      if (this.sessionState.sessionToken || this.sessionState.sessionId) {
        await this.apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({
            sessionToken: this.sessionState.sessionToken,
            sessionId: this.sessionState.sessionId
          })
        });
      }
    } catch (error) {
      console.warn('⚠️ 백엔드 로그아웃 요청 실패:', error);
    }

    // 로컬 상태 클리어
    this.updateState({
      isAuthenticated: false,
      user: null,
      sessionToken: null,
      sessionId: null,
      error: null
    });

    this.clearStorage();
    
    console.log('✅ 로그아웃 완료');

    return {
      success: true,
      message: '로그아웃되었습니다'
    };
  }

  // ============================================================================
  // 📡 상태 관리 및 이벤트
  // ============================================================================

  /**
   * 상태 업데이트 및 리스너 알림
   */
  private updateState(updates: Partial<SessionState>): void {
    this.sessionState = { ...this.sessionState, ...updates };
    this.notifyListeners();
  }

  /**
   * 상태 변화 리스너 추가
   */
  addStateListener(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    
    // 즉시 현재 상태 전달
    listener(this.sessionState);
    
    // 리스너 제거 함수 반환
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 모든 리스너에게 상태 변화 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.sessionState);
      } catch (error) {
        console.warn('⚠️ 상태 리스너 오류:', error);
      }
    });
  }

  // ============================================================================
  // 📊 Getter 메서드들
  // ============================================================================

  /**
   * 현재 세션 상태 반환
   */
  getState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * 현재 사용자 정보 반환
   */
  getCurrentUser(): SessionUser | null {
    return this.sessionState.user;
  }

  /**
   * 인증 상태 확인
   */
  isAuthenticated(): boolean {
    return this.sessionState.isAuthenticated;
  }

  /**
   * 로딩 상태 확인
   */
  isLoading(): boolean {
    return this.sessionState.isLoading;
  }

  /**
   * 현재 오류 메시지 반환
   */
  getError(): string | null {
    return this.sessionState.error;
  }

  // ============================================================================
  // 🧹 정리 및 해제
  // ============================================================================

  /**
   * 세션 관리자 정리
   */
  dispose(): void {
    console.log('🧹 SessionManager 정리 시작');
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    this.listeners.clear();
    console.log('✅ SessionManager 정리 완료');
  }
}

// ============================================================================
// 📤 Export
// ============================================================================

// 기본 인스턴스 생성 및 내보내기
export const sessionManager = SessionManager.getInstance();

export default SessionManager;