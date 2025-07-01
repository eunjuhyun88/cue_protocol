// ============================================================================
// 📁 src/services/api/WebAuthnAPI.ts
// 🔐 완전한 WebAuthn API 클라이언트 (세션 복원 + 통합 인증 지원)
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
  // 🔐 WebAuthn 등록 (개선된 버전)
  // ============================================================================
  
  /**
   * WebAuthn 등록 시작 (영구 세션 토큰 저장 포함)
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<WebAuthnRegistrationResult> {
    try {
      console.log('🔥 === WebAuthn 등록 프로세스 시작 ===');
      console.log('📧 이메일:', userEmail || 'PassKey 전용');
      console.log('📱 디바이스:', this.deviceInfo.platform);

      // 1. 백엔드로 등록 시작 요청
      console.log('📞 Step 1: 등록 시작 API 호출');
      const startResponse = await this.post('/api/auth/webauthn/register/start', {
        userEmail,
        userName: userEmail || `PassKey_User_${Date.now()}`,
        deviceInfo: this.deviceInfo,
      });

      console.log('✅ 등록 시작 성공:', { 
        success: startResponse.success, 
        sessionId: startResponse.sessionId 
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('등록 시작 응답이 올바르지 않습니다');
      }

      // 2. WebAuthn 라이브러리 로드 및 실행
      console.log('📦 Step 2: WebAuthn 라이브러리 로드');
      const loaded = await loadWebAuthn();
      
      let credential: WebAuthnCredential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 크리덴셜 사용');
        credential = this.createMockCredential();
        console.log('🎭 Mock 크리덴셜 생성:', credential.id);
      } else {
        console.log('👆 Step 3: 생체인증 팝업 실행...');
        console.log('🔐 브라우저에서 Face ID/Touch ID 프롬프트가 나타납니다');
        
        try {
          credential = await startRegistration(startResponse.options);
          console.log('✅ 실제 생체인증 완료:', credential.id);
        } catch (webauthnError: any) {
          console.error('❌ WebAuthn 실행 실패:', webauthnError);
          throw this.handleWebAuthnError(webauthnError);
        }
      }

      // 3. 등록 완료 API 호출
      console.log('📞 Step 4: 등록 완료 API 호출');
      const completeResponse = await this.post('/api/auth/webauthn/register/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      console.log('✅ 등록 완료 응답:', { 
        success: completeResponse.success,
        hasUser: !!completeResponse.user,
        isExisting: completeResponse.isExistingUser,
        hasSessionToken: !!completeResponse.sessionToken
      });

      // 4. 응답 검증 및 세션 토큰 저장
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '등록 완료 처리 실패');
      }

      if (!completeResponse.user) {
        throw new Error('사용자 정보가 응답에 포함되지 않았습니다');
      }

      // 🔧 핵심: 영구 세션 토큰 저장
      if (completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
        console.log('💾 영구 세션 토큰 저장 완료');
      }

      // 5. 기존 사용자 vs 신규 사용자 구분
      if (completeResponse.isExistingUser) {
        console.log('🔄 === 기존 사용자 데이터 복원! ===');
        console.log('💎 보존된 데이터:', {
          username: completeResponse.user.username,
          cueBalance: completeResponse.user.cueBalance || completeResponse.user.cue_tokens,
          did: completeResponse.user.did,
          trustScore: completeResponse.user.trustScore || completeResponse.user.trust_score
        });
      } else {
        console.log('🆕 === 신규 사용자 등록 완료! ===');
        console.log('🎉 새로운 AI Passport 생성:', {
          username: completeResponse.user.username,
          did: completeResponse.user.did,
          welcomeBonus: completeResponse.rewards?.welcomeCUE || 15428
        });
      }

      console.log('🎉 === WebAuthn 등록 프로세스 완료 ===');

      // 6. 표준화된 응답 반환
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
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔐 WebAuthn 로그인 (개선된 버전)
  // ============================================================================

  /**
   * WebAuthn 로그인 (영구 세션 기능 포함)
   */
  async loginWithWebAuthn(userEmail?: string): Promise<WebAuthnLoginResult> {
    try {
      console.log('🔓 === WebAuthn 로그인 프로세스 시작 ===');
      console.log('📧 이메일:', userEmail || 'PassKey 인증');

      // 1. 로그인 시작 API 호출
      console.log('📞 Step 1: 로그인 시작 API 호출');
      const startResponse = await this.post('/api/auth/webauthn/login/start', {
        userEmail
      });

      console.log('✅ 로그인 시작 성공:', { 
        success: startResponse.success, 
        sessionId: startResponse.sessionId 
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('로그인 시작 응답이 올바르지 않습니다');
      }

      // 2. WebAuthn 라이브러리 로드 및 실행
      console.log('📦 Step 2: WebAuthn 라이브러리 로드');
      const loaded = await loadWebAuthn();
      
      let credential: WebAuthnCredential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 크리덴셜 사용');
        credential = this.createMockCredential();
        console.log('🎭 Mock 크리덴셜 생성:', credential.id);
      } else {
        console.log('👆 Step 3: 생체인증 실행...');
        
        try {
          credential = await startAuthentication(startResponse.options);
          console.log('✅ 실제 생체인증 완료:', credential.id);
        } catch (webauthnError: any) {
          console.error('❌ WebAuthn 실행 실패:', webauthnError);
          throw this.handleWebAuthnError(webauthnError);
        }
      }

      // 3. 로그인 완료 API 호출
      console.log('📞 Step 4: 로그인 완료 API 호출');
      const completeResponse = await this.post('/api/auth/webauthn/login/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      console.log('✅ 로그인 완료 응답:', { 
        success: completeResponse.success,
        hasUser: !!completeResponse.user,
        hasSessionToken: !!(completeResponse.sessionToken || completeResponse.token)
      });

      // 4. 응답 검증 및 세션 토큰 저장
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '로그인 완료 처리 실패');
      }

      if (!completeResponse.user) {
        throw new Error('사용자 정보가 응답에 포함되지 않았습니다');
      }

      // 🔧 핵심: 영구 세션 토큰 저장
      const sessionToken = completeResponse.sessionToken || completeResponse.token;
      if (sessionToken) {
        this.setSessionToken(sessionToken);
        console.log('💾 로그인 세션 토큰 저장 완료');
      }

      console.log('🎉 === WebAuthn 로그인 프로세스 완료 ===');

      // 5. 표준화된 응답 반환
      return {
        success: true,
        user: this.normalizeUser(completeResponse.user),
        sessionToken,
        action: 'login',
        message: '로그인이 완료되었습니다.'
      };

    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔧 통합 WebAuthn 인증 (최신 백엔드 API 지원)
  // ============================================================================

  /**
   * 통합 WebAuthn 인증 (로그인/등록 자동 판별)
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

      // 2. WebAuthn 실행 (로그인/등록 자동 처리)
      console.log('📦 Step 2: WebAuthn 라이브러리 로드');
      const loaded = await loadWebAuthn();
      
      let credential: WebAuthnCredential;
      
      if (!loaded) {
        credential = this.createMockCredential();
      } else {
        console.log('👆 Step 3: 통합 생체인증 실행...');
        credential = await startAuthentication(startResponse.options);
        console.log('✅ 통합 생체인증 완료:', credential.id);
      }

      // 3. 통합 인증 완료 API 호출
      console.log('📞 Step 4: 통합 인증 완료 API 호출');
      const completeResponse = await this.post('/api/auth/webauthn/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      // 4. 세션 토큰 저장 및 응답 처리
      if (completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
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
  // 🔧 유틸리티 메서드들
  // ============================================================================

  /**
   * Mock 크리덴셜 생성
   */
  private createMockCredential(): WebAuthnCredential {
    return {
      id: `mock_cred_${Date.now()}`,
      type: 'public-key',
      response: {
        attestationObject: 'mock-attestation',
        clientDataJSON: 'mock-client-data'
      }
    };
  }

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
      walletAddress: user.wallet_address || user.walletAddress, // 하위 호환성
      cue_tokens: user.cue_tokens || user.cueBalance,
      cueBalance: user.cue_tokens || user.cueBalance, // 하위 호환성
      trust_score: user.trust_score || user.trustScore,
      trustScore: user.trust_score || user.trustScore, // 하위 호환성
      passport_level: user.passport_level || user.passportLevel,
      passportLevel: user.passport_level || user.passportLevel, // 하위 호환성
      biometric_verified: user.biometric_verified || user.biometricVerified,
      biometricVerified: user.biometric_verified || user.biometricVerified, // 하위 호환성
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
      registeredAt: user.created_at || user.registeredAt, // 하위 호환성
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
   * WebAuthn 라이브러리 로드 상태 확인
   */
  async checkWebAuthnLibrary(): Promise<boolean> {
    return await loadWebAuthn();
  }

  // ============================================================================
  // 🎭 Mock 메서드들 (백엔드 연결 실패시 폴백)
  // ============================================================================

  /**
   * Mock WebAuthn 등록
   */
  async mockWebAuthnRegistration(): Promise<WebAuthnRegistrationResult> {
    console.log('🎭 === Mock WebAuthn 등록 ===');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: `user_mock_${Date.now()}`,
          username: `MockAgent${Math.floor(Math.random() * 10000)}`,
          email: 'mock@cueprotocol.ai',
          did: `did:mock:${Date.now()}`,
          wallet_address: `0x${Math.random().toString(16).substr(2, 40)}`,
          walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
          cue_tokens: 1000 + Math.floor(Math.random() * 5000),
          cueBalance: 1000 + Math.floor(Math.random() * 5000),
          trust_score: 85 + Math.floor(Math.random() * 15),
          trustScore: 85 + Math.floor(Math.random() * 15),
          passport_level: 'Verified',
          passportLevel: 'Verified',
          biometric_verified: true,
          biometricVerified: true,
          auth_method: 'passkey',
          registeredAt: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        // Mock 세션 토큰 저장
        const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        this.setSessionToken(mockToken);

        resolve({
          success: true,
          user: mockUser,
          sessionToken: mockToken,
          isExistingUser: Math.random() > 0.8, // 20% 확률로 기존 사용자
          action: Math.random() > 0.8 ? 'login' : 'register',
          message: 'Mock WebAuthn registration completed',
        });
      }, 2000);
    });
  }

  /**
   * Mock WebAuthn 로그인
   */
  async mockWebAuthnLogin(): Promise<WebAuthnLoginResult> {
    console.log('🎭 === Mock WebAuthn 로그인 ===');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: `user_mock_existing`,
          username: `ExistingAgent${Math.floor(Math.random() * 1000)}`,
          email: 'existing@cueprotocol.ai',
          did: `did:mock:existing:${Date.now()}`,
          wallet_address: `0x1234567890123456789012345678901234567890`,
          walletAddress: `0x1234567890123456789012345678901234567890`,
          cue_tokens: 3500 + Math.floor(Math.random() * 7000),
          cueBalance: 3500 + Math.floor(Math.random() * 7000),
          trust_score: 90 + Math.floor(Math.random() * 10),
          trustScore: 90 + Math.floor(Math.random() * 10),
          passport_level: 'Verified',
          passportLevel: 'Verified',
          biometric_verified: true,
          biometricVerified: true,
          auth_method: 'passkey',
          registeredAt: new Date(Date.now() - 86400000 * 30).toISOString(), // 30일 전
          created_at: new Date(Date.now() - 86400000 * 30).toISOString()
        };

        // Mock 세션 토큰 저장
        const mockToken = `mock_login_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        this.setSessionToken(mockToken);

        resolve({
          success: true,
          user: mockUser,
          token: mockToken,
          sessionToken: mockToken,
          action: 'login',
          message: 'Mock WebAuthn login completed',
        });
      }, 1000);
    });
  }
}