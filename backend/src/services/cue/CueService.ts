// src/services/cue/CueService.ts
// ============================================================================
// 💎 CueService 모듈 - CUE 토큰 마이닝, 잔액 조회, 거래 기록 API
// ============================================================================ 
import { DatabaseService } from '../database/DatabaseService';

export class CueService {
  constructor(private db = DatabaseService.getInstance()) {}

  async mineCUE(userDid: string, activity: string, data: any = {}): Promise<number> {
    try {
      console.log(`⛏️ CUE 마이닝: ${userDid} - ${activity}`);

      // 활동별 CUE 보상 계산
      let amount = 0;
      
      switch (activity) {
        case 'ai_chat':
          amount = this.calculateChatReward(data);
          break;
        case 'data_extraction':
          amount = this.calculateExtractionReward(data);
          break;
        case 'daily_login':
          amount = 5.0;
          break;
        case 'registration':
          amount = 100.0;
          break;
        default:
          amount = 1.0;
      }

      // CUE 거래 기록
      await this.recordTransaction({
        user_did: userDid,
        transaction_type: 'mining',
        amount: amount,
        status: 'completed',
        source: activity,
        description: `CUE mined from ${activity}`,
        metadata: data
      });

      console.log(`✅ CUE 마이닝 완료: ${amount} tokens`);
      return amount;

    } catch (error) {
      console.error('CUE 마이닝 오류:', error);
      return 0;
    }
  }

  private calculateChatReward(data: any): number {
    const baseReward = 2.0;
    const lengthBonus = Math.min((data.messageLength || 0) / 100, 3.0);
    const contextBonus = Math.min((data.personalContextUsed || 0) * 0.5, 2.0);
    
    return Math.round((baseReward + lengthBonus + contextBonus) * 100) / 100;
  }

  private calculateExtractionReward(data: any): number {
    const baseReward = 1.0;
    const sizeBonus = Math.min((data.dataSize || 0) / 1000, 5.0);
    const qualityBonus = (data.quality || 0.5) * 2.0;
    
    return Math.round((baseReward + sizeBonus + qualityBonus) * 100) / 100;
  }

  private async recordTransaction(transactionData: any): Promise<void> {
    try {
      // 적절한 메서드 사용 (호환성 보장)
      if (typeof this.db.recordCueTransaction === 'function') {
        await this.db.recordCueTransaction(transactionData);
      } else if (typeof this.db.createCUETransaction === 'function') {
        await this.db.createCUETransaction(transactionData);
      } else {
        console.warn('⚠️ CUE 거래 기록 메서드를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('CUE 거래 기록 오류:', error);
    }
  }

  async getBalance(userDid: string): Promise<number> {
    try {
      return await this.db.getCUEBalance(userDid);
    } catch (error) {
      console.error('CUE 잔액 조회 오류:', error);
      return 0;
    }
  }
}

export default new CueService();