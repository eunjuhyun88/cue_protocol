// ============================================================================
// 🌐 AI Personal 프로젝트 공통 인터페이스 정의
// 파일: shared/types/index.ts (프론트엔드와 백엔드 공용)
// 용도: 완전한 타입 안전성과 일관성 보장
// ============================================================================

// =============================================================================
// 1. 기본 응답 구조
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  processingTime?: number;
  source?: string;
  version?: string;
  cached?: boolean;
  [key: string]: any;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo;
}

// =============================================================================
// 2. 사용자 및 인증 관련
// =============================================================================

export interface User {
  id: string;
  did: string;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  trustScore: number;
  passportLevel: 'Basic' | 'Verified' | 'Premium' | 'Expert';
  cueBalance: number;
  totalMined: number;
  registeredAt: string;
  lastLoginAt?: string;
  biometricEnabled: boolean;
  passkeyRegistered: boolean;
  metadata?: UserMetadata;
}

export interface UserMetadata {
  preferredLanguage?: string;
  timezone?: string;
  preferences?: UserPreferences;
  settings?: UserSettings;
  [key: string]: any;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  ai: AIPreferences;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  cueUpdates: boolean;
  aiInsights: boolean;
  securityAlerts: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  dataSharing: boolean;
  analyticsTracking: boolean;
  personalization: boolean;
}

export interface AIPreferences {
  preferredModel: string;
  responseLength: 'concise' | 'balanced' | 'detailed';
  communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly';
  personalizedResponses: boolean;
}

export interface UserSettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  autoSave: boolean;
  backupEnabled: boolean;
  [key: string]: any;
}

// =============================================================================
// 3. WebAuthn 및 인증
// =============================================================================

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceType: 'platform' | 'cross-platform';
  deviceName?: string;
  lastUsed: string;
  createdAt: string;
  trusted: boolean;
}

export interface WebAuthnRegistrationRequest {
  userEmail?: string;
  username?: string;
  deviceInfo?: DeviceInfo;
  challenge?: string;
}

export interface WebAuthnRegistrationResponse {
  success: boolean;
  user?: User;
  credential?: WebAuthnCredential;
  sessionToken?: string;
  expiresAt?: string;
  message?: string;
  error?: string;
}

export interface WebAuthnLoginRequest {
  userHandle?: string;
  challenge?: string;
  deviceInfo?: DeviceInfo;
}

export interface WebAuthnLoginResponse {
  success: boolean;
  user?: User;
  sessionToken?: string;
  expiresAt?: string;
  credential?: WebAuthnCredential;
  message?: string;
  error?: string;
}

export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  vendor?: string;
  mobile?: boolean;
  fingerprint?: string;
  timestamp: string;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  active: boolean;
}

// =============================================================================
// 4. AI Passport 시스템
// =============================================================================

