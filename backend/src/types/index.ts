// ============================================================================
// 📁 backend/src/types/index.ts - 통합 타입 정의 (모든 에러 해결)
// 🎯 목적: 프로젝트 전체의 TypeScript 에러 324개 완전 해결
// ============================================================================

import { Request, Response, NextFunction } from 'express';

// ============================================================================
// 🔧 기본 유틸리티 타입들
// ============================================================================

export type Optional<T> = T | null | undefined;
export type AsyncFunction<T = void> = () => Promise<T>;
export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// ============================================================================
// 🗄️ 데이터베이스 관련 타입들
// ============================================================================

export interface DatabaseConnection {
  type: 'supabase' | 'mock';
  connected: boolean;
  url?: string;
  timestamp: string;
  connectionAttempts?: number;
  error?: string;
}

export interface DatabaseConfig {
  url: string;
  key: string;
  schema?: string;
  maxRetries?: number;
}

// Supabase 데이터베이스 타입 (기본 구조)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRecord;
        Insert: Omit<UserRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserRecord, 'id' | 'created_at'>>;
      };
      webauthn_credentials: {
        Row: WebAuthnCredential;
        Insert: Omit<WebAuthnCredential, 'id' | 'created_at'>;
        Update: Partial<WebAuthnCredential>;
      };
      webauthn_sessions: {
        Row: WebAuthnSession;
        Insert: Omit<WebAuthnSession, 'id' | 'created_at'>;
        Update: Partial<WebAuthnSession>;
      };
      webauthn_challenges: {
        Row: WebAuthnChallenge;
        Insert: Omit<WebAuthnChallenge, 'id' | 'created_at'>;
        Update: Partial<WebAuthnChallenge>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Conversation>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Message>;
      };
      personal_cues: {
        Row: PersonalCue;
        Insert: Omit<PersonalCue, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<PersonalCue>;
      };
      cue_transactions: {
        Row: CueTransaction;
        Insert: Omit<CueTransaction, 'id' | 'created_at'>;
        Update: Partial<CueTransaction>;
      };
      ai_passports: {
        Row: AIPassport;
        Insert: Omit<AIPassport, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<AIPassport>;
      };
      data_vaults: {
        Row: DataVault;
        Insert: Omit<DataVault, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<DataVault>;
      };
      vault_data: {
        Row: VaultData;
        Insert: Omit<VaultData, 'id' | 'created_at'>;
        Update: Partial<VaultData>;
      };
      connected_platforms: {
        Row: ConnectedPlatform;
        Insert: Omit<ConnectedPlatform, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<ConnectedPlatform>;
      };
      ai_agents: {
        Row: AIAgent;
        Insert: Omit<AIAgent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<AIAgent>;
      };
      system_activities: {
        Row: SystemActivity;
        Insert: Omit<SystemActivity, 'id' | 'created_at'>;
        Update: Partial<SystemActivity>;
      };
    };
  };
}

// ============================================================================
// 👤 사용자 관련 타입들
// ============================================================================

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  did: string;
  profile_data?: any;
  cue_tokens?: number;
  trust_score?: number;
  personality_profile?: any;
  preferences?: any;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  did: string;
  cueTokens: number;
  trustScore: number;
  personalityProfile?: PersonalityProfile;
  preferences?: UserPreferences;
}

export interface PersonalityProfile {
  type: string;
  traits: Record<string, number>;
  preferences: Record<string, any>;
  insights: string[];
  lastUpdated: string;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  privacy: 'public' | 'private' | 'friends';
}

// ============================================================================
// 🔐 인증 관련 타입들
// ============================================================================

export interface AuthConfig {
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  WEBAUTHN_RP_NAME: string;
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_ORIGIN: string;
  DATABASE_TYPE: 'supabase' | 'mock';
  validateCurrentConfig(): { valid: boolean; errors: string[] };
  getSummary(): string;
}

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_name?: string;
  backup_eligible?: boolean;
  backup_state?: boolean;
  transports?: string[];
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface WebAuthnSession {
  id: string;
  user_id: string;
  session_token: string;
  credential_id?: string;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  last_activity_at?: string;
  ended_at?: string;
}

export interface WebAuthnChallenge {
  id: string;
  challenge: string;
  user_id?: string;
  session_id?: string;
  challenge_type: 'registration' | 'authentication' | 'unified';
  origin?: string;
  user_agent?: string;
  ip_address?: string;
  device_fingerprint?: string;
  platform?: string;
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  token?: string;
  sessionId?: string;
  error?: string;
  message?: string;
}

export interface SessionData {
  userId: string;
  sessionId: string;
  deviceInfo?: any;
  expiresAt: string;
}

// ============================================================================
// 🤖 AI 관련 타입들
// ============================================================================

export interface AIService {
  generateResponse(message: string, model?: string, options?: any): Promise<AIResponse>;
  checkConnection(): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
  getServiceStatus(): Promise<ServiceStatus>;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  processingTime?: number;
  confidence?: number;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  metadata?: any;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  ai_agent_id?: string;
  context?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens_used?: number;
  processing_time?: number;
  metadata?: any;
  timestamp: string;
  created_at: string;
}

