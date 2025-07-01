// ============================================================================
// 📁 src/types/cue.types.ts
// 💎 CUE 토큰 관련 타입 정의
// ============================================================================

export interface CueTransaction {
  id: string;
  userDid: string;
  amount: number;
  type: 'earned' | 'spent';
  source: 'chat' | 'mining' | 'verification' | 'bonus' | 'referral';
  purpose?: string;
  metadata?: any;
  timestamp: Date;
  blockNumber?: number;
  transactionHash?: string;
}

export interface CueMiningResult {
  cueEarned: number;
  breakdown: {
    baseReward: number;
    qualityBonus: number;
    conversationBonus: number;
    personalityBonus: number;
  };
  factors: string[];
  nextMiningTime?: Date;
}

export interface CueBalance {
  total: number;
  available: number;
  locked: number;
  pending: number;
  lastUpdated: Date;
}

export interface CueHistory {
  transactions: CueTransaction[];
  totalEarned: number;
  totalSpent: number;
  averagePerDay: number;
  lastTransaction?: Date;
}

export interface CueMiningState {
  isActive: boolean;
  canMine: boolean;
  cooldownUntil?: Date;
  multiplier: number;
  streakDays: number;
}