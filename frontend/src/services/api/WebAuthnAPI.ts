// ============================================================================
// 📁 src/services/api/WebAuthnAPI.ts
// 🔐 영구 세션 지원 WebAuthn 인증 API 서비스
// ============================================================================

import { BackendAPIClient } from './BackendAPIClient';
import type { WebAuthnRegistrationResult, WebAuthnLoginResult } from '../../types/auth.types';

// WebAuthn 라이브러리 동적 로드
let startRegistration: any = null;
let startAuthentication: any = null;

const loadWebAuthn = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && !startRegistration) {
    try {
      const webauthn = await import('@simplewebauthn/browser');
      startRegistration = webauthn.startRegistration;
      startAuthentication = webauthn.startAuthentication;
      return true;
    } catch (error) {
      console.error('❌ WebAuthn 라이브러리 로드 실패:', error);
      return false;
    }
  }
  return !!startRegistration;
};

export class WebAuthnAPI extends BackendAPIClient {
  // ============================================================================
  // 🔐 WebAuthn 등록 (영구 세션 토큰 저장 포함)
  // ============================================================================
  
  /**
   * WebAuthn 등록 시작 (영구 세션 기능 포함)
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<WebAuthnRegistrationResult> {
    try {
      console.log('🆕 === WebAuthn 등록 시작 (영구 세션 포함) ===');

      // 1. 등록 시작 API 호출
      const startResponse = await this.post('/api/auth/webauthn/register/start', {
        userEmail,
        userName: `PassKey_User_${Date.now()}`,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        },
      });

      console.log('✅ 등록 시작 성공:', { 
        success: startResponse.success, 
        sessionId: startResponse.sessionId 
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error('등록 시작 응답이 올바르지 않습니다');
      }

      // 2. WebAuthn 라이브러리 로드 및 실행
      console.log('📦 WebAuthn 라이브러리 로드 확인');
      const loaded = await loadWebAuthn();
      
      let credential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 크리덴셜 사용');
        credential = {
          id: `mock_cred_${Date.now()}`,
          type: 'public-key',
          response: {
            attestationObject: 'mock-attestation',
            clientDataJSON: 'mock-client-data'
          }
        };
        console.log('🎭 Mock 크리덴셜 생성:', credential.id);
      } else {
        console.log('👆 생체인증 팝업 실행...');
        credential = await startRegistration(startResponse.options);
        console.log('✅ 생체인증 완료:', credential.id);
      }

      // 3. 등록 완료 API 호출
      console.log('📞 등록 완료 API 호출');
      const completeResponse = await this.post('/api/auth/webauthn/register/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      console.log('✅ 등록 완료:', { 
        success: completeResponse.success,
        hasUser: !!completeResponse.user,
        isExisting: completeResponse.isExistingUser
      });

      // ✅ 응답 검증
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

      // 🔧 호환성: 기존 세션 ID도 저장 (레거시 지원)
      if (completeResponse.sessionId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('cue_session_id', completeResponse.sessionId);
        }
      }

      if (completeResponse.isExistingUser) {
        console.log('🔄 기존 사용자 데이터 복원!');
        console.log('💎 보존된 데이터:', {
          username: completeResponse.user.username,
          cueBalance: completeResponse.user.cueBalance,
          did: completeResponse.user.did
        });
      } else {
        console.log('🆕 신규 사용자 등록 완료!');
      }

      console.log('🎉 WebAuthn 등록 완료!', {
        userId: completeResponse.user.id,
        username: completeResponse.user.username,
        did: completeResponse.user.did,
        sessionToken: !!completeResponse.sessionToken,
        isExisting: completeResponse.isExistingUser || false
      });

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);

      // WebAuthn 특정 오류 처리
      if (error.name === 'NotAllowedError') {
        throw new Error('사용자가 생체인증을 취소했습니다.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('이 기기에서는 생체인증을 지원하지 않습니다.');
      } else if (error.name === 'SecurityError') {
        throw new Error('보안 오류가 발생했습니다. HTTPS 환경인지 확인해주세요.');
      }

      throw new Error(error.message || 'WebAuthn 등록에 실패했습니다.');
    }
  }

  // ============================================================================
  // 🔐 WebAuthn 로그인 (영구 세션 토큰 저장 포함)
  // ============================================================================

  /**
   * WebAuthn 로그인 (영구 세션 기능 포함)
   */
  async loginWithWebAuthn(userEmail?: string): Promise<WebAuthnLoginResult> {
    try {
      console.log('🔓 === WebAuthn 로그인 시작 (영구 세션 포함) ===');

      // 1. 로그인 시작 API 호출
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
      console.log('📦 WebAuthn 라이브러리 로드 확인');
      const loaded = await loadWebAuthn();
      
      let credential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 크리덴셜 사용');
        credential = {
          id: `mock_cred_${Date.now()}`,
          type: 'public-key',
          response: {
            authenticatorData: 'mock-auth-data',
            clientDataJSON: 'mock-client-data',
            signature: 'mock-signature'
          }
        };
        console.log('🎭 Mock 크리덴셜 생성:', credential.id);
      } else {
        console.log('👆 생체인증 실행...');
        credential = await startAuthentication(startResponse.options);
        console.log('✅ 생체인증 완료:', credential.id);
      }

      // 3. 로그인 완료 API 호출
      console.log('📞 로그인 완료 API 호출');
      const completeResponse = await this.post('/api/auth/webauthn/login/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      console.log('✅ 로그인 완료:', { 
        success: completeResponse.success,
        hasUser: !!completeResponse.user
      });

