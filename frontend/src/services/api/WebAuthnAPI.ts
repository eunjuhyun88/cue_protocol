// ============================================================================
// 📁 src/services/api/WebAuthnAPI.ts
// 🔐 WebAuthn 인증 API 서비스
// ============================================================================

import { BackendAPIClient } from './BackendAPIClient';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type { WebAuthnRegistrationResult, WebAuthnLoginResult } from '../../types/auth.types';

export class WebAuthnAPI extends BackendAPIClient {
  /**
   * WebAuthn 등록 시작
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<WebAuthnRegistrationResult> {
    try {
      console.log('🔐 WebAuthn 등록 시작...');

      // 1. 등록 시작 API 호출
      const startResponse = await this.post('/api/auth/webauthn/register/start', {
        userEmail,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
        },
      });

      console.log('📋 등록 옵션 받음:', startResponse);

      // 2. 브라우저 WebAuthn 등록 실행
      const credential = await startRegistration(startResponse.options || startResponse);

      console.log('✅ WebAuthn 크리덴셜 생성 완료');

      // 3. 등록 완료 API 호출
      const completeResponse = await this.post('/api/auth/webauthn/register/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      return completeResponse;
    } catch (error: any) {
      console.error('❌ WebAuthn 등록 실패:', error);

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

  /**
   * WebAuthn 로그인
   */
  async loginWithWebAuthn(): Promise<WebAuthnLoginResult> {
    try {
      console.log('🔐 WebAuthn 로그인 시작...');

      // 1. 로그인 시작 API 호출
      const startResponse = await this.post('/api/auth/webauthn/login/start', {});

      console.log('📋 인증 옵션 받음:', startResponse);

      // 2. 브라우저 WebAuthn 인증 실행
      const credential = await startAuthentication(startResponse.options || startResponse);

      console.log('✅ WebAuthn 인증 완료');

      // 3. 로그인 완료 API 호출
      const completeResponse = await this.post('/api/auth/webauthn/login/complete', {
        credential,
        sessionId: startResponse.sessionId,
      });

      return completeResponse;
    } catch (error: any) {
      console.error('❌ WebAuthn 로그인 실패:', error);

      // WebAuthn 특정 오류 처리
      if (error.name === 'NotAllowedError') {
        throw new Error('사용자가 인증을 취소했습니다.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('이 기기에서는 생체인증을 지원하지 않습니다.');
      }

      throw new Error(error.message || 'WebAuthn 로그인에 실패했습니다.');
    }
  }

  /**
   * Mock WebAuthn 등록 (백엔드 연결 실패시)
   */
  async mockWebAuthnRegistration(): Promise<WebAuthnRegistrationResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          did: `did:mock:${Date.now()}`,
          walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
          passkeyRegistered: true,
          biometricVerified: true,
          credentialId: `mock_cred_${Date.now()}`,
        };

        resolve({
          success: true,
          user: mockUser,
          message: 'Mock WebAuthn registration completed',
        });
      }, 2000);
    });
  }

  /**
   * Mock WebAuthn 로그인 (백엔드 연결 실패시)
   */
  async mockWebAuthnLogin(): Promise<WebAuthnLoginResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          did: `did:mock:existing`,
          walletAddress: `0x1234567890123456789012345678901234567890`,
          passkeyRegistered: true,
          biometricVerified: true,
          credentialId: `mock_cred_existing`,
        };

        resolve({
          success: true,
          user: mockUser,
          token: 'mock_jwt_token',
          message: 'Mock WebAuthn login completed',
        });
      }, 1000);
    });
  }
}