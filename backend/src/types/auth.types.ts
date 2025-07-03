// ============================================================================
// 📁 backend/src/types/auth.types.ts
// 🎯 통합 Auth 타입 시스템 - 중복 제거 및 일관성 확보
// ============================================================================

// ============================================================================
// 🔑 Core User Types
// ============================================================================

/**
 * 기본 사용자 인터페이스 (모든 사용자 데이터의 기준)
 */
export interface User {
  id: string;
  username: string;
  email?: string | null;
  did: string;
  wallet_address: string;
  display_name?: string | null;
  trust_score: number;
  passport_level: string;
  biometric_verified: boolean;
  passkey_registered?: boolean;
  auth_method: 'passkey' | 'email' | 'social' | 'hybrid';
  cue_tokens: number;
  login_count?: number;
  created_at: string;
  updated_at?: string;
  last_login_at?: string | null;
  
  // 선택적 확장 데이터
  personality_profile?: PersonalityProfile;
  preferences?: UserPreferences;
  security_settings?: SecuritySettings;
}

/**
 * 사용자 생성 데이터 (필수 필드만)
 */
export interface CreateUserData {
  id: string;
  username: string;
  email?: string | null;
  did: string;
  wallet_address: string;
  display_name?: string;
  trust_score?: number;
  passport_level?: string;
  biometric_verified?: boolean;
  auth_method: 'passkey' | 'email' | 'social' | 'hybrid';
  cue_tokens?: number;
}

/**
 * 사용자 업데이트 데이터 (모든 필드 선택적)
 */
export interface UpdateUserData {
  username?: string;
  email?: string | null;
  display_name?: string | null;
  trust_score?: number;
  passport_level?: string;
  biometric_verified?: boolean;
  passkey_registered?: boolean;
  preferences?: Partial<UserPreferences>;
  security_settings?: Partial<SecuritySettings>;
  updated_at?: string;
  last_login_at?: string;
}

/**
 * 사용자 응답 포맷 (프론트엔드 호환성 포함)
 */
export interface UserResponse {
  // 기본 정보
  id: string;
  username: string;
  email?: string | null;
  did: string;
  
  // 지갑 정보 (호환성을 위한 중복 키)
  wallet_address: string;
  walletAddress: string; // 프론트엔드 호환성
  
  // 프로필 정보
  display_name?: string | null;
  
  // 점수 및 레벨 (호환성을 위한 중복 키)
  trust_score: number;
  trustScore: number; // 프론트엔드 호환성
  passport_level: string;
  passportLevel: string; // 프론트엔드 호환성
  
  // 인증 상태 (호환성을 위한 중복 키)
  biometric_verified: boolean;
  biometricVerified: boolean; // 프론트엔드 호환성
  passkey_registered: boolean;
  passkeyRegistered: boolean; // 프론트엔드 호환성
  
  // CUE 토큰 (호환성을 위한 중복 키)
  cue_tokens: number;
  cueBalance: number; // 프론트엔드 호환성
  
  // 날짜 정보 (호환성을 위한 중복 키)
  created_at: string;
  registeredAt: string; // 프론트엔드 호환성
  last_login_at?: string | null;
  lastLoginAt?: string | null; // 프론트엔드 호환성
}

/**
 * 사용자 성격 프로필
 */
export interface PersonalityProfile {
  type: string;
  communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  learningPattern: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  workingStyle: 'focused' | 'collaborative' | 'independent' | 'flexible';
  responsePreference: 'concise' | 'detailed' | 'examples' | 'step-by-step';
  decisionMaking: 'analytical' | 'intuitive' | 'collaborative' | 'data-driven';
  interests?: string[];
  goals?: string[];
}

/**
 * 사용자 환경설정
 */
export interface UserPreferences {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  ai_assistant: {
    personality: string;
    response_length: 'short' | 'medium' | 'long';
    formality: 'casual' | 'professional';
  };
  privacy: {
    data_sharing: boolean;
    analytics: boolean;
    personalization: boolean;
  };
}

/**
 * 보안 설정
 */
export interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  login_alerts: boolean;
  device_trust: boolean;
  ip_whitelist?: string[];
  security_questions?: SecurityQuestion[];
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer_hash: string;
  created_at: string;
}

// ============================================================================
// 🔐 Session Management Types
// ============================================================================

/**
 * 세션 데이터 (통합 버전)
 */
export interface SessionData {
  id: string;
  userId?: string;
  credentialId?: string;
  challenge?: string;
  type: SessionType;
  deviceInfo: DeviceInfo;
  userName?: string;
  userEmail?: string;
  timestamp: number;
  created: string;
  lastAccess: string;
  isActive: boolean;
  expiresAt?: number;
  
  // 추가 메타데이터
  userAgent?: string;
  ipAddress?: string;
  location?: GeolocationData;
}

/**
 * 세션 타입
 */
