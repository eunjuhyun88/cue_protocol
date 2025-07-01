// ============================================================================
// 📁 src/types/auth.types.ts
// 🔐 Final0626 AI Passport 인증 관련 타입 정의
// ============================================================================

export interface User {
  id: string;
  username: string;
  email?: string | null; // ✅ email nullable 지원 (v2.1)
  display_name?: string;
  did: string;
  wallet_address?: string;
  walletAddress?: string; // 하위 호환성
  cue_tokens?: number;
  cueBalance?: number; // 하위 호환성
  trust_score?: number;
  trustScore?: number; // 하위 호환성
  passport_level?: string;
  passportLevel?: string; // 하위 호환성
  biometric_verified?: boolean;
  biometricVerified?: boolean; // 하위 호환성
  auth_method?: string;
  status?: string;
  subscription_type?: string;
  privacy_level?: string;
  
  // 개성 프로필
  personality?: {
    type?: string;
    working_style?: string;
    decision_making?: string;
    learning_pattern?: string;
    communication_style?: string;
    response_preference?: string;
  };
  
  // 심리학적 프로필
  psychology?: {
    openness?: number;
    conscientiousness?: number;
    extraversion?: number;
    agreeableness?: number;
    neuroticism?: number;
    curiosity?: number;
    risk_tolerance?: number;
    analytical_thinking?: number;
  };
  
  // 전문성 데이터
  expertise?: {
    domains?: Record<string, number>;
    programming_languages?: Record<string, number>;
    soft_skills?: Record<string, number>;
    tools_and_platforms?: Record<string, number>;
    career_focus?: string;
    learning_goals?: string[];
  };
  
  // CUE 설정
  cue_config?: {
    decay_rate?: number;
    learning_rate?: number;
    privacy_level?: string;
    auto_extraction?: boolean;
    learning_enabled?: boolean;
    adaptive_learning?: boolean;
    context_awareness?: number;
    max_cues_per_type?: number;
    cross_platform_sync?: boolean;
    confidence_threshold?: number;
    real_time_application?: boolean;
    personalization_strength?: number;
  };
  
  // 플랫폼 설정
  platform_settings?: {
    claude?: { enabled: boolean; sync_frequency: string; };
    chatgpt?: { enabled: boolean; sync_frequency: string; };
    gemini?: { enabled: boolean; sync_frequency: string; };
    discord?: { enabled: boolean; sync_frequency: string; };
  };
  
  // 사용 통계
  usage_stats?: {
    total_interactions?: number;
    cue_learning_score?: number;
    average_satisfaction?: number;
    successful_cue_applications?: number;
  };
  
  // 성취/업적
  achievements?: Achievement[];
  
  // 시간 정보
  created_at?: string;
  updated_at?: string;
  last_cue_update_at?: string;
  registeredAt?: string; // 하위 호환성
  lastLogin?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  icon: string;
  category?: string;
  earned: boolean;
  earned_at?: string;
  progress?: number;
  max_progress?: number;
  cue_reward?: number;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  timestamp: number;
  screen?: {
    width: number;
    height: number;
  };
  timezone?: string;
  language?: string;
}

export interface WebAuthnCredential {
  id: string;
  type: 'public-key';
  rawId?: ArrayBuffer;
  response: {
    attestationObject?: string | ArrayBuffer;
    clientDataJSON: string | ArrayBuffer;
    authenticatorData?: string | ArrayBuffer;
    signature?: string | ArrayBuffer;
    userHandle?: string | ArrayBuffer;
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  getClientExtensionResults?: () => any;
}

export interface WebAuthnRegistrationOptions {
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string | Uint8Array;
    name: string;
    displayName: string;
  };
  challenge: string | Uint8Array;
  pubKeyCredParams: Array<{
    alg: number;
    type: 'public-key';
  }>;
  timeout?: number;
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification?: 'required' | 'preferred' | 'discouraged';
    residentKey?: 'required' | 'preferred' | 'discouraged';
    requireResidentKey?: boolean;
  };
  excludeCredentials?: Array<{
    id: string | Uint8Array;
    type: 'public-key';
    transports?: Array<'usb' | 'nfc' | 'ble' | 'internal'>;
  }>;
}

