// ============================================================================
// 📁 backend/src/services/auth/SessionService.ts
// 세션 관리 서비스 (AuthService 연동)
// ============================================================================

import jwt from 'jsonwebtoken';
import { AuthService } from './AuthService';
import { AuthConfig } from '../../config/auth';

// 내부 타입 정의
interface SessionData {
  userId: string;
  credentialId?: string;
  userEmail?: string;
  userName?: string;
  createdAt: number;
  lastUsed: number;
  expiresAt: number;
}



export class SessionService {
  private readonly JWT_SECRET: string;
  private readonly SESSION_DURATION: number;
  private sessionStore = new Map<string, SessionData>();
  private authService: AuthService;

  constructor() {
    // AuthConfig에서 설정 가져오기
    const jwtConfig = AuthConfig.getJWTConfig();
    const sessionConfig = AuthConfig.getSessionConfig();
    
    this.JWT_SECRET = jwtConfig.secret;
    this.SESSION_DURATION = sessionConfig.timeout;
    
    // AuthService 인스턴스 생성
    this.authService = new AuthService();
    
    console.log('🔧 SessionService 초기화됨');
    console.log(`🔑 JWT Secret: ${this.JWT_SECRET.substring(0, 10)}...`);
    console.log(`⏰ Session Duration: ${this.SESSION_DURATION / (24 * 60 * 60 * 1000)}일`);
    console.log('👤 AuthService 연동 완료');
    
    // 정기적인 세션 정리 (5분마다)
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  // ============================================================================
  // 🔑 JWT 토큰 관리
  // ============================================================================

  /**
   * JWT 세션 토큰 생성
   */
  generateSessionToken(userId: string, credentialId?: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      userId,
      credentialId,
      type: 'session',
      iat: now,
      exp: now + (this.SESSION_DURATION / 1000)
    };
    
    const token = jwt.sign(payload, this.JWT_SECRET);
    console.log(`🔑 세션 토큰 생성: ${userId} (유효기간: ${this.SESSION_DURATION / (24 * 60 * 60 * 1000)}일)`);
    
    return token;
  }

