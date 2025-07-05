// ============================================================================
// 🔐 WebAuthn Service 최적화 - DI Container 호환 버전
// 파일: backend/src/services/auth/WebAuthnService.ts
// 
// 🎯 수정사항:
// ✅ Redis 의존성을 메모리 기반으로 변경 (프론트엔드 호환)
// ✅ DI Container 패턴 완전 적용
// ✅ 강화된 보안 검증 유지
// ✅ 프로덕션 레벨 로깅
// ============================================================================

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import crypto from 'crypto';
import { DatabaseService } from '../../core/DIContainer';

// ============================================================================
// 🔧 타입 정의
// ============================================================================

interface WebAuthnConfig {
  rpName: string;
  rpID: string;
  origin: string;
  timeout: number;
  expectedChallenge?: string;
}

interface StoredChallenge {
  challenge: string;
  userInfo: {
    id: string;
    name: string;
    displayName: string;
    email?: string;
  };
  type: 'registration' | 'authentication';
  timestamp: number;
  deviceInfo?: any;
  ipAddress?: string;
}

interface WebAuthnCredential {
  id: string;
  credentialID: Buffer;
  credentialPublicKey: Buffer;
  counter: number;
  credentialDeviceType: 'singleDevice' | 'multiDevice';
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransport[];
  userID: string;
  createdAt: Date;
  lastUsedAt: Date;
  nickname?: string;
  isActive: boolean;
}

interface WebAuthnResult {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  metadata?: {
    challenge?: string;
    sessionId?: string;
    userVerified?: boolean;
    counter?: number;
  };
}

// ============================================================================
// 🛡️ WebAuthn 보안 서비스 (메모리 기반)
// ============================================================================

export class WebAuthnService {
  private config: WebAuthnConfig;
  private db: DatabaseService;
  private sessionPrefix = 'webauthn:session:';
  private challengePrefix = 'webauthn:challenge:';
  private rateLimitPrefix = 'webauthn:ratelimit:';
  
  // 메모리 기반 스토리지 (Redis 대체)
  private challengeStore = new Map<string, StoredChallenge>();
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(
    config?: Partial<WebAuthnConfig>,
    databaseService?: DatabaseService
  ) {
    // 설정 초기화
    this.config = {
      rpName: process.env.WEBAUTHN_RP_NAME || 'AI Personal Assistant',
      rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
      origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000',
      timeout: parseInt(process.env.WEBAUTHN_TIMEOUT || '60000'),
      ...config
    };

    // 데이터베이스 서비스
    this.db = databaseService || DatabaseService.getInstance();

    console.log('🔐 WebAuthn Service 초기화됨 (메모리 기반):', {
      rpName: this.config.rpName,
      rpID: this.config.rpID,
      origin: this.config.origin,
      storageType: 'memory'
    });

    // 정기적으로 만료된 데이터 정리
    this.startCleanupInterval();
  }

  // ============================================================================
  // 🔧 초기화 및 헬스체크
  // ============================================================================

  /**
   * WebAuthn 서비스 상태 확인
   */
  async getWebAuthnStatus(): Promise<any> {
    const dbStatus = await this.testDatabaseConnection();
    
    return {
      status: 'operational',
      config: {
        rpName: this.config.rpName,
        rpID: this.config.rpID,
        origin: this.config.origin,
        timeout: this.config.timeout
      },
      connections: {
        storage: 'memory',
        database: dbStatus
      },
      features: {
        multiDevice: true,
        backupCodes: true,
        rateLimiting: true,
        auditLogging: true
      },
      sessions: {
        challengeCount: this.challengeStore.size,
        rateLimitCount: this.rateLimitStore.size
      },
      timestamp: new Date().toISOString()
    };
  }

