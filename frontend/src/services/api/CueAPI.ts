// ============================================================================
// 📁 src/services/api/CueAPI.ts
// 💎 CUE 토큰 API 서비스
// ============================================================================

import { BackendAPIClient } from './BackendAPIClient';
import type { CueBalance, CueHistory, CueMiningResult, CueTransaction } from '../../types/cue.types';

export class CueAPI extends BackendAPIClient {
  /**
   * CUE 마이닝 실행
   */
  async mineCue(miningData: {
    userDid: string;
    messageContent: string;
    aiResponse: string;
    model: string;
    personalityProfile?: any;
  }): Promise<CueMiningResult> {
    try {
      return await this.post('/api/cue/mine', miningData);
    } catch (error) {
      console.error('CUE 마이닝 실패:', error);
      throw error;
    }
  }

  /**
   * CUE 잔액 조회
   */
  async getCueBalance(userDid: string): Promise<CueBalance> {
    try {
      return await this.get(`/api/cue/${userDid}/balance`);
    } catch (error) {
      console.error('CUE 잔액 조회 실패:', error);
      throw error;
    }
  }

  /**
   * CUE 거래 내역 조회
   */
  async getCueHistory(userDid: string): Promise<CueHistory> {
    try {
      return await this.get(`/api/cue/${userDid}/history`);
    } catch (error) {
      console.error('CUE 내역 조회 실패:', error);
      throw error;
    }
  }

  /**
   * CUE 소비 (기능 사용)
   */
  async spendCue(
    userDid: string,
    amount: number,
    purpose: string,
    metadata: any = {}
  ): Promise<CueTransaction> {
    try {
      return await this.post(`/api/cue/${userDid}/spend`, {
        amount,
        purpose,
        metadata,
      });
    } catch (error) {
      console.error('CUE 소비 실패:', error);
      throw error;
    }
  }

  /**
   * Mock CUE 마이닝 결과 생성
   */
  generateMockMiningResult(): CueMiningResult {
    const baseReward = Math.random() * 5 + 1; // 1-6 CUE
    const qualityBonus = Math.random() * 2; // 0-2 CUE
    const conversationBonus = Math.random() * 1; // 0-1 CUE
    const personalityBonus = Math.random() * 0.5; // 0-0.5 CUE

    return {
      cueEarned: Number((baseReward + qualityBonus + conversationBonus + personalityBonus).toFixed(2)),
      breakdown: {
        baseReward: Number(baseReward.toFixed(2)),
        qualityBonus: Number(qualityBonus.toFixed(2)),
        conversationBonus: Number(conversationBonus.toFixed(2)),
        personalityBonus: Number(personalityBonus.toFixed(2)),
      },
      factors: [
        '대화 참여도',
        '개인화 적용',
        '의미있는 질문',
        '학습 컨텍스트'
      ],
      nextMiningTime: new Date(Date.now() + 5 * 60 * 1000), // 5분 후
    };
  }

  /**
   * Mock CUE 잔액 생성
   */
  generateMockBalance(): CueBalance {
    const total = Math.floor(Math.random() * 10000) + 1000;
    const locked = Math.floor(total * 0.1);
    const pending = Math.floor(Math.random() * 100);
    
    return {
      total,
      available: total - locked - pending,
      locked,
      pending,
      lastUpdated: new Date(),
    };
  }

  /**
   * Mock CUE 거래 내역 생성
   */
  generateMockHistory(): CueHistory {
    const transactions: CueTransaction[] = [];
    
    for (let i = 0; i < 10; i++) {
      const isEarned = Math.random() > 0.3;
      transactions.push({
        id: `tx_${Date.now()}_${i}`,
        userDid: 'mock_user',
        amount: Number((Math.random() * 10 + 1).toFixed(2)),
        type: isEarned ? 'earned' : 'spent',
        source: isEarned ? 'chat' : 'verification',
        purpose: isEarned ? '대화 참여' : 'AI 기능 사용',
        timestamp: new Date(Date.now() - i * 3600000), // i시간 전
      });
    }

    const totalEarned = transactions
      .filter(t => t.type === 'earned')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalSpent = transactions
      .filter(t => t.type === 'spent')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      transactions,
      totalEarned,
      totalSpent,
      averagePerDay: totalEarned / 30, // 30일 기준
      lastTransaction: transactions[0]?.timestamp,
    };
  }
}