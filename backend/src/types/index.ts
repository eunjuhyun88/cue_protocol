// ============================================================================
// 📋 AI Personal Backend TypeScript 타입 정의 (수정됨)
// 경로: backend/src/types/index.ts
// 용도: 공통 타입 및 인터페이스 정의
// ============================================================================

// ============================================================================
// 🔐 데이터베이스 테이블 타입
// ============================================================================

export interface UserRecord {
  id: string;
  username: string;
  email?: string;
  did: string;
  wallet_address?: string;
  cue_tokens: number;
  trust_score: number;
  passport_level: string;
  biometric_verified: boolean;
  personality_profile?: any;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_info?: any;
  created_at: string;
  updated_at?: string;
}

export interface WebAuthnSession {
  id: string;
  user_id: string;
  session_id: string;
  challenge: string;
  expires_at: string;
  created_at: string;
  completed_at?: string;
}

export interface WebAuthnChallenge {
  id: string;
  user_id?: string;
  challenge: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  used_at?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  model_used: string;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  tokens_used?: number;
  cue_tokens_earned?: number;
  metadata?: any;
  created_at: string;
}

export interface PersonalCue {
  id: string;
  user_did: string;
  cue_key: string;
  cue_type: string;
  cue_value: any;
  confidence_score: number;
  source_context?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
}

export interface CueTransaction {
  id: string;
  user_did: string;
  transaction_type: 'mining' | 'transfer' | 'spending' | 'reward';
  amount: number;
  balance_after: number;
  description?: string;
  metadata?: any;
  created_at: string;
}

export interface AIPassport {
  id: string;
  user_did: string;
  passport_level: string;
  trust_score: number;
  interaction_count: number;
  last_interaction: string;
  personality_traits?: any;
  preferences?: any;
  created_at: string;
  updated_at?: string;
}

export interface DataVault {
  id: string;
  user_did: string;
  vault_name: string;
  vault_type: string;
  description?: string;
  encryption_key: string;
  access_permissions?: any;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface VaultData {
  id: string;
  vault_id: string;
  data_key: string;
  encrypted_data: string;
  data_type: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

export interface ConnectedPlatform {
  id: string;
  user_id: string;
  platform_name: string;
  platform_user_id: string;
  connection_status: 'active' | 'inactive' | 'error';
  credentials?: string; // encrypted
  metadata?: any;
  created_at: string;
  updated_at?: string;
}

export interface AIAgent {
  id: string;
  agent_name: string;
  agent_type: string;
  model_provider: string;
  model_name: string;
  capabilities?: string[];
  configuration?: any;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SystemActivity {
  id: string;
  user_id?: string;
  activity_type: string;
  description: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================================================
// 🤖 AI 서비스 타입
// ============================================================================

export interface AIService {
  provider: string;
  model: string;
  available: boolean;
  capabilities: string[];
}

export interface AIResponse {
  content: string;
  model: string;
  tokens_used: number;
  finish_reason?: string;
  metadata?: any;
}

export interface ServiceStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'error';
  details?: any;
  timestamp: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'error';
  services: ServiceStatus[];
  timestamp: string;
  uptime: number;
}

// ============================================================================
// 🌐 API 응답 타입
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface SuccessResponse<T = any> extends APIResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse extends APIResponse {
  success: false;
  error: string;
}

export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// 🔐 인증 관련 타입
// ============================================================================

export interface AuthResponse {
  success: boolean;
  user?: UserRecord;
  token?: string;
  sessionId?: string;
  message?: string;
}

export interface SessionData {
  userId: string;
  sessionId: string;
  expiresAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  did: string;
  cueTokens: number;
  trustScore: number;
  passportLevel: string;
  verified: boolean;
}

// ============================================================================
// 🔧 유틸리티 타입
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

export type AsyncHandler<T = any> = (req: any, res: any, next?: any) => Promise<T>;

export type RouteHandler = AsyncHandler<void>;

// ============================================================================
// 📦 내보내기 (타입만 export)
// ============================================================================

export type {
  UserRecord as User,
  WebAuthnCredential as Credential,
  WebAuthnSession as Session,
  WebAuthnChallenge as Challenge,
  Conversation as ChatConversation,
  Message as ChatMessage,
  PersonalCue as Cue,
  CueTransaction as Transaction,
  AIPassport as Passport,
  DataVault as Vault,
  VaultData as VaultContent,
  ConnectedPlatform as Platform,
  AIAgent as Agent,
  SystemActivity as Activity
};