  /**
   * JWT 세션 토큰 검증
   */
  verifySessionToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      console.log(`✅ 세션 토큰 검증 성공: ${(decoded as any).userId}`);
      return decoded;
    } catch (error: any) {
      console.error('❌ 세션 토큰 검증 실패:', error.message);
      return null;
    }
  }

  // ============================================================================
  // 👤 사용자 조회 (AuthService 연동)
  // ============================================================================

  /**
   * 세션 토큰으로 사용자 조회 (AuthService 사용)
   */
  async getUserBySession(sessionToken: string): Promise<any> {
    try {
      // JWT 토큰 검증
      const decoded = this.verifySessionToken(sessionToken);
      if (!decoded || !decoded.userId) {
        return null;
      }

      console.log('👤 AuthService를 통한 사용자 조회 시작:', decoded.userId);

      // AuthService를 통한 사용자 조회
      let user = await this.authService.findUserById(decoded.userId);
      
      if (!user && decoded.credentialId) {
        console.log('🔄 credential_id로 재시도:', decoded.credentialId);
        user = await this.authService.findUserByCredentialId(decoded.credentialId);
      }
      
      if (user) {
        console.log('✅ AuthService 사용자 조회 성공:', user.username || user.id);
        
        // AuthService의 포맷팅 사용
        return this.authService.formatUserResponse(user);
      } else {
        console.log('⚠️ AuthService에서 사용자 찾을 수 없음, Mock 사용자 생성');
        return this.createMockUser(decoded.userId, decoded.credentialId);
      }
      
    } catch (error) {
      console.error('❌ 세션으로 사용자 조회 실패:', error);
      
      // Mock 폴백
      return this.createMockUser('unknown_user', 'unknown_credential');
    }
  }

  /**
   * Mock 사용자 생성 (폴백용)
   */
  private createMockUser(userId: string, credentialId?: string): any {
    console.log('🎭 Mock 사용자 생성:', userId);
    
    return {
      id: userId,
      username: `MockUser_${userId.substring(0, 8)}`,
      email: `${userId}@mock.example.com`,
      did: `did:ai-personal:mock-${userId}`,
      wallet_address: `0x${userId.replace(/[^a-f0-9]/gi, '').substring(0, 40).padEnd(40, '0')}`,
      display_name: `Mock User ${userId.substring(0, 6)}`,
      trust_score: 50,
      passport_level: 'Basic',
      biometric_verified: false,
      passkey_registered: !!credentialId,
      cue_balance: 100,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };
  }

  // ============================================================================
  // 💾 메모리 세션 관리
  // ============================================================================

  /**
   * 메모리 세션 저장
   */
  storeSession(sessionId: string, userData: any): void {
    const sessionData: SessionData = {
      userId: userData.userId || userData.id,
      credentialId: userData.credentialId,
      userEmail: userData.userEmail || userData.email,
      userName: userData.userName || userData.name,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      expiresAt: Date.now() + this.SESSION_DURATION
    };
    
    this.sessionStore.set(sessionId, sessionData);
    console.log(`💾 세션 저장됨: ${sessionId} (사용자: ${sessionData.userId})`);
  }

  /**
   * 메모리 세션 조회
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessionStore.get(sessionId);
    
    if (!session) {
      console.log(`❌ 세션을 찾을 수 없음: ${sessionId}`);
      return null;
    }
    
    // 만료 확인
    if (session.expiresAt < Date.now()) {
      console.log(`⏰ 세션 만료됨: ${sessionId}`);
      this.sessionStore.delete(sessionId);
      return null;
    }
    
    // 마지막 사용 시간 업데이트
    session.lastUsed = Date.now();
    this.sessionStore.set(sessionId, session);
    
    return session;
  }

  /**
   * 메모리 세션 삭제
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessionStore.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ 세션 삭제됨: ${sessionId}`);
    }
    return deleted;
  }

  // ============================================================================
  // 🔧 AuthService 위임 메서드들
  // ============================================================================

  /**
   * 사용자 생성 (AuthService 위임)
   */
  async createUser(userData: any): Promise<any> {
    console.log('👤 SessionService → AuthService: 사용자 생성 위임');
    return await this.authService.createUser(userData);
  }

  /**
   * WebAuthn 자격증명 저장 (AuthService 위임)
   */
  async saveWebAuthnCredential(credData: any): Promise<boolean> {
    console.log('🔐 SessionService → AuthService: 자격증명 저장 위임');
    return await this.authService.saveWebAuthnCredential(credData);
  }

  /**
   * 웰컴 CUE 지급 (AuthService 위임)
   */
  async grantWelcomeCUE(userDid: string): Promise<boolean> {
    console.log('💰 SessionService → AuthService: 웰컴 CUE 지급 위임');
    return await this.authService.grantWelcomeCUE(userDid);
  }

  /**
   * 사용자 통계 조회 (AuthService 위임)
   */
  async getUserStats(userId: string): Promise<any> {
    console.log('📊 SessionService → AuthService: 사용자 통계 위임');
    return await this.authService.getUserStats(userId);
  }

  // ============================================================================
  // 🧹 정리 및 관리 메서드
  // ============================================================================

  /**
   * 만료된 세션 정리
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (session.expiresAt < now) {
        this.sessionStore.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 만료된 세션 ${cleanedCount}개 정리됨`);
    }
    
    return cleanedCount;
  }

  /**
   * 현재 활성 세션 수
   */
  getActiveSessionCount(): number {
    this.cleanupExpiredSessions(); // 정리 후 카운트
    return this.sessionStore.size;
  }

  /**
   * 세션 정보 (디버깅용)
   */
  getSessionInfo(): any {
    return {
      activeSessionCount: this.getActiveSessionCount(),
      sessionIds: Array.from(this.sessionStore.keys()),
      jwtSecret: this.JWT_SECRET.substring(0, 10) + '...',
      sessionDuration: this.SESSION_DURATION,
      authServiceConnected: !!this.authService
    };
  }

  /**
   * 통합 서비스 상태 조회
   */
  async getStatus(): Promise<any> {
    try {
      // AuthService 상태 조회
      const authSystemStatus = await this.authService.getAuthSystemStatus();
      
      return {
        sessionService: {
          initialized: true,
          activeSessions: this.getActiveSessionCount(),
          jwtConfigured: !!this.JWT_SECRET,
          sessionDuration: this.SESSION_DURATION
        },
        authService: authSystemStatus,
        integration: {
          connected: !!this.authService,
          lastCheck: new Date().toISOString()
        },
        uptime: process.uptime()
      };
    } catch (error) {
      console.error('❌ 통합 상태 조회 실패:', error);
      return {
        sessionService: { initialized: true, error: 'Status check failed' },
        authService: { connected: false, error: error.message },
        integration: { connected: false }
      };
    }
  }

  /**
   * 서비스 초기화 상태 확인
   */
  isReady(): boolean {
    return !!(this.JWT_SECRET && this.authService && this.SESSION_DURATION > 0);
  }
}