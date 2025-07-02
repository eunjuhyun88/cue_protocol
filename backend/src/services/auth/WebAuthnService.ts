// ============================================================================
// 🔐 WebAuthn 서비스 - 패스키 인증 비즈니스 로직
// 파일: backend/src/services/auth/WebAuthnService.ts
// 역할: WebAuthn 관련 모든 비즈니스 로직 처리
// ============================================================================

import crypto from 'crypto';
import { AuthConfig } from '../../config/auth';
import { AuthService } from './AuthService';
import { SessionService } from './SessionService';
import { 
  WebAuthnStartRequest,
  WebAuthnCompleteRequest,
  WebAuthnRegistrationOptions,
  WebAuthnLoginOptions 
} from '../../types/auth.types';

export class WebAuthnService {
  constructor(
    private authService = new AuthService(),
    private sessionService = new SessionService()
  ) {}

  // ============================================================================
  // 🔥 통합 WebAuthn 인증 (신규/기존 사용자 자동 감지)
  // ============================================================================

  /**
   * 통합 인증 시작 - 로그인/가입 자동 판별
   */
  async startUnifiedAuthentication(deviceInfo?: any) {
    console.log('🔍 통합 WebAuthn 인증 시작');

    const config = AuthConfig.getWebAuthnConfig();
    
    // 모든 패스키 허용하는 인증 옵션 생성
    const options: WebAuthnLoginOptions = {
      challenge: this.generateChallenge(),
      timeout: config.timeout,
      rpId: config.rpID,
      allowCredentials: [], // 🔑 빈 배열 = 모든 기존 패스키 허용
      userVerification: "preferred"
    };

    const sessionId = this.generateSessionId('unified');
    
    // 세션 저장
    this.sessionService.createSession({
      id: sessionId,
      challenge: options.challenge,
      type: 'unified',
      deviceInfo: deviceInfo || {},
      timestamp: Date.now(),
      created: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      isActive: true
    });

    console.log('✅ 통합 인증 옵션 생성 완료:', sessionId);

    return {
      options,
      sessionId
    };
  }

  /**
   * 통합 인증 완료 - 기존/신규 사용자 자동 처리
   */
  async completeUnifiedAuthentication(credential: any, sessionId: string, userAgent: string) {
    console.log('✅ 통합 WebAuthn 인증 완료');

    // 세션 검증
    const sessionData = this.sessionService.getSession(sessionId);
    if (!sessionData) {
      throw new Error('유효하지 않거나 만료된 세션입니다');
    }

    console.log('✅ 임시 세션 검증 완료');

    // 🔍 STEP 1: credential.id로 기존 사용자 확인
    console.log('🔍 기존 사용자 확인 중... credential_id:', credential.id);
    
    const existingUser = await this.authService.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      // 🔑 기존 사용자 - 자동 로그인
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
    
    // 🆕 STEP 2: 신규 사용자 - 회원가입 진행
    console.log('🆕 신규 사용자 회원가입 진행');
    
    const userId = crypto.randomUUID();
    const username = `PassKey_User_${Date.now()}`;
    
    // 신규 사용자 데이터 생성
    const userData = {
      id: userId,
      username,
      email: null, // PassKey 전용이므로 이메일 없음
      display_name: `AI Passport User ${username}`,
      did: `did:ai-personal:${userId}`,
      wallet_address: this.generateWalletAddress(),
      trust_score: 85.0,
      passport_level: 'Basic',
      biometric_verified: true,
      auth_method: 'passkey',
      cue_tokens: 15428,
      created_at: new Date().toISOString()
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
      rewards: { welcomeCUE: 15428 },
      message: '🎉 새로운 AI Passport가 생성되었습니다!'
    };
  }

  // ============================================================================
  // 🔧 기존 WebAuthn API (하위 호환성)
  // ============================================================================

