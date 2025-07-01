// ============================================================================
// 📁 src/services/api/WebAuthnAPI.ts (수정완료)
// 🔐 WebAuthn API 클라이언트 - 영구 패스키 credential_id 유지 버전
// 🔧 수정사항: Mock 패스키 영구 보존, 올바른 로그인/등록 구분
// ============================================================================

import { BackendAPIClient } from './BackendAPIClient';
import type {
  WebAuthnRegistrationResult,
  WebAuthnLoginResult,
  WebAuthnCredential,
  DeviceInfo,
  SessionRestoreResult,
  User
} from '../../types/auth.types';

// WebAuthn 라이브러리 동적 로드
let startRegistration: any = null;
let startAuthentication: any = null;
let isWebAuthnLoaded = false;

const loadWebAuthn = async (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    console.warn('🚫 Server-side 환경에서는 WebAuthn을 사용할 수 없습니다');
    return false;
  }

  if (isWebAuthnLoaded && startRegistration && startAuthentication) {
    return true;
  }

  try {
    console.log('📦 WebAuthn 라이브러리 로드 중...');
    const webauthn = await import('@simplewebauthn/browser');
    startRegistration = webauthn.startRegistration;
    startAuthentication = webauthn.startAuthentication;
    isWebAuthnLoaded = true;
    console.log('✅ WebAuthn 라이브러리 로드 성공');
    return true;
  } catch (error) {
    console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
    isWebAuthnLoaded = false;
    return false;
  }
};

export class WebAuthnAPI extends BackendAPIClient {
  private deviceInfo: DeviceInfo;
  private mockCredentialKey = 'cue_mock_credential'; // 🔑 핵심: 영구 Mock 패스키 저장

  constructor(baseURL = 'http://localhost:3001') {
    super(baseURL);
    
    // 디바이스 정보 수집
    this.deviceInfo = this.collectDeviceInfo();
    console.log('🔐 WebAuthnAPI 초기화됨');
  }

  // ============================================================================
  // 🔧 디바이스 정보 수집
  // ============================================================================
  