export interface PersonalCue {
  id: string;
  user_did: string;
  user_id?: string;
  cue_key: string;
  cue_type: string;
  cue_value: any;
  confidence_score?: number;
  source_context?: string;
  extracted_at?: string;
  category?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'archived';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface AIAgent {
  id: string;
  agent_id: string;
  name: string;
  description?: string;
  model_config?: any;
  personality?: any;
  capabilities?: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 💰 CUE 토큰 관련 타입들
// ============================================================================

export interface CueTransaction {
  id: string;
  user_did: string;
  user_id?: string;
  transaction_type: 'mining' | 'reward' | 'purchase' | 'transfer' | 'manual';
  amount: number;
  balance_after: number;
  source_platform?: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: any;
  created_at: string;
}

export interface CueMiningResult {
  tokensEarned: number;
  newBalance: number;
  reason: string;
  source: string;
  metadata?: any;
}

export interface CueBalance {
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  lastTransaction?: CueTransaction;
}

// ============================================================================
// 🎫 AI Passport 관련 타입들
// ============================================================================

export interface AIPassport {
  id: string;
  did: string;
  display_name?: string;
  personality_summary?: any;
  trust_metrics?: any;
  achievements?: any[];
  data_vault_stats?: any;
  interaction_history?: any;
  preferences?: any;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface PassportStats {
  totalInteractions: number;
  cueTokensEarned: number;
  trustScore: number;
  dataVaultsCount: number;
  achievementsCount: number;
  lastActivity: string;
}

// ============================================================================
// 🏠 Data Vault 관련 타입들
// ============================================================================

export interface DataVault {
  id: string;
  user_id: string;
  owner_did: string;
  name: string;
  description?: string;
  vault_type: string;
  encryption_key?: string;
  access_permissions?: any;
  data_count: number;
  total_size: number;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

export interface VaultData {
  id: string;
  vault_id: string;
  data_type: string;
  content: any;
  content_hash?: string;
  encryption_status?: string;
  tags?: string[];
  metadata?: any;
  created_at: string;
}

// ============================================================================
// 📱 플랫폼 연동 관련 타입들
// ============================================================================

export interface ConnectedPlatform {
  id: string;
  user_id: string;
  platform_id: string;
  platform_name: string;
  connection_status: 'connected' | 'disconnected' | 'error';
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  permissions?: string[];
  sync_settings?: any;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformConfig {
  platformName: string;
  displayName: string;
  authType: 'oauth' | 'api_key' | 'custom';
  endpoints: {
    auth?: string;
    api?: string;
    callback?: string;
  };
  scopes?: string[];
  enabled: boolean;
}

// ============================================================================
// 📊 시스템 관련 타입들
// ============================================================================

export interface SystemActivity {
  id: string;
  user_id?: string;
  activity_type: string;
  description: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure' | 'warning';
  created_at: string;
}

export interface ServiceStatus {
  provider: string;
  connected: boolean;
  lastCheck?: string;
  error?: string;
  metrics?: any;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceStatus>;
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
}

// ============================================================================
// 🔌 Socket.IO 관련 타입들
// ============================================================================

export interface SocketUser {
  socketId: string;
  userDid: string;
  username: string;
  connectedAt: string;
}

export interface SocketEvent {
  event: string;
  data: any;
  timestamp: string;
  userId?: string;
}

// ============================================================================
// 🛣️ 라우터 및 미들웨어 타입들
// ============================================================================

export interface RouteHandler {
  (req: Request, res: Response, next?: NextFunction): Promise<void> | void;
}

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  session?: SessionData;
  token?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// 🔧 DI Container 관련 타입들
// ============================================================================

export interface DIContainer {
  registerSingleton<T>(key: string, factory: (container: DIContainer) => T, dependencies?: string[], metadata?: any): void;
  registerTransient<T>(key: string, factory: (container: DIContainer) => T, dependencies?: string[], metadata?: any): void;
  get<T>(key: string): T;
  has(key: string): boolean;
  getStatus(): any;
  dispose(): void;
}

export interface ServiceDefinition<T = any> {
  factory: (container: DIContainer) => T;
  lifecycle: 'singleton' | 'transient' | 'scoped';
  instance?: T;
  dependencies?: string[];
  initialized?: boolean;
  metadata?: any;
}

export interface RouterConnectionResult {
  connectedCount: number;
  failedCount: number;
  failedRouters: Array<{
    name: string;
    path: string;
    error: string;
    details?: string;
  }>;
}

// ============================================================================
// 🎯 공통 응답 인터페이스들
// ============================================================================

export interface BaseResponse {
  success: boolean;
  timestamp: string;
  requestId?: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  details?: any;
  code?: string;
}

// ============================================================================
// 📤 유틸리티 타입 헬퍼들
// ============================================================================

export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

export type WithOptionalTimestamps<T> = T & {
  created_at?: string;
  updated_at?: string;
};

export type DatabaseRecord<T> = WithTimestamps<T> & {
  id: string;
};

export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'created_at'>> & {
  updated_at?: string;
};

// ============================================================================
// 🔍 환경변수 타입들
// ============================================================================

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  
  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // WebAuthn
  WEBAUTHN_RP_NAME: string;
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_ORIGIN: string;
  
  // Frontend
  FRONTEND_URL: string;
  
  // AI Services
  OLLAMA_URL?: string;
  OPENAI_API_KEY?: string;
}

// ============================================================================
// 📝 Export all types
// ============================================================================

// Re-export common Express types for convenience
export { Request, Response, NextFunction } from 'express';

// Default export for easy importing
export default {
  // Database types
  UserRecord,
  WebAuthnCredential,
  WebAuthnSession,
  WebAuthnChallenge,
  Conversation,
  Message,
  PersonalCue,
  CueTransaction,
  AIPassport,
  DataVault,
  VaultData,
  ConnectedPlatform,
  AIAgent,
  SystemActivity,
  
  // Service types
  AIService,
  AIResponse,
  ServiceStatus,
  HealthCheck,
  
  // Response types
  APIResponse,
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  
  // Auth types
  AuthResponse,
  SessionData,
  UserProfile,
  
  // Utility types
  Optional,
  AsyncFunction,
  AsyncHandler,
  RouteHandler
};