  /**
   * 회원가입 시작
   */
  async startRegistration(userEmail?: string, deviceInfo?: any) {
    console.log('🆕 WebAuthn 등록 시작');
    
    const config = AuthConfig.getWebAuthnConfig();
    const userId = crypto.randomUUID();
    const userName = userEmail || `user_${Date.now()}`;
    
    const options: WebAuthnRegistrationOptions = {
      rp: {
        name: config.rpName,
        id: config.rpID
      },
      user: {
        id: this.base64urlEncode(Buffer.from(userId)),
        name: userName,
        displayName: userName
      },
      challenge: this.generateChallenge(),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" }
      ],
      timeout: config.timeout,
      attestation: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
        residentKey: "preferred"
      }
    };

    const sessionId = this.generateSessionId('register');
    
    this.sessionService.createSession({
      id: sessionId,
      challenge: options.challenge,
      userId,
      userName,
      userEmail,
      deviceInfo,
      type: 'registration',
      timestamp: Date.now(),
      created: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      isActive: true
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
   * 회원가입 완료
   */
  async completeRegistration(credential: any, sessionId: string, userAgent: string) {
    console.log('🚀 WebAuthn 등록 완료');
    
    const sessionData = this.sessionService.getSession(sessionId);
    if (!sessionData) {
      throw new Error('유효하지 않거나 만료된 세션입니다');
    }
    
    // 🔍 기존 사용자 확인 (자동 감지)
    const existingUser = await this.authService.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      console.log('🎉 기존 사용자 로그인! 모든 데이터 유지됨');
      
      const sessionToken = this.sessionService.generateSessionToken(
        existingUser.id, 
        credential.id
      );
      
      await this.authService.updateCredentialLastUsed(credential.id);
      
      this.sessionService.deleteSession(sessionId);
      
      return {
        isExistingUser: true,
        sessionToken,
        user: this.authService.formatUserResponse(existingUser),
        message: '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
      };
    }
    
    // 🆕 신규 사용자 등록
    const { userId, userName, userEmail, deviceInfo } = sessionData;

    const userData = {
      id: userId,
      username: userName,
      email: userEmail,
      display_name: `AI Passport User ${userName}`,
      did: `did:ai-personal:${userId}`,
      wallet_address: this.generateWalletAddress(),
      trust_score: 85.0,
      passport_level: 'Basic',
      biometric_verified: true,
      auth_method: 'passkey',
      cue_tokens: 15428,
      created_at: new Date().toISOString()
    };

    const user = await this.authService.createUser(userData);

    // WebAuthn credential 저장
    await this.authService.saveWebAuthnCredential({
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from('mock-public-key-data').toString('base64'),
      counter: 0,
      device_type: 'platform',
      user_agent: userAgent,
      device_fingerprint: deviceInfo
    });

    // 세션 토큰 생성
    const sessionToken = this.sessionService.generateSessionToken(userId, credential.id);
    
    this.sessionService.deleteSession(sessionId);
    
    return {
      isExistingUser: false,
      sessionToken,
      user: this.authService.formatUserResponse(user),
      message: '새로운 AI Passport가 생성되었습니다!'
    };
  }

  /**
   * 로그인 시작
   */
  async startLogin(deviceInfo?: any) {
    console.log('🔓 WebAuthn 로그인 시작');
    
    const config = AuthConfig.getWebAuthnConfig();
    
    const options: WebAuthnLoginOptions = {
      challenge: this.generateChallenge(),
      timeout: config.timeout,
      rpId: config.rpID,
      allowCredentials: [], // 모든 등록된 자격 증명 허용
      userVerification: "preferred"
    };

    const sessionId = this.generateSessionId('login');
    
    this.sessionService.createSession({
      id: sessionId,
      challenge: options.challenge,
      deviceInfo: deviceInfo || {},
      type: 'authentication',
      timestamp: Date.now(),
      created: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      isActive: true
    });

    console.log('✅ 로그인 옵션 생성 완료');

    return {
      options,
      sessionId
    };
  }

  /**
   * 로그인 완료
   */
  async completeLogin(credential: any, sessionId: string, userAgent: string) {
    console.log('✅ WebAuthn 로그인 완료');
    
    const sessionData = this.sessionService.getSession(sessionId);
    if (!sessionData) {
      throw new Error('유효하지 않거나 만료된 세션입니다');
    }

    // 사용자 조회
    const user = await this.authService.findUserByCredentialId(credential.id);
    if (!user) {
      throw new Error('등록되지 않은 자격 증명입니다');
    }

    // 마지막 사용 시간 업데이트
    await this.authService.updateCredentialLastUsed(credential.id);

    // 세션 토큰 생성
    const sessionToken = this.sessionService.generateSessionToken(user.id, credential.id);
    
    this.sessionService.deleteSession(sessionId);
    
    return {
      verified: true,
      sessionToken,
      user: this.authService.formatUserResponse(user),
      message: '로그인이 완료되었습니다!'
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

  private generateWalletAddress(): string {
    return `0x${crypto.randomBytes(20).toString('hex')}`;
  }
}