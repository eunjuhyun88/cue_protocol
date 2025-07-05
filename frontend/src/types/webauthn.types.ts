// ============================================================================
// 🔄 프론트엔드-백엔드 인터페이스 완전 동기화
// 목적: WebAuthn API 호출 시 인자와 응답이 정확히 일치하도록 수정
// ============================================================================

// ============================================================================
// 📋 1단계: 공통 타입 정의 (프론트엔드와 백엔드 공유)
// ============================================================================

// 공통 디바이스 정보 인터페이스
interface DeviceInfo {
  platform?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  timestamp?: number;
  clientFingerprint?: string;
  ip?: string;
}

// 공통 WebAuthn 요청 인터페이스
interface WebAuthnRegistrationRequest {
  userEmail?: string;
  userName?: string;
  userDisplayName?: string;
  deviceInfo?: DeviceInfo;
}

interface WebAuthnLoginRequest {
  userIdentifier?: string;
  userEmail?: string;
}

// 공통 사용자 응답 인터페이스
interface WebAuthnUser {
  id: string;
  name: string;               // 백엔드 기준 (username 아님)
  displayName: string;
  email?: string;
  did: string;
  walletAddress: string;
  trustScore: number;
  loginCount?: number;
}

// 공통 WebAuthn 응답 인터페이스
interface WebAuthnRegistrationResponse {
  success: boolean;
  message?: string;
  user?: WebAuthnUser;
  credential?: {
    id: string;
    deviceType: string;
    backedUp: boolean;
  };
  authentication?: {           // 백엔드 구조 사용
    token: string;
    expiresAt: string;
    type: 'jwt';
  };
  security?: {
    userVerified: boolean;
    counter: number;
    registrationTimestamp: string;
  };
}

interface WebAuthnLoginResponse {
  success: boolean;
  message?: string;
  user?: WebAuthnUser;
  authentication?: {
    credentialID: string;
    deviceType: string;
    counter: number;
    userVerified: boolean;
    authenticatedAt: string;
  };
  session?: {                  // 백엔드 구조 사용
    token: string;
    expiresAt: string;
    type: 'jwt';
  };
  security?: {
    strongAuthentication: boolean;
    phishingResistant: boolean;
    userPresence: boolean;
    userVerification: boolean;
  };
}

// ============================================================================
// 📋 2단계: 프론트엔드 API 클라이언트 수정
// ============================================================================

class FixedWebAuthnAPI {
  private baseURL: string = 'http://localhost:3001';

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`❌ API 오류 (${endpoint}):`, error);
      throw error;
    }
  }

  // ✅ 수정된 등록 메서드 - 백엔드와 완전 일치
  async startWebAuthnRegistration(userEmail?: string): Promise<WebAuthnRegistrationResponse> {
    try {
      console.log('🆕 === WebAuthn 등록 시작 (인터페이스 동기화) ===');

      // ✅ 백엔드가 기대하는 정확한 구조로 전송
      const registrationRequest: WebAuthnRegistrationRequest = {
        userEmail: userEmail || `demo_${Date.now()}@example.com`,
        userName: userEmail ? userEmail.split('@')[0] : `demo_user_${Date.now()}`,
        userDisplayName: userEmail ? `User ${userEmail.split('@')[0]}` : `Demo User ${Date.now()}`,
        deviceInfo: {
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          timestamp: Date.now()
        }
      };

      console.log('📤 등록 요청 데이터:', registrationRequest);

      // 1. 등록 시작 API 호출
      const startResponse = await this.request('/api/auth/webauthn/register/start', {
        method: 'POST',
        body: JSON.stringify(registrationRequest)
      });

      console.log('📥 등록 시작 응답:', startResponse);

      if (!startResponse.success || !startResponse.options) {
        throw new Error(startResponse.message || '등록 시작 실패');
      }

      // 2. WebAuthn 라이브러리 로드
      let startRegistration: any = null;
      try {
        const webauthn = await import('@simplewebauthn/browser');
        startRegistration = webauthn.startRegistration;
        console.log('✅ WebAuthn 라이브러리 로드 성공');
      } catch (error) {
        console.warn('⚠️ WebAuthn 라이브러리 로드 실패, Mock 모드 사용');
      }

      // 3. WebAuthn 실행 또는 Mock
      let credential;
      if (startRegistration) {
        console.log('👆 생체인증 팝업 실행...');
        credential = await startRegistration(startResponse.options);
        console.log('✅ 생체인증 완료:', credential.id);
      } else {
        console.log('🎭 Mock 크리덴셜 생성...');
        credential = {
          id: `mock_cred_${Date.now()}`,
          type: 'public-key',
          response: {
            attestationObject: 'mock-attestation',
            clientDataJSON: 'mock-client-data'
          }
        };
      }

      // 4. 등록 완료 API 호출
      const completeResponse = await this.request('/api/auth/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      console.log('📥 등록 완료 응답:', completeResponse);

      // ✅ 응답 검증 및 정규화
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '등록 완료 실패');
      }

      // ✅ 토큰 저장 (백엔드 구조에 맞춤)
      const token = completeResponse.authentication?.token;
      if (token && typeof window !== 'undefined') {
        localStorage.setItem('webauthn_token', token);
        console.log('💾 인증 토큰 저장 완료');
      }

      console.log('🎉 WebAuthn 등록 완료:', {
        userId: completeResponse.user?.id,
        name: completeResponse.user?.name,
        did: completeResponse.user?.did,
        hasToken: !!token
      });

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 등록 실패:', error);
      throw new Error(error.message || 'WebAuthn 등록에 실패했습니다.');
    }
  }

  // ✅ 수정된 로그인 메서드 - 백엔드와 완전 일치
  async startWebAuthnLogin(userEmail?: string): Promise<WebAuthnLoginResponse> {
    try {
      console.log('🔓 === WebAuthn 로그인 시작 (인터페이스 동기화) ===');

      // ✅ 백엔드가 기대하는 정확한 구조로 전송
      const loginRequest: WebAuthnLoginRequest = {
        userIdentifier: userEmail || 'demo_user',
        userEmail: userEmail
      };

      console.log('📤 로그인 요청 데이터:', loginRequest);

      // 1. 로그인 시작 API 호출
      const startResponse = await this.request('/api/auth/webauthn/login/start', {
        method: 'POST',
        body: JSON.stringify(loginRequest)
      });

      console.log('📥 로그인 시작 응답:', startResponse);

      if (!startResponse.success || !startResponse.options) {
        throw new Error(startResponse.message || '로그인 시작 실패');
      }

      // 2. WebAuthn 라이브러리 로드
      let startAuthentication: any = null;
      try {
        const webauthn = await import('@simplewebauthn/browser');
        startAuthentication = webauthn.startAuthentication;
        console.log('✅ WebAuthn 라이브러리 로드 성공');
      } catch (error) {
        console.warn('⚠️ WebAuthn 라이브러리 로드 실패, Mock 모드 사용');
      }

      // 3. WebAuthn 실행 또는 Mock
      let credential;
      if (startAuthentication) {
        console.log('👆 생체인증 팝업 실행...');
        credential = await startAuthentication(startResponse.options);
        console.log('✅ 생체인증 완료:', credential.id);
      } else {
        console.log('🎭 Mock 크리덴셜 생성...');
        credential = {
          id: `mock_cred_${Date.now()}`,
          type: 'public-key',
          response: {
            authenticatorData: 'mock-auth-data',
            clientDataJSON: 'mock-client-data',
            signature: 'mock-signature'
          }
        };
      }

      // 4. 로그인 완료 API 호출
      const completeResponse = await this.request('/api/auth/webauthn/login/complete', {
        method: 'POST',
        body: JSON.stringify({
          credential,
          sessionId: startResponse.sessionId
        })
      });

      console.log('📥 로그인 완료 응답:', completeResponse);

      // ✅ 응답 검증 및 정규화
      if (!completeResponse.success) {
        throw new Error(completeResponse.message || '로그인 완료 실패');
      }

      // ✅ 토큰 저장 (백엔드 구조에 맞춤)
      const token = completeResponse.session?.token;
      if (token && typeof window !== 'undefined') {
        localStorage.setItem('webauthn_token', token);
        console.log('💾 세션 토큰 저장 완료');
      }

      console.log('🎉 WebAuthn 로그인 완료:', {
        userId: completeResponse.user?.id,
        name: completeResponse.user?.name,
        did: completeResponse.user?.did,
        hasToken: !!token
      });

      return completeResponse;

    } catch (error: any) {
      console.error('💥 WebAuthn 로그인 실패:', error);
      throw new Error(error.message || 'WebAuthn 로그인에 실패했습니다.');
    }
  }
}