export interface AIPassport {
  did: string;
  user: User;
  personalityProfile: PersonalityProfile;
  trustMetrics: TrustMetrics;
  achievements: Achievement[];
  connectedPlatforms: ConnectedPlatform[];
  dataVaults: DataVault[];
  aiAgents: AIAgent[];
  analytics: PassportAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalityProfile {
  id: string;
  traits: PersonalityTrait[];
  communicationStyle: CommunicationStyle;
  learningPatterns: LearningPattern[];
  preferences: PersonalPreferences;
  adaptationHistory: AdaptationRecord[];
  confidence: number;
  lastAnalysis: string;
}

export interface PersonalityTrait {
  name: string;
  category: 'cognitive' | 'behavioral' | 'emotional' | 'social';
  value: number; // 0-100
  confidence: number;
  evidence: TraitEvidence[];
  trending: 'up' | 'down' | 'stable';
}

export interface TraitEvidence {
  source: string;
  event: string;
  weight: number;
  timestamp: string;
}

export interface CommunicationStyle {
  formality: number; // 0-100
  verbosity: number; // 0-100
  directness: number; // 0-100
  emotiveness: number; // 0-100
  technicality: number; // 0-100
  preferredTone: string[];
  avoidedPatterns: string[];
}

export interface LearningPattern {
  type: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  strength: number;
  preferences: string[];
  examples: string[];
}

export interface PersonalPreferences {
  topics: TopicPreference[];
  formats: FormatPreference[];
  timing: TimingPreference;
  interaction: InteractionPreference;
}

export interface TopicPreference {
  topic: string;
  interest: number; // 0-100
  expertise: number; // 0-100
  frequency: number;
  recentEngagement: string;
}

export interface FormatPreference {
  format: 'text' | 'audio' | 'video' | 'interactive' | 'visual';
  preference: number; // 0-100
  context: string[];
}

export interface TimingPreference {
  activeHours: string[];
  timezone: string;
  responseSpeed: 'immediate' | 'quick' | 'thoughtful' | 'delayed';
  sessionLength: number; // minutes
}

export interface InteractionPreference {
  questionStyle: 'direct' | 'guided' | 'exploratory';
  feedbackFrequency: 'immediate' | 'periodic' | 'on-request';
  personalizationLevel: number; // 0-100
  privacyLevel: number; // 0-100
}

export interface AdaptationRecord {
  id: string;
  type: 'personality' | 'preference' | 'behavior' | 'knowledge';
  before: any;
  after: any;
  trigger: string;
  confidence: number;
  timestamp: string;
  validated: boolean;
}

export interface TrustMetrics {
  overallScore: number; // 0-100
  components: TrustComponent[];
  history: TrustHistoryEntry[];
  verification: VerificationStatus;
  reputation: ReputationMetrics;
  lastUpdate: string;
}

export interface TrustComponent {
  name: string;
  category: 'identity' | 'behavior' | 'contribution' | 'verification';
  score: number;
  weight: number;
  evidence: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface TrustHistoryEntry {
  score: number;
  change: number;
  reason: string;
  timestamp: string;
  validator?: string;
}

export interface VerificationStatus {
  identity: boolean;
  email: boolean;
  phone: boolean;
  biometric: boolean;
  social: string[];
  professional: string[];
  community: string[];
}

export interface ReputationMetrics {
  communityRating: number;
  peerEndorsements: number;
  contributionScore: number;
  consistencyRating: number;
  expertiseRecognition: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'engagement' | 'contribution' | 'milestone' | 'skill';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt: string;
  criteria: AchievementCriteria;
  rewards: AchievementReward[];
  rarity: number; // percentage of users who have this
}

export interface AchievementCriteria {
  type: 'count' | 'threshold' | 'streak' | 'quality' | 'composite';
  target: number;
  metric: string;
  timeframe?: string;
}

export interface AchievementReward {
  type: 'cue' | 'badge' | 'feature' | 'recognition';
  value: number | string;
  description: string;
}

// =============================================================================
// 5. CUE 토큰 시스템
// =============================================================================

export interface CUEBalance {
  userId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalMined: number;
  dailyEarned: number;
  dailyLimit: number;
  miningRate: number;
  lastMiningAt: string;
  pendingTransactions: number;
  lockedAmount: number;
  availableBalance: number;
}

export interface CUETransaction {
  id: string;
  userId: string;
  type: 'mining' | 'spending' | 'transfer' | 'reward' | 'penalty';
  amount: number;
  balance: number;
  description: string;
  source: string;
  metadata: TransactionMetadata;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
}

export interface TransactionMetadata {
  sourceType: 'ai_chat' | 'data_contribution' | 'platform_sync' | 'achievement' | 'manual';
  sourceId?: string;
  quality?: number;
  multiplier?: number;
  reason?: string;
  [key: string]: any;
}

export interface CUEMiningSession {
  id: string;
  userId: string;
  type: 'ai_interaction' | 'data_contribution' | 'quality_validation';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  cueEarned: number;
  qualityScore: number;
  efficiency: number;
  metadata: MiningMetadata;
}

export interface MiningMetadata {
  interactions: number;
  dataPoints: number;
  validations: number;
  qualityMetrics: QualityMetrics;
  [key: string]: any;
}

export interface QualityMetrics {
  relevance: number;
  accuracy: number;
  completeness: number;
  uniqueness: number;
  timeliness: number;
}

// =============================================================================
// 6. AI 채팅 및 대화
// =============================================================================

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: MessageMetadata;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
}

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  processingTime?: number;
  cueEarned?: number;
  personalizedElements?: string[];
  sources?: string[];
  confidence?: number;
  [key: string]: any;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  type: 'chat' | 'session' | 'consultation' | 'learning';
  model: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  status: 'active' | 'paused' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  metadata: ConversationMetadata;
}

