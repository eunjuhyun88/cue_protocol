// ============================================================================
// 📁 src/types/auth.types.ts
// 🔐 인증 관련 타입 정의
// ============================================================================

export type RegistrationStep = 'waiting' | 'passkey' | 'wallet' | 'complete';

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  createdAt: Date;
}

export interface AuthUser {
  did: string;
  walletAddress: string;
  passkeyRegistered: boolean;
  biometricVerified: boolean;
  credentialId?: string;
}

export interface WebAuthnRegistrationResult {
  success: boolean;
  user: AuthUser;
  sessionId?: string;
  message?: string;
}

export interface WebAuthnLoginResult {
  success: boolean;
  user: AuthUser;
  token?: string;
  message?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isRegistering: boolean;
  registrationStep: RegistrationStep;
  registrationError?: string;
  user?: AuthUser;
}

export interface BackendConnectionState {
  status: ConnectionStatus;
  isConnected: boolean;
  connectionDetails?: any;
  lastChecked?: Date;
}