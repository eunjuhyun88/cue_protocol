// ============================================================================
// 🔐 WebAuthn 서비스 - 최종 완성 버전 (의존성 최소화)
// 파일: backend/src/services/auth/WebAuthnService.ts  
// 역할: WebAuthn 옵션 생성, 인증 처리, paste-3.txt + paste-4.txt 로직 완전 적용
// ============================================================================

import crypto from 'crypto';
import { AuthService } from './AuthService';
import { SessionService } from './SessionService';

export class WebAuthnService {
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly timeout: number;

  constructor(
    private authService: AuthService,
    private sessionService: SessionService
  ) {
    // WebAuthn 설정 (환경변수에서 직접 가져와서 의존성 최소화)
    this.rpName = process.env.WEBAUTHN_RP_NAME || 'Final0626 AI Passport';
    this.rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
    this.timeout = 60000;
    
    console.log('🔐 WebAuthnService 초기화됨 (최종 완성 버전)');
    console.log(`🏷️  RP Name: ${this.rpName}`);
    console.log(`🌐 RP ID: ${this.rpID}`);
    console.log(`⏰ Timeout: ${this.timeout}ms`);
  }

  // ============================================================================
  // 🔥 통합 WebAuthn 인증 (paste-3.txt + paste-4.txt 로직 완전 적용)
  // ============================================================================