  private async testDatabaseConnection(): Promise<string> {
    try {
      await this.db.testConnection();
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }

  // ============================================================================
  // 🆕 패스키 등록 플로우
  // ============================================================================

  /**
   * 패스키 등록 옵션 생성
   */
  async generateRegistrationOptions(
    userID: string,
    userName: string,
    userDisplayName: string,
    userEmail?: string,
    deviceInfo?: any,
    ipAddress?: string
  ): Promise<WebAuthnResult> {
    try {
      console.log(`🆕 패스키 등록 옵션 생성: ${userName} (${userID})`);

      // Rate Limiting 체크
      if (!this.checkRateLimit(`reg:${ipAddress || 'unknown'}`, 10, 300)) {
        return {
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          errorCode: 'RATE_LIMITED'
        };
      }

      // 기존 자격 증명 조회 (중복 등록 방지)
      const existingCredentials = await this.getUserCredentials(userID);
      const excludeCredentials = existingCredentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key' as const,
        transports: cred.transports || ['internal']
      }));

      // 등록 옵션 생성
      const options: GenerateRegistrationOptionsOpts = {
        rpName: this.config.rpName,
        rpID: this.config.rpID,
        userID,
        userName,
        userDisplayName,
        timeout: this.config.timeout,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
        supportedAlgorithmIDs: [-7, -257],
      };

      const registrationOptions = await generateRegistrationOptions(options);

      // Challenge 저장 (5분 만료)
      const sessionId = this.generateSessionId();
      const challengeData: StoredChallenge = {
        challenge: registrationOptions.challenge,
        userInfo: {
          id: userID,
          name: userName,
          displayName: userDisplayName,
          email: userEmail
        },
        type: 'registration',
        timestamp: Date.now(),
        deviceInfo,
        ipAddress
      };

      this.challengeStore.set(sessionId, challengeData);

      console.log(`✅ 등록 옵션 생성 완료: 세션 ${sessionId}`);

