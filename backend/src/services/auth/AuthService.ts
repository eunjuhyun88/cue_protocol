// ============================================================================
// 📁 backend/src/services/auth/AuthService.ts
// 🔧 리팩토링된 AuthService - DI 패턴 적용, 순환 의존성 제거
// ============================================================================

import crypto from 'crypto';
import { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UserResponse,
  WebAuthnCredentialData 
} from '../../types/auth.types';
import { AuthConfig } from '../../config/auth';
import { DIContainer } from '../../core/DIContainer';
import { CryptoService } from '../encryption/CryptoService';

/**
 * 인증 서비스 - 사용자 인증 비즈니스 로직
 * DI 패턴 적용으로 순환 의존성 제거
 */
export class AuthService {
  private cryptoService: CryptoService;

  private config: AuthConfig;
  private databaseService: any;

  constructor(
    config: AuthConfig,
    dbService: any // DI를 통해 주입받음
  ) {
    this.config = config;
    this.dbService = dbService;
    
    console.log('👤 AuthService 초기화 완료 (DI 패턴)');
    console.log(`🗄️  Database Type: ${config.DATABASE_TYPE}`);
  }

  // ============================================================================
  // 👤 사용자 관리 (핵심 비즈니스 로직)
  // ============================================================================

  /**
   * 새로운 사용자 생성
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      console.log('👤 새 사용자 생성:', userData.username);
      
      // 비즈니스 로직 적용
      const enrichedUserData = this.enrichUserData(userData);
      
      // 데이터베이스에 저장
      const user = await this.dbService.createUser(enrichedUserData);
      
      // 웰컴 CUE 지급 (백그라운드 처리)
      this.grantWelcomeCUEBackground(user.did);
      
      console.log('✅ 사용자 생성 성공:', user.id);
      return user;
    } catch (error) {
      console.error('❌ 사용자 생성 실패:', error);
      throw new Error('사용자 생성에 실패했습니다');
    }
  }

  /**
   * 사용자 데이터 보강 (비즈니스 로직)
   */
  private enrichUserData(userData: CreateUserData): CreateUserData {
    const businessConfig = this.config.getBusinessConfig();
    
    return {
      ...userData,
      trust_score: userData.trust_score ?? businessConfig.defaultTrustScore,
      passport_level: userData.passport_level ?? businessConfig.defaultPassportLevel,
      biometric_verified: userData.biometric_verified ?? true,
      cue_tokens: userData.cue_tokens ?? businessConfig.welcomeCUE,
      wallet_address: userData.wallet_address || this.generateWalletAddress(),
      did: userData.did || this.generateDID(userData.id)
    };
  }

  /**
   * 사용자 ID로 조회
   */
  async findUserById(userId: string): Promise<User | null> {
    try {
      return await this.dbService.findUserById(userId);
    } catch (error) {
      console.error('❌ 사용자 ID 조회 실패:', error);
      return null;
    }
  }

  /**
   * 이메일로 사용자 조회
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      if (this.config.DATABASE_TYPE === 'supabase') {
        return await this.dbService.findUserByEmail(email);
      } else {
        return await this.dbService.getUserByUsername(email);
      }
    } catch (error) {
      console.error('❌ 사용자 이메일 조회 실패:', error);
      return null;
    }
  }

  /**
   * 사용자명으로 사용자 조회
   */
  async findUserByUsername(username: string): Promise<User | null> {
    try {
      return await this.dbService.getUserByUsername(username);
    } catch (error) {
      console.error('❌ 사용자명 조회 실패:', error);
      return null;
    }
  }