      // ✅ 응답 검증
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '로그인 완료 처리 실패');
      }

      if (!completeResponse.user) {
        throw new Error('사용자 정보가 응답에 포함되지 않았습니다');
      }

      // 🔧 핵심: 영구 세션 토큰 저장
      if (completeResponse.sessionToken) {
        this.setSessionToken(completeResponse.sessionToken);
        console.log('💾 로그인 세션 토큰 저장 완료');
      }

      // 🔧 호환성: 기존 토큰 필드도 처리
      if (completeResponse.token) {
        this.setSessionToken(completeResponse.token);
        console.log('💾 로그인 토큰 저장 완료 (token 필드)');
      }

      console.log('🎉 WebAuthn 로그인 완료!', {
        userId: completeResponse.user.id,
        username: completeResponse.user.username,
        did: completeResponse.user.did,
        sessionToken: !!(completeResponse.sessionToken || completeResponse.token)
      });

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);

      // WebAuthn 특정 오류 처리
      if (error.name === 'NotAllowedError') {
        throw new Error('사용자가 인증을 취소했습니다.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('이 기기에서는 생체인증을 지원하지 않습니다.');
      } else if (error.name === 'SecurityError') {
        throw new Error('보안 오류가 발생했습니다. HTTPS 환경인지 확인해주세요.');
      }

      throw new Error(error.message || 'WebAuthn 로그인에 실패했습니다.');
    }
  }

  // ============================================================================
  // 🎭 Mock WebAuthn (백엔드 연결 실패시 폴백)
  // ============================================================================

  /**
   * Mock WebAuthn 등록 (백엔드 연결 실패시)
   */
  async mockWebAuthnRegistration(): Promise<WebAuthnRegistrationResult> {
    console.log('🎭 === Mock WebAuthn 등록 ===');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          id: `user_mock_${Date.now()}`,
          username: `MockAgent${Math.floor(Math.random() * 10000)}`,
          email: 'mock@cueprotocol.ai',
          did: `did:mock:${Date.now()}`,
          walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
          passkeyRegistered: true,
          biometricVerified: true,
          credentialId: `mock_cred_${Date.now()}`,
          cueBalance: 1000 + Math.floor(Math.random() * 5000),
          trustScore: 85 + Math.floor(Math.random() * 15),
          passportLevel: 'Verified',
          registeredAt: new Date().toISOString()
        };

        // Mock 세션 토큰 저장
        const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        this.setSessionToken(mockToken);

        resolve({
          success: true,
          user: mockUser,
          sessionToken: mockToken,
          isExistingUser: Math.random() > 0.8, // 20% 확률로 기존 사용자
          message: 'Mock WebAuthn registration completed',
        });
      }, 2000);
    });
  }

  /**
   * Mock WebAuthn 로그인 (백엔드 연결 실패시)
   */
  async mockWebAuthnLogin(): Promise<WebAuthnLoginResult> {
    console.log('🎭 === Mock WebAuthn 로그인 ===');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          id: `user_mock_existing`,
          username: `ExistingAgent${Math.floor(Math.random() * 1000)}`,
          email: 'existing@cueprotocol.ai',
          did: `did:mock:existing:${Date.now()}`,
          walletAddress: `0x1234567890123456789012345678901234567890`,
          passkeyRegistered: true,
          biometricVerified: true,
          credentialId: `mock_cred_existing`,
          cueBalance: 3500 + Math.floor(Math.random() * 7000),
          trustScore: 90 + Math.floor(Math.random() * 10),
          passportLevel: 'Verified',
          registeredAt: new Date(Date.now() - 86400000 * 30).toISOString() // 30일 전
        };

        // Mock 세션 토큰 저장
        const mockToken = `mock_login_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        this.setSessionToken(mockToken);

        resolve({
          success: true,
          user: mockUser,
          token: mockToken,
          sessionToken: mockToken,
          message: 'Mock WebAuthn login completed',
        });
      }, 1000);
    });
  }

  // ============================================================================
  // 🔧 WebAuthn 지원 확인
  // ============================================================================

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
}