export type SessionType = 
  | 'registration' 
  | 'authentication' 
  | 'unified' 
  | 'session'
  | 'recovery'
  | 'verification';

/**
 * JWT 토큰 페이로드
 */
export interface SessionTokenPayload {
  userId: string;
  credentialId?: string;
  sessionId?: string;
  type: 'session' | 'access' | 'refresh';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  
  // 추가 클레임
  roles?: string[];
  permissions?: string[];
  deviceId?: string;
}

/**
 * 디바이스 정보
 */
export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  screenResolution?: string;
  language?: string;
  timezone?: string;
  fingerprint?: string;
  
  // 네트워크 정보
  ipAddress?: string;
  country?: string;
  city?: string;
  
  // 보안 정보
  trusted?: boolean;
  lastSeen?: string;
  riskScore?: number;
}

/**
 * 지리적 위치 데이터
 */
export interface GeolocationData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  isp?: string;
}

// ============================================================================
// 🔧 WebAuthn Types
// ============================================================================

/**
 * WebAuthn 자격증명 데이터 (데이터베이스 저장용)
 */
export interface WebAuthnCredentialData {
  id?: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: 'platform' | 'roaming';
  user_agent: string;
  backup_eligible?: boolean;
  backup_state?: boolean;
  is_active?: boolean;
  device_fingerprint?: DeviceInfo;
  created_at?: string;
  last_used_at?: string;
  
  // 추가 메타데이터
  nickname?: string;
  attestation_type?: string;
  transport?: ('usb' | 'nfc' | 'ble' | 'internal')[];
}

/**
 * WebAuthn 등록 옵션
 */
export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout?: number;
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
  excludeCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
  extensions?: AuthenticationExtensions;
}

/**
 * WebAuthn 로그인 옵션
 */
export interface WebAuthnLoginOptions {
  challenge: string;
  rpId?: string;
  timeout?: number;
  allowCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
  extensions?: AuthenticationExtensions;
}

/**
 * WebAuthn 확장 기능
 */
export interface AuthenticationExtensions {
  appid?: string;
  txAuthSimple?: string;
  txAuthGeneric?: {
    contentType: string;
    content: Uint8Array;
  };
  authnSel?: boolean;
  exts?: boolean;
  uvi?: boolean;
  loc?: boolean;
  uvm?: boolean;
  biometricPerfBounds?: {
    FAR?: number;
    FRR?: number;
  };
}

/**
 * WebAuthn 자격증명 응답
 */
export interface WebAuthnCredential {
  id: string;
  type: 'public-key';
  rawId?: ArrayBuffer;
  response: {
    authenticatorData?: ArrayBuffer;
    clientDataJSON: ArrayBuffer;
    signature?: ArrayBuffer;
    attestationObject?: ArrayBuffer;
    userHandle?: ArrayBuffer;
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults?: any;
}

// ============================================================================
// 📡 API Request/Response Types
// ============================================================================

/**
 * WebAuthn 시작 요청
 */
export interface WebAuthnStartRequest {
  deviceInfo?: DeviceInfo;
  userEmail?: string;
  userName?: string;
  preferredAuthenticator?: 'platform' | 'cross-platform';
}

/**
 * WebAuthn 완료 요청
 */
export interface WebAuthnCompleteRequest {
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject?: string;
      authenticatorData?: string;
      signature?: string;
      userHandle?: string;
    };
    type: string;
    clientExtensionResults?: any;
    authenticatorAttachment?: string;
  };
  sessionId: string;
}

/**
 * 세션 복원 요청
 */
export interface SessionRestoreRequest {
  sessionToken: string;
  deviceInfo?: DeviceInfo;
}

/**
 * WebAuthn 시작 응답
 */
export interface WebAuthnStartResponse {
  success: boolean;
  options: WebAuthnRegistrationOptions | WebAuthnLoginOptions;
  sessionId: string;
  message?: string;
  userInfo?: {
    userID: string;
    displayName: string;
  };
  debug?: any;
}

/**
 * WebAuthn 완료 응답
 */
export interface WebAuthnCompleteResponse {
  success: boolean;
  verified?: boolean;
  action?: 'register' | 'login';
  user: UserResponse;
  sessionId?: string;
  sessionToken?: string;
  token?: string; // 호환성
  isExistingUser?: boolean;
  rewards?: {
    welcomeCUE?: number;
    trustScore?: number;
    achievementBadges?: string[];
  };
  message?: string;
  error?: string;
  debug?: any;
}

/**
 * 통합 인증 응답
 */
export interface AuthResponse {
  success: boolean;
  action?: 'login' | 'register';
  sessionToken?: string;
  user?: UserResponse;
  isExistingUser?: boolean;
  rewards?: {
    welcomeCUE?: number;
    trustScore?: number;
    achievementBadges?: string[];
  };
  message: string;
  error?: string;
  details?: string;
  debug?: any;
}

/**
 * 세션 복원 응답
 */
