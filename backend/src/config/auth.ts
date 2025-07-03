// ============================================================================
// 📁 backend/src/config/auth.ts
// 🔧 통합 AuthConfig - 모든 인증 관련 설정을 중앙에서 관리
// ============================================================================

import crypto from 'crypto';

export class AuthConfig {
  private static instance: AuthConfig;
  
  // 🔑 JWT 설정
  public readonly JWT_SECRET: string;
  public readonly JWT_EXPIRES_IN: string;
  public readonly JWT_ISSUER: string;
  public readonly JWT_AUDIENCE: string;

  // 🔐 WebAuthn 설정
  public readonly WEBAUTHN_RP_NAME: string;
  public readonly WEBAUTHN_RP_ID: string;
  public readonly WEBAUTHN_ORIGIN: string;
  public readonly WEBAUTHN_TIMEOUT: number;

  // ⏰ 세션 설정
  public readonly SESSION_TIMEOUT: number; // milliseconds
  public readonly SESSION_CLEANUP_INTERVAL: number;
  public readonly MAX_SESSIONS_PER_USER: number;

  // 🗄️ 데이터베이스 설정
  public readonly DATABASE_TYPE: 'supabase' | 'mock';
  public readonly SUPABASE_URL?: string;
  public readonly SUPABASE_SERVICE_KEY?: string;
  public readonly SUPABASE_ANON_KEY?: string;

  // 🎯 비즈니스 로직 설정
  public readonly WELCOME_CUE_AMOUNT: number;
  public readonly DEFAULT_TRUST_SCORE: number;
  public readonly DEFAULT_PASSPORT_LEVEL: string;

  // 🔒 보안 설정
  public readonly RATE_LIMIT_WINDOW: number;
  public readonly RATE_LIMIT_MAX_REQUESTS: number;
  public readonly PASSWORD_SALT_ROUNDS: number;

  private constructor() {
    console.log('🔧 AuthConfig 초기화 시작...');

    // JWT 설정 로드
    this.JWT_SECRET = this.validateJWTSecret(
      process.env.JWT_SECRET || 'ai-personal-development-secret-key-32chars-minimum'
    );
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
    this.JWT_ISSUER = process.env.JWT_ISSUER || 'ai-personal-backend';
    this.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'ai-personal-frontend';

    // WebAuthn 설정 로드
    this.WEBAUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME || 'AI Personal Platform';
    this.WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
    this.WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
    this.WEBAUTHN_TIMEOUT = parseInt(process.env.WEBAUTHN_TIMEOUT || '60000');

    // 세션 설정
    this.SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || (30 * 24 * 60 * 60 * 1000).toString()); // 30일
    this.SESSION_CLEANUP_INTERVAL = parseInt(process.env.SESSION_CLEANUP_INTERVAL || (5 * 60 * 1000).toString()); // 5분
    this.MAX_SESSIONS_PER_USER = parseInt(process.env.MAX_SESSIONS_PER_USER || '5');

    // 데이터베이스 설정 결정
    this.SUPABASE_URL = process.env.SUPABASE_URL;
    this.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    
    this.DATABASE_TYPE = this.determineDatabaseType();

    // 비즈니스 로직 설정
    this.WELCOME_CUE_AMOUNT = parseInt(process.env.WELCOME_CUE_AMOUNT || '15428');
    this.DEFAULT_TRUST_SCORE = parseFloat(process.env.DEFAULT_TRUST_SCORE || '85.0');
    this.DEFAULT_PASSPORT_LEVEL = process.env.DEFAULT_PASSPORT_LEVEL || 'Basic';