  /**
   * Credential ID로 사용자 찾기 (WebAuthn 핵심 로직)
   */
  async findUserByCredentialId(credentialId: string): Promise<User | null> {
    try {
      if (this.config.DATABASE_TYPE === 'supabase') {
        return await this.dbService.getUserByCredentialId(credentialId);
      } else {
        // Mock 구현: 메모리에서 검색하거나 Mock 사용자 생성
        console.log('🎭 Mock 모드: credential_id로 사용자 검색');
        return this.createMockUserFromCredential(credentialId);
      }
    } catch (error) {
      console.error('❌ Credential ID로 사용자 조회 실패:', error);
      return null;
    }
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userId: string, updates: UpdateUserData): Promise<User | null> {
    try {
      const updatedUser = await this.dbService.updateUser(userId, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      console.log('✅ 사용자 업데이트 성공:', userId);
      return updatedUser;
    } catch (error) {
      console.error('❌ 사용자 업데이트 실패:', error);
      return null;
    }
  }

  // ============================================================================
  // 🔑 WebAuthn Credential 관리
  // ============================================================================

  /**
   * WebAuthn 자격증명 저장
   */
  async saveWebAuthnCredential(credData: WebAuthnCredentialData): Promise<boolean> {
    try {
      const enrichedCredData = {
        ...credData,
        id: credData.id || crypto.randomUUID(),
        created_at: credData.created_at || new Date().toISOString(),
        last_used_at: credData.last_used_at || new Date().toISOString(),
        is_active: credData.is_active ?? true,
        backup_eligible: credData.backup_eligible ?? false,
        backup_state: credData.backup_state ?? false
      };

      if (this.config.DATABASE_TYPE === 'supabase') {
        await this.dbService.saveWebAuthnCredential(enrichedCredData);
      } else {
        // Mock 구현
        console.log('🎭 Mock 모드: WebAuthn 자격증명 저장됨');
      }
      
      console.log('✅ WebAuthn 자격증명 저장 성공:', credData.credential_id);
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 자격증명 저장 실패:', error);
      return false;
    }
  }

  /**
   * 자격증명 마지막 사용 시간 업데이트
   */
  async updateCredentialLastUsed(credentialId: string): Promise<void> {
    try {
      if (this.config.DATABASE_TYPE === 'supabase') {
        await this.dbService.updateCredentialLastUsed(credentialId);
      }
      console.log('✅ 자격증명 사용 시간 업데이트:', credentialId);
    } catch (error) {
      console.error('❌ 자격증명 사용 시간 업데이트 실패:', error);
    }
  }

  // ============================================================================
  // 💰 CUE 토큰 관리
  // ============================================================================

  /**
   * CUE 잔액 조회
   */
  async getCUEBalance(userDid: string): Promise<number> {
    try {
      if (this.config.DATABASE_TYPE === 'supabase') {
        return await this.dbService.getCUEBalance(userDid);
      } else {
        // Mock 구현
        return this.config.getBusinessConfig().welcomeCUE;
      }
    } catch (error) {
      console.error('❌ CUE 잔액 조회 실패:', error);
      return 0;
    }
  }

  /**
   * CUE 거래 생성
   */
  async createCUETransaction(transactionData: {
    user_did?: string;
    user_id?: string;
    transaction_type: 'mining' | 'spending' | 'reward' | 'transfer' | 'registration_bonus';
    amount: number;
    balance_after?: number;
    status?: 'pending' | 'completed' | 'failed';
    source?: string;
    description?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const enrichedTransactionData = {
        ...transactionData,
        status: transactionData.status || 'completed',
        source_platform: transactionData.source || 'system',
        created_at: new Date().toISOString()
      };

      if (this.config.DATABASE_TYPE === 'supabase') {
        return await this.dbService.createCUETransaction(enrichedTransactionData);
      } else {
        // Mock 구현
        console.log('🎭 Mock 모드: CUE 거래 생성됨:', transactionData.amount);
        return { id: crypto.randomUUID(), ...enrichedTransactionData };
      }
    } catch (error) {
      console.error('❌ CUE 거래 생성 실패:', error);
      return null;
    }
  }

  /**
   * 웰컴 CUE 지급 (백그라운드)
   */
  private async grantWelcomeCUEBackground(userDid: string): Promise<void> {
    try {
      const welcomeAmount = this.config.getBusinessConfig().welcomeCUE;
      
      await this.createCUETransaction({
        user_did: userDid,
        transaction_type: 'registration_bonus',
        amount: welcomeAmount,
        balance_after: welcomeAmount,
        description: 'Welcome bonus for new user registration',
        metadata: {
          type: 'welcome_bonus',
          granted_at: new Date().toISOString()
        }
      });
      
      console.log('🎉 웰컴 CUE 지급 완료:', userDid, welcomeAmount);
    } catch (error) {
      console.error('❌ 웰컴 CUE 지급 실패:', error);
    }
  }

  // ============================================================================
  // 🛠️ 유틸리티 메서드
  // ============================================================================

  /**
   * 사용자 응답 포맷팅 (프론트엔드 호환성)
   */
  formatUserResponse(user: User): UserResponse {
    return {
      // 기본 정보
      id: user.id,
      username: user.username,
      email: user.email,
      did: user.did,
      
      // 지갑 정보 (호환성을 위한 중복 키)
      wallet_address: user.wallet_address,
      walletAddress: user.wallet_address,
      
      // 프로필 정보
      display_name: user.display_name,
      
      // 점수 및 레벨 (호환성을 위한 중복 키)
      trust_score: user.trust_score,
      trustScore: user.trust_score,
      passport_level: user.passport_level,
      passportLevel: user.passport_level,
      
      // 인증 상태 (호환성을 위한 중복 키)
      biometric_verified: user.biometric_verified,
      biometricVerified: user.biometric_verified,
      passkey_registered: user.passkey_registered ?? true,
      passkeyRegistered: user.passkey_registered ?? true,
      
      // CUE 토큰 (호환성을 위한 중복 키)
      cue_tokens: user.cue_tokens,
      cueBalance: user.cue_tokens,
      
      // 날짜 정보 (호환성을 위한 중복 키)
      created_at: user.created_at,
      registeredAt: user.created_at,
      last_login_at: user.last_login_at,
      lastLoginAt: user.last_login_at
    };
  }

  /**
   * DID 생성
   */
  generateDID(userId: string): string {
    return `did:ai-personal:${userId}`;
  }

  /**
   * 지갑 주소 생성
   */
  generateWalletAddress(): string {
    return `0x${crypto.randomBytes(20).toString('hex')}`;
  }

  /**
   * Mock 사용자 생성 (Credential 기반)
   */
  private createMockUserFromCredential(credentialId: string): User {
    const userId = `user_${credentialId.substring(0, 8)}`;
    const businessConfig = this.config.getBusinessConfig();
    
    return {
      id: userId,
      username: `MockUser_${credentialId.substring(0, 8)}`,
      email: `${userId}@mock.example.com`,
      did: this.generateDID(userId),
      wallet_address: this.generateWalletAddress(),
      display_name: `Mock User ${userId.substring(0, 6)}`,
      trust_score: businessConfig.defaultTrustScore,
      passport_level: businessConfig.defaultPassportLevel,
      biometric_verified: true,
      passkey_registered: true,
      auth_method: 'passkey',
      cue_tokens: businessConfig.welcomeCUE,
      created_at: new Date().toISOString()
    };
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats(userId: string): Promise<any> {
    try {
      const user = await this.findUserById(userId);
      if (!user) return null;

      const cueBalance = await this.getCUEBalance(user.did);
      
      return {
        userId: user.id,
        username: user.username,
        did: user.did,
        trustScore: user.trust_score,
        passportLevel: user.passport_level,
        cueBalance,
        biometricVerified: user.biometric_verified,
        passkeyRegistered: user.passkey_registered ?? true,
        loginCount: user.login_count || 0,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      };
    } catch (error) {
      console.error('❌ 사용자 통계 조회 실패:', error);
      return null;
    }
  }

  /**
   * 인증 시스템 상태 확인
   */
  async getAuthSystemStatus(): Promise<any> {
    try {
      const dbStatus = await this.dbService.getStatus?.() || { connected: true, type: 'mock' };
      
      return {
        database: {
          connected: dbStatus.connected,
          type: this.config.DATABASE_TYPE,
          lastCheck: new Date().toISOString()
        },
        services: {
          auth: true,
          webauthn: true,
          session: true,
          cue: true
        },
        config: {
          jwtConfigured: !!this.config.JWT_SECRET,
          webauthnConfigured: !!this.config.WEBAUTHN_RP_ID,
          databaseType: this.config.DATABASE_TYPE
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 인증 시스템 상태 확인 실패:', error);
      return {
        database: { connected: false, error: error.message },
        services: { auth: false },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 서비스 정리 (DI Container에서 호출)
   */
  dispose(): void {
    console.log('🧹 AuthService 정리 중...');
    // 필요한 정리 작업 수행
    console.log('✅ AuthService 정리 완료');
  }
}

// ============================================================================
// 📁 backend/src/services/auth/SessionService.ts
// 🔧 리팩토링된 SessionService - 순환 의존성 제거
// ============================================================================

import jwt from 'jsonwebtoken';
import { 
  SessionData, 
  SessionTokenPayload, 
  SessionType,
  DeviceInfo 
} from '../../types/auth.types';

/**
 * 세션 관리 서비스 - DI 패턴 적용
 * AuthService에 의존하지만 순환 의존성 없음
 */
export class SessionService {
  private sessionStore = new Map<string, SessionData>();
  private config: AuthConfig;
  private authService: AuthService; // DI를 통해 주입받음

  constructor(
    config: AuthConfig,
    authService: AuthService
  ) {
    this.config = config;
    this.authService = authService;
    
    console.log('🔧 SessionService 초기화 완료 (DI 패턴)');
    console.log(`⏰ Session Timeout: ${config.SESSION_TIMEOUT / (24 * 60 * 60 * 1000)}일`);
    
    // 정기적인 세션 정리
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, config.SESSION_CLEANUP_INTERVAL);
  }

  // ============================================================================
  // 🔑 JWT 토큰 관리
  // ============================================================================

  /**
   * JWT 세션 토큰 생성
   */
  generateSessionToken(userId: string, credentialId?: string, deviceId?: string): string {
    const now = Math.floor(Date.now() / 1000);
    const jwtConfig = this.config.getJWTConfig();
    
    const payload: SessionTokenPayload = {
      userId,
      credentialId,
      type: 'session',
      iat: now,
      exp: now + (this.config.SESSION_TIMEOUT / 1000),
      iss: jwtConfig.issuer,
      aud: jwtConfig.audience,
      deviceId
    };
    
    const token = jwt.sign(payload, jwtConfig.secret, { algorithm: jwtConfig.algorithm });
    console.log(`🔑 세션 토큰 생성: ${userId} (유효기간: ${this.config.SESSION_TIMEOUT / (24 * 60 * 60 * 1000)}일)`);
    
    return token;
  }

  /**
   * JWT 세션 토큰 검증
   */
  verifySessionToken(token: string): SessionTokenPayload | null {
    try {
      const jwtConfig = this.config.getJWTConfig();
      const decoded = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }) as SessionTokenPayload;
      
      console.log(`✅ 세션 토큰 검증 성공: ${decoded.userId}`);
      return decoded;
    } catch (error: any) {
      console.error('❌ 세션 토큰 검증 실패:', error.message);
      return null;
    }
  }

  // ============================================================================
  // 👤 사용자 조회 (AuthService 위임)
  // ============================================================================

  /**
   * 세션 토큰으로 사용자 조회
   */
  async getUserBySession(sessionToken: string): Promise<any> {
    try {
      // JWT 토큰 검증
      const decoded = this.verifySessionToken(sessionToken);
      if (!decoded?.userId) {
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
        
        // 로그인 시간 업데이트 (백그라운드)
        this.updateLastLoginBackground(user.id);
        
        return this.authService.formatUserResponse(user);
      } else {
        console.log('⚠️ AuthService에서 사용자 찾을 수 없음');
        return null;
      }
      
    } catch (error) {
      console.error('❌ 세션으로 사용자 조회 실패:', error);
      return null;
    }
  }

  /**
   * 마지막 로그인 시간 업데이트 (백그라운드)
   */
  private async updateLastLoginBackground(userId: string): Promise<void> {
    try {
      await this.authService.updateUser(userId, {
        last_login_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ 마지막 로그인 시간 업데이트 실패:', error);
    }
  }

  // ============================================================================
  // 💾 메모리 세션 관리
  // ============================================================================

  /**
   * 메모리 세션 생성
   */
  createSession(sessionData: Omit<SessionData, 'created' | 'lastAccess' | 'isActive' | 'expiresAt'>): void {
    const session: SessionData = {
      ...sessionData,
      created: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      isActive: true,
      expiresAt: Date.now() + this.config.SESSION_TIMEOUT
    };
    
    this.sessionStore.set(sessionData.id, session);
    console.log(`💾 세션 생성됨: ${sessionData.id} (타입: ${sessionData.type})`);
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
    if (session.expiresAt && session.expiresAt < Date.now()) {
      console.log(`⏰ 세션 만료됨: ${sessionId}`);
      this.sessionStore.delete(sessionId);
      return null;
    }
    
    // 마지막 접근 시간 업데이트
    session.lastAccess = new Date().toISOString();
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

  /**
   * 활성 세션 목록 조회
   */
  getActiveSessions(): SessionData[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessionStore.values()).filter(session => session.isActive);
  }

  // ============================================================================
  // 🧹 세션 정리 및 관리
  // ============================================================================

  /**
   * 만료된 세션 정리
   */
  private cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessionStore.entries()) {
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

  /**
   * 사용자별 세션 정리 (보안)
   */
  cleanupUserSessions(userId: string, keepCurrentSession?: string): number {
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (session.userId === userId && sessionId !== keepCurrentSession) {
        this.sessionStore.delete(sessionId);
        cleanedCount++;
      }
    }
    
    console.log(`🧹 사용자 ${userId}의 이전 세션 ${cleanedCount}개 정리됨`);
    return cleanedCount;
  }

  /**
   * 세션 정보 조회 (디버깅용)
   */
  getSessionInfo(): any {
    const activeSessions = this.getActiveSessions();
    
    return {
      activeSessionCount: activeSessions.length,
      sessionsByType: this.getSessionStatsByType(),
      jwtSecret: this.config.JWT_SECRET.substring(0, 10) + '...',
      sessionTimeout: this.config.SESSION_TIMEOUT,
      maxSessionsPerUser: this.config.MAX_SESSIONS_PER_USER,
      cleanupInterval: this.config.SESSION_CLEANUP_INTERVAL
    };
  }

  /**
   * 세션 타입별 통계
   */
  private getSessionStatsByType(): Record<SessionType, number> {
    const stats: Record<SessionType, number> = {
      'registration': 0,
      'authentication': 0,
      'unified': 0,
      'session': 0,
      'recovery': 0,
      'verification': 0
    };
    
    for (const session of this.getActiveSessions()) {
      stats[session.type] = (stats[session.type] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * 세션 무효화 (로그아웃 시 사용)
   */
  async invalidateSession(sessionToken: string): Promise<boolean> {
    try {
      const decoded = this.verifySessionToken(sessionToken);
      if (!decoded) return false;
      
      // JWT는 stateless이므로 블랙리스트에 추가하거나
      // 실제 구현에서는 Redis 등을 사용하여 무효화된 토큰 관리
      console.log(`🚫 세션 토큰 무효화: ${decoded.userId}`);
      
      return true;
    } catch (error) {
      console.error('❌ 세션 무효화 실패:', error);
      return false;
    }
  }

  /**
   * 통합 서비스 상태 조회
   */
  async getStatus(): Promise<any> {
    try {
      const authSystemStatus = await this.authService.getAuthSystemStatus();
      
      return {
        sessionService: {
          initialized: true,
          activeSessions: this.getActiveSessions().length,
          jwtConfigured: !!this.config.JWT_SECRET,
          sessionTimeout: this.config.SESSION_TIMEOUT,
          cleanupInterval: this.config.SESSION_CLEANUP_INTERVAL
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
   * 서비스 정리 (DI Container에서 호출)
   */
  dispose(): void {
    console.log('🧹 SessionService 정리 중...');
    this.sessionStore.clear();
    console.log('✅ SessionService 정리 완료');
  }
}

// ============================================================================
// 📁 backend/src/services/auth/WebAuthnService.ts
// 🔧 리팩토링된 WebAuthnService - 최적화된 의존성
// ============================================================================

import crypto from 'crypto';

/**
 * WebAuthn 서비스 - 패스키 인증 비즈니스 로직
 * AuthService와 SessionService에 의존하지만 순환 의존성 없음
 */
export class WebAuthnService {
  private config: AuthConfig;
  private authService: AuthService;
  private sessionService: SessionService;

  constructor(
    config: AuthConfig,
    authService: AuthService,
    sessionService: SessionService
  ) {
    this.config = config;
    this.authService = authService;
    this.sessionService = sessionService;
    
    console.log('🔐 WebAuthnService 초기화 완료 (DI 패턴)');
    console.log(`🏷️  RP ID: ${config.WEBAUTHN_RP_ID}`);
  }

  // ============================================================================
  // 🔥 통합 WebAuthn 인증 (핵심 기능)
  // ============================================================================

  /**
   * 통합 인증 시작 - 로그인/가입 자동 판별
   */
  async startUnifiedAuthentication(deviceInfo?: DeviceInfo) {
    console.log('🔍 통합 WebAuthn 인증 시작');

    const webauthnConfig = this.config.getWebAuthnConfig();
    
    const options = {
      challenge: this.generateChallenge(),
      timeout: webauthnConfig.timeout,
      rpId: webauthnConfig.rpID,
      allowCredentials: [], // 🔑 빈 배열 = 모든 기존 패스키 허용
      userVerification: webauthnConfig.userVerification
    };

    const sessionId = this.generateSessionId('unified');
    
    this.sessionService.createSession({
      id: sessionId,
      challenge: options.challenge,
      type: 'unified',
      deviceInfo: deviceInfo || {},
      timestamp: Date.now()
    });

    console.log('✅ 통합 인증 옵션 생성 완료:', sessionId);
    return { options, sessionId };
  }

  /**
   * 통합 인증 완료 - 기존/신규 사용자 자동 처리 (paste.txt 로직 보존)
   */
  async completeUnifiedAuthentication(credential: any, sessionId: string, userAgent: string) {
    console.log('✅ 통합 WebAuthn 인증 완료');

    // 세션 검증
    const sessionData = this.sessionService.getSession(sessionId);
    if (!sessionData) {
      throw new Error('유효하지 않거나 만료된 세션입니다');
    }

    console.log('✅ 임시 세션 검증 완료');

    // 🔍 STEP 1: credential.id로 기존 사용자 확인 (paste.txt 로직 그대로)
    console.log('🔍 기존 사용자 확인 중... credential_id:', credential.id);
    
    const existingUser = await this.authService.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      // 🔑 기존 사용자 - 자동 로그인 (paste.txt 로직 그대로)
      console.log('🎉 기존 사용자 자동 로그인!', {
        id: existingUser.id,
        username: existingUser.username,
        cueTokens: existingUser.cue_tokens
      });
      
      const sessionToken = this.sessionService.generateSessionToken(
        existingUser.id, 
        credential.id
      );
      
      // 마지막 사용 시간 업데이트
      await this.authService.updateCredentialLastUsed(credential.id);
      
      // 임시 세션 정리
      this.sessionService.deleteSession(sessionId);
      
      return {
        action: 'login',
        sessionToken,
        user: this.authService.formatUserResponse(existingUser),
        isExistingUser: true,
        message: '환영합니다! 기존 계정으로 로그인되었습니다.'
      };
    }
    
    // 🆕 STEP 2: 신규 사용자 - 회원가입 진행 (paste.txt 로직 그대로)
    console.log('🆕 신규 사용자 회원가입 진행');
    
    const userId = crypto.randomUUID();
    const username = `PassKey_User_${Date.now()}`;
    
    // 신규 사용자 데이터 생성
    const userData: CreateUserData = {
      id: userId,
      username,
      email: null, // PassKey 전용이므로 이메일 없음
      did: this.authService.generateDID(userId),
      wallet_address: this.authService.generateWalletAddress(),
      auth_method: 'passkey'
    };

    console.log('📝 신규 사용자 데이터 준비:', {
      id: userData.id,
      username: userData.username,
      did: userData.did
    });

    // 사용자 DB 저장
    const user = await this.authService.createUser(userData);

    // WebAuthn credential 저장
    await this.authService.saveWebAuthnCredential({
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from('mock-public-key-data').toString('base64'),
      counter: 0,
      device_type: 'platform',
      user_agent: userAgent,
      device_fingerprint: sessionData.deviceInfo
    });

    // 세션 토큰 생성
    const sessionToken = this.sessionService.generateSessionToken(userId, credential.id);
    
    // 임시 세션 정리
    this.sessionService.deleteSession(sessionId);
    
    console.log('🎉 신규 사용자 등록 완료!');
    
    return {
      action: 'register',
      sessionToken,
      user: this.authService.formatUserResponse(user),
      isExistingUser: false,
      rewards: { welcomeCUE: this.config.getBusinessConfig().welcomeCUE },
      message: '🎉 새로운 AI Passport가 생성되었습니다!'
    };
  }

  // ============================================================================
  // 🔧 하위 호환성 API들 (기존 코드 지원)
  // ============================================================================

  /**
   * 회원가입 시작 (하위 호환성)
   */
  async startRegistration(userEmail?: string, deviceInfo?: DeviceInfo) {
    console.log('🆕 WebAuthn 등록 시작 (하위 호환성)');
    
    const webauthnConfig = this.config.getWebAuthnConfig();
    const userId = crypto.randomUUID();
    const userName = userEmail || `user_${Date.now()}`;
    
    const options = {
      rp: {
        name: webauthnConfig.rpName,
        id: webauthnConfig.rpID
      },
      user: {
        id: this.base64urlEncode(Buffer.from(userId)),
        name: userName,
        displayName: userName
      },
      challenge: this.generateChallenge(),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" as const },
        { alg: -257, type: "public-key" as const }
      ],
      timeout: webauthnConfig.timeout,
      attestation: "none" as const,
      authenticatorSelection: webauthnConfig.authenticatorSelection
    };

    const sessionId = this.generateSessionId('register');
    
    this.sessionService.createSession({
      id: sessionId,
      challenge: options.challenge,
      userId,
      userName,
      userEmail,
      deviceInfo: deviceInfo || {},
      type: 'registration',
      timestamp: Date.now()
    });

    console.log('✅ 등록 옵션 생성 완료');

    return {
      options,
      sessionId,
      user: {
        id: userId,
        username: userName,
        email: userEmail
      }
    };
  }

  /**
   * 로그인 시작 (하위 호환성)
   */
  async startLogin(deviceInfo?: DeviceInfo) {
    console.log('🔓 WebAuthn 로그인 시작 (하위 호환성)');
    
    const webauthnConfig = this.config.getWebAuthnConfig();
    
    const options = {
      challenge: this.generateChallenge(),
      timeout: webauthnConfig.timeout,
      rpId: webauthnConfig.rpID,
      allowCredentials: [], // 모든 등록된 자격 증명 허용
      userVerification: webauthnConfig.userVerification
    };

    const sessionId = this.generateSessionId('login');
    
    this.sessionService.createSession({
      id: sessionId,
      challenge: options.challenge,
      deviceInfo: deviceInfo || {},
      type: 'authentication',
      timestamp: Date.now()
    });

    console.log('✅ 로그인 옵션 생성 완료');

    return {
      options,
      sessionId
    };
  }

  // ============================================================================
  // 🛠️ 유틸리티 함수들
  // ============================================================================

  private generateChallenge(): string {
    return this.base64urlEncode(Buffer.from(`challenge_${Date.now()}_${Math.random()}`));
  }

  private generateSessionId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private base64urlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * 서비스 정리 (DI Container에서 호출)
   */
  dispose(): void {
    console.log('🧹 WebAuthnService 정리 중...');
    // 필요한 정리 작업 수행
    console.log('✅ WebAuthnService 정리 완료');
  }
}

// ============================================================================
// 📤 리팩토링 완료 - Export
// ============================================================================