export interface WebAuthnLoginOptions {
  challenge: string | Uint8Array;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string | Uint8Array;
    type: 'public-key';
    transports?: Array<'usb' | 'nfc' | 'ble' | 'internal'>;
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface WebAuthnRegistrationResult {
  success: boolean;
  user?: User;
  sessionId?: string;
  sessionToken?: string;
  isExistingUser?: boolean;
  action?: 'register' | 'login';
  error?: string;
  message?: string;
  rewards?: {
    welcomeCUE?: number;
    trustScore?: number;
  };
  debug?: {
    timestamp: string;
    databaseMode: string;
    summary?: any;
  };
}

export interface WebAuthnLoginResult {
  success: boolean;
  user?: User;
  sessionId?: string;
  sessionToken?: string;
  token?: string; // 하위 호환성
  action?: 'login' | 'register';
  error?: string;
  message?: string;
  debug?: {
    timestamp: string;
    databaseMode: string;
  };
}

export interface SessionRestoreResult {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
}

export interface HealthCheckResult {
  status: string;
  connected: boolean;
  mode: string;
  timestamp?: string;
  version?: string;
  environment?: string;
  database?: string;
  supabaseConnected?: boolean;
  services?: {
    webauthn?: boolean;
    ai?: boolean;
    cue?: boolean;
    vault?: boolean;
  };
  uptime?: number;
  memory?: any;
  error?: string;
  service?: string;
}

export interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  isRegistering: boolean;
  user: User | null;
  sessionToken: string | null;
  error: string | null;
  registrationStep: RegistrationStep;
}

export type RegistrationStep = 
  | 'waiting'     // 초기 대기 상태
  | 'auth'        // 생체인증 진행 중
  | 'wallet'      // 지갑 생성 중
  | 'passport'    // AI 패스포트 생성 중
  | 'complete';   // 완료

export interface AuthContextType {
  // State
  isInitialized: boolean;
  isAuthenticated: boolean;
  isRegistering: boolean;
  user: User | null;
  sessionToken: string | null;
  error: string | null;
  registrationStep: RegistrationStep;
  
  // Actions
  register: (email?: string) => Promise<void>;
  login: (email?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  setRegistrationStep: (step: RegistrationStep) => void;
}

// 백엔드 API 응답 타입들
export interface BackendResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface WebAuthnStartResponse {
  success: boolean;
  options: WebAuthnRegistrationOptions | WebAuthnLoginOptions;
  sessionId: string;
  userHandle?: string;
  userInfo?: {
    userID: string;
    displayName: string;
  };
  message?: string;
}

export interface WebAuthnCompleteResponse {
  success: boolean;
  verified?: boolean;
  user: User;
  sessionId?: string;
  sessionToken?: string;
  token?: string;
  isExistingUser?: boolean;
  action?: 'register' | 'login';
  rewards?: {
    welcomeCUE?: number;
    trustScore?: number;
  };
  message?: string;
  error?: string;
  debug?: any;
}

// WebAuthn 라이브러리 함수 타입
export type StartRegistrationFunction = (
  options: WebAuthnRegistrationOptions
) => Promise<WebAuthnCredential>;

export type StartAuthenticationFunction = (
  options: WebAuthnLoginOptions
) => Promise<WebAuthnCredential>;

// 세션 관리 타입
export interface SessionTokenPayload {
  userId: string;
  credentialId: string;
  type: 'session';
  iat: number;
  exp: number;
}

export interface AuthConfig {
  backendURL: string;
  enableMockMode: boolean;
  sessionTimeout: number; // milliseconds
  maxRetryAttempts: number;
  retryDelay: number; // milliseconds
}

// 에러 타입들
export class WebAuthnError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WebAuthnError';
  }
}

export class BackendError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

export class SessionError extends Error {
  constructor(
    message: string,
    public reason?: 'expired' | 'invalid' | 'missing'
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

// 유틸리티 타입들
export type OptionalUser = Partial<User>;
export type RequiredUserFields = Pick<User, 'id' | 'username' | 'did'>;

// API 엔드포인트 타입
export type AuthEndpoint = 
  | '/api/auth/webauthn/register/start'
  | '/api/auth/webauthn/register/complete'
  | '/api/auth/webauthn/login/start'
  | '/api/auth/webauthn/login/complete'
  | '/api/auth/webauthn/start'      // 통합 인증 시작
  | '/api/auth/webauthn/complete'   // 통합 인증 완료
  | '/api/auth/session/restore'
  | '/api/auth/logout'
  | '/health';

// 개발/디버깅용 타입
export interface DebugInfo {
  timestamp: string;
  endpoint: string;
  method: string;
  requestData?: any;
  responseData?: any;
  error?: string;
  duration?: number;
  userAgent?: string;
  sessionId?: string;
}

export interface MockConfig {
  enabled: boolean;
  responseDelay: number;
  successRate: number; // 0-1
  userData: Partial<User>;
  features: {
    webauthn: boolean;
    biometrics: boolean;
    database: boolean;
    ai: boolean;
  };
}