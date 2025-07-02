// ============================================================================
// 📁 src/services/api/WebAuthnAPI.ts (수정완료)
// 🔐 WebAuthn API 클라이언트 - 영구 패스키 credential_id 유지 버전
// 🔧 수정사항: Mock 패스키 영구 보존, 올바른 로그인/등록 구분
// ============================================================================

import { PersistentDataAPIClient, loadWebAuthn, checkWebAuthnSupport } from './PersistentDataAPIClient';
import type {
  WebAuthnRegistrationResult,
  WebAuthnLoginResult,
  WebAuthnCredential,
  DeviceInfo,
  SessionRestoreResult,
  User
} from '../../types/auth.types';

export class WebAuthnAPI extends PersistentDataAPIClient {
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
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
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
          const { startAuthentication } = await import('@simplewebauthn/browser');
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
        message: completeResponse.message,
        deviceInfo: this.deviceInfo
      };

    } catch (error: any) {
      console.error('💥 통합 WebAuthn 인증 실패:', error);
      throw this.handleWebAuthnError(error);
    }
  }

  // 명시적 등록
  async register(userName?: string, displayName?: string) {
    console.log('🆕 === WebAuthn 등록 시작 ===');
    
    try {
      const startResponse = await this.persistentClient.request('/api/auth/webauthn/register/start', {
        method: 'POST',
        body: JSON.stringify({
          userName: userName || `User_${Date.now()}`,
          displayName: displayName || 'CUE Protocol User',
          deviceInfo: this.getDeviceInfo()
        })
      });

      if (!startResponse.success) {
        throw new Error('등록 시작 실패: ' + startResponse.message);
      }

      // WebAuthn 라이브러리 로드
      const loaded = await loadWebAuthn();
      
      let credential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 패스키 사용');
        credential = this.persistentClient.getOrCreateMockCredential();
      } else {
        const { startRegistration } = await import('@simplewebauthn/browser');
        credential = await startRegistration(startResponse.options);
      }

      const completeResponse = await this.persistentClient.request('/api/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      if (!completeResponse.success) {
        throw new Error('등록 완료 실패: ' + completeResponse.message);
      }

      // 세션 저장
      if (completeResponse.sessionToken) {
        localStorage.setItem('cue_session_token', completeResponse.sessionToken);
      }
      if (completeResponse.sessionId) {
        localStorage.setItem('cue_session_id', completeResponse.sessionId);
      }

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw error;
    }
  }

  // 명시적 로그인
  async login() {
    console.log('🔑 === WebAuthn 로그인 시작 ===');
    
    try {
      const startResponse = await this.persistentClient.request('/api/auth/webauthn/login/start', {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: this.getDeviceInfo()
        })
      });

      if (!startResponse.success) {
        throw new Error('로그인 시작 실패: ' + startResponse.message);
      }

      // WebAuthn 라이브러리 로드
      const loaded = await loadWebAuthn();
      
      let credential;
      
      if (!loaded) {
        console.warn('⚠️ WebAuthn 라이브러리 없음 - Mock 패스키 사용');
        credential = this.persistentClient.getOrCreateMockCredential();
      } else {
        const { startAuthentication } = await import('@simplewebauthn/browser');
        credential = await startAuthentication(startResponse.options);
      }

      const completeResponse = await this.persistentClient.request('/api/auth/webauthn/login/complete', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      if (!completeResponse.success) {
        throw new Error('로그인 완료 실패: ' + completeResponse.message);
      }

      // 세션 저장
      if (completeResponse.sessionToken) {
        localStorage.setItem('cue_session_token', completeResponse.sessionToken);
      }
      if (completeResponse.sessionId) {
        localStorage.setItem('cue_session_id', completeResponse.sessionId);
      }

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      throw error;
    }
  }

  // 세션 복원
  async restoreSession() {
    return this.persistentClient.restoreSession();
  }

  // 로그아웃
  async logout() {
    return this.persistentClient.logout();
  }

  // 패스키 관리
  async listCredentials() {
    try {
      return await this.persistentClient.request('/api/auth/webauthn/credentials');
    } catch (error) {
      return {
        credentials: [
          {
            id: this.persistentClient.getOrCreateMockCredential().id,
            name: 'Mock Passkey',
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            deviceType: 'Browser Mock'
          }
        ],
        fallback: true
      };
    }
  }

  async deleteCredential(credentialId: string) {
    try {
      return await this.persistentClient.request(`/api/auth/webauthn/credentials/${credentialId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      return {
        success: false,
        error: 'Credential deletion failed',
        fallback: true
      };
    }
  }

  async renameCredential(credentialId: string, newName: string) {
    try {
      return await this.persistentClient.request(`/api/auth/webauthn/credentials/${credentialId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName })
      });
    } catch (error) {
      return {
        success: false,
        error: 'Credential rename failed',
        fallback: true
      };
    }
  }

  // 디바이스 정보 수집
  private getDeviceInfo() {
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
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      timestamp: Date.now()
    };
  }

  // Mock 패스키 관리
  getMockCredential() {
    return this.persistentClient.getOrCreateMockCredential();
  }

  clearMockCredential() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cue_mock_credential');
      console.log('🗑️ Mock 패스키 삭제됨');
    }
  }

  regenerateMockCredential() {
    this.clearMockCredential();
    return this.persistentClient.getOrCreateMockCredential();
  }

  // 디버그 및 테스트
  getDebugInfo() {
    const support = this.checkSupport();
    const mockCredential = this.getMockCredential();
    
    return {
      webauthnSupport: support,
      mockCredential,
      sessionInfo: {
        hasToken: !!localStorage.getItem('cue_session_token'),
        hasSessionId: !!localStorage.getItem('cue_session_id')
      },
      deviceInfo: this.getDeviceInfo(),
      timestamp: new Date().toISOString()
    };
  }

  // 테스트 플로우
  async testAuthentication() {
    console.log('🧪 === WebAuthn 테스트 시작 ===');
    
    try {
      // 1. 지원 확인
      const support = this.checkSupport();
      console.log('1. WebAuthn 지원:', support);

      // 2. 라이브러리 로드
      const loaded = await this.loadLibrary();
      console.log('2. 라이브러리 로드:', loaded);

      // 3. Mock 패스키 확인
      const mockCredential = this.getMockCredential();
      console.log('3. Mock 패스키:', mockCredential.id);

      // 4. 백엔드 상태 확인
      const health = await this.persistentClient.checkHealth();
      console.log('4. 백엔드 상태:', health);

      // 5. 인증 테스트
      const result = await this.authenticate();
      console.log('5. 인증 결과:', result.success);

      return {
        success: true,
        steps: {
          support,
          loaded,
          mockCredential: mockCredential.id,
          backend: health.connected,
          authentication: result.success
        }
      };

    } catch (error: any) {
      console.error('🧪 테스트 실패:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default WebAuthnAPI;