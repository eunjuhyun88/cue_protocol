============================================================================
📋 Final0626 Backend TypeScript 타입 정의
경로: backend/src/types/index.ts
용도: 공통 타입 및 인터페이스 정의
============================================================================

============================================================================
🔐 인증 관련 타입
============================================================================

export interface User {
  id: string;
  username: string;
  did: string;
  wallet_address: string;
  cue_tokens: number;
  trust_score: number;
  passport_level: string;
  biometric_verified: boolean;
  personality_profile?: PersonalityProfile;
  created_at: string;
  last_login_at?: string;
}

export interface PersonalityProfile {
  type: string;
  communicationStyle: string;
  learningPattern: string;
  workingStyle: string;
  responsePreference: string;
  decisionMaking: string;
}

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_info?: any;
  created_at: string;
}

============================================================================
🤖 AI 관련 타입
============================================================================

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  description: string;
  maxTokens?: number;
  costPerToken?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  metadata?: any;
}

export interface ChatSession {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  model_used: string;
  created_at: string;
  updated_at: string;
}

============================================================================
⚡ CUE 토큰 관련 타입
============================================================================

export interface PersonalCue {
  id: string;
  user_id: string;
  prompt: string;
  response: string;
  model_used: string;
  cue_tokens_earned: number;
  metadata: any;
  created_at: string;
  cue_hash: string;
}

export interface CueTransaction {
  id: string;
  user_id: string;
  type: 'mining' | 'transfer' | 'spending';
  amount: number;
  description: string;
  metadata?: any;
  created_at: string;
}

export interface CueBalance {
  user_id: string;
  total_tokens: number;
  total_earned: number;
  total_spent: number;
  daily_earned: number;
  last_mining_at: string;
}

============================================================================
🗄️ 데이터 볼트 관련 타입
============================================================================

export interface VaultEntry {
  id: string;
  user_id: string;
  data: any;
  category: string;
  metadata: VaultMetadata;
  ragDagNodes: number;
  accessLevel: 'private' | 'shared' | 'public';
  created_at: string;
  updated_at: string;
}

export interface VaultMetadata {
  hash: string;
  encrypted: boolean;
  size: number;
  createdAt: string;
  tags?: string[];
  description?: string;
}

export interface RAGDAGNode {
  id: string;
  type: 'prompt' | 'response' | 'context' | 'reference';
  content: string;
  connections: string[];
  metadata: any;
  created_at: string;
}

============================================================================
🌐 API 응답 타입
============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  metadata?: any;
}

export interface PaginationResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

============================================================================
🔧 설정 관련 타입
============================================================================

export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
  webauthn: {
    rpName: string;
    rpId: string;
    origin: string;
  };
  ai: {
    openaiKey?: string;
    anthropicKey?: string;
    googleKey?: string;
  };
  cue: {
    miningRate: number;
    initialBalance: number;
    maxDailyMining: number;
  };
}

============================================================================
🛡️ 미들웨어 관련 타입
============================================================================

export interface RequestWithUser extends Request {
  user?: User;
  session?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}