export interface ConversationContext {
  personalityProfile?: PersonalityProfile;
  currentTopic?: string;
  userMood?: string;
  sessionGoals?: string[];
  preferences?: ChatPreferences;
  history?: string[];
}

export interface ChatPreferences {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  personalized: boolean;
  memoryEnabled: boolean;
}

export interface ConversationMetadata {
  totalMessages: number;
  totalTokens: number;
  totalCueEarned: number;
  averageQuality: number;
  topics: string[];
  [key: string]: any;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'local';
  type: 'chat' | 'completion' | 'embedding' | 'multimodal';
  capabilities: ModelCapability[];
  limits: ModelLimits;
  pricing: ModelPricing;
  availability: 'available' | 'limited' | 'unavailable';
  description: string;
}

export interface ModelCapability {
  type: 'text' | 'code' | 'image' | 'audio' | 'reasoning' | 'function-calling';
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  description: string;
}

export interface ModelLimits {
  maxTokens: number;
  maxConversationLength: number;
  requestsPerMinute: number;
  requestsPerDay: number;
}

export interface ModelPricing {
  inputTokens: number; // cost per 1K tokens
  outputTokens: number;
  currency: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
}

// =============================================================================
// 7. 데이터 볼트 시스템
// =============================================================================

export interface DataVault {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: VaultCategory;
  entries: VaultEntry[];
  security: VaultSecurity;
  sharing: VaultSharing;
  analytics: VaultAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface VaultCategory {
  primary: 'personal' | 'professional' | 'creative' | 'educational' | 'social';
  secondary: string[];
  tags: string[];
}

export interface VaultEntry {
  id: string;
  vaultId: string;
  type: 'conversation' | 'document' | 'insight' | 'preference' | 'memory';
  title: string;
  content: any;
  metadata: VaultEntryMetadata;
  encryption: EncryptionInfo;
  access: AccessControl;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEntryMetadata {
  source: string;
  format: string;
  size: number;
  hash: string;
  version: number;
  quality: number;
  relevance: number;
  connections: string[];
  [key: string]: any;
}

export interface EncryptionInfo {
  encrypted: boolean;
  algorithm?: string;
  keyId?: string;
  level: 'none' | 'basic' | 'standard' | 'advanced';
}

export interface AccessControl {
  owner: string;
  level: 'private' | 'shared' | 'public';
  permissions: Permission[];
  restrictions: string[];
}

export interface Permission {
  userId: string;
  role: 'viewer' | 'editor' | 'admin';
  actions: string[];
  expiresAt?: string;
}

export interface VaultSecurity {
  encryptionLevel: 'basic' | 'standard' | 'advanced' | 'military';
  backupEnabled: boolean;
  auditTrail: AuditEntry[];
  accessLog: AccessLogEntry[];
  integrityChecks: IntegrityCheck[];
}

export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  details: any;
  timestamp: string;
  ipAddress?: string;
}

export interface AccessLogEntry {
  userId: string;
  action: 'read' | 'write' | 'delete' | 'share';
  entryId: string;
  timestamp: string;
  metadata: any;
}

export interface IntegrityCheck {
  id: string;
  type: 'hash' | 'signature' | 'checksum';
  value: string;
  timestamp: string;
  valid: boolean;
}

export interface VaultSharing {
  enabled: boolean;
  publicUrl?: string;
  sharedWith: SharedAccess[];
  linkExpiry?: string;
  downloadAllowed: boolean;
}

export interface SharedAccess {
  userId: string;
  permission: 'view' | 'edit' | 'download';
  sharedAt: string;
  expiresAt?: string;
  accessed: boolean;
  lastAccess?: string;
}

export interface VaultAnalytics {
  totalEntries: number;
  totalSize: number;
  accessCount: number;
  lastAccessed: string;
  growthRate: number;
  utilizationScore: number;
  insights: VaultInsight[];
}

export interface VaultInsight {
  type: 'pattern' | 'trend' | 'recommendation' | 'alert';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  timestamp: string;
}

// =============================================================================
// 8. 플랫폼 연동
// =============================================================================

export interface ConnectedPlatform {
  id: string;
  userId: string;
  platformName: string;
  platformId: string;
  displayName: string;
  type: 'social' | 'productivity' | 'ai' | 'messaging' | 'storage';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  capabilities: PlatformCapability[];
  lastSync: string;
  syncStatus: SyncStatus;
  credentials: PlatformCredentials;
  settings: PlatformSettings;
  statistics: PlatformStatistics;
}

export interface PlatformCapability {
  name: string;
  description: string;
  enabled: boolean;
  permissions: string[];
}

export interface SyncStatus {
  lastAttempt: string;
  lastSuccess: string;
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  nextSync?: string;
}

export interface PlatformCredentials {
  type: 'oauth' | 'api_key' | 'token' | 'session';
  encrypted: boolean;
  expiresAt?: string;
  scopes: string[];
  refreshable: boolean;
}

export interface PlatformSettings {
  autoSync: boolean;
  syncFrequency: number; // hours
  dataTypes: string[];
  privacyLevel: 'minimal' | 'standard' | 'full';
  notifications: boolean;
}

export interface PlatformStatistics {
  totalSynced: number;
  lastSyncItems: number;
  totalErrors: number;
  averageSyncTime: number;
  dataSize: number;
  cueGenerated: number;
}

// =============================================================================
// 9. AI 에이전트
// =============================================================================

export interface AIAgent {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: 'personal' | 'professional' | 'creative' | 'analytical' | 'social';
  model: string;
  personality: AgentPersonality;
  capabilities: AgentCapability[];
  knowledge: AgentKnowledge;
  performance: AgentPerformance;
  settings: AgentSettings;
  status: 'active' | 'paused' | 'training' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface AgentPersonality {
  traits: Record<string, number>;
  communicationStyle: CommunicationStyle;
  expertise: string[];
  preferences: any;
  adaptability: number;
}

export interface AgentCapability {
  name: string;
  level: number;
  description: string;
  enabled: boolean;
  lastUsed?: string;
}

export interface AgentKnowledge {
  domains: KnowledgeDomain[];
  sources: string[];
  lastUpdated: string;
  confidence: number;
  gaps: string[];
}

export interface KnowledgeDomain {
  name: string;
  expertise: number;
  coverage: number;
  sources: number;
  lastUpdate: string;
}

export interface AgentPerformance {
  accuracy: number;
  responsiveness: number;
  userSatisfaction: number;
  adaptationRate: number;
  learningSpeed: number;
  interactions: number;
  successRate: number;
}

export interface AgentSettings {
  privacy: 'strict' | 'balanced' | 'open';
  learning: boolean;
  persistence: boolean;
  proactive: boolean;
  collaboration: boolean;
  customization: any;
}

// =============================================================================
// 10. 시스템 및 운영
// =============================================================================

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  uptime: number;
  version: string;
  services: ServiceStatus[];
  performance: PerformanceMetrics;
  lastCheck: string;
}

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  responseTime: number;
  errorRate: number;
  lastCheck: string;
  dependencies: string[];
}

