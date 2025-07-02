// ============================================================================
// 📋 백엔드 타입 정의 통합 파일
// 파일: backend/src/types/index.ts
// 역할: 모든 백엔드 타입 정의를 한 곳에서 관리
// ============================================================================

// 데이터베이스 타입들
export * from './database.types';

// ============================================================================
// 🤖 AI 서비스 관련 타입들
// ============================================================================

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'ollama' | 'mock';
  type: 'cloud' | 'local' | 'hybrid';
  available: boolean;
  recommended?: boolean;
  description?: string;
  maxTokens?: number;
  contextWindow?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  personalizationLevel?: number;
  usedData?: string[];
  provider?: string;
  local?: boolean;
  responseTime?: number;
}

export interface PersonalizationContext {
  personalityProfile?: PersonalityProfile;
  cues: PersonalCue[];
  behaviorPatterns?: string[];
  preferences?: Record<string, any>;
  recentInteractions?: any[];
  vaultIds: string[];
  personalityMatch: number;
}

export interface PersonalityProfile {
  type: string;
  communicationStyle: string;
  learningPattern: string;
  decisionMaking: string;
  workingStyle?: string;
  responsePreference?: string;
}

// ============================================================================
// ⚡ CUE 토큰 관련 타입들
// ============================================================================

export interface CUETransaction {
  id: string;
  user_id: string;
  user_did: string;
  transaction_type: 'mining' | 'spending' | 'transfer' | 'daily_bonus' | 'achievement';
  amount: number;
  balance_after: number;
  description: string;
  source_platform: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface MiningResult {
  tokensEarned: number;
  newBalance: number;
  multiplier: number;
  bonusReason?: string;
  activity: string;
}

export interface MiningStats {
  totalMined: number;
  dailyAverage: number;
  bestDay: { date: string; amount: number };
  currentStreak: number;
  activityBreakdown: Record<string, number>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  amount: number;
  avatar?: string;
  did: string;
}

// ============================================================================
// 🗄️ 데이터 볼트 관련 타입들
// ============================================================================

export interface DataVault {
  id: string;
  user_id: string;
  user_did: string;
  vault_name: string;
  description?: string;
  vault_type: 'personal' | 'shared' | 'public';
  is_encrypted: boolean;
  encryption_key_id?: string;
  compartment_count: number;
  total_size: number;
  access_permissions: VaultPermissions;
  metadata?: Record<string, any>;
  created_at: string;
  last_accessed_at?: string;
}

export interface VaultPermissions {
  owner: string;
  read: string[];
  write: string[];
  admin: string[];
}

export interface DataCompartment {
  id: string;
  vault_id: string;
  user_id: string;
  data_type: string;
  original_content?: string;
  encrypted_content?: string;
  is_encrypted: boolean;
  source_platform: string;
  compression_info?: CompressionInfo;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CompressionInfo {
  ratio: number;
  preservation: number;
  keywords: string[];
  entities: any[];
  topics: string[];
}

export interface PersonalCue {
  id: string;
  user_did: string;
  vault_id?: string;
  content_type: string;
  original_content?: string;
  compressed_content: string;
  compression_algorithm: string;
  compression_ratio: number;
  semantic_preservation: number;
  keywords: string[];
  entities: any[];
  sentiment_score?: number;
  topics: string[];
  importance_score: number;
  cue_mining_value: number;
  created_at: string;
}

// ============================================================================
// 🌐 플랫폼 연동 관련 타입들
// ============================================================================

export interface PlatformConnection {
  id: string;
  user_id: string;
  user_did: string;
  platform_name: string;
  platform_type: 'oauth' | 'api_key' | 'webhook';
  encrypted_credentials?: string;
  connection_status: 'connected' | 'disconnected' | 'error' | 'pending';
  is_connected: boolean;
  sync_settings: SyncSettings;
  data_points_count?: number;
  metadata?: Record<string, any>;
  connected_at?: string;
  disconnected_at?: string;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncSettings {
  autoSync: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  dataTypes: string[];
  filters?: Record<string, any>;
  maxRecords?: number;
}

export interface SyncLog {
  id: string;
  platform_connection_id: string;
  sync_status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  records_processed?: number;
  error_count?: number;
  status_message?: string;
  metadata?: Record<string, any>;
}

export interface PlatformData {
  id: string;
  platform_connection_id: string;
  user_id: string;
  data_type: string;
  external_id?: string;
  content: any;
  metadata?: Record<string, any>;
  imported_at: string;
  updated_at?: string;
}

// ============================================================================
// 🎫 AI Passport 관련 타입들
// ============================================================================

export interface AIPassport {
  did: string;
  username: string;
  displayName?: string;
  trustScore: number;
  level: string;
  cueBalance: number;
  totalMined: number;
  personalityProfile: PersonalityProfile;
  connectedPlatforms: ConnectedPlatform[];
  achievements: Achievement[];
  stats: PassportStats;
  createdAt: string;
  lastActive: string;
  isVerified: boolean;
}

export interface ConnectedPlatform {
  name: string;
  connected: boolean;
  lastSync?: string;
  dataPoints: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface PassportStats {
  totalInteractions: number;
  favoriteModel: string;
  averageSessionDuration: string;
  platformConnections: number;
}

// ============================================================================
// 🔐 인증 관련 타입들
// ============================================================================

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  user_agent?: string;
  backup_eligible: boolean;
  backup_state: boolean;
  is_active: boolean;
  device_fingerprint?: Record<string, any>;
  created_at: string;
  last_used_at?: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  device_info?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  last_activity_at: string;
}

// ============================================================================
// 📞 API 응답 타입들
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: Record<string, boolean | any>;
  uptime: number;
  memory: NodeJS.MemoryUsage;
}

// ============================================================================
// 📊 통계 및 분석 타입들
// ============================================================================

export interface UserStats {
  totalCUEEarned: number;
  totalInteractions: number;
  averageSessionTime: number;
  favoriteFeatures: string[];
  growthMetrics: GrowthMetrics;
}

export interface GrowthMetrics {
  weeklyGrowth: number;
  monthlyGrowth: number;
  engagementScore: number;
  retentionRate: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCUECirculating: number;
  averagePersonalizationLevel: number;
  topFeatures: FeatureUsage[];
}

export interface FeatureUsage {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  averageRating?: number;
}

// ============================================================================
// 🔧 서비스 설정 타입들
// ============================================================================

export interface ServiceConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  database: {
    type: 'supabase' | 'mock';
    url?: string;
    connected: boolean;
  };
  ai: {
    openai: { configured: boolean; connected: boolean };
    anthropic: { configured: boolean; connected: boolean };
    ollama: { configured: boolean; connected: boolean };
  };
  features: {
    webauthn: boolean;
    cueProtocol: boolean;
    dataVaults: boolean;
    platformIntegration: boolean;
    realTimeSync: boolean;
  };
}

// ============================================================================
// 🎨 UI 지원 타입들 (백엔드에서 전송용)
// ============================================================================

export interface UIUser {
  id: string;
  username: string;
  did: string;
  cueBalance: number;
  trustScore: number;
  level: string;
  avatar?: string;
  isVerified: boolean;
}

export interface UIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
}

export interface UIVault {
  id: string;
  name: string;
  description?: string;
  type: string;
  isEncrypted: boolean;
  compartmentCount: number;
  totalSize: number;
  createdAt: string;
  lastAccessed?: string;
}

// ============================================================================
// 🔍 검색 및 필터링 타입들
// ============================================================================

export interface SearchQuery {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    limit: number;
    offset: number;
  };
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  facets?: Record<string, any>;
  suggestions?: string[];
  executionTime: number;
}

// ============================================================================
// 🎯 이벤트 및 알림 타입들
// ============================================================================

export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: string;
  processed: boolean;
}

export interface UserNotification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
  expires_at?: string;
}

// ============================================================================
// 🛠️ 유틸리티 타입들
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type TimestampedEntity<T> = T & {
  created_at: string;
  updated_at?: string;
};

export type SoftDeletable<T> = T & {
  deleted_at?: string;
  is_deleted?: boolean;
};

// ============================================================================
// 🔚 Default exports (선택적)
// ============================================================================

// 타입은 런타임 값이 아니므로 default export로 묶을 수 없습니다.
// 필요한 타입은 개별적으로 import/export 하세요.