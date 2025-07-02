// ============================================================================
// ⚡ CUE 서비스 - CUE 토큰 관리 및 마이닝 로직
// 파일: backend/src/services/cue/CueService.ts
// 역할: CUE 토큰 잔액, 거래, 마이닝 비즈니스 로직
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

interface CueBalance {
  amount: number;
  lastUpdated: string;
  totalMined?: number;
}

interface MiningActivity {
  userId: string;
  activity: string;
  metadata?: any;
}

interface TransactionHistory {
  items: any[];
  total: number;
  hasMore: boolean;
  summary?: any;
}

interface LeaderboardOptions {
  period: string;
  limit: number;
  category: string;
}

export class CueService {
  private static instance: CueService;
  private databaseService: DatabaseService;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
    console.log('⚡ CueService 초기화 완료');
  }

  public static getInstance(): CueService {
    if (!CueService.instance) {
      CueService.instance = new CueService();
    }
    return CueService.instance;
  }

  // ============================================================================
  // 💰 CUE 잔액 조회
  // ============================================================================

  public async getBalance(userDid: string): Promise<CueBalance> {
    try {
      console.log(`💰 CUE 잔액 조회 - DID: ${userDid}`);

      const user = await this.databaseService.getUserByDid(userDid);
      if (!user) {
        throw new Error('User not found');
      }

      // 총 마이닝 량 계산
      const totalMined = await this.calculateTotalMined(user.id);

      return {
        amount: user.cue_tokens || 0,
        lastUpdated: user.last_cue_update_at || user.created_at,
        totalMined: totalMined
      };

    } catch (error) {
      console.error('❌ CUE 잔액 조회 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // ⛏️ CUE 토큰 마이닝
  // ============================================================================

  public async mineTokensForActivity(activity: MiningActivity): Promise<number> {
    try {
      console.log(`⛏️ CUE 마이닝 시작 - 사용자: ${activity.userId}, 활동: ${activity.activity}`);

      const user = await this.databaseService.getUserById(activity.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 활동에 따른 CUE 계산
      const miningResult = this.calculateMiningReward(activity);
      const tokensEarned = miningResult.baseAmount * miningResult.multiplier;

      // 사용자 잔액 업데이트
      const newBalance = (user.cue_tokens || 0) + tokensEarned;
      await this.databaseService.updateUser(activity.userId, {
        cue_tokens: newBalance,
        last_cue_update_at: new Date().toISOString()
      });

      // 거래 기록 저장
      await this.recordTransaction({
        userId: activity.userId,
        userDid: user.did,
        type: 'mining',
        amount: tokensEarned,
        balanceAfter: newBalance,
        description: `${activity.activity} 활동을 통한 CUE 마이닝`,
        metadata: {
          ...activity.metadata,
          baseAmount: miningResult.baseAmount,
          multiplier: miningResult.multiplier,
          bonusReason: miningResult.bonusReason
        }
      });

      console.log(`✅ CUE 마이닝 완료 - 획득: ${tokensEarned} CUE`);
      return tokensEarned;

    } catch (error) {
      console.error('❌ CUE 마이닝 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 📊 거래 내역 조회
  // ============================================================================

  public async getTransactionHistory(options: {
    userId: string;
    limit?: number;
    offset?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionHistory> {
    try {
      console.log(`📊 거래 내역 조회 - 사용자: ${options.userId}`);

      const transactions = await this.databaseService.getCueTransactions({
        userId: options.userId,
        limit: options.limit || 20,
        offset: options.offset || 0,
        type: options.type,
        startDate: options.startDate,
        endDate: options.endDate
      });

      // 요약 정보 계산
      const summary = await this.calculateTransactionSummary(options.userId, {
        startDate: options.startDate,
        endDate: options.endDate
      });

      return {
        items: transactions,
        total: transactions.length,
        hasMore: transactions.length === (options.limit || 20),
        summary: summary
      };

    } catch (error) {
      console.error('❌ 거래 내역 조회 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🏆 리더보드 조회
  // ============================================================================

  public async getLeaderboard(options: LeaderboardOptions): Promise<any> {
    try {
      console.log(`🏆 리더보드 조회 - 기간: ${options.period}, 카테고리: ${options.category}`);

      // 기간별 필터링
      const dateRange = this.getDateRangeForPeriod(options.period);
      
      const rankings = await this.databaseService.getTopCueEarners({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: options.limit,
        category: options.category
      });

      return {
        rankings: rankings.map((rank, index) => ({
          rank: index + 1,
          userId: rank.user_id,
          username: rank.username || `User ${rank.user_id.slice(-4)}`,
          amount: rank.total_cue || 0,
          avatar: rank.avatar_url,
          did: rank.did
        })),
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 리더보드 조회 오류:', error);
      throw error;
    }
  }

  // ============================================================================
  // 📈 프로토콜 통계
  // ============================================================================

  public async getProtocolStats(): Promise<any> {
    try {
      console.log('📈 CUE 프로토콜 통계 조회');

      const stats = await this.databaseService.getCueProtocolStats();

      return {
        totalSupply: stats.totalSupply || 0,
        totalUsers: stats.totalUsers || 0,
        dailyVolume: stats.dailyVolume || 0,
        averageMining: stats.averageMining || 0,
        topActivities: stats.topActivities || []
      };

    } catch (error) {
      console.error('❌ 프로토콜 통계 조회 오류:', error);
      return {
        totalSupply: 1000000,
        totalUsers: 100,
        dailyVolume: 5000,
        averageMining: 50,
        topActivities: ['ai_chat', 'data_vault', 'daily_login']
      };
    }
  }

  // ============================================================================
  // 🛠️ 프라이빗 헬퍼 메서드들
  // ============================================================================

  private calculateMiningReward(activity: MiningActivity): {
    baseAmount: number;
    multiplier: number;
    bonusReason?: string;
  } {
    let baseAmount = 1;
    let multiplier = 1;
    let bonusReason = '';

    switch (activity.activity) {
      case 'ai_chat':
        baseAmount = Math.floor((activity.metadata?.messageLength || 50) / 10);
        if (activity.metadata?.personalContextUsed > 5) {
          multiplier = 1.5;
          bonusReason = 'Personal context bonus';
        }
        break;

      case 'data_vault_save':
        baseAmount = Math.floor((activity.metadata?.dataSize || 100) / 50);
        if (activity.metadata?.extractCues) {
          multiplier = 1.3;
          bonusReason = 'CUE extraction bonus';
        }
        break;

      case 'daily_login':
        baseAmount = 5;
        if (activity.metadata?.consecutiveDays > 7) {
          multiplier = 2;
          bonusReason = 'Streak bonus';
        }
        break;

      case 'platform_connection':
        baseAmount = 10;
        multiplier = 1;
        break;

      case 'achievement_unlock':
        baseAmount = activity.metadata?.achievementRarity === 'legendary' ? 50 : 
                    activity.metadata?.achievementRarity === 'epic' ? 20 : 10;
        break;

      default:
        baseAmount = 1;
        break;
    }

    // 최소/최대 제한
    baseAmount = Math.max(1, Math.min(baseAmount, 100));
    multiplier = Math.max(1, Math.min(multiplier, 3));

    return { baseAmount, multiplier, bonusReason };
  }

  private async calculateTotalMined(userId: string): Promise<number> {
    try {
      const transactions = await this.databaseService.getCueTransactions({
        userId: userId,
        type: 'mining',
        limit: 1000 // 충분히 큰 수
      });

      return transactions.reduce((total, tx) => total + (tx.amount || 0), 0);
    } catch (error) {
      console.error('총 마이닝 량 계산 오류:', error);
      return 0;
    }
  }

  private async recordTransaction(data: {
    userId: string;
    userDid: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.databaseService.createCUETransaction({
        id: uuidv4(),
        user_id: data.userId,
        user_did: data.userDid,
        transaction_type: data.type,
        amount: data.amount,
        balance_after: data.balanceAfter,
        description: data.description,
        source_platform: 'system',
        metadata: data.metadata,
        status: 'completed',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('거래 기록 저장 오류:', error);
      throw error;
    }
  }

  private async calculateTransactionSummary(userId: string, options: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const transactions = await this.databaseService.getCueTransactions({
        userId: userId,
        startDate: options.startDate,
        endDate: options.endDate,
        limit: 1000
      });

      const totalEarned = transactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalSpent = transactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      const byType = transactions.reduce((acc, tx) => {
        const type = tx.transaction_type;
        if (!acc[type]) acc[type] = { count: 0, amount: 0 };
        acc[type].count++;
        acc[type].amount += tx.amount;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      return {
        totalEarned,
        totalSpent,
        netAmount: totalEarned - totalSpent,
        transactionCount: transactions.length,
        byType
      };
    } catch (error) {
      console.error('거래 요약 계산 오류:', error);
      return {
        totalEarned: 0,
        totalSpent: 0,
        netAmount: 0,
        transactionCount: 0,
        byType: {}
      };
    }
  }

  private getDateRangeForPeriod(period: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString();
    let start: Date;

    switch (period) {
      case 'daily':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }

    return {
      start: start.toISOString(),
      end: end
    };
  }

  // ============================================================================
  // 🎁 보너스 및 특별 기능들
  // ============================================================================

  public async claimDailyBonus(userId: string): Promise<{
    available: boolean;
    tokensEarned?: number;
    newBalance?: number;
    streak?: number;
    nextAvailable?: string;
  }> {
    try {
      console.log(`🎁 일일 보너스 클레임 확인 - 사용자: ${userId}`);

      const user = await this.databaseService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // 마지막 보너스 클레임 시간 확인
      const lastClaim = await this.getLastDailyBonusClaim(userId);
      const now = new Date();
      
      if (lastClaim) {
        const timeSinceLastClaim = now.getTime() - new Date(lastClaim).getTime();
        const hoursSince = timeSinceLastClaim / (1000 * 60 * 60);
        
        if (hoursSince < 24) {
          const nextAvailable = new Date(new Date(lastClaim).getTime() + 24 * 60 * 60 * 1000);
          return {
            available: false,
            nextAvailable: nextAvailable.toISOString()
          };
        }
      }

      // 연속 로그인 스트릭 계산
      const streak = await this.calculateLoginStreak(userId);
      
      // 보너스 계산 (스트릭에 따라 증가)
      const baseBonus = 10;
      const streakMultiplier = Math.min(1 + (streak * 0.1), 3); // 최대 3배
      const tokensEarned = Math.floor(baseBonus * streakMultiplier);

      // 잔액 업데이트
      const newBalance = (user.cue_tokens || 0) + tokensEarned;
      await this.databaseService.updateUser(userId, {
        cue_tokens: newBalance,
        last_daily_bonus_at: now.toISOString(),
        login_streak: streak + 1
      });

      // 거래 기록
      await this.recordTransaction({
        userId: userId,
        userDid: user.did,
        type: 'daily_bonus',
        amount: tokensEarned,
        balanceAfter: newBalance,
        description: `일일 보너스 (${streak + 1}일 연속)`,
        metadata: {
          streak: streak + 1,
          streakMultiplier: streakMultiplier
        }
      });

      console.log(`✅ 일일 보너스 지급 완료 - ${tokensEarned} CUE`);

      return {
        available: true,
        tokensEarned: tokensEarned,
        newBalance: newBalance,
        streak: streak + 1,
        nextAvailable: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      };

    } catch (error) {
      console.error('❌ 일일 보너스 클레임 오류:', error);
      throw error;
    }
  }

  private async getLastDailyBonusClaim(userId: string): Promise<string | null> {
    try {
      const user = await this.databaseService.getUserById(userId);
      return user?.last_daily_bonus_at || null;
    } catch (error) {
      return null;
    }
  }

  private async calculateLoginStreak(userId: string): Promise<number> {
    try {
      const user = await this.databaseService.getUserById(userId);
      return user?.login_streak || 0;
    } catch (error) {
      return 0;
    }
  }
}