// ============================================================================
// 📋 3단계: React Hook 수정 (useAuth.ts)
// ============================================================================

interface UseAuthReturn {
  isAuthenticated: boolean;
  user: WebAuthnUser | null;
  register: (userEmail?: string) => Promise<void>;
  login: (userEmail?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<WebAuthnUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const api = new FixedWebAuthnAPI();

  const register = async (userEmail?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.startWebAuthnRegistration(userEmail);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        console.log('✅ 등록 완료, 상태 업데이트됨');
      } else {
        throw new Error('등록 응답이 올바르지 않습니다');
      }
    } catch (error: any) {
      setError(error.message);
      console.error('❌ 등록 실패:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userEmail?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.startWebAuthnLogin(userEmail);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        console.log('✅ 로그인 완료, 상태 업데이트됨');
      } else {
        throw new Error('로그인 응답이 올바르지 않습니다');
      }
    } catch (error: any) {
      setError(error.message);
      console.error('❌ 로그인 실패:', error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('webauthn_token');
    }
    console.log('🚪 로그아웃 완료');
  };

  return {
    isAuthenticated,
    user,
    register,
    login,
    logout,
    isLoading,
    error
  };
};

// ============================================================================
// 📋 4단계: 사용법 예시
// ============================================================================

/*
// React 컴포넌트에서 사용
const MyComponent = () => {
  const { register, login, user, isAuthenticated, isLoading, error } = useAuth();

  const handleRegister = async () => {
    try {
      await register('user@example.com');
      console.log('등록 성공!', user);
    } catch (error) {
      console.error('등록 실패:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await login('user@example.com');
      console.log('로그인 성공!', user);
    } catch (error) {
      console.error('로그인 실패:', error);
    }
  };

  return (
    <div>
      {!isAuthenticated ? (
        <>
          <button onClick={handleRegister} disabled={isLoading}>
            {isLoading ? '등록 중...' : '패스키로 가입'}
          </button>
          <button onClick={handleLogin} disabled={isLoading}>
            {isLoading ? '로그인 중...' : '패스키로 로그인'}
          </button>
        </>
      ) : (
        <div>
          <p>환영합니다, {user?.name}님!</p>
          <p>DID: {user?.did}</p>
          <p>신뢰점수: {user?.trustScore}</p>
        </div>
      )}
      {error && <p style={{color: 'red'}}>에러: {error}</p>}
    </div>
  );
};
*/