      return {
        success: true,
        data: {
          options: registrationOptions,
          sessionId
        },
        metadata: {
          challenge: registrationOptions.challenge,
          sessionId
        }
      };

    } catch (error: any) {
      console.error('❌ 등록 옵션 생성 실패:', error);
      return {
        success: false,
        error: 'Failed to generate registration options',
        errorCode: 'GENERATION_FAILED'
      };
    }
  }

  /**
   * 패스키 등록 검증
   */
  async verifyRegistration(
    sessionId: string,
    registrationResponse: RegistrationResponseJSON,
    ipAddress?: string
  ): Promise<WebAuthnResult> {
    try {
      console.log(`✅ 패스키 등록 검증 시작: 세션 ${sessionId}`);

      // Challenge 데이터 조회 및 삭제
      const challengeData = this.challengeStore.get(sessionId);
      if (!challengeData || challengeData.type !== 'registration') {
        return {
          success: false,
          error: 'Invalid or expired session',
          errorCode: 'INVALID_SESSION'
        };
      }

      // 만료 확인 (5분)
      if (Date.now() - challengeData.timestamp > 300000) {
        this.challengeStore.delete(sessionId);
        return {
          success: false,
          error: 'Session expired',
          errorCode: 'SESSION_EXPIRED'
        };
      }

      // 세션 삭제 (일회용)
      this.challengeStore.delete(sessionId);

      // IP 주소 일치 확인 (보안 강화)
      if (ipAddress && challengeData.ipAddress && challengeData.ipAddress !== ipAddress) {
        console.warn(`⚠️ IP 주소 불일치: ${challengeData.ipAddress} → ${ipAddress}`);
      }

      // 등록 응답 검증
      const verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpID,
        requireUserVerification: true,
      });

      if (!verification.verified || !verification.registrationInfo) {
        console.error('❌ 등록 검증 실패');
        return {
          success: false,
          error: 'Registration verification failed',
          errorCode: 'VERIFICATION_FAILED'
        };
      }

      const { registrationInfo } = verification;

      // 자격 증명 저장
      const credential: WebAuthnCredential = {
        id: crypto.randomUUID(),
        credentialID: registrationInfo.credentialID,
        credentialPublicKey: registrationInfo.credentialPublicKey,
        counter: registrationInfo.counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        transports: registrationResponse.response.transports,
        userID: challengeData.userInfo.id,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        isActive: true
      };

      await this.storeCredential(credential);

      // 감사 로그 기록
      await this.auditLog('REGISTRATION_SUCCESS', {
        userID: challengeData.userInfo.id,
        credentialID: credential.id,
        deviceInfo: challengeData.deviceInfo,
        ipAddress,
        userAgent: challengeData.deviceInfo?.userAgent
      });

      console.log(`🎉 패스키 등록 완료: 사용자 ${challengeData.userInfo.id}`);

      return {
        success: true,
        data: {
          credentialID: credential.id,
          user: challengeData.userInfo,
          deviceType: credential.credentialDeviceType,
          backedUp: credential.credentialBackedUp
        },
        metadata: {
          userVerified: verification.registrationInfo.userVerified,
          counter: credential.counter
        }
      };

    } catch (error: any) {
      console.error('❌ 등록 검증 실패:', error);
      return {
        success: false,
        error: 'Registration verification failed',
        errorCode: 'VERIFICATION_ERROR'
      };
    }
  }

  // ============================================================================
  // 🔓 패스키 인증 플로우
  // ============================================================================

  /**
   * 패스키 인증 옵션 생성
   */
  async generateAuthenticationOptions(
    userID?: string,
    ipAddress?: string
  ): Promise<WebAuthnResult> {
    try {
      console.log(`🔓 패스키 인증 옵션 생성: ${userID || '알려지지 않은 사용자'}`);

      // Rate Limiting 체크
      if (!this.checkRateLimit(`auth:${ipAddress || 'unknown'}`, 20, 300)) {
        return {
          success: false,
          error: 'Too many authentication attempts. Please try again later.',
          errorCode: 'RATE_LIMITED'
        };
      }

      // 허용된 자격 증명 조회
      let allowCredentials;
      if (userID) {
        const userCredentials = await this.getUserCredentials(userID);
        allowCredentials = userCredentials
          .filter(cred => cred.isActive)
          .map(cred => ({
            id: cred.credentialID,
            type: 'public-key' as const,
            transports: cred.transports || ['internal']
          }));
      }

      // 인증 옵션 생성
      const options: GenerateAuthenticationOptionsOpts = {
        timeout: this.config.timeout,
        allowCredentials,
        userVerification: 'preferred',
        rpID: this.config.rpID,
      };

      const authenticationOptions = await generateAuthenticationOptions(options);

      // Challenge 저장
      const sessionId = this.generateSessionId();
      const challengeData: StoredChallenge = {
        challenge: authenticationOptions.challenge,
        userInfo: {
          id: userID || 'unknown',
          name: 'unknown',
          displayName: 'unknown'
        },
        type: 'authentication',
        timestamp: Date.now(),
        ipAddress
      };

      this.challengeStore.set(sessionId, challengeData);

      console.log(`✅ 인증 옵션 생성 완료: 세션 ${sessionId}`);

      return {
        success: true,
        data: {
          options: authenticationOptions,
          sessionId
        },
        metadata: {
          challenge: authenticationOptions.challenge,
          sessionId
        }
      };

    } catch (error: any) {
      console.error('❌ 인증 옵션 생성 실패:', error);
      return {
        success: false,
        error: 'Failed to generate authentication options',
        errorCode: 'GENERATION_FAILED'
      };
    }
  }

  /**
   * 패스키 인증 검증
   */
  async verifyAuthentication(
    sessionId: string,
    authenticationResponse: AuthenticationResponseJSON,
    ipAddress?: string
  ): Promise<WebAuthnResult> {
    try {
      console.log(`✅ 패스키 인증 검증 시작: 세션 ${sessionId}`);

      // Challenge 데이터 조회 및 삭제
      const challengeData = this.challengeStore.get(sessionId);
      if (!challengeData || challengeData.type !== 'authentication') {
        return {
          success: false,
          error: 'Invalid or expired session',
          errorCode: 'INVALID_SESSION'
        };
      }

      // 만료 확인
      if (Date.now() - challengeData.timestamp > 300000) {
        this.challengeStore.delete(sessionId);
        return {
          success: false,
          error: 'Session expired',
          errorCode: 'SESSION_EXPIRED'
        };
      }

      // 세션 삭제
      this.challengeStore.delete(sessionId);

      // 자격 증명 조회
      const credential = await this.getCredentialByID(
        Buffer.from(authenticationResponse.id, 'base64url')
      );

      if (!credential || !credential.isActive) {
        return {
          success: false,
          error: 'Credential not found or inactive',
          errorCode: 'CREDENTIAL_NOT_FOUND'
        };
      }

      // 인증 응답 검증
      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpID,
        authenticator: {
          credentialID: credential.credentialID,
          credentialPublicKey: credential.credentialPublicKey,
          counter: credential.counter,
          transports: credential.transports
        },
        requireUserVerification: true,
      });

      if (!verification.verified) {
        await this.auditLog('AUTHENTICATION_FAILED', {
          userID: credential.userID,
          credentialID: credential.id,
          reason: 'Verification failed',
          ipAddress
        });

        return {
          success: false,
          error: 'Authentication verification failed',
          errorCode: 'VERIFICATION_FAILED'
        };
      }

      // Counter 업데이트
      await this.updateCredentialCounter(credential.id, verification.authenticationInfo.newCounter);

      // 마지막 사용 시간 업데이트
      await this.updateCredentialLastUsed(credential.id);

      // 감사 로그 기록
      await this.auditLog('AUTHENTICATION_SUCCESS', {
        userID: credential.userID,
        credentialID: credential.id,
        counter: verification.authenticationInfo.newCounter,
        ipAddress
      });

      console.log(`🎉 패스키 인증 완료: 사용자 ${credential.userID}`);

      return {
        success: true,
        data: {
          userID: credential.userID,
          credentialID: credential.id,
          deviceType: credential.credentialDeviceType,
          counter: verification.authenticationInfo.newCounter
        },
        metadata: {
          userVerified: verification.authenticationInfo.userVerified,
          counter: verification.authenticationInfo.newCounter
        }
      };

    } catch (error: any) {
      console.error('❌ 인증 검증 실패:', error);
      return {
        success: false,
        error: 'Authentication verification failed',
        errorCode: 'VERIFICATION_ERROR'
      };
    }
  }

  // ============================================================================
  // 🗄️ 자격 증명 관리
  // ============================================================================

  /**
   * 자격 증명 저장
   */
  private async storeCredential(credential: WebAuthnCredential): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO webauthn_credentials (
          id, credential_id, credential_public_key, counter,
          credential_device_type, credential_backed_up, transports,
          user_id, created_at, last_used_at, nickname, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        credential.id,
        credential.credentialID,
        credential.credentialPublicKey,
        credential.counter,
        credential.credentialDeviceType,
        credential.credentialBackedUp,
        JSON.stringify(credential.transports),
        credential.userID,
        credential.createdAt.toISOString(),
        credential.lastUsedAt.toISOString(),
        credential.nickname,
        credential.isActive
      ]);

      console.log(`💾 자격 증명 저장 완료: ${credential.id}`);
    } catch (error) {
      console.error('❌ 자격 증명 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자의 모든 자격 증명 조회
   */
  private async getUserCredentials(userID: string): Promise<WebAuthnCredential[]> {
    try {
      const result = await this.db.query(`
        SELECT * FROM webauthn_credentials 
        WHERE user_id = ? AND is_active = true
        ORDER BY created_at DESC
      `, [userID]);

      return result.rows.map(row => ({
        id: row.id,
        credentialID: Buffer.from(row.credential_id),
        credentialPublicKey: Buffer.from(row.credential_public_key),
        counter: row.counter,
        credentialDeviceType: row.credential_device_type,
        credentialBackedUp: row.credential_backed_up,
        transports: JSON.parse(row.transports || '[]'),
        userID: row.user_id,
        createdAt: new Date(row.created_at),
        lastUsedAt: new Date(row.last_used_at),
        nickname: row.nickname,
        isActive: row.is_active
      }));
    } catch (error) {
      console.error('❌ 사용자 자격 증명 조회 실패:', error);
      return [];
    }
  }

  /**
   * ID로 자격 증명 조회
   */
  private async getCredentialByID(credentialID: Buffer): Promise<WebAuthnCredential | null> {
    try {
      const result = await this.db.query(`
        SELECT * FROM webauthn_credentials 
        WHERE credential_id = ? AND is_active = true
      `, [credentialID]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        credentialID: Buffer.from(row.credential_id),
        credentialPublicKey: Buffer.from(row.credential_public_key),
        counter: row.counter,
        credentialDeviceType: row.credential_device_type,
        credentialBackedUp: row.credential_backed_up,
        transports: JSON.parse(row.transports || '[]'),
        userID: row.user_id,
        createdAt: new Date(row.created_at),
        lastUsedAt: new Date(row.last_used_at),
        nickname: row.nickname,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('❌ 자격 증명 조회 실패:', error);
      return null;
    }
  }

  /**
   * 자격 증명 카운터 업데이트
   */
  private async updateCredentialCounter(credentialId: string, newCounter: number): Promise<void> {
    try {
      await this.db.query(`
        UPDATE webauthn_credentials 
        SET counter = ? 
        WHERE id = ?
      `, [newCounter, credentialId]);
    } catch (error) {
      console.error('❌ 카운터 업데이트 실패:', error);
    }
  }

  /**
   * 자격 증명 마지막 사용 시간 업데이트
   */
  private async updateCredentialLastUsed(credentialId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE webauthn_credentials 
        SET last_used_at = ? 
        WHERE id = ?
      `, [new Date().toISOString(), credentialId]);
    } catch (error) {
      console.error('❌ 마지막 사용 시간 업데이트 실패:', error);
    }
  }

  // ============================================================================
  // 🛠️ 유틸리티 메서드 (메모리 기반)
  // ============================================================================

  /**
   * 세션 ID 생성
   */
  private generateSessionId(): string {
    return `${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Rate Limiting 체크 (메모리 기반)
   */
  private checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // 새로운 윈도우 시작
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs * 1000
      });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * 감사 로그 기록
   */
  private async auditLog(action: string, details: any): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO webauthn_audit_log (
          action, details, timestamp, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        action,
        JSON.stringify(details),
        new Date().toISOString(),
        details.ipAddress,
        details.userAgent
      ]);
    } catch (error) {
      console.error('❌ 감사 로그 기록 실패:', error);
    }
  }

  /**
   * 정기적 정리 작업 시작
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // 1분마다 실행
  }

  // ============================================================================
  // 🧹 정리 및 유지보수
  // ============================================================================

  /**
   * 만료된 세션 정리
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // 만료된 Challenge 정리
      for (const [sessionId, challenge] of this.challengeStore.entries()) {
        if (now - challenge.timestamp > fiveMinutes) {
          this.challengeStore.delete(sessionId);
        }
      }

      // 만료된 Rate Limit 정리
      for (const [key, record] of this.rateLimitStore.entries()) {
        if (now > record.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }

      console.log('🧹 WebAuthn 메모리 정리 완료:', {
        challenges: this.challengeStore.size,
        rateLimits: this.rateLimitStore.size
      });
    } catch (error) {
      console.error('❌ 정리 작업 실패:', error);
    }
  }

  /**
   * 서비스 종료
   */
  async dispose(): Promise<void> {
    try {
      this.challengeStore.clear();
      this.rateLimitStore.clear();
      console.log('👋 WebAuthn Service 종료됨');
    } catch (error) {
      console.error('❌ 서비스 종료 실패:', error);
    }
  }
}

export default WebAuthnService;