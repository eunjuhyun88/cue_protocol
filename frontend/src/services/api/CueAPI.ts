// ============================================================================
// 📁 src/services/api/CueAPI.ts
// 💰 CUE 토큰 API 클라이언트
// ============================================================================

import { PersistentDataAPIClient } from './PersistentDataAPIClient';

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

export class CueAPI {
  private persistentClient: PersistentDataAPIClient;

  constructor() {
    this.persistentClient = new PersistentDataAPIClient();
  }

  // ============================================================================
  // 🔧 기본 CUE 마이닝
  // ============================================================================

  async mineCUE(userDid: string, activity: string): Promise<any> {
    return this.persistentClient.mineCUE(userDid, activity);
  }

  async advancedMining(
    userDid: string,
    activity: MiningActivity
  ): Promise<{
    success: boolean;
    amount: number;
    transaction: CueTransaction;
    newBalance: number;
  }> {
    try {
      const response = await this.persistentClient.post('/api/cue/mine/advanced', {
        userDid,
        activity
      });

      return response;
    } catch (error) {
      const amount = Math.floor(
        activity.baseReward * (activity.qualityMultiplier || 1)
      );
      
      const transaction: CueTransaction = {
        id: `mock_${Date.now()}`,
        type: 'mining',
        amount,
        timestamp: new Date().toISOString(),
        description: activity.description,
        qualityScore: activity.qualityMultiplier,
        activityType: activity.type
      };

      return {
        success: true,
        amount,
        transaction,
        newBalance: Math.floor(Math.random() * 10000) + amount
      };
    }
  }

  // ============================================================================
  // 🔧 CUE 잔액 및 거래 관리
  // ============================================================================

  async getBalance(userDid: string): Promise<CueBalance> {
    try {
      const response = await this.persistentClient.get(`/api/cue/balance/${userDid}`);
      return response;
    } catch (error) {
      return {
        total: 8750 + Math.floor(Math.random() * 5000),
        available: 8500 + Math.floor(Math.random() * 4000),
        locked: 250,
        todaysMining: 47 + Math.floor(Math.random() * 50),
        lifetimeMined: 25000 + Math.floor(Math.random() * 50000),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async getTransactions(
    userDid: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ transactions: CueTransaction[]; total: number; hasMore: boolean }> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.type) params.append('type', options.type);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const response = await this.persistentClient.get(
        `/api/cue/transactions/${userDid}?${params.toString()}`
      );
      
      return response;
    } catch (error) {
      return this.generateMockTransactions(options.limit || 20);
    }
  }

  // ============================================================================
  // 🔧 마이닝 통계 및 분석
  // ============================================================================

  async getMiningStats(userDid: string): Promise<{
    hourlyRate: number;
    dailyRate: number;
    weeklyRate: number;
    efficiency: number;
    streak: number;
    topActivities: string[];
  }> {
    try {
      const response = await this.persistentClient.get(`/api/cue/mining/stats/${userDid}`);
      return response;
    } catch (error) {
      return {
        hourlyRate: 5.2 + Math.random() * 3,
        dailyRate: 120 + Math.random() * 50,
        weeklyRate: 850 + Math.random() * 200,
        efficiency: 0.85 + Math.random() * 0.15,
        streak: 12 + Math.floor(Math.random() * 20),
        topActivities: ['AI Conversation', 'Data Sharing', 'Platform Connection']
      };
    }
  }

  async analyzeActivity(
    userDid: string,
    activityData: {
      type: string;
      content: string;
      context?: any;
      duration?: number;
    }
  ): Promise<{
    qualityScore: number;
    estimatedReward: number;
    factors: { name: string; weight: number; description: string }[];
    suggestions: string[];
  }> {
    try {
      const response = await this.persistentClient.post('/api/cue/analyze', {
        userDid,
        activityData
      });

      return response;
    } catch (error) {
      return {
        qualityScore: 0.75 + Math.random() * 0.25,
        estimatedReward: 5 + Math.floor(Math.random() * 15),
        factors: [
          { name: 'Content Quality', weight: 0.4, description: '메시지 품질과 복잡성' },
          { name: 'Engagement', weight: 0.3, description: '상호작용 수준' },
          { name: 'Personalization', weight: 0.2, description: '개인화 기여도' },
          { name: 'Innovation', weight: 0.1, description: '새로운 관점 제시' }
        ],
        suggestions: [
          '더 구체적인 질문을 해보세요',
          '개인적인 관심사를 공유해보세요',
          '이전 대화와 연결지어 보세요'
        ]
      };
    }
  }

