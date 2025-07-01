// ============================================================================
// 📁 src/types/passport.types.ts
// 🎯 AI Passport 관련 타입 정의
// ============================================================================

export interface PersonalityProfile {
  type: string;
  communicationStyle: string;
  learningPattern: string;
  workingStyle: string;
  responsePreference: string;
  decisionMaking: string;
}

export interface UnifiedDataVault {
  id: string;
  name: string;
  category: 'identity' | 'behavioral' | 'professional' | 'social' | 'preferences' | 'expertise';
  description: string;
  dataCount: number;
  cueCount: number;
  encrypted: boolean;
  lastUpdated: Date;
  accessLevel: 'public' | 'private' | 'selective';
  value: number;
  dataPoints: any[];
  usageCount: number;
  sourcePlatforms: string[];
}

export interface ConnectedPlatform {
  id: string;
  name: string;
  connected: boolean;
  lastSync: Date;
  cueCount: number;
  contextMined: number;
  status: 'active' | 'syncing' | 'error' | 'connecting';
  icon: string;
  color: string;
  connectionSteps?: string[];
}

export interface ContextEntry {
  id: string;
  platform: string;
  content: string;
  timestamp: Date;
}

export interface CueEntry {
  id: string;
  amount: number;
  source: string;
  timestamp: Date;
}

export interface PersonalizedAgent {
  id: string;
  name: string;
  type: 'coding' | 'creative' | 'analysis' | 'consultation' | 'research' | 'mentor';
  description: string;
  checkpoint: string;
  trainingStatus: 'idle' | 'training' | 'validating' | 'ready' | 'deployed';
  trainingProgress: number;
  accuracy: number;
  totalTrainingTime: number;
  datasetSize: number;
  lastTrained: Date;
  usageCount: number;
  specialties: string[];
  modelVersion: string;
}

export interface UnifiedAIPassport {
  did: string;
  walletAddress: string;
  passkeyRegistered: boolean;
  trustScore: number;
  cueTokens: number;
  registrationStatus: 'pending' | 'verified' | 'complete';
  biometricVerified: boolean;
  passportLevel: 'Basic' | 'Verified' | 'Premium' | 'Enterprise';
  personalityProfile: PersonalityProfile;
  dataVaults: UnifiedDataVault[];
  connectedPlatforms: ConnectedPlatform[];
  contextHistory: ContextEntry[];
  cueHistory: CueEntry[];
  personalizedAgents: PersonalizedAgent[];
}