export interface SessionRestoreResponse {
  success: boolean;
  user?: UserResponse;
  sessionInfo?: {
    createdAt: string;
    lastAccess: string;
    expiresAt: string;
    deviceTrusted: boolean;
  };
  message: string;
  error?: string;
}

// ============================================================================
// ⚙️ Configuration Types
// ============================================================================

/**
 * 인증 설정
 */
export interface AuthConfiguration {
  backendURL: string;
  enableMockMode: boolean;
  sessionTimeout: number;
  maxRetryAttempts: number;
  retryDelay: number;
  
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  };
  
  webauthn: {
    rpName: string;
    rpID: string;
    origin: string;
    timeout: number;
  };
  
  security: {
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    corsEnabled: boolean;
    allowedOrigins: string[];
  };
}

/**
 * Mock 설정
 */
export interface MockConfiguration {
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

// ============================================================================
// 🚨 Error Types
// ============================================================================

/**
 * 기본 인증 에러 클래스
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * WebAuthn 에러
 */
export class WebAuthnError extends AuthError {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message, code, 400);
    this.name = 'WebAuthnError';
  }
}

/**
 * 세션 에러
 */
export class SessionError extends AuthError {
  constructor(
    message: string,
    public reason: 'expired' | 'invalid' | 'missing' | 'conflict'
  ) {
    super(message, `SESSION_${reason.toUpperCase()}`, 401);
    this.name = 'SessionError';
  }
}

/**
 * 백엔드 연결 에러
 */
export class BackendError extends AuthError {
  constructor(
    message: string,
    public status: number,
    public endpoint?: string
  ) {
    super(message, 'BACKEND_ERROR', status);
    this.name = 'BackendError';
  }
}

/**
 * 검증 에러
 */
export class ValidationError extends AuthError {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// 🔄 Utility Types
// ============================================================================

/**
 * 부분 사용자 타입
 */
export type PartialUser = Partial<User>;

/**
 * 필수 사용자 필드
 */
export type RequiredUserFields = Pick<User, 'id' | 'username' | 'did' | 'wallet_address'>;

/**
 * API 엔드포인트 타입
 */
export type AuthEndpoint = 
  | '/api/auth/webauthn/start'
  | '/api/auth/webauthn/complete'
  | '/api/auth/webauthn/register/start'
  | '/api/auth/webauthn/register/complete'
  | '/api/auth/webauthn/login/start'
  | '/api/auth/webauthn/login/complete'
  | '/api/auth/session/restore'
  | '/api/auth/logout'
  | '/api/auth/status'
  | '/health';

/**
 * 디버그 정보
 */
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
  userId?: string;
}

/**
 * 시스템 상태
 */
export interface SystemStatus {
  authService: {
    initialized: boolean;
    databaseConnected: boolean;
    webauthnConfigured: boolean;
  };
  sessionService: {
    initialized: boolean;
    activeSessions: number;
    jwtConfigured: boolean;
  };
  timestamp: string;
  uptime: number;
  version: string;
}

/**
 * 통계 정보
 */
export interface AuthStats {
  totalSessions: number;
  activeSessions: number;
  byType: Record<SessionType, number>;
  recentActivity: number;
  averageSessionDuration: number;
  successRate: number;
  errorRate: number;
}

// ============================================================================
// 🎯 Type Guards
// ============================================================================

/**
 * User 타입 가드
 */
export function isValidUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.username === 'string' &&
    typeof obj.did === 'string' &&
    typeof obj.wallet_address === 'string' &&
    typeof obj.trust_score === 'number' &&
    typeof obj.passport_level === 'string' &&
    typeof obj.biometric_verified === 'boolean' &&
    typeof obj.auth_method === 'string' &&
    typeof obj.cue_tokens === 'number' &&
    typeof obj.created_at === 'string'
  );
}

/**
 * SessionData 타입 가드
 */
export function isValidSessionData(obj: any): obj is SessionData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    ['registration', 'authentication', 'unified', 'session', 'recovery', 'verification'].includes(obj.type) &&
    typeof obj.timestamp === 'number' &&
    typeof obj.created === 'string' &&
    typeof obj.lastAccess === 'string' &&
    typeof obj.isActive === 'boolean'
  );
}

/**
 * WebAuthnCredential 타입 가드
 */
export function isWebAuthnCredential(obj: any): obj is WebAuthnCredential {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    obj.type === 'public-key' &&
    typeof obj.response === 'object' &&
    obj.response.clientDataJSON instanceof ArrayBuffer
  );
}

/**
 * DeviceInfo 타입 가드
 */
export function isValidDeviceInfo(obj: any): obj is DeviceInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj.userAgent === undefined || typeof obj.userAgent === 'string') &&
    (obj.platform === undefined || typeof obj.platform === 'string') &&
    (obj.deviceType === undefined || ['desktop', 'mobile', 'tablet'].includes(obj.deviceType))
  );
}

