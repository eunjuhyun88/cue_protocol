// ============================================================================
// 📁 backend/src/types/auth.types.ts
// 완전한 인증 관련 타입 정의 (업로드된 paste.txt 기반)
// ============================================================================

// ============================================================================
// 🔑 기본 사용자 타입
// ============================================================================

export interface User {
  id: string;
  username: string;
  email?: string;
  did: string;
  wallet_address: string;
  trust_score: number;
  passport_level: string;
  biometric_verified: boolean;
  auth_method: string;
  cue_tokens: number;
  created_at: string;
  last_login_at?: string;
  personality_profile?: PersonalityProfile;
}

export interface PersonalityProfile {
  type: string;
  communicationStyle: string;
  learningPattern: string;
  workingStyle: string;
  responsePreference: string;
  decisionMaking: string;
}

// ============================================================================
// 🔐 세션 관리 타입
// ============================================================================

export interface SessionData {
  id: string;
  userId?: string;
  credentialId?: string;
  challenge?: string;
  type: 'registration' | 'authentication' | 'unified' | 'session';
  deviceInfo: any;
  userName?: string;
  userEmail?: string;
  timestamp: number;
  created: string;
  lastAccess: string;
  isActive: boolean;
  expiresAt?: number;
}

export interface SessionTokenPayload {
  userId: string;
  credentialId: string;
  type: 'session';
  iat: number;
  exp: number;
}

// ============================================================================
// 🔧 WebAuthn 관련 타입
// ============================================================================

export interface WebAuthnCredential {
  id: string;
  type: 'public-key';
  rawId?: ArrayBuffer;
  response: {
    authenticatorData?: ArrayBuffer;
    clientDataJSON: ArrayBuffer;
    signature?: ArrayBuffer;
    attestationObject?: ArrayBuffer;
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults?: any;
}

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
  attestation?: 'none' | 'indirect' | 'direct';
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
  extensions?: any;
}

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
  extensions?: any;
}

// ============================================================================
// 📡 API 요청/응답 타입
// ============================================================================

export interface WebAuthnStartRequest {
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    timestamp?: string;
    [key: string]: any;
  };
  userEmail?: string;
}

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

export interface SessionRestoreRequest {
  sessionToken: string;
}

export interface WebAuthnStartResponse {
  success: boolean;
  options: WebAuthnRegistrationOptions | WebAuthnLoginOptions;
  sessionId: string;
  message?: string;
  userInfo?: {
    userID: string;
    displayName: string;
  };
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

export interface AuthResponse {
  success: boolean;
  action?: 'login' | 'register';
  sessionToken?: string;
  user?: User;
  isExistingUser?: boolean;
  rewards?: {
    welcomeCUE?: number;
  };
  message: string;
  error?: string;
  details?: string;
}

// ============================================================================
// ⚙️ 설정 타입
// ============================================================================

export interface AuthConfig {
  backendURL: string;
  enableMockMode: boolean;
  sessionTimeout: number; // milliseconds
  maxRetryAttempts: number;
  retryDelay: number; // milliseconds
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
}

export interface WebAuthnConfig {
  rpName: string;
  rpID: string;
  origin: string;
  timeout: number;
}

// ============================================================================
// 🚨 에러 타입
// ============================================================================

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

// ============================================================================
// 🔄 유틸리티 타입
// ============================================================================

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

// ============================================================================
// 🧪 개발/디버깅 타입
// ============================================================================

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

// ============================================================================
// 🔄 함수 타입
// ============================================================================

export type StartRegistrationFunction = (
  options: WebAuthnRegistrationOptions
) => Promise<WebAuthnCredential>;

export type StartAuthenticationFunction = (
  options: WebAuthnLoginOptions
) => Promise<WebAuthnCredential>;

// ============================================================================
// 🔒 미들웨어 타입
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: User;
  requestId?: string;
  sessionId?: string;
}

export interface AuthMiddlewareOptions {
  skipPaths?: string[];
  enableMockAuth?: boolean;
  requireVerification?: boolean;
}

// ============================================================================
// 📊 통계/모니터링 타입
// ============================================================================

export interface AuthStats {
  totalSessions: number;
  activeSessions: number;
  byType: {
    unified: number;
    registration: number;
    authentication: number;
    session: number;
  };
  recentActivity: number;
  averageSessionDuration: number;
  successRate: number;
}

export interface SecurityMetrics {
  failedAttempts: number;
  blockedIPs: string[];
  suspiciousActivity: number;
  rateLimitHits: number;
  lastSecurityScan: string;
}

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
}

// ============================================================================
// 🎯 타입 가드 함수
// ============================================================================

export function isValidUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
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

export function isValidSessionData(obj: any): obj is SessionData {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.credentialId === 'string' &&
    ['registration', 'authentication', 'unified', 'session'].includes(obj.type) &&
    typeof obj.timestamp === 'number' &&
    typeof obj.created === 'string' &&
    typeof obj.lastAccess === 'string' &&
    typeof obj.isActive === 'boolean'
  );
}

export function isWebAuthnCredential(obj: any): obj is WebAuthnCredential {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    obj.type === 'public-key' &&
    typeof obj.response === 'object' &&
    obj.response.clientDataJSON instanceof ArrayBuffer
  );
}