    // 보안 설정
    this.RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || (15 * 60 * 1000).toString()); // 15분
    this.RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');
    this.PASSWORD_SALT_ROUNDS = parseInt(process.env.PASSWORD_SALT_ROUNDS || '12');

    // 설정 검증
    this.validateConfiguration();
    this.logConfiguration();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): AuthConfig {
    if (!AuthConfig.instance) {
      AuthConfig.instance = new AuthConfig();
    }
    return AuthConfig.instance;
  }

  /**
   * JWT Secret 검증 및 생성
   */
  private validateJWTSecret(secret: string): string {
    if (secret.length < 32) {
      console.warn('⚠️ JWT_SECRET이 32자보다 짧습니다. 보안상 위험할 수 있습니다.');
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Production 환경에서는 최소 32자 이상의 JWT_SECRET이 필요합니다.');
      }
      
      // 개발 환경에서는 자동으로 안전한 키 생성
      const generatedSecret = crypto.randomBytes(32).toString('hex');
      console.log('🔑 개발용 JWT_SECRET 자동 생성됨');
      return generatedSecret;
    }
    
    return secret;
  }

  /**
   * 데이터베이스 타입 결정
   */
  private determineDatabaseType(): 'supabase' | 'mock' {
    if (this.SUPABASE_URL && 
        this.SUPABASE_SERVICE_KEY && 
        !this.SUPABASE_URL.includes('dummy') &&
        !this.SUPABASE_URL.includes('example')) {
      return 'supabase';
    }
    
    console.log('🎭 Mock 데이터베이스 모드로 실행됩니다.');
    return 'mock';
  }

  /**
   * 전체 설정 검증
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    // JWT 검증
    if (!this.JWT_SECRET) {
      errors.push('JWT_SECRET이 설정되지 않았습니다.');
    }

    // WebAuthn 검증
    if (!this.WEBAUTHN_RP_NAME) {
      errors.push('WEBAUTHN_RP_NAME이 설정되지 않았습니다.');
    }

    if (!this.WEBAUTHN_RP_ID) {
      errors.push('WEBAUTHN_RP_ID가 설정되지 않았습니다.');
    }

    // URL 형식 검증
    try {
      new URL(this.WEBAUTHN_ORIGIN);
    } catch {
      errors.push('WEBAUTHN_ORIGIN이 유효한 URL이 아닙니다.');
    }

    // 숫자 값 검증
    if (this.WEBAUTHN_TIMEOUT < 30000 || this.WEBAUTHN_TIMEOUT > 300000) {
      console.warn('⚠️ WEBAUTHN_TIMEOUT은 30초~5분 사이가 권장됩니다.');
    }

    if (this.SESSION_TIMEOUT < 60000) { // 최소 1분
      errors.push('SESSION_TIMEOUT은 최소 60초 이상이어야 합니다.');
    }

    // Production 환경 추가 검증
    if (process.env.NODE_ENV === 'production') {
      if (this.DATABASE_TYPE === 'mock') {
        console.warn('⚠️ Production 환경에서 Mock 데이터베이스를 사용중입니다.');
      }

      if (this.WEBAUTHN_ORIGIN.includes('localhost')) {
        errors.push('Production 환경에서는 localhost를 사용할 수 없습니다.');
      }
    }

    if (errors.length > 0) {
      throw new Error(`AuthConfig 설정 오류:\n${errors.join('\n')}`);
    }
  }

  /**
   * 설정 로깅
   */
  private logConfiguration(): void {
    console.log('🔐 ===== AuthConfig 설정 완료 =====');
    console.log(`🏷️  RP Name: ${this.WEBAUTHN_RP_NAME}`);
    console.log(`🌐 RP ID: ${this.WEBAUTHN_RP_ID}`);
    console.log(`🔗 Origin: ${this.WEBAUTHN_ORIGIN}`);
    console.log(`🗄️  Database: ${this.DATABASE_TYPE}`);
    console.log(`⏰ Session Timeout: ${this.SESSION_TIMEOUT / (24 * 60 * 60 * 1000)}일`);
    console.log(`💰 Welcome CUE: ${this.WELCOME_CUE_AMOUNT}`);
    console.log(`🎯 Default Trust Score: ${this.DEFAULT_TRUST_SCORE}`);
    console.log(`🔑 JWT Secret Length: ${this.JWT_SECRET.length}자`);
    console.log('🔐 ================================');
  }

  // ============================================================================
  // 🎯 설정 그룹별 접근 메서드
  // ============================================================================

  /**
   * JWT 관련 설정 반환
   */
  getJWTConfig() {
    return {
      secret: this.JWT_SECRET,
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: this.JWT_ISSUER,
      audience: this.JWT_AUDIENCE,
      algorithm: 'HS256' as const
    };
  }

  /**
   * WebAuthn 관련 설정 반환
   */
  getWebAuthnConfig() {
    return {
      rpName: this.WEBAUTHN_RP_NAME,
      rpID: this.WEBAUTHN_RP_ID,
      origin: this.WEBAUTHN_ORIGIN,
      timeout: this.WEBAUTHN_TIMEOUT,
      userVerification: 'preferred' as const,
      attestation: 'none' as const,
      authenticatorSelection: {
        authenticatorAttachment: 'platform' as const,
        userVerification: 'preferred' as const,
        residentKey: 'preferred' as const
      }
    };
  }

  /**
   * 세션 관련 설정 반환
   */
  getSessionConfig() {
    return {
      timeout: this.SESSION_TIMEOUT,
      cleanupInterval: this.SESSION_CLEANUP_INTERVAL,
      maxSessionsPerUser: this.MAX_SESSIONS_PER_USER,
      cookieName: 'ai-personal-session',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict' as const
    };
  }

  /**
   * 데이터베이스 관련 설정 반환
   */
  getDatabaseConfig() {
    return {
      type: this.DATABASE_TYPE,
      supabase: {
        url: this.SUPABASE_URL,
        serviceKey: this.SUPABASE_SERVICE_KEY,
        anonKey: this.SUPABASE_ANON_KEY
      },
      fallbackToMock: true
    };
  }

  /**
   * 비즈니스 로직 설정 반환
   */
  getBusinessConfig() {
    return {
      welcomeCUE: this.WELCOME_CUE_AMOUNT,
      defaultTrustScore: this.DEFAULT_TRUST_SCORE,
      defaultPassportLevel: this.DEFAULT_PASSPORT_LEVEL,
      maxRetryAttempts: 3,
      retryDelay: 1000
    };
  }

  /**
   * 보안 관련 설정 반환
   */
  getSecurityConfig() {
    return {
      rateLimit: {
        windowMs: this.RATE_LIMIT_WINDOW,
        maxRequests: this.RATE_LIMIT_MAX_REQUESTS
      },
      passwordSaltRounds: this.PASSWORD_SALT_ROUNDS,
      allowedOrigins: this.getAllowedOrigins(),
      corsEnabled: true
    };
  }

  // ============================================================================
  // 🛠️ 유틸리티 메서드
  // ============================================================================

  /**
   * 허용된 Origin 목록 반환
   */
  private getAllowedOrigins(): string[] {
    const origins = [this.WEBAUTHN_ORIGIN];
    
    // 개발 환경에서는 추가 Origin 허용
    if (process.env.NODE_ENV === 'development') {
      origins.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
    }
    
    // 환경변수에서 추가 Origin 로드
    const additionalOrigins = process.env.ADDITIONAL_ORIGINS?.split(',') || [];
    origins.push(...additionalOrigins.map(origin => origin.trim()));
    
    return [...new Set(origins)]; // 중복 제거
  }

  /**
   * 환경별 설정 확인
   */
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * 설정 유효성 재검증
   */
  public validateCurrentConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 런타임 검증
    if (!this.JWT_SECRET || this.JWT_SECRET.length < 16) {
      errors.push('JWT_SECRET가 너무 짧습니다.');
    }
    
    if (this.isProduction() && this.DATABASE_TYPE === 'mock') {
      errors.push('Production 환경에서는 실제 데이터베이스를 사용해야 합니다.');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 전체 설정 정보 반환 (디버깅용)
   */
  public getFullConfig(): Record<string, any> {
    return {
      jwt: this.getJWTConfig(),
      webauthn: this.getWebAuthnConfig(),
      session: this.getSessionConfig(),
      database: this.getDatabaseConfig(),
      business: this.getBusinessConfig(),
      security: this.getSecurityConfig(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isDevelopment: this.isDevelopment(),
        isProduction: this.isProduction()
      }
    };
  }

  /**
   * 설정 재로드 (환경변수 변경 시)
   */
  public static reload(): AuthConfig {
    AuthConfig.instance = new AuthConfig();
    console.log('🔄 AuthConfig 재로드 완료');
    return AuthConfig.instance;
  }

  /**
   * 설정 요약 정보 (로그용)
   */
  public getSummary(): string {
    const config = this.validateCurrentConfig();
    
    return `
🔐 AuthConfig Summary:
- Environment: ${process.env.NODE_ENV || 'development'}
- Database: ${this.DATABASE_TYPE}
- WebAuthn RP: ${this.WEBAUTHN_RP_NAME}
- Session Timeout: ${this.SESSION_TIMEOUT / (24 * 60 * 60 * 1000)} days
- JWT Secret: ${this.JWT_SECRET.length} chars
- Validation: ${config.valid ? '✅ Valid' : '❌ Invalid'}
${config.errors.length > 0 ? '- Errors: ' + config.errors.join(', ') : ''}
    `.trim();
  }
}

// ============================================================================
// 📤 Export 및 초기화
// ============================================================================

/**
 * AuthConfig 인스턴스 생성 및 초기화
 */
export function initializeAuthConfig(): AuthConfig {
  const config = AuthConfig.getInstance();
  console.log(config.getSummary());
  return config;
}

/**
 * 빠른 설정 접근을 위한 헬퍼 함수들
 */
export const getJWTSecret = () => AuthConfig.getInstance().JWT_SECRET;
export const getDatabaseType = () => AuthConfig.getInstance().DATABASE_TYPE;
export const getWebAuthnRPID = () => AuthConfig.getInstance().WEBAUTHN_RP_ID;
export const getSessionTimeout = () => AuthConfig.getInstance().SESSION_TIMEOUT;

// 기본 export
export default AuthConfig;