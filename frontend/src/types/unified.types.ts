// ============================================================================
// 📁 src/types/unified.types.ts
// 🔧 통합된 타입 정의 - 모든 컴포넌트에서 공통 사용
// ============================================================================

export interface User {
  id: string;
  username: string;
  email?: string | null;
  did: string;
  walletAddress?: string;
  wallet_address?: string;
  cueBalance?: number;
  cue_tokens?: number;
  trustScore?: number;
  trust_score?: number;
  passportLevel?: string;
  passport_level?: string;
  biometricVerified?: boolean;
  biometric_verified?: boolean;
  authMethod?: string;
  auth_method?: string;
  status?: string;
  registeredAt?: string;
  created_at?: string;
  updated_at?: string;
  lastLogin?: string;
}

export interface AIPassport {
  did: string;
  username: string;
  trustScore: number;
  passportLevel: string;
  cueBalance: number;
  totalMined: number; // 항상 기본값 제공
  level?: string;
  
  // 선택적 속성들은 기본값 제공
  dataVaults?: DataVault[];
  connectedPlatforms?: string[];
  personalityProfile?: PersonalityProfile;
  achievements?: Achievement[];
  ragDagStats?: RAGDAGStats;
  recentActivity?: RecentActivity[];
  
  // 메타데이터
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface DataVault {
  id?: string;
  name: string;
  type: string;
  category?: string;
  description?: string;
  size: string;
  items: number;
  dataCount?: number;
  cueCount?: number;
  encrypted?: boolean;
  lastUpdated?: string;
  status?: 'active' | 'syncing' | 'error';
  icon?: string;
  color?: string;
}

export interface PersonalityProfile {
  traits: string[];
  communicationStyle: string;
  expertise: string[];
  preferences?: string[];
  learningStyle?: string;
}

export interface Achievement {
  id?: string;
  name: string;
  icon: string;
  earned: boolean;
  description: string;
  earnedAt?: string;
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface RAGDAGStats {
  learnedConcepts: number;
  connectionStrength: number;
  lastLearningActivity: string;
  knowledgeNodes: number;
  personalityAccuracy: number;
  totalConnections?: number;
  activeNodes?: number;
  learningRate?: number;
}

export interface RecentActivity {
  id?: string;
  type: string;
  description: string;
  timestamp: string;
  cueReward?: number;
  category?: string;
  status?: 'completed' | 'pending' | 'failed';
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  model?: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  tokensUsed?: number;
  processingTime?: number;
  attachments?: File[];
  error?: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  mode: 'real' | 'mock';
  status: string;
  timestamp: string;
  service: string;
  version: string;
  responseTime?: number;
  error?: string;
  database?: string;
  supabaseConnected?: boolean;
  services?: {
    webauthn: boolean;
    ai: boolean;
    cue: boolean;
    vault: boolean;
  };
}

export interface WebAuthnSupport {
  supported: boolean;
  reason?: string;
}

export interface AuthConfig {
  backendURL: string;
  enableMockMode: boolean;
  sessionTimeout: number;
  maxRetryAttempts: number;
  retryDelay: number;
}

// ============================================================================
// 🔧 Utility Types
// ============================================================================

export type ViewType = 'chat' | 'dashboard' | 'history' | 'achievements' | 'settings';

export type RegistrationStep = 'waiting' | 'auth' | 'wallet' | 'passport' | 'complete';

// ============================================================================
// 🔧 안전한 데이터 접근을 위한 헬퍼 함수들
// ============================================================================

export const safePassportAccess = {
  getTotalMined: (passport: AIPassport | null): number => {
    return passport?.totalMined ?? 25000;
  },
  
  getCueBalance: (passport: AIPassport | null, fallback: number = 15428): number => {
    return passport?.cueBalance ?? fallback;
  },
  
  getTrustScore: (passport: AIPassport | null): number => {
    return passport?.trustScore ?? 85;
  },
  
  getDataVaults: (passport: AIPassport | null): DataVault[] => {
    return passport?.dataVaults ?? [];
  },
  
  getConnectedPlatforms: (passport: AIPassport | null): string[] => {
    return passport?.connectedPlatforms ?? [];
  },
  
  getAchievements: (passport: AIPassport | null): Achievement[] => {
    return passport?.achievements ?? [];
  },
  
  getRecentActivity: (passport: AIPassport | null): RecentActivity[] => {
    return passport?.recentActivity ?? [];
  }
};

// ============================================================================
// 🔧 기본 Mock 데이터 생성 함수들
// ============================================================================

export const createMockPassport = (did: string, username: string = 'TestUser'): AIPassport => ({
  did,
  username,
  trustScore: 88 + Math.floor(Math.random() * 12),
  passportLevel: 'Verified Agent',
  cueBalance: 15428 + Math.floor(Math.random() * 5000),
  totalMined: 25000 + Math.floor(Math.random() * 50000),
  
  dataVaults: [
    {
      name: 'Identity Vault',
      type: 'identity',
      size: '2.3MB',
      items: 47,
      cueCount: 850
    },
    {
      name: 'Chat History',
      type: 'conversation',
      size: '15.7MB',
      items: 1204,
      cueCount: 2340
    },
    {
      name: 'Learning Data',
      type: 'ml_training',
      size: '8.9MB',
      items: 342,
      cueCount: 1560
    }
  ],
  
  connectedPlatforms: ['ChatGPT', 'Claude', 'Discord'],
  
  personalityProfile: {
    traits: ['창의적', '분석적', '신뢰할 수 있는'],
    communicationStyle: 'friendly',
    expertise: ['AI', 'Web3', 'Protocol Design']
  },
  
  achievements: [
    { name: 'First CUE', icon: '🎯', earned: true, description: '첫 CUE 토큰 획득' },
    { name: 'Trusted Agent', icon: '🛡️', earned: true, description: '신뢰 점수 80% 달성' },
    { name: 'Platform Master', icon: '🌐', earned: false, description: '5개 플랫폼 연결' }
  ],
  
  ragDagStats: {
    learnedConcepts: 1250,
    connectionStrength: 0.87,
    lastLearningActivity: new Date().toISOString(),
    knowledgeNodes: 3400,
    personalityAccuracy: 0.92
  },
  
  recentActivity: [
    {
      type: 'CHAT',
      description: 'AI 대화를 통해 15 CUE 획득',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      cueReward: 15
    },
    {
      type: 'LEARNING',
      description: '개인화 패턴 학습 완료',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
      type: 'PLATFORM_SYNC',
      description: 'Discord 플랫폼 동기화',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ],
  
  createdAt: new Date().toISOString()
});

export const createMockUser = (username: string = 'TestUser'): User => ({
  id: `user_${Date.now()}`,
  username,
  email: 'test@cueprotocol.ai',
  did: `did:cue:${Date.now()}`,
  walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
  cueBalance: 15428,
  trustScore: 88,
  passportLevel: 'Verified Agent',
  biometricVerified: true,
  authMethod: 'webauthn',
  status: 'active',
  registeredAt: new Date().toISOString()
});