export interface PerformanceMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  requests: number;
  errors: number;
  latency: number;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  stack?: string;
  user?: string;
  context?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// =============================================================================
// 11. 이벤트 및 알림
// =============================================================================

export interface SystemEvent {
  id: string;
  type: string;
  category: 'user' | 'system' | 'security' | 'business';
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  userId?: string;
  data: any;
  timestamp: string;
  processed: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'cue' | 'ai' | 'social' | 'security';
  title: string;
  message: string;
  action?: NotificationAction;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: string;
  createdAt: string;
}

export interface NotificationAction {
  label: string;
  url?: string;
  action?: string;
  data?: any;
}

// =============================================================================
// 12. 유틸리티 타입
// =============================================================================

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Status = 'idle' | 'loading' | 'success' | 'error';
export type Theme = 'light' | 'dark' | 'auto';
export type Language = 'ko' | 'en' | 'ja' | 'zh';

// =============================================================================
// 13. API 엔드포인트 타입
// =============================================================================

export interface ApiEndpoints {
  // Authentication
  '/api/auth/webauthn/register/start': {
    POST: {
      request: WebAuthnRegistrationRequest;
      response: ApiResponse<{
        options: any;
        sessionId: string;
        user: Pick<User, 'id' | 'username' | 'email'>;
      }>;
    };
  };
  '/api/auth/webauthn/register/complete': {
    POST: {
      request: {
        credential: any;
        sessionId: string;
      };
      response: WebAuthnRegistrationResponse;
    };
  };
  '/api/auth/webauthn/login/start': {
    POST: {
      request: WebAuthnLoginRequest;
      response: ApiResponse<{
        options: any;
        sessionId: string;
      }>;
    };
  };
  '/api/auth/webauthn/login/complete': {
    POST: {
      request: {
        credential: any;
        sessionId: string;
      };
      response: WebAuthnLoginResponse;
    };
  };

