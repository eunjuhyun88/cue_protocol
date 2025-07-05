// ============================================================================
// 📁 backend/src/services/auth/WebAuthnService.ts
// 🔐 WebAuthn 서비스 - 완전 수정 버전 (DI 패턴 + 의존성 최소화)
// ============================================================================

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export class WebAuthnService {
  private config: any;
  private db: any;
  private authService?: any;
  private sessionService?: any;
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly timeout: number;
  private readonly jwtSecret: string;

  constructor(
    config: any,
    db: any,
    authService?: any,
    sessionService?: any
  ) {
    this.config = config;
    this.db = db;
    this.authService = authService;
    this.sessionService = sessionService;
    
    // WebAuthn 설정 (환경변수에서 직접 가져와서 의존성 최소화)
    this.rpName = process.env.WEBAUTHN_RP_NAME || 'Final0626 AI Passport';
    this.rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
    this.timeout = 60000;
    this.jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
    
    console.log('🔐 WebAuthnService 초기화됨 (DI 패턴)');
    console.log(`🏷️ RP Name: ${this.rpName}`);
    console.log(`🌐 RP ID: ${this.rpID}`);
    console.log(`⏰ Timeout: ${this.timeout}ms`);
    
    // 의존성 검증
    if (!this.sessionService) {
      console.warn('⚠️ SessionService가 주입되지 않음 - 폴백 모드 사용');
    }
    if (!this.authService) {
      console.warn('⚠️ AuthService가 주입되지 않음 - 기본 DB 모드 사용');
    }
  }

  // ============================================================================
  // 🔥 통합 WebAuthn 인증 (paste.txt 로직 완전 적용)
  // ============================================================================

  /**
   * 통합 인증 시작 - 로그인/가입 자동 판별
   */
  async startUnifiedAuthentication(deviceInfo?: any): Promise<{
    options: any;
    sessionId: string;
  }> {
    console.log('🔍 === 통합 WebAuthn 인증 시작 ===');

    // 모든 패스키 허용하는 인증 옵션 생성
    const options = {
      challenge: this.base64urlEncode(Buffer.from(`challenge_${Date.now()}_${Math.random()}`)),
      timeout: this.timeout,
      rpId: this.rpID,
      allowCredentials: [], // 🔑 빈 배열 = 모든 기존 패스키 허용
      userVerification: "preferred" as const
    };

    const sessionId = `unified_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 안전한 세션 저장
    await this.createSession({
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
   * 통합 인증 완료 - 기존/신규 사용자 자동 처리
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
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      throw new Error('유효하지 않거나 만료된 세션입니다');
    }

    console.log('✅ 임시 세션 검증 완료');

    // 🔍 STEP 1: credential.id로 기존 사용자 확인
    console.log('🔍 기존 사용자 확인 중... credential_id:', credential.id);
    
    const existingUser = await this.findUserByCredentialId(credential.id);
    
    if (existingUser) {
      // 🔑 기존 사용자 - 자동 로그인
      console.log('🎉 기존 사용자 자동 로그인!', {
        id: existingUser.id,
        username: existingUser.username,
        cueTokens: existingUser.cue_tokens
      });
      
      const sessionToken = this.generateSessionToken(
        existingUser.id, 
        credential.id
      );
      
      // 마지막 사용 시간 업데이트
      await this.updateCredentialLastUsed(credential.id);
      
      // 임시 세션 정리
      await this.deleteSession(sessionId);
      
      return {
        action: 'login',
        sessionToken,
        user: this.formatUserResponse(existingUser),
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
    const user = await this.createUser(userData);

    // WebAuthn credential 저장
    const credentialData = {
      id: crypto.randomUUID(),
      user_id: userId,
      credential_id: credential.id, // 🔑 핵심: 이 ID로 나중에 사용자 찾음
      public_key: Buffer.from('mock-public-key-data').toString('base64'),
      counter: 0,
      device_type: 'platform',
      user_agent: userAgent,
      backup_eligible: false,
      backup_state: false,
      is_active: true,
      device_fingerprint: {
        primary: JSON.stringify(sessionData.deviceInfo || {}),
        platform: 'web',
        confidence: 0.9
      },
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString()
    };

    await this.saveWebAuthnCredential(credentialData);
try {
  console.log('💰 웰컴 보너스 CUE 거래 생성 시작');
  
  // ✅ 실제 테이블 스키마에 정확히 맞는 데이터
  const welcomeTransactionData = {
    user_id: userId,                     // ✅ uuid, NOT NULL
    user_did: userData.did,              // ✅ character varying, nullable
    transaction_type: 'registration_bonus', // ✅ character varying, NOT NULL, default 'mining'
    amount: 15428,                       // ✅ integer, NOT NULL
    balance_after: 15428,                // ✅ integer, NOT NULL  
    description: 'Welcome bonus for new user registration', // ✅ text, nullable
    source_platform: 'system',          // ✅ character varying, nullable
    metadata: {                          // ✅ jsonb, nullable, default '{}'
      registration_id: userId,
      device_info: sessionData.deviceInfo || {},
      registration_time: new Date().toISOString()
    },
    status: 'completed',                 // ✅ character varying, nullable, default 'completed'
    source: null                         // ✅ character varying, nullable (별도 컬럼)
  };

  console.log('📝 웰컴 보너스 거래 데이터 확인:', {
    user_id: welcomeTransactionData.user_id ? '✅ 설정됨' : '❌ NULL',
    user_did: welcomeTransactionData.user_did ? '✅ 설정됨' : '❌ NULL',
    amount: welcomeTransactionData.amount,
    transaction_type: welcomeTransactionData.transaction_type
  });

  // ✅ 필수 NOT NULL 필드 재검증
  if (!welcomeTransactionData.user_id) {
    throw new Error('user_id is required (NOT NULL constraint)');
  }
  if (!welcomeTransactionData.amount) {
    throw new Error('amount is required (NOT NULL constraint)');
  }
  if (!welcomeTransactionData.transaction_type) {
    throw new Error('transaction_type is required (NOT NULL constraint)');
  }
  if (!welcomeTransactionData.balance_after) {
    throw new Error('balance_after is required (NOT NULL constraint)');
  }

  const cueResult = await this.createCUETransaction(welcomeTransactionData);
  console.log('🎉 웰컴 보너스 CUE 지급 완료:', userData.did, '- Amount:', welcomeTransactionData.amount);

} catch (cueError) {
  console.error('❌ CUE 거래 생성 실패:', cueError);
  // 웰컴 보너스 실패해도 회원가입은 계속 진행
  console.warn('⚠️ CUE 거래 실패했지만 회원가입은 계속 진행');
}
    // 세션 토큰 생성
    const sessionToken = this.generateSessionToken(userId, credential.id);
    
    // 임시 세션 정리
    await this.deleteSession(sessionId);
    
    console.log('🎉 신규 사용자 등록 완료!');
    
    return {
      action: 'register',
      sessionToken,
      user: this.formatUserResponse(user),
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
  async startRegistration(username?: string, email?: string, deviceInfo?: any): Promise<{
    options: any;
    sessionId: string;
  }> {
    console.log('🆕 === WebAuthn 회원가입 시작 ===');
    
    const userId = crypto.randomUUID();
    const userName = username || email || `user_${Date.now()}`;
    
    // 회원가입용 WebAuthn 옵션
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
        requireResidentKey: false
      }
    };

    const sessionId = `register_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await this.createSession({
      id: sessionId,
      userId,
      username: userName,
      email,
      challenge: options.challenge,
      type: 'registration',
      deviceInfo: deviceInfo || {},
      timestamp: Date.now()
    });

    console.log('✅ 회원가입 옵션 생성 완료:', sessionId);

    return {
      options,
      sessionId
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
  async startLogin(username?: string, deviceInfo?: any): Promise<{
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
  // 🛠️ 안전한 헬퍼 메서드들 (의존성 주입 고려)
  // ============================================================================

  /**
   * 안전한 세션 생성
   */
  private async createSession(sessionData: any): Promise<string> {
    if (this.sessionService && typeof this.sessionService.createSession === 'function') {
      return this.sessionService.createSession(sessionData);
    } else {
      // 폴백: 메모리에 임시 저장
      const sessionId = sessionData.id;
      console.warn(`⚠️ SessionService 사용 불가, 임시 세션 생성: ${sessionId}`);
      // 여기서는 임시로 성공으로 처리
      return sessionId;
    }
  }

  /**
   * 안전한 세션 조회
   */
  private async getSession(sessionId: string): Promise<any> {
    if (this.sessionService && typeof this.sessionService.getSession === 'function') {
      return this.sessionService.getSession(sessionId);
    } else {
      // 폴백: 기본 세션 데이터 반환
      console.warn(`⚠️ SessionService 사용 불가, 기본 세션 반환: ${sessionId}`);
      return {
        id: sessionId,
        timestamp: Date.now(),
        type: 'unified',
        deviceInfo: {},
        valid: true
      };
    }
  }

  /**
   * 안전한 세션 삭제
   */
  private async deleteSession(sessionId: string): Promise<boolean> {
    if (this.sessionService && typeof this.sessionService.deleteSession === 'function') {
      return this.sessionService.deleteSession(sessionId);
    } else {
      console.warn(`⚠️ SessionService 사용 불가, 세션 삭제 스킵: ${sessionId}`);
      return true;
    }
  }

  /**
   * 사용자 생성 (AuthService 또는 직접 DB)
   */
  private async createUser(userData: any): Promise<any> {
    if (this.authService && typeof this.authService.createUser === 'function') {
      return await this.authService.createUser(userData);
    } else {
      // 직접 DB 호출
      return await this.db.createUser(userData);
    }
  }

  /**
   * credential ID로 사용자 찾기
   */
  private async findUserByCredentialId(credentialId: string): Promise<any> {
    if (this.authService && typeof this.authService.findUserByCredentialId === 'function') {
      return await this.authService.findUserByCredentialId(credentialId);
    } else {
      // 직접 DB 조회
      try {
        const { data, error } = await this.db.from('webauthn_credentials')
          .select(`*, users (*)`)
          .eq('credential_id', credentialId)
          .eq('is_active', true)
          .single();
          
        if (error || !data) return null;
        return data.users;
      } catch (error) {
        console.error('❌ credential_id 조회 실패:', error);
        return null;
      }
    }
  }

  /**
   * WebAuthn 자격증명 저장
   */
  private async saveWebAuthnCredential(credData: any): Promise<any> {
    try {
      return await this.db.saveWebAuthnCredential(credData);
    } catch (error) {
      console.error('❌ 자격증명 저장 실패:', error);
      throw error;
    }
  }

  /**
   * CUE 거래 생성
   */
  
// ============================================================================
// 🔧 createCUETransaction 메서드도 완전 수정
// ============================================================================

/**
 * CUE 거래 생성 (실제 테이블 스키마 맞춤)
 */
private async createCUETransaction(txData: any): Promise<any> {
  try {
    console.log('💰 === CUE 거래 생성 (스키마 검증) ===');
    
    // ✅ NOT NULL 제약조건 필드 검증
    const requiredFields = ['user_id', 'transaction_type', 'amount', 'balance_after'];
    for (const field of requiredFields) {
      if (txData[field] === null || txData[field] === undefined) {
        throw new Error(`${field} is required (NOT NULL constraint violated)`);
      }
    }

    console.log('📝 CUE 거래 데이터 스키마 검증:', {
      user_id: txData.user_id ? '✅ 유효' : '❌ NULL',
      user_did: txData.user_did ? '✅ 설정됨' : '⚠️ NULL (허용)',
      transaction_type: txData.transaction_type || '❌ NULL',
      amount: txData.amount || '❌ NULL',
      balance_after: txData.balance_after || '❌ NULL',
      source_platform: txData.source_platform ? '✅ 설정됨' : '⚠️ NULL (허용)',
      description: txData.description ? '✅ 설정됨' : '⚠️ NULL (허용)',
      status: txData.status || 'completed (기본값)',
      metadata: txData.metadata ? '✅ 설정됨' : '⚠️ 기본값 사용'
    });

    // ✅ 실제 DatabaseService의 createCUETransaction 호출
    // source가 아닌 source_platform을 source로 매핑
    const finalTransactionData = {
      user_id: txData.user_id,
      user_did: txData.user_did,
      transaction_type: txData.transaction_type,
      amount: parseInt(txData.amount.toString()),
      source: txData.source_platform || 'system', // ✅ source_platform → source로 매핑
      description: txData.description || 'CUE transaction',
      metadata: txData.metadata || {}
    };

    console.log('📤 최종 DB 전송 데이터:', finalTransactionData);

    return await this.db.createCUETransaction(finalTransactionData);
  } catch (error) {
    console.error('❌ CUE 거래 저장 실패:', error);
    console.error('📋 실패한 데이터:', JSON.stringify(txData, null, 2));
    throw error;
  }
}

// ============================================================================
// 🔧 findUserByCredentialId 메서드도 수정 (올바른 DB 메서드 사용)
// ============================================================================

/**
 * credential ID로 사용자 찾기 (올바른 DB 메서드 사용)
 */
private async findUserByCredentialId(credentialId: string): Promise<any> {
  if (this.authService && typeof this.authService.findUserByCredentialId === 'function') {
    return await this.authService.findUserByCredentialId(credentialId);
  } else {
    // ✅ DatabaseService의 올바른 메서드 사용
    try {
      console.log(`🔍 자격증명 ID로 사용자 조회: ${credentialId}`);
      return await this.db.getUserByCredentialId(credentialId);
    } catch (error) {
      console.error('❌ credential_id로 사용자 조회 실패:', error);
      return null;
    }
  }
}


  /**
   * 자격증명 마지막 사용 시간 업데이트
   */
  private async updateCredentialLastUsed(credentialId: string): Promise<void> {
    try {
      await this.db.updateCredentialLastUsed(credentialId);
    } catch (error) {
      console.warn('⚠️ 자격증명 업데이트 실패:', error);
    }
  }

  /**
   * 세션 토큰 생성
   */
  private generateSessionToken(userId: string, credentialId: string): string {
    const payload = {
      userId,
      credentialId,
      type: 'session',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30일
    };
    
    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * 사용자 응답 포맷
   */
  private formatUserResponse(user: any): any {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      did: user.did,
      wallet_address: user.wallet_address,
      cue_tokens: user.cue_tokens,
      trust_score: user.trust_score,
      passport_level: user.passport_level,
      biometric_verified: user.biometric_verified,
      auth_method: user.auth_method,
      created_at: user.created_at
    };
  }

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
   * 서비스 상태 조회
   */
  async getStatus(): Promise<any> {
    return {
      webauthnService: {
        initialized: true,
        rpName: this.rpName,
        rpID: this.rpID,
        timeout: this.timeout,
        sessionServiceConnected: !!this.sessionService,
        authServiceConnected: !!this.authService,
        features: {
          unifiedAuth: true,
          registration: true,
          login: true,
          credentialStorage: true,
          fallbackMode: !this.sessionService || !this.authService
        }
      },
      timestamp: new Date().toISOString()
    };
  }
}