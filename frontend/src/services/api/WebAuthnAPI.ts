// ============================================================================
// 📁 frontend/src/services/api/WebAuthnAPI.ts
// 🔐 통합 WebAuthn API 서비스 - 기존 구조 완벽 호환 (Mock 제거)
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
      console.log('✅ WebAuthn 라이브러리 로드 성공');
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
  // 🔐 WebAuthn 등록 (실제 백엔드 연동)
  // ============================================================================
  
  /**
   * WebAuthn 등록 시작 (영구 세션 기능 포함)
   * ✅ useAuth에서 사용하는 핵심 메서드
   */
  async startWebAuthnRegistration(userEmail?: string): Promise<WebAuthnRegistrationResult> {
    try {
      console.log('🆕 === WebAuthn 등록 시작 ===');

      // 1. 등록 시작 API 호출
      const startResponse = await this.post('/api/auth/webauthn/register/start', {
        userEmail,
        userName: `PassKey_User_${Date.now()}`,
        deviceInfo: {
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          timestamp: Date.now()
        },
      });

      console.log('✅ 등록 시작 성공:', { 
        success: startResponse.success, 
        sessionId: startResponse.sessionId 
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error(startResponse.message || '등록 시작 응답이 올바르지 않습니다');
      }

      // 2. WebAuthn 라이브러리 로드 및 실행
      console.log('📦 WebAuthn 라이브러리 로드 확인');
      const loaded = await loadWebAuthn();
      
      if (!loaded) {
        throw new Error('WebAuthn 라이브러리를 로드할 수 없습니다. 브라우저 호환성을 확인하세요.');
      }

      console.log('👆 생체인증 팝업 실행...');
      const credential = await startRegistration(startResponse.options);
      console.log('✅ 생체인증 완료:', credential.id);

      // 3. 등록 완료 API 호출
      console.log('📋 등록 완료 요청 전송');
      const completeResponse = await this.post('/api/auth/webauthn/register/complete', {
        credential,
        sessionId: startResponse.sessionId
      });

      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '등록 완료에 실패했습니다');
      }

      // 4. 세션 토큰 저장 (영구 세션)
      const sessionToken = completeResponse.sessionToken || completeResponse.token;
      if (sessionToken) {
        this.setSessionToken(sessionToken);
        console.log('💾 세션 토큰 저장 완료');
      }

      // 5. 호환성을 위한 추가 데이터 저장
      if (completeResponse.sessionId && typeof window !== 'undefined') {
        localStorage.setItem('cue_session_id', completeResponse.sessionId);
      }

      console.log('🎉 WebAuthn 등록 완전 성공:', {
        username: completeResponse.user?.username,
        did: completeResponse.user?.did,
        isExisting: completeResponse.isExistingUser || false
      });

      return {
        success: true,
        user: completeResponse.user,
        sessionToken: sessionToken,
        sessionId: completeResponse.sessionId,
        message: completeResponse.message || 'Registration successful'
      };

    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      
      // WebAuthn 특정 에러 처리
      let errorMessage = 'WebAuthn registration failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '사용자가 생체인증을 취소했습니다.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '이 기기에서는 생체인증을 지원하지 않습니다.';
      } else if (error.name === 'SecurityError') {
        errorMessage = '보안 오류가 발생했습니다. HTTPS 환경인지 확인해주세요.';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = '이미 등록된 크리덴셜입니다.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        user: null,
        sessionToken: null,
        sessionId: null
      };
    }
  }

  // ============================================================================
  // 🔓 WebAuthn 로그인 (실제 백엔드 연동)
  // ============================================================================
  
  /**
   * WebAuthn 로그인
   * ✅ useAuth에서 사용하는 핵심 메서드
   */
  async loginWithWebAuthn(userEmail?: string): Promise<WebAuthnLoginResult> {
    try {
      console.log('🔓 === WebAuthn 로그인 시작 ===');

      // 1. 로그인 시작 API 호출
      const startResponse = await this.post('/api/auth/webauthn/login/start', {
        userEmail
      });

      console.log('✅ 로그인 시작 성공:', { 
        success: startResponse.success, 
        sessionId: startResponse.sessionId 
      });

      if (!startResponse.success || !startResponse.options) {
        throw new Error(startResponse.message || '로그인 시작 응답이 올바르지 않습니다');
      }

      // 2. WebAuthn 라이브러리 로드 및 실행
      console.log('📦 WebAuthn 라이브러리 로드 확인');
      const loaded = await loadWebAuthn();
      
      if (!loaded) {
        throw new Error('WebAuthn 라이브러리를 로드할 수 없습니다. 브라우저 호환성을 확인하세요.');
      }

      console.log('👆 생체인증 팝업 실행...');
      const credential = await startAuthentication(startResponse.options);
      console.log('✅ 생체인증 완료:', credential.id);

      // 3. 로그인 완료 API 호출
      console.log('📋 로그인 완료 요청 전송');
      const completeResponse = await this.post('/api/auth/webauthn/login/complete', {
        credential,
        sessionId: startResponse.sessionId
      });

      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '로그인 완료에 실패했습니다');
      }

      // 4. 세션 토큰 저장 (영구 세션)
      const sessionToken = completeResponse.sessionToken || completeResponse.token;
      if (sessionToken) {
        this.setSessionToken(sessionToken);
        console.log('💾 로그인 세션 토큰 저장 완료');
      }

      console.log('🎉 WebAuthn 로그인 완전 성공:', {
        username: completeResponse.user?.username,
        did: completeResponse.user?.did
      });

      return {
        success: true,
        user: completeResponse.user,
        sessionToken: sessionToken,
        sessionId: completeResponse.sessionId,
        message: completeResponse.message || 'Login successful'
      };

    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      
      // WebAuthn 특정 에러 처리
      let errorMessage = 'WebAuthn login failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '사용자가 인증을 취소했습니다.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '이 기기에서는 생체인증을 지원하지 않습니다.';
      } else if (error.name === 'SecurityError') {
        errorMessage = '보안 오류가 발생했습니다. HTTPS 환경인지 확인해주세요.';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = '등록된 크리덴셜을 찾을 수 없습니다.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        user: null,
        sessionToken: null,
        sessionId: null
      };
    }
  }

  // ============================================================================
  // 🔧 세션 복원 (useAuth 호환용)
  // ============================================================================
  
  /**
   * 세션 복원 (페이지 새로고침 시 자동 호출)
   * ✅ useAuth에서 사용 가능한 메서드
   */
  async restoreSession(): Promise<any> {
    console.log('🔄 === WebAuthnAPI 세션 복원 시작 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        console.log('❌ 저장된 세션 토큰 없음');
        return {
          success: false,
          error: 'No session token found'
        };
      }

      console.log('🔍 저장된 세션 토큰 발견, 복원 시도');

      const response = await this.post('/api/auth/session/restore', { 
        sessionToken 
      });

      if (!response.success) {
        console.log('❌ 세션 복원 실패, 토큰 삭제');
        this.clearSessionToken();
        return {
          success: false,
          error: response.message || 'Session restore failed'
        };
      }

      console.log('✅ 세션 복원 성공!', {
        username: response.user?.username,
        did: response.user?.did,
        cueBalance: response.user?.cueBalance || response.user?.cue_tokens
      });

      // 새 토큰이 있으면 저장
      if (response.sessionToken) {
        this.setSessionToken(response.sessionToken);
      }

      return response;

    } catch (error: any) {
      console.error('💥 세션 복원 오류:', error);
      this.clearSessionToken();
      return {
        success: false,
        error: error.message || 'Session restore failed'
      };
    }
  }

  // ============================================================================
  // 🎯 유틸리티 메서드들
  // ============================================================================

  /**
   * 사용자 정보 업데이트
   */
  async updateUserProfile(updates: any): Promise<any> {
    try {
      return await this.put('/api/auth/profile', updates);
    } catch (error: any) {
      console.error('프로필 업데이트 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 디바이스 목록 조회
   */
  async getRegisteredDevices(): Promise<any> {
    try {
      return await this.get('/api/auth/devices');
    } catch (error: any) {
      console.error('디바이스 목록 조회 실패:', error);
      return {
        success: false,
        devices: [],
        error: error.message
      };
    }
  }

  /**
   * 디바이스 삭제
   */
  async removeDevice(deviceId: string): Promise<any> {
    try {
      return await this.delete(`/api/auth/devices/${deviceId}`);
    } catch (error: any) {
      console.error('디바이스 삭제 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * WebAuthn 지원 여부 확인
   */
  checkWebAuthnSupport(): { supported: boolean; reason?: string } {
    if (typeof window === 'undefined') {
      return { supported: false, reason: 'server-side' };
    }
    
    if (!window.PublicKeyCredential) {
      return { supported: false, reason: 'not-supported' };
    }
    
    return { supported: true };
  }

  /**
   * 백엔드 연결 상태 확인
   */
  async checkConnection(): Promise<any> {
    try {
      return await this.get('/api/debug/health');
    } catch (error) {
      return {
        status: 'disconnected',
        error: 'Backend connection failed'
      };
    }
  }
}

export default WebAuthnAPI;