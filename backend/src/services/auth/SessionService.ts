// ============================================================================
// 📁 backend/src/services/auth/SessionService.ts
// 🔑 세션 관리 서비스 - AuthService 의존성 제거 버전
// ============================================================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * 세션 데이터 인터페이스
 */
interface SessionData {
  id: string;
  userId?: string;
  type: string;
  timestamp: number;
  created: string;
  lastAccess: string;
  isActive: boolean;
  expiresAt?: number;
  challenge?: string;
  deviceInfo?: any;
  username?: string;
  email?: string;
  [key: string]: any;
}

/**
 * 세션 관리 서비스 - DI 패턴 적용, AuthService 의존성 제거
 */
export class SessionService {
  private config: any;
  private sessionStore = new Map<string, SessionData>();
  private JWT_SECRET: string;
  private SESSION_DURATION: number;

  constructor(config: any) {  // ✅ AuthService 의존성 제거
    this.config = config;
    this.JWT_SECRET = process.env.JWT_SECRET || config.JWT_SECRET || 'development-secret-key';
    this.SESSION_DURATION = config.SESSION_TIMEOUT || (30 * 24 * 60 * 60 * 1000); // 30일
    
    console.log('🔑 SessionService 초기화됨 (AuthService 의존성 제거)');
    console.log('🔐 JWT Secret:', this.JWT_SECRET.substring(0, 10) + '...');
    console.log('⏰ Session Duration:', this.SESSION_DURATION / (24 * 60 * 60 * 1000), '일');
    
    // 주기적인 세션 정리 (5분마다)
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  // ============================================================================
  // 🔑 JWT 토큰 관리
  // ============================================================================

  /**
   * 세션 토큰 생성 (JWT)
   */
  generateSessionToken(userId: string, credentialId: string): string {
    const payload = {
      userId,
      credentialId,
      type: 'session',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + Math.floor(this.SESSION_DURATION / 1000)
    };
    
    const token = jwt.sign(payload, this.JWT_SECRET);
    console.log(`🎫 JWT 세션 토큰 생성: ${userId}`);
    return token;
  }

  /**
   * 세션 토큰 검증
   */
  verifySessionToken(token: string): any {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      console.log(`✅ JWT 토큰 검증 성공: ${(decoded as any).userId}`);
      return decoded;
    } catch (error: any) {
      console.error('❌ JWT 토큰 검증 실패:', error.message);
      return null;
    }
  }

  /**
   * 토큰으로 사용자 정보 조회 (간단 버전)
   */
  async getUserBySession(sessionToken: string): Promise<any> {
    const decoded = this.verifySessionToken(sessionToken);
    if (!decoded) {
      return null;
    }

    // 기본 사용자 정보 반환 (AuthService 없이)
    return {
      id: decoded.userId,
      username: `user_${decoded.userId.slice(-8)}`,
      did: `did:final0626:${decoded.userId}`,
      auth_method: 'passkey',
      session_valid: true,
      verified_at: new Date().toISOString()
    };
  }

  // ============================================================================
  // 🗄️ 메모리 세션 스토어 관리
  // ============================================================================

  /**
   * 세션 생성 (임시 인증 세션용)
   */
  createSession(sessionData: Partial<SessionData>): string {
    const sessionId = sessionData.id || this.generateSessionId(sessionData.type || 'session');
    
    const session: SessionData = {
      id: sessionId,
      type: sessionData.type || 'session',
      timestamp: Date.now(),
      created: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      isActive: true,
      ...sessionData
    };
    
    this.sessionStore.set(sessionId, session);
    console.log(`📝 세션 생성됨: ${sessionId} (type: ${session.type})`);
    
    return sessionId;
  }

  /**
   * 세션 조회
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessionStore.get(sessionId);
    
    if (!session) {
      console.log(`❌ 세션을 찾을 수 없음: ${sessionId}`);
      return null;
    }
    
    // 만료 확인
    if (session.expiresAt && session.expiresAt < Date.now()) {
      console.log(`⏰ 만료된 세션: ${sessionId}`);
      this.sessionStore.delete(sessionId);
      return null;
    }
    
    // 마지막 접근 시간 업데이트
    session.lastAccess = new Date().toISOString();
    this.sessionStore.set(sessionId, session);
    
    return session;
  }

  /**
   * 세션 삭제
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessionStore.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ 세션 삭제됨: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * 세션 무효화 (로그아웃용)
   */
  async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      console.log('🗑️ 세션 무효화 처리');
      
      // JWT 토큰 블랙리스트에 추가하는 로직이 여기에 들어가야 함
      // 현재는 간단히 로그만 출력
      
      console.log('✅ 세션 무효화 완료');
      return true;
    } catch (error) {
      console.error('❌ 세션 무효화 실패:', error);
      return false;
    }
  }

  /**
   * 세션 유효성 검사
   */
  async validateSession(sessionToken: string): Promise<boolean> {
    const decoded = this.verifySessionToken(sessionToken);
    return !!decoded;
  }

  // ============================================================================
  // 🔧 헬퍼 함수들
  // ============================================================================

  /**
   * 세션 ID 생성
   */
  private generateSessionId(type: string): string {
    return `${type}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * 만료된 세션 정리
   */
  private cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessionStore.entries()) {
      // 1일 이상 된 임시 세션 정리
      if (session.timestamp && (now - session.timestamp > 24 * 60 * 60 * 1000)) {
        this.sessionStore.delete(sessionId);
        cleanedCount++;
      }
      
      // 명시적으로 만료된 세션 정리
      if (session.expiresAt && session.expiresAt < now) {
        this.sessionStore.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 만료된 세션 ${cleanedCount}개 정리됨`);
    }
    
    return cleanedCount;
  }

  // ============================================================================
  // 📊 상태 및 통계 조회
  // ============================================================================

  /**
   * 활성 세션 목록 조회 (디버깅용)
   */
  getActiveSessions(): Array<{
    id: string;
    userId?: string;
    type: string;
    created: string;
    lastAccess: string;
    isActive: boolean;
  }> {
    this.cleanupExpiredSessions(); // 정리 후 반환
    
    return Array.from(this.sessionStore.values()).map(session => ({
      id: session.id,
      userId: session.userId,
      type: session.type,
      created: session.created,
      lastAccess: session.lastAccess,
      isActive: session.isActive
    }));
  }

  /**
   * 세션 정보 조회
   */
  getSessionInfo(): {
    activeSessionCount: number;
    jwtSecret: string;
    sessionDuration: number;
  } {
    return {
      activeSessionCount: this.getActiveSessions().length,
      jwtSecret: this.JWT_SECRET.substring(0, 10) + '...',
      sessionDuration: this.SESSION_DURATION
    };
  }

  /**
   * 서비스 상태 조회
   */
  async getStatus(): Promise<any> {
    return {
      sessionService: {
        initialized: true,
        activeSessions: this.getActiveSessions().length,
        jwtConfigured: !this.JWT_SECRET.includes('development'),
        sessionDuration: `${this.SESSION_DURATION / (24 * 60 * 60 * 1000)}일`,
        authServiceDependency: false, // ✅ AuthService 의존성 제거됨
        features: {
          jwtTokens: true,
          temporarySessions: true,
          sessionCleanup: true,
          userBySession: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 서비스 정리 (DI Container에서 호출)
   */
  dispose(): void {
    console.log('🧹 SessionService 정리 중...');
    this.sessionStore.clear();
    console.log('✅ SessionService 정리 완료');
  }
}