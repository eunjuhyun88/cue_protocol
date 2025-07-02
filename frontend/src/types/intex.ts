// ============================================================================
// 📁 src/types/index.ts
// 🔧 프로젝트 전체 타입 정의 통합
// ============================================================================

// ============================================================================
// 🔧 기본 타입들
// ============================================================================

export interface User {
  id: string;
  username: string;
  email?: string;
  did: string;
  walletAddress?: string;
  cueBalance: number;
  trustScore: number;
  passportLevel: string;
  biometricVerified: boolean;
  registeredAt: string;
  lastLogin: string;
}

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  attachments?: File[];
  metadata?: any;
  isError?: boolean;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type ViewType = 'chat' | 'dashboard' | 'passport' | 'vaults' | 'platforms' | 'analytics';

// ============================================================================
// 🔧 AI Passport 관련 타입들
// ============================================================================

export interface UnifiedAIPassport {
  did: string;
  username?: string;
  walletAddress?: string;
  passkeyRegistered: boolean;
  trustScore: number;
  cueTokens: number;
  registrationStatus: string;
  biometricVerified: boolean;
  passportLevel: string;
  personalityProfile: PersonalityProfile;
  dataVaults: DataVault[];
  connectedPlatforms: ConnectedPlatform[];
  contextHistory: any[];
  cueHistory: any[];
  personalizedAgents: any[];
  achievements?: Achievement[];
  ragDagStats?: RAGDAGStats;
  analytics?: PassportAnalytics;
  createdAt?: string;
}

export interface PersonalityProfile {
  type: string;
  traits: string[];
  communicationStyle: string;
  expertise: string[];
  mbtiType?: string;
  learningStyle?: string;
  learningPattern?: string;
  workingStyle?: string;
  responsePreference?: string;
  decisionMaking?: string;
}

export interface DataVault {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  size?: string;
  items?: number;
  dataCount: number;
  cueCount: number;
  encrypted: boolean;
  lastUpdated: Date;
  accessLevel: string;
  value: number;
  dataPoints: any[];
  usageCount: number;
  sourcePlatforms: string[];
  status?: string;
}

export interface ConnectedPlatform {
  id: string;
  name: string;
  connected: boolean;
  status: string;
  lastSync: Date | string | null;
  conversations?: number;
  cueCount: number;
  contextMined: number;
  icon: string;
  color: string;
  health: string;
  data_synced?: number;
  cue_earned?: number;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  description: string;
  date?: string;
  progress?: { current: number; total: number };
  category: string;
  rarity: string;
  earnedAt?: Date;
}

export interface RAGDAGStats {
  learnedConcepts: number;
  connectionStrength: number;
  contextualAccuracy: number;
  learningVelocity: number;
  memoryEfficiency: number;
  lastLearningActivity: string;
  totalInteractions: number;
  conceptCategories: Record<string, number>;
  knowledgeNodes: number;
  personalityAccuracy: number;
  adaptationRate: number;
  conceptCoverage: number;
}

export interface PassportAnalytics {
  weeklyActivity: Array<{
    day: string;
    chats: number;
    cue: number;
    quality: number;
  }>;
  topicDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  platformMetrics?: {
    mostActive: string;
    totalSyncs: number;
    lastFullSync: string;
  };
}

// ============================================================================
// 🔧 인증 관련 타입들
// ============================================================================

export interface AuthConfig {
  backendURL: string;
  enableMockMode: boolean;
  sessionTimeout: number;
  maxRetryAttempts: number;
  retryDelay: number;
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
  cookieEnabled?: boolean;
  onLine?: boolean;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
}

export interface WebAuthnCredential {
  id: string;
  type: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
}

export interface WebAuthnRegistrationResult {
  success: boolean;
  user: User | null;
  sessionToken?: string;
  isExistingUser: boolean;
  action: string;
  message: string;
  deviceInfo: DeviceInfo;
}

export interface WebAuthnLoginResult {
  success: boolean;
  user: User | null;
  sessionToken?: string;
  message: string;
}

export interface SessionRestoreResult {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
}

export interface HealthCheckResult {
  connected: boolean;
  mode: 'real' | 'mock';
  status?: string;
  timestamp?: string;
  version?: string;
  database?: string;
  services?: Record<string, boolean>;
  responseTime?: number;
  error?: string;
}

// ============================================================================
// 🔧 채팅 관련 타입들
// ============================================================================

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  selectedModel: string;
  availableModels: string[];
}

export interface ChatResponse {
  success?: boolean;
  response?: string;
  message: string;
  model: string;
  timestamp: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  processingTime?: number;
  tokensUsed?: number;
  usedData?: string[];
}

// ============================================================================
// 🔧 CUE 토큰 관련 타입들
// ============================================================================

export interface CueTransaction {
  id: string;
  type: 'mining' | 'bonus' | 'transfer' | 'spend';
  amount: number;
  timestamp: string;
  description: string;
  metadata?: any;
  qualityScore?: number;
  activityType?: string;
}

export interface CueBalance {
  total: number;
  available: number;
  locked: number;
  todaysMining: number;
  lifetimeMined: number;
  lastUpdated: string;
}

export interface MiningActivity {
  type: string;
  description: string;
  baseReward: number;
  qualityMultiplier: number;
  finalReward: number;
  factors: string[];
}

// ============================================================================
// 🔧 API 응답 타입들
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  mock?: boolean;
  fallback?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// 🔧 UI 컴포넌트 Props 타입들
// ============================================================================

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'default' | 'primary' | 'secondary';
  color?: 'primary' | 'accent' | 'secondary' | 'white' | 'dark';
}

export interface OnboardingFlowProps {
  step: 'waiting' | 'auth' | 'wallet' | 'passport' | 'complete';
  isLoading: boolean;
  onStart: () => void;
  backendConnected: boolean;
  backendMode: string;
  webauthnSupport: {
    supported: boolean;
    reason?: string;
  };
  error?: string;
  onRetryConnection?: () => void;
  onDebugCredential?: () => void;
}

export interface MainLayoutProps {
  passport?: UnifiedAIPassport;
  cueBalance: number;
  todaysMining: number;
  backendConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectionDetails?: any;
  messages: Message[];
  isLoadingChat: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onSendMessage: (message: string, model: string) => void;
  onUpdatePassport: (updates: any) => void;
  onLogout: () => void;
  onRetryConnection: () => void;
}

// ============================================================================
// 🔧 유틸리티 타입들
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// 🔧 이벤트 타입들
// ============================================================================

export interface CueMinedEvent {
  type: 'cue_mined';
  userDid: string;
  amount: number;
  activity: string;
  timestamp: string;
}

export interface MessageResponseEvent {
  type: 'message_response';
  userDid: string;
  response: string;
  model: string;
  cueReward?: number;
  timestamp: string;
}

export interface RAGDAGUpdatedEvent {
  type: 'rag_dag_updated';
  userDid: string;
  stats: Partial<RAGDAGStats>;
  timestamp: string;
}

export interface PlatformSyncEvent {
  type: 'platform_sync';
  userDid: string;
  platform: string;
  status: 'success' | 'error';
  timestamp: string;
}

export interface AchievementUnlockedEvent {
  type: 'achievement_unlocked';
  userDid: string;
  achievement: Achievement;
  timestamp: string;
}

export type RealtimeEvent = 
  | CueMinedEvent 
  | MessageResponseEvent 
  | RAGDAGUpdatedEvent 
  | PlatformSyncEvent 
  | AchievementUnlockedEvent;