  // AI Passport
  '/api/passport/:did': {
    GET: {
      response: ApiResponse<AIPassport>;
    };
    PUT: {
      request: Partial<AIPassport>;
      response: ApiResponse<AIPassport>;
    };
  };

  // CUE System
  '/api/cue/:userId/balance': {
    GET: {
      response: ApiResponse<CUEBalance>;
    };
  };
  '/api/cue/mine': {
    POST: {
      request: {
        userId: string;
        type: 'ai_interaction' | 'data_contribution';
        metadata?: any;
      };
      response: ApiResponse<CUETransaction>;
    };
  };

  // AI Chat
  '/api/ai/chat': {
    POST: {
      request: {
        message: string;
        model?: string;
        conversationId?: string;
        userId: string;
        personalizedContext?: any;
      };
      response: ApiResponse<{
        message: string;
        conversationId: string;
        messageId: string;
        metadata: MessageMetadata;
      }>;
    };
  };

  // Data Vault
  '/api/vault/:userId': {
    GET: {
      response: ApiResponse<DataVault[]>;
    };
    POST: {
      request: {
        data: any;
        category: string;
        metadata?: any;
      };
      response: ApiResponse<VaultEntry>;
    };
  };

  // Platform Integration
  '/api/platform/:userId/connected': {
    GET: {
      response: ApiResponse<ConnectedPlatform[]>;
    };
  };
  '/api/platform/:userId/connect': {
    POST: {
      request: {
        platform: string;
        credentials: any;
      };
      response: ApiResponse<ConnectedPlatform>;
    };
  };
}

// =============================================================================
// 14. 환경 설정
// =============================================================================

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production';
  API_BASE_URL: string;
  WS_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_ORIGIN: string;
  AI_MODELS: string[];
  FEATURES: {
    webauthn: boolean;
    aiChat: boolean;
    cueMining: boolean;
    platformSync: boolean;
    analytics: boolean;
  };
}

// Export all types for easy importing
export * from './index';