  // ============================================================================
  // 🔧 CUE 전송 및 사용
  // ============================================================================

  async transferCUE(
    fromUserDid: string,
    toUserDid: string,
    amount: number,
    message?: string
  ): Promise<{
    success: boolean;
    transactionId: string;
    fee: number;
    newBalance: number;
  }> {
    try {
      const response = await this.persistentClient.post('/api/cue/transfer', {
        fromUserDid,
        toUserDid,
        amount,
        message
      });

      return response;
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        fee: 0,
        newBalance: 0,
        error: 'Transfer failed - using mock mode'
      };
    }
  }

  async spendCUE(
    userDid: string,
    amount: number,
    purpose: string,
    metadata?: any
  ): Promise<{
    success: boolean;
    transactionId: string;
    remainingBalance: number;
  }> {
    try {
      const response = await this.persistentClient.post('/api/cue/spend', {
        userDid,
        amount,
        purpose,
        metadata
      });

      return response;
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        remainingBalance: 0,
        error: 'Spend failed - using mock mode'
      };
    }
  }

  // ============================================================================
  // 🔧 리워드 예측 및 리더보드
  // ============================================================================

  async predictRewards(
    userDid: string,
    plannedActivities: string[]
  ): Promise<{
    totalEstimated: number;
    breakdown: { activity: string; estimated: number }[];
    optimizationTips: string[];
  }> {
    try {
      const response = await this.persistentClient.post('/api/cue/predict', {
        userDid,
        plannedActivities
      });

      return response;
    } catch (error) {
      const breakdown = plannedActivities.map(activity => ({
        activity,
        estimated: 3 + Math.floor(Math.random() * 12)
      }));

      return {
        totalEstimated: breakdown.reduce((sum, item) => sum + item.estimated, 0),
        breakdown,
        optimizationTips: [
          '연속적인 활동으로 스트릭 보너스를 받아보세요',
          '다양한 유형의 활동을 조합해보세요',
          '고품질 콘텐츠에 집중하세요'
        ]
      };
    }
  }

  async getLeaderboard(
    type: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'weekly',
    limit: number = 10
  ): Promise<{
    rankings: {
      rank: number;
      userDid: string;
      username: string;
      amount: number;
      change: number;
    }[];
    userRank?: number;
  }> {
    try {
      const response = await this.persistentClient.get(
        `/api/cue/leaderboard?type=${type}&limit=${limit}`
      );
      return response;
    } catch (error) {
      return {
        rankings: Array.from({ length: limit }, (_, i) => ({
          rank: i + 1,
          userDid: `did:cue:user${i + 1}`,
          username: `Agent${1000 + i}`,
          amount: 10000 - i * 500 + Math.floor(Math.random() * 200),
          change: Math.floor(Math.random() * 21) - 10
        })),
        userRank: 5 + Math.floor(Math.random() * 15)
      };
    }
  }

  // ============================================================================
  // 🔧 CUE 가격 정보
  // ============================================================================

  async getPriceInfo(): Promise<{
    usdPrice: number;
    change24h: number;
    marketCap: number;
    volume24h: number;
    lastUpdated: string;
  }> {
    try {
      const response = await this.persistentClient.get('/api/cue/price');
      return response;
    } catch (error) {
      return {
        usdPrice: 0.0247 + (Math.random() - 0.5) * 0.002,
        change24h: (Math.random() - 0.5) * 10,
        marketCap: 125000000 + Math.floor(Math.random() * 10000000),
        volume24h: 2500000 + Math.floor(Math.random() * 500000),
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // 🔧 Mock 데이터 생성 헬퍼들
  // ============================================================================

  private generateMockTransactions(limit: number): {
    transactions: CueTransaction[];
    total: number;
    hasMore: boolean;
  } {
    const types: CueTransaction['type'][] = ['mining', 'bonus', 'transfer', 'spend'];
    const descriptions = [
      'AI 채팅 마이닝',
      '고품질 대화 보너스',
      '연속 활동 보너스',
      '새로운 플랫폼 연결',
      'RAG-DAG 기여',
      '데이터 볼트 업데이트',
      '친구 추천 보너스'
    ];

    const transactions: CueTransaction[] = [];

    for (let i = 0; i < limit; i++) {
      transactions.push({
        id: `mock_tx_${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        amount: Math.floor(Math.random() * 20) + 1,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        qualityScore: 0.7 + Math.random() * 0.3,
        activityType: 'conversation'
      });
    }

    return {
      transactions,
      total: limit * 2,
      hasMore: true
    };
  }
}

export default CueAPI;