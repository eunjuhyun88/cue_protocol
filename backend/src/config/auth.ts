// ============================================================================
// 📁 backend/src/config/auth.ts (즉시 도입용 간단 버전)
// ============================================================================

export class AuthConfig {
  static JWT_SECRET = process.env.JWT_SECRET || 'ai-personal-development-secret-key-32chars-minimum';
  static WEBAUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME || 'AI Personal Platform';
  static WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
  static WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
  static SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30일

  static initialize() {
    console.log('🔐 인증 설정 초기화');
    console.log(`🏷️  RP Name: ${this.WEBAUTHN_RP_NAME}`);
    console.log(`🌐 RP ID: ${this.WEBAUTHN_RP_ID}`);
    console.log(`🔗 Origin: ${this.WEBAUTHN_ORIGIN}`);
    
    if (this.JWT_SECRET.length < 32) {
      console.warn('⚠️ JWT_SECRET이 32자보다 짧습니다. 보안상 위험할 수 있습니다.');
    }
  }

  static getJWTConfig() {
    return {
      secret: this.JWT_SECRET,
      expiresIn: '30d',
      issuer: 'ai-personal-backend',
      audience: 'ai-personal-frontend'
    };
  }

  static getWebAuthnConfig() {
    return {
      rpName: this.WEBAUTHN_RP_NAME,
      rpID: this.WEBAUTHN_RP_ID,
      origin: this.WEBAUTHN_ORIGIN,
      timeout: 60000,
      userVerification: 'preferred' as const
    };
  }

  static getSessionConfig() {
    return {
      timeout: this.SESSION_TIMEOUT,
      cookieName: 'ai-personal-session',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    };
  }

  static getDatabaseConfig() {
    return {
      useSupabase: process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('dummy'),
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
      fallbackToMock: true
    };
  }

  static validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET는 최소 32자 이상이어야 합니다');
    }
    
    if (!this.WEBAUTHN_RP_NAME) {
      errors.push('WEBAUTHN_RP_NAME이 설정되지 않았습니다');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}