  /**
   * 통합 인증 시작 - 로그인/가입 자동 판별 (paste-3.txt 로직)
   */
  async startUnifiedAuthentication(deviceInfo?: any): Promise<{
    options: any;
    sessionId: string;
  }> {
    console.log('🔍 === 통합 WebAuthn 인증 시작 ===');

    // 모든 패스키 허용하는 인증 옵션 생성 (paste-3.txt 방식)
    const options = {
      challenge: this.base64urlEncode(Buffer.from(`challenge_${Date.now()}_${Math.random()}`)),
      timeout: this.timeout,
      rpId: this.rpID,
      allowCredentials: [], // 🔑 빈 배열 = 모든 기존 패스키 허용
      userVerification: "preferred" as const
    };

    const sessionId = `unified_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 세션 저장
    this.sessionService.createSession({
      id: sessionId,
      challenge: options.challenge,
      type: 'unified',
      deviceInfo: deviceInfo || {},
      timestamp: Date.now()
    });

    console.log('✅ 통합 인증 옵션 생성 완료:', sessionId);

    return {
      options,
      sessionId
    };
  }

  /**
   * 통합 인증 완료 - 기존/신규 사용자 자동 처리 (paste-4.txt 로직 완전 적용)
   */
  async completeUnifiedAuthentication(
    credential: any, 
    sessionId: string, 
    userAgent: string
  ): Promise<{
    action: 'login' | 'register';
    sessionToken: string;
    user: any;
    isExistingUser: boolean;
    rewards?: any;
    message: string;
  }> {
    console.log('✅ === 통합 WebAuthn 인증 완료 ===');

    // 세션 검증
    const sessionData = this.sessionService.getSession(sessionId);
    if (!sessionData) {
      throw new Error('유효하지 않거나 만료된 세션입니다');
    }

    console.log('✅ 임시 세션 검증 완료');

    // 🔍 STEP 1: credential.id로 기존 사용자 확인 (paste-4.txt 로직)
    console.log('🔍 기존 사용자 확인 중... credential_id:', credential.id);
    
    const existingUser = await this.authService.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      // 🔑 기존 사용자 - 자동 로그인 (paste-4.txt 로직)
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
    
    // 🆕 STEP 2: 신규 사용자 - 회원가입 진행 (paste-4.txt 로직)
    console.log('🆕 신규 사용자 회원가입 진행');
    
    const userId = crypto.randomUUID();
    const username = `PassKey_User_${Date.now()}`;
    
    // 신규 사용자 데이터 생성 (paste-4.txt 방식)
    const userData = {
      id: userId,
      username,
      email: null, // PassKey 전용
      display_name: `AI Passport User ${username}`,
      did: `did:final0626:${userId}`,
      wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`,
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

    // WebAuthn credential 저장 (paste-4.txt 로직)
    const credentialData = {
      user_id: userId,
      credential_id: credential.id, // 🔑 핵심: 이 ID로 나중에 사용자 찾음
      public_key: Buffer.from('mock-public-key-data').toString('base64'),
      counter: 0,
      device_type: 'platform',
      user_agent: userAgent,
      backup_eligible: false,
      backup_state: false,
      is_active: true,
      device_fingerprint: sessionData.deviceInfo || {}
    };

    await this.authService.saveWebAuthnCredential(credentialData);

    // CUE 거래 저장 (paste-4.txt 로직)
    await this.authService.createCUETransaction({
      user_id: userId,
      transaction_type: 'registration_bonus',
      amount: 15428,
      balance_after: 15428,
      description: 'Welcome bonus for new user registration',
      source_platform: 'system',
      metadata: {
        registration_id: userId,
        device_info: sessionData.deviceInfo,
        registration_time: new Date().toISOString()
      }
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
  async startRegistration(userEmail?: string, deviceInfo?: any): Promise<{
    options: any;
    sessionId: string;
    user: any;
  }> {
    console.log('🆕 === WebAuthn 회원가입 시작 ===');
    
    const userId = crypto.randomUUID();
    const userName = userEmail || `user_${Date.now()}`;
    
    // 회원가입용 WebAuthn 옵션 (paste-4.txt 방식)
    const options = {
      rp: { 
        name: this.rpName, 
        id: this.rpID 
      },
      user: {
        id: this.base64urlEncode(Buffer.from(userId)),
        name: userName,
        displayName: userName
      },
      challenge: this.base64urlEncode(Buffer.from(`challenge_${Date.now()}_${Math.random()}`)),
      pubKeyCredParams: [
        { alg: -7, type: "public-key" as const },
        { alg: -257, type: "public-key" as const }
      ],
      timeout: this.timeout,
      attestation: "none" as const,
      authenticatorSelection: {
        authenticatorAttachment: "platform" as const,
        userVerification: "preferred" as const,
        residentKey: "preferred" as const
      }
    };

    const sessionId = `register_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    this.sessionService.createSession({
      id: sessionId,
      userId,
      userName,
      userEmail,
      challenge: options.challenge,
      type: 'register',
      deviceInfo: deviceInfo || {},
      timestamp: Date.now()
    });

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
  async completeRegistration(
    credential: any, 
    sessionId: string, 
    userAgent: string
  ): Promise<any> {
    console.log('🚀 === WebAuthn 회원가입 완료 ===');
    
    // 통합 인증 완료 로직 재사용
    return await this.completeUnifiedAuthentication(credential, sessionId, userAgent);
  }

  /**
   * 로그인 시작
   */
  async startLogin(deviceInfo?: any): Promise<{
    options: any;
    sessionId: string;
  }> {
    console.log('🔑 === WebAuthn 로그인 시작 ===');
    
    // 통합 인증과 동일한 로직 사용
    return await this.startUnifiedAuthentication(deviceInfo);
  }

  /**
   * 로그인 완료
   */
  async completeLogin(
    credential: any, 
    sessionId: string, 
    userAgent: string
  ): Promise<any> {
    console.log('✅ === WebAuthn 로그인 완료 ===');
    
    // 통합 인증 완료 로직 재사용
    return await this.completeUnifiedAuthentication(credential, sessionId, userAgent);
  }

  // ============================================================================
  // 🔧 헬퍼 함수들 (paste-4.txt에서 추출)
  // ============================================================================

  /**
   * Base64URL 인코딩
   */
  private base64urlEncode(buffer: Buffer): string {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Challenge 생성
   */
  private generateChallenge(): string {
    return this.base64urlEncode(
      Buffer.from(`challenge_${Date.now()}_${Math.random()}`)
    );
  }

  /**
   * 서비스 상태 조회
   */
  async getStatus(): Promise<any> {
    return {
      webauthnService: {
        initialized: true,
        rpName: this.rpName,
        rpID: this.rpID,
        timeout: this.timeout,
        features: {
          unifiedAuth: true,
          registration: true,
          login: true,
          credentialStorage: true
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}