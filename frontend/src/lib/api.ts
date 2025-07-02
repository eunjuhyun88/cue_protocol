// ============================================================================
// 📁 src/lib/api.ts - 기존 API 클라이언트들의 단순 re-export
// 🎯 중복 없이 기존 파일들을 그대로 활용
// ============================================================================

// 기존 완전한 구현 re-export
export { PersistentDataAPIClient } from '../services/api/PersistentDataAPIClient';
export { default as BackendAPIClient } from '../services/api/BackendAPIClient';
export { default as ChatAPI } from '../services/api/ChatAPI';
export { default as CueAPI } from '../services/api/CueAPI';
export { default as PassportAPI } from '../services/api/PassportAPI';
export { default as WebAuthnAPI } from '../services/api/WebAuthnAPI';

// 메인 API 클라이언트로 PersistentDataAPIClient 사용
export const apiClient = new PersistentDataAPIClient();

// 편의를 위한 타입 정의
export interface User {
  id: string;
  did: string;
  username: string;
  email?: string;
  wallet_address?: string;
  cueBalance?: number;
  cue_tokens?: number;
  trustScore?: number;
  trust_score?: number;
  passportLevel?: string;
  passport_level?: string;
  biometric_verified?: boolean;
  auth_method?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  lastLogin?: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  model: string;
  timestamp: string;
  cueReward?: number;
  cueEarned?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  tokensUsed?: number;
  processingTime?: number;
  conversationId?: string;
}

export interface AIPassport {
  did: string;
  username: string;
  trustScore: number;
  passportLevel: string;
  cueBalance: number;
  totalMined?: number;
  dataVaults?: Array<{
    name: string;
    type: string;
    size: string;
    items: number;
  }>;
  connectedPlatforms?: string[];
  personalityProfile?: {
    traits: string[];
    communicationStyle: string;
    expertise: string[];
  };
  achievements?: Array<{
    name: string;
    icon: string;
    earned: boolean;
    description: string;
  }>;
  ragDagStats?: {
    learnedConcepts: number;
    connectionStrength: number;
    lastLearningActivity: string;
    knowledgeNodes: number;
    personalityAccuracy: number;
  };
  recentActivity?: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

// 기본 export는 PersistentDataAPIClient 클래스
export default PersistentDataAPIClient;