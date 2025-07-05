// ============================================================================
// 📁 frontend/src/services/api/WebAuthnAPI.ts
// 🔐 Production Ready WebAuthn API - No Mock, Persistent Session, Enhanced Error Handling
// 🔧 요구사항: Mock 제거, 영구 세션 유지, 강화된 에러처리 및 로깅
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
  private sessionPersistence: boolean = true;
  private retryAttempts: number = 3;
  private timeout: number = 60000; // 60초
  
  constructor(baseURL = 'http://localhost:3001') {
    super(baseURL);
    
    this.deviceInfo = this.collectDeviceInfo();
    this.initializeErrorRecovery();
    
    console.log('🔐 Production WebAuthnAPI 초기화 완료', {
      sessionPersistence: this.sessionPersistence,
      timeout: this.timeout,
      deviceSupport: checkWebAuthnSupport()
    });
  }

  // ============================================================================
  // 🔧 디바이스 정보 수집 (확장된 메타데이터)
  // ============================================================================
  
  private collectDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'Server',
        platform: 'Server',
        timestamp: Date.now(),
        source: 'WebAuthnAPI_SSR'
      };
    }

    const info: DeviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: Date.now(),
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      languages: navigator.languages,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      webauthnSupport: checkWebAuthnSupport(),
      source: 'WebAuthnAPI_Client',
      
      // 추가 보안 메타데이터
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : undefined,
      
      permissions: {
        notifications: 'unknown',
        geolocation: 'unknown'
      }
    };

    // 권한 상태 비동기 확인 (에러 무시)
    this.checkPermissions().then(permissions => {
      info.permissions = permissions;
    }).catch(() => {
      // 권한 확인 실패 무시
    });

    return info;
  }

  private async checkPermissions(): Promise<any> {
    if (!navigator.permissions) return { notifications: 'unavailable', geolocation: 'unavailable' };
    
    try {
      const [notifications, geolocation] = await Promise.all([
        navigator.permissions.query({ name: 'notifications' as any }),
        navigator.permissions.query({ name: 'geolocation' as any })
      ]);
      
      return {
        notifications: notifications.state,
        geolocation: geolocation.state
      };
    } catch (error) {
      return { notifications: 'error', geolocation: 'error' };
    }
  }

  // ============================================================================
  // 🔧 에러 복구 시스템 초기화
  // ============================================================================
  
  private initializeErrorRecovery(): void {
    // WebSocket 재연결 로직
    this.enableAutoReconnect();
    
    // 네트워크 상태 모니터링
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkRestore.bind(this));
      window.addEventListener('offline', this.handleNetworkLoss.bind(this));
    }
    
    console.log('🛡️ 에러 복구 시스템 초기화 완료');
  }

  private handleNetworkRestore(): void {
    console.log('🌐 네트워크 연결 복원됨');
    this.validateSessionAfterReconnect();
  }

  private handleNetworkLoss(): void {
    console.log('🚫 네트워크 연결 끊어짐');
    // 세션은 유지하되 상태만 기록
  }

  private async validateSessionAfterReconnect(): Promise<void> {
    try {
      if (this.getSessionToken()) {
        const result = await this.restoreSession();
        if (!result.success) {
          console.warn('⚠️ 네트워크 복원 후 세션 검증 실패');
        } else {
          console.log('✅ 네트워크 복원 후 세션 검증 성공');
        }
      }
    } catch (error) {
      console.error('❌ 네트워크 복원 후 세션 검증 오류:', error);
    }
  }

  // ============================================================================
  // 🔐 통합 WebAuthn 인증 (Production Ready)
  // ============================================================================

  /**
   * 통합 WebAuthn 인증 (로그인/등록 자동 판별, Mock 없음)
   */
  async unifiedWebAuthnAuth(): Promise<WebAuthnRegistrationResult> {
    const startTime = Date.now();
    let attempt = 0;
    
    while (attempt < this.retryAttempts) {
      try {
        attempt++;
        console.log(`🔥 === 통합 WebAuthn 인증 시작 (시도 ${attempt}/${this.retryAttempts}) ===`);

        // 1. WebAuthn 지원 확인 (필수)
        if (!checkWebAuthnSupport()) {
          throw new Error('이 브라우저나 기기에서는 WebAuthn을 지원하지 않습니다.');
        }

        // 2. 통합 인증 시작 API 호출
        console.log('📞 Step 1: 통합 인증 시작 API 호출');
        const startResponse = await this.post('/api/auth/webauthn/start', {
          deviceInfo: this.deviceInfo,
          sessionPersistence: this.sessionPersistence,
          timeout: this.timeout
        });

        if (!startResponse.success || !startResponse.options) {
          throw new Error(`통합 인증 시작 실패: ${startResponse.message || 'Invalid response'}`);
        }

        console.log('✅ 통합 인증 시작 성공:', {
          sessionId: startResponse.sessionId,
          challenge: startResponse.options.challenge?.slice(0, 20) + '...',
          timeout: startResponse.options.timeout
        });

        // 3. WebAuthn 라이브러리 로드 (필수)
        console.log('📦 Step 2: WebAuthn 라이브러리 로드');
        const loaded = await loadWebAuthn();
        
        if (!loaded) {
          throw new Error('WebAuthn 라이브러리를 로드할 수 없습니다. 네트워크 연결을 확인해주세요.');
        }

        // 4. 실제 WebAuthn 실행
        console.log('👆 Step 3: 생체인증 실행...');
        let credential: WebAuthnCredential;
        
        try {
          const { startAuthentication } = await import('@simplewebauthn/browser');
          
          // 기존 패스키 우선 시도
          credential = await Promise.race([
            startAuthentication({
              ...startResponse.options,
              allowCredentials: [] // 모든 등록된 패스키 허용
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('WebAuthn 시간 초과')), this.timeout)
            )
          ]);
          
          console.log('✅ 기존 패스키 인증 성공:', credential.id?.slice(0, 20) + '...');
          
        } catch (authError: any) {
          console.log('🆕 기존 패스키 없음, 새 패스키 등록 시도');
          
          try {
            const { startRegistration } = await import('@simplewebauthn/browser');
            
            credential = await Promise.race([
              startRegistration(startResponse.options),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('WebAuthn 등록 시간 초과')), this.timeout)
              )
            ]);
            
            console.log('✅ 새 패스키 등록 성공:', credential.id?.slice(0, 20) + '...');
            
          } catch (regError: any) {
            throw this.enhanceWebAuthnError(regError, 'registration');
          }
        }

        // 5. 통합 인증 완료
        console.log('📞 Step 4: 통합 인증 완료 API 호출');
        
        const completeResponse = await this.post('/api/auth/webauthn/complete', {
          credential,
          sessionId: startResponse.sessionId,
          deviceInfo: this.deviceInfo,
          processingTime: Date.now() - startTime
        });

        if (!completeResponse.success) {
          throw new Error(`인증 완료 실패: ${completeResponse.message || 'Server error'}`);
        }

        console.log('✅ 통합 인증 완료:', {
          action: completeResponse.action,
          isExisting: completeResponse.isExistingUser,
          userId: completeResponse.user?.id,
          processingTime: Date.now() - startTime
        });

        // 6. 영구 세션 토큰 저장
        if (completeResponse.sessionToken) {
          this.setSessionToken(completeResponse.sessionToken);
          console.log('💾 영구 세션 토큰 저장 완료');
          
          // 추가 세션 메타데이터 저장
          if (typeof window !== 'undefined') {
            localStorage.setItem('cue_session_metadata', JSON.stringify({
              loginTime: new Date().toISOString(),
              deviceFingerprint: this.generateDeviceFingerprint(),
              authMethod: 'WebAuthn',
              lastActivity: Date.now()
            }));
          }
        }

        // 7. 결과 반환
        const result: WebAuthnRegistrationResult = {
          success: true,
          user: this.normalizeUser(completeResponse.user),
          sessionToken: completeResponse.sessionToken,
          isExistingUser: completeResponse.action === 'login',
          action: completeResponse.action,
          message: completeResponse.message || `${completeResponse.action === 'login' ? '로그인' : '등록'} 성공`,
          deviceInfo: this.deviceInfo,
          processingTime: Date.now() - startTime,
          sessionPersistent: this.sessionPersistence
        };

        console.log(`🎉 === 통합 인증 완료: ${completeResponse.action?.toUpperCase()} (${Date.now() - startTime}ms) ===`);
        
        return result;

      } catch (error: any) {
        console.error(`💥 통합 WebAuthn 인증 실패 (시도 ${attempt}/${this.retryAttempts}):`, error);
        
        if (attempt >= this.retryAttempts) {
          throw this.enhanceWebAuthnError(error, 'unified_auth');
        }
        
        // 재시도 전 잠시 대기
        await this.delay(1000 * attempt);
      }
    }
    
    throw new Error('최대 재시도 횟수를 초과했습니다.');
  }

  // ============================================================================
  // 🔧 세션 복원 (강화된 검증)
  // ============================================================================

  /**
   * 세션 복원 (강화된 무결성 검증)
   */
  async restoreSession(): Promise<SessionRestoreResult> {
    console.log('🔧 === 강화된 세션 복원 시작 ===');
    
    try {
      // 1. 토큰 조회
      const sessionToken = this.getSessionToken();
      
      if (!sessionToken) {
        console.log('❌ 저장된 세션 토큰 없음');
        return { 
          success: false, 
          error: 'No session token found',
          action: 'login_required'
        };
      }

      console.log('🔍 세션 토큰 발견:', sessionToken.slice(0, 20) + '...');

      // 2. 세션 메타데이터 검증
      let sessionMetadata = null;
      try {
        const metadataStr = localStorage.getItem('cue_session_metadata');
        if (metadataStr) {
          sessionMetadata = JSON.parse(metadataStr);
          
          // 세션 만료 검사 (7일)
          const loginTime = new Date(sessionMetadata.loginTime).getTime();
          const now = Date.now();
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
          
          if (now - loginTime > maxAge) {
            console.log('⏰ 세션이 만료됨 (7일 초과)');
            this.clearSessionToken();
            return { 
              success: false, 
              error: 'Session expired',
              action: 'login_required'
            };
          }
        }
      } catch (metaError) {
        console.warn('⚠️ 세션 메타데이터 파싱 실패:', metaError);
      }

      // 3. 서버 세션 복원 요청
      console.log('📞 서버 세션 복원 요청');
      const response = await this.post('/api/auth/session/restore', { 
        sessionToken,
        deviceInfo: this.deviceInfo,
        sessionMetadata,
        integrity: this.generateDeviceFingerprint()
      });

      if (!response.success) {
        console.log('❌ 서버 세션 복원 실패:', response.error);
        
        // 실패 시 토큰 정리
        this.clearSessionToken();
        localStorage.removeItem('cue_session_metadata');
        
        return { 
          success: false, 
          error: response.error || 'Session restore failed',
          action: 'login_required'
        };
      }

      // 4. 세션 메타데이터 업데이트
      if (sessionMetadata) {
        sessionMetadata.lastActivity = Date.now();
        localStorage.setItem('cue_session_metadata', JSON.stringify(sessionMetadata));
      }

      console.log('✅ 세션 복원 성공!', {
        username: response.user?.username,
        lastActivity: sessionMetadata?.lastActivity
      });

      return {
        success: true,
        user: this.normalizeUser(response.user),
        sessionToken: sessionToken,
        message: response.message || '세션이 복원되었습니다',
        sessionMetadata,
        restoredAt: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('💥 세션 복원 오류:', error);
      
      // 네트워크 오류가 아닌 경우만 토큰 정리
      if (!this.isNetworkError(error)) {
        this.clearSessionToken();
        localStorage.removeItem('cue_session_metadata');
      }
      
      return { 
        success: false, 
        error: error.message || 'Session restore failed',
        action: this.isNetworkError(error) ? 'retry' : 'login_required'
      };
    }
  }

  // ============================================================================
  // 🔧 로그아웃 (완전한 정리)
  // ============================================================================

  /**
   * 로그아웃 (완전한 세션 정리)
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    console.log('🔧 === 완전한 로그아웃 처리 ===');
    
    try {
      const sessionToken = this.getSessionToken();
      
      if (sessionToken) {
        console.log('🗑️ 서버 세션 무효화');
        
        try {
          await this.post('/api/auth/logout', { 
            sessionToken,
            deviceInfo: this.deviceInfo,
            logoutTime: new Date().toISOString()
          });
          console.log('✅ 서버 로그아웃 성공');
        } catch (error) {
          console.warn('⚠️ 서버 로그아웃 실패 (로컬 정리는 계속)', error);
        }
      }

      // 2. 완전한 로컬 정리
      this.clearSessionToken();
      
      if (typeof window !== 'undefined') {
        // 모든 세션 관련 데이터 제거
        localStorage.removeItem('cue_session_metadata');
        localStorage.removeItem('cue_user_preferences');
        localStorage.removeItem('cue_device_fingerprint');
        
        // WebSocket 연결 해제
        this.disconnectWebSocket();
        
        console.log('✅ 로컬 세션 데이터 완전 정리 완료');
      }

      console.log('✅ 완전한 로그아웃 완료');
      return { success: true };

    } catch (error: any) {
      console.error('💥 로그아웃 오류:', error);
      
      // 오류가 발생해도 로컬 데이터는 정리
      this.clearSessionToken();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cue_session_metadata');
        localStorage.removeItem('cue_user_preferences');
        localStorage.removeItem('cue_device_fingerprint');
      }
      
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // 🔧 헬퍼 메서드들
  // ============================================================================

  /**
   * 사용자 데이터 정규화
   */
  private normalizeUser(userData: any): User {
    if (!userData) {
      throw new Error('사용자 데이터가 없습니다');
    }

    return {
      id: userData.id,
      username: userData.username || userData.display_name || `User_${userData.id?.slice(-8)}`,
      email: userData.email || userData.userEmail || null,
      did: userData.did || `did:cue:${userData.id}`,
      walletAddress: userData.walletAddress || userData.wallet_address,
      cueBalance: userData.cueBalance || userData.cue_tokens || 0,
      trustScore: userData.trustScore || userData.trust_score || 50,
      passportLevel: userData.passportLevel || userData.passport_level || 'Basic',
      biometricVerified: userData.biometricVerified || userData.biometric_verified || true,
      registeredAt: userData.registeredAt || userData.created_at || new Date().toISOString(),
      authenticated: true,
      source: 'WebAuthnAPI_Normalized'
    };
  }

  /**
   * WebAuthn 에러 강화
   */
  private enhanceWebAuthnError(error: any, context: string): Error {
    console.error(`🔧 WebAuthn 에러 처리 (${context}):`, error);
    
    let message = error.message || 'WebAuthn 인증 실패';
    let code = error.name || 'UnknownError';
    
    // 에러 타입별 메시지 개선
    switch (error.name) {
      case 'NotAllowedError':
        message = '생체인증이 취소되었거나 시간이 초과되었습니다. 다시 시도해주세요.';
        code = 'USER_CANCELLED';
        break;
      case 'SecurityError':
        message = '보안 오류가 발생했습니다. HTTPS 환경에서 시도하거나 브라우저 설정을 확인해주세요.';
        code = 'SECURITY_ERROR';
        break;
      case 'NotSupportedError':
        message = '이 기기나 브라우저에서는 생체인증을 지원하지 않습니다.';
        code = 'NOT_SUPPORTED';
        break;
      case 'InvalidStateError':
        message = '이미 등록된 인증기이거나 잘못된 상태입니다.';
        code = 'INVALID_STATE';
        break;
      case 'ConstraintError':
        message = '요청한 인증 방식을 사용할 수 없습니다.';
        code = 'CONSTRAINT_ERROR';
        break;
      case 'TimeoutError':
        message = '인증 시간이 초과되었습니다. 다시 시도해주세요.';
        code = 'TIMEOUT';
        break;
    }
    
    const enhancedError = new Error(message);
    enhancedError.name = code;
    enhancedError.cause = error;
    enhancedError.context = context;
    enhancedError.timestamp = new Date().toISOString();
    
    return enhancedError;
  }

  /**
   * 네트워크 에러 판별
   */
  private isNetworkError(error: any): boolean {
    return error.name === 'NetworkError' || 
           error.code === 'NETWORK_ERROR' ||
           error.message?.includes('fetch') ||
           error.message?.includes('network') ||
           !navigator.onLine;
  }

  /**
   * 디바이스 지문 생성
   */
  private generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown'
    ].join('|');
    
    // 간단한 해시 생성
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // 🔧 디버그 및 상태 확인
  // ============================================================================

  /**
   * 확장된 디버그 정보
   */
  getDebugInfo(): any {
    const baseDebugInfo = super.getDebugInfo();
    
    return {
      ...baseDebugInfo,
      webauthn: {
        support: checkWebAuthnSupport(),
        deviceInfo: this.deviceInfo,
        sessionPersistence: this.sessionPersistence,
        timeout: this.timeout,
        retryAttempts: this.retryAttempts
      },
      session: {
        hasToken: !!this.getSessionToken(),
        tokenLength: this.getSessionToken()?.length || 0,
        hasMetadata: !!localStorage.getItem('cue_session_metadata'),
        deviceFingerprint: this.generateDeviceFingerprint()
      },
      capabilities: {
        realtime: this.websocket?.readyState === WebSocket.OPEN,
        errorRecovery: true,
        networkMonitoring: typeof window !== 'undefined',
        persistentSession: this.sessionPersistence
      },
      health: {
        networkOnline: navigator.onLine,
        wsConnected: this.websocket?.readyState === WebSocket.OPEN,
        lastActivity: localStorage.getItem('cue_session_metadata') ? 
          JSON.parse(localStorage.getItem('cue_session_metadata')!).lastActivity : null
      }
    };
  }

  /**
   * 연결 상태 테스트
   */
  async testConnection(): Promise<any> {
    console.log('🧪 === 연결 상태 테스트 시작 ===');
    
    const results = {
      webauthnSupport: checkWebAuthnSupport(),
      backendConnected: false,
      sessionValid: false,
      websocketConnected: false,
      timestamp: new Date().toISOString()
    };

    try {
      // 1. 백엔드 연결 테스트
      const healthCheck = await this.checkHealth();
      results.backendConnected = healthCheck.connected;
      
      // 2. 세션 유효성 테스트
      if (this.getSessionToken()) {
        const sessionTest = await this.restoreSession();
        results.sessionValid = sessionTest.success;
      }
      
      // 3. WebSocket 연결 테스트
      results.websocketConnected = this.websocket?.readyState === WebSocket.OPEN;
      
      console.log('🧪 연결 테스트 완료:', results);
      return results;
      
    } catch (error) {
      console.error('🧪 연결 테스트 실패:', error);
      return { ...results, error: error.message };
    }
  }
}

export default WebAuthnAPI;