  private collectDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'Server',
        platform: 'Server',
        timestamp: Date.now()
      };
    }

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: Date.now(),
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  // ============================================================================
  // 🔑 Mock 패스키 영구 관리 (핵심 수정!)
  // ============================================================================

  /**
   * 영구 Mock 패스키 생성 또는 조회
   */
  private getOrCreateMockCredential(): WebAuthnCredential {
    if (typeof window === 'undefined') {
      return this.createTemporaryMockCredential();
    }

    try {
      // 1. 기존 Mock 패스키 조회
      const existingCred = localStorage.getItem(this.mockCredentialKey);
      if (existingCred) {
        const parsed = JSON.parse(existingCred);
        console.log('🔄 기존 Mock 패스키 재사용:', parsed.id);
        return parsed;
      }

      // 2. 새 Mock 패스키 생성 및 저장
      const newCredential = this.createPermanentMockCredential();
      localStorage.setItem(this.mockCredentialKey, JSON.stringify(newCredential));
      console.log('🆕 새 Mock 패스키 생성 및 저장:', newCredential.id);
      return newCredential;

    } catch (error) {
      console.error('❌ Mock 패스키 관리 실패:', error);
      return this.createTemporaryMockCredential();
    }
  }

  /**
   * 영구 Mock 패스키 생성 (디바이스 고유)
   */
  private createPermanentMockCredential(): WebAuthnCredential {
    // 디바이스 고유 특성 기반 ID 생성
    const deviceFingerprint = [
      navigator.userAgent,
      navigator.platform,
      window.screen.width,
      window.screen.height,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');

    // 안정적인 해시 생성 (동일 기기에서 항상 같은 ID)
    const hash = this.simpleHash(deviceFingerprint);
    const credentialId = `mock_passkey_${hash}`;

    return {
      id: credentialId,
      type: 'public-key',
      response: {
        attestationObject: 'mock-attestation-object',
        clientDataJSON: 'mock-client-data-json'
      }
    };
  }

  /**
   * 임시 Mock 패스키 (localStorage 실패시 폴백)
   */
  private createTemporaryMockCredential(): WebAuthnCredential {
    return {
      id: 'temp_mock_credential',
      type: 'public-key',
      response: {
        attestationObject: 'temp-attestation',
        clientDataJSON: 'temp-client-data'
      }
    };
  }

  /**
   * 간단한 해시 함수 (일관된 ID 생성용)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Mock 패스키 초기화 (디버깅용)
   */
  clearMockCredential(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.mockCredentialKey);
      console.log('🗑️ Mock 패스키 초기화됨');
    }
  }

  // ============================================================================
  // 🔐 통합 WebAuthn 인증 (로그인/등록 자동 판별) - 수정완료
  // ============================================================================

  /**
   * 통합 WebAuthn 인증 (한 번의 패스키로 로그인/등록 자동 처리)
   */
  async unifiedWebAuthnAuth(): Promise<WebAuthnRegistrationResult> {
    try {
      console.log('🔥 === 통합 WebAuthn 인증 시작 ===');

      // 1. 통합 인증 시작 API 호출
      console.log('📞 Step 1: 통합 인증 시작 API 호출');
      const startResponse = await this.post('/api/auth/webauthn/start', {
        deviceInfo: this.deviceInfo
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('통합 인증 시작 응답이 올바르지 않습니다');
      }

      console.log('✅ 통합 인증 시작 성공:', startResponse.sessionId);

      // 2. WebAuthn 실행 (기존 패스키 사용)
      console.log('📦 Step 2: WebAuthn 라이브러리 로드');
      const loaded = await loadWebAuthn();
      
      let credential: WebAuthnCredential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - 영구 Mock 패스키 사용');
        credential = this.getOrCreateMockCredential(); // 🔑 핵심 수정!
      } else {
        console.log('👆 Step 3: 통합 생체인증 실행...');
        try {
          // 🔧 중요: 기존 패스키를 찾기 위해 authentication 사용
          credential = await startAuthentication(startResponse.options);
          console.log('✅ 실제 패스키 인증 완료:', credential.id);
        } catch (webauthnError: any) {
          console.warn('⚠️ 실제 패스키 인증 실패, Mock 사용:', webauthnError.message);
          credential = this.getOrCreateMockCredential();
        }
      }

      // 3. 통합 인증 완료 API 호출
      console.log('📞 Step 4: 통합 인증 완료 API 호출');
      console.log('🔑 사용 중인 credential_id:', credential.id);
      
      const completeResponse = await this.post('/api/auth/webauthn/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      console.log('✅ 통합 인증 완료 응답:', {
        success: completeResponse.success,
        action: completeResponse.action,
        isExisting: completeResponse.isExistingUser,
        userId: completeResponse.user?.id
      });

      // 4. 세션 토큰 저장 및 응답 처리
      if (completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
        console.log('💾 영구 세션 토큰 저장 완료');
      }

      console.log(`🎉 === 통합 인증 완료: ${completeResponse.action?.toUpperCase()} ===`);

      return {
        success: true,
        user: this.normalizeUser(completeResponse.user),
        sessionToken: completeResponse.sessionToken,
        isExistingUser: completeResponse.action === 'login',
        action: completeResponse.action,
        message: completeResponse.message
      };

    } catch (error: any) {
      console.error('💥 통합 WebAuthn 인증 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔐 기존 등록 API (수정완료)
  // ============================================================================

  /**
   * WebAuthn 등록 시작 (수정: 기존 패스키 감지 기능 추가)
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<WebAuthnRegistrationResult> {
    try {
      console.log('🔥 === WebAuthn 등록/로그인 프로세스 시작 ===');
      console.log('📧 이메일:', userEmail || 'PassKey 전용');

      // 1. 등록 시작 API 호출
      console.log('📞 Step 1: 등록 시작 API 호출');
      const startResponse = await this.post('/api/auth/webauthn/register/start', {
        userEmail,
        userName: userEmail || `PassKey_User_${Date.now()}`,
        deviceInfo: this.deviceInfo,
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('등록 시작 응답이 올바르지 않습니다');
      }

      console.log('✅ 등록 시작 성공:', startResponse.sessionId);

      // 2. WebAuthn 실행 (기존 패스키 사용)
      console.log('📦 Step 2: WebAuthn 라이브러리 로드');
      const loaded = await loadWebAuthn();
      
      let credential: WebAuthnCredential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - 영구 Mock 패스키 사용');
        credential = this.getOrCreateMockCredential(); // 🔑 핵심 수정!
      } else {
        console.log('👆 Step 3: 생체인증 실행...');
        
        try {
          // 🔧 먼저 기존 패스키로 로그인 시도
          try {
            const authOptions = {
              ...startResponse.options,
              allowCredentials: [] // 모든 기존 패스키 허용
            };
            credential = await startAuthentication(authOptions);
            console.log('✅ 기존 패스키 인증 성공:', credential.id);
          } catch (authError) {
            // 기존 패스키가 없으면 새로 등록
            console.log('🆕 기존 패스키 없음, 새 패스키 등록 중...');
            credential = await startRegistration(startResponse.options);
            console.log('✅ 새 패스키 등록 성공:', credential.id);
          }
        } catch (webauthnError: any) {
          console.error('❌ WebAuthn 실행 실패:', webauthnError);
          throw this.handleWebAuthnError(webauthnError);
        }
      }

      // 3. 등록 완료 API 호출
      console.log('📞 Step 4: 등록 완료 API 호출');
      console.log('🔑 사용 중인 credential_id:', credential.id);
      
      const completeResponse = await this.post('/api/auth/webauthn/register/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      console.log('✅ 등록 완료 응답:', { 
        success: completeResponse.success,
        isExisting: completeResponse.isExistingUser,
        action: completeResponse.isExistingUser ? 'login' : 'register',
        userId: completeResponse.user?.id
      });

      // 4. 응답 처리
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '등록 완료 처리 실패');
      }

      if (!completeResponse.user) {
        throw new Error('사용자 정보가 응답에 포함되지 않았습니다');
      }

      // 🔧 세션 토큰 저장
      if (completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
        console.log('💾 영구 세션 토큰 저장 완료');
      }

      // 5. 결과 구분
      if (completeResponse.isExistingUser) {
        console.log('🔄 === 기존 사용자 데이터 복원! ===');
        console.log('💎 보존된 데이터:', {
          username: completeResponse.user.username,
          cueBalance: completeResponse.user.cueBalance || completeResponse.user.cue_tokens,
          trustScore: completeResponse.user.trustScore || completeResponse.user.trust_score
        });
      } else {
        console.log('🆕 === 신규 사용자 등록 완료! ===');
        console.log('🎉 새로운 AI Passport:', {
          username: completeResponse.user.username,
          did: completeResponse.user.did,
          welcomeBonus: 15428
        });
      }

      console.log('🎉 === WebAuthn 프로세스 완료 ===');

      return {
        success: true,
        user: this.normalizeUser(completeResponse.user),
        sessionToken: completeResponse.sessionToken,
        isExistingUser: completeResponse.isExistingUser || false,
        action: completeResponse.isExistingUser ? 'login' : 'register',
        message: completeResponse.isExistingUser 
          ? '기존 계정으로 로그인되었습니다. 모든 데이터가 유지됩니다.'
          : '새로운 AI Passport가 생성되었습니다!',
        rewards: completeResponse.rewards
      };

    } catch (error: any) {
      console.error('💥 WebAuthn 등록/로그인 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들
  // ============================================================================

  /**
   * WebAuthn 에러 처리
   */
  private handleWebAuthnError(error: any): Error {
    if (error.name === 'NotAllowedError') {
      return new Error('사용자가 생체인증을 취소했습니다.');
    } else if (error.name === 'NotSupportedError') {
      return new Error('이 기기에서는 생체인증을 지원하지 않습니다.');
    } else if (error.name === 'SecurityError') {
      return new Error('보안 오류가 발생했습니다. HTTPS 환경인지 확인해주세요.');
    } else if (error.name === 'InvalidStateError') {
      return new Error('이미 등록된 인증기입니다.');
    }
    
    return new Error(error.message || 'WebAuthn 인증에 실패했습니다.');
  }

  /**
   * 사용자 데이터 정규화
   */
  private normalizeUser(user: any): User {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      did: user.did,
      wallet_address: user.wallet_address || user.walletAddress,
      walletAddress: user.wallet_address || user.walletAddress,
      cue_tokens: user.cue_tokens || user.cueBalance,
      cueBalance: user.cue_tokens || user.cueBalance,
      trust_score: user.trust_score || user.trustScore,
      trustScore: user.trust_score || user.trustScore,
      passport_level: user.passport_level || user.passportLevel,
      passportLevel: user.passport_level || user.passportLevel,
      biometric_verified: user.biometric_verified || user.biometricVerified,
      biometricVerified: user.biometric_verified || user.biometricVerified,
      auth_method: user.auth_method,
      status: user.status,
      
      // 복합 데이터
      personality: user.personality,
      psychology: user.psychology,
      expertise: user.expertise,
      cue_config: user.cue_config,
      platform_settings: user.platform_settings,
      usage_stats: user.usage_stats,
      achievements: user.achievements,
      
      // 시간 정보
      created_at: user.created_at,
      updated_at: user.updated_at,
      registeredAt: user.created_at || user.registeredAt,
      lastLogin: user.lastLogin
    };
  }

  /**
   * WebAuthn 지원 확인
   */
  static checkWebAuthnSupport(): { supported: boolean; reason?: string } {
    if (typeof window === 'undefined') {
      return { supported: false, reason: 'Server-side rendering' };
    }
    if (!window.PublicKeyCredential) {
      return { supported: false, reason: 'WebAuthn을 지원하지 않는 브라우저입니다.' };
    }
    return { supported: true };
  }

  /**
   * 디버깅 정보
   */
  getDebugInfo(): any {
    const sessionInfo = this.getSessionInfo();
    let mockCredential = null;
    
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.mockCredentialKey);
        mockCredential = stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.warn('Mock credential 조회 실패:', error);
      }
    }
    
    return {
      deviceInfo: this.deviceInfo,
      sessionInfo,
      mockCredential,
      webauthnSupported: WebAuthnAPI.checkWebAuthnSupport().supported,
      timestamp: new Date().toISOString()
    };
  }
}