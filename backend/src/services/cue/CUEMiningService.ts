// ============================================================================
// ⛏️ CUE 마이닝 서비스 (DatabaseService 전용 버전)
// 경로: backend/src/services/cue/CUEMiningService.ts
// 용도: CUE 토큰 마이닝 로직 및 보상 계산 (DatabaseService만 사용)
// 호출구조: DIContainer → CUEMiningService → DatabaseService
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

interface MiningParams {
  userDid: string;
  messageContent: string;
  aiResponse: string;
  model: string;
  personalContextUsed: number;
  responseTime: number;
  conversationId: string;
}

interface DataExtractionParams {
  userDid: string;
  dataType: string;
  dataSize: number;
  extractionQuality: number;
  processingTime: number;
}

interface TransactionData {
  user_did: string;
  transaction_type: 'mining' | 'spending' | 'bonus' | 'penalty';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  source: string;
  description: string;
  metadata?: any;
}

export class CUEMiningService {
  private static instance: CUEMiningService;
  private db: DatabaseService;
  private isInitialized: boolean = false;

  private constructor() {
    console.log('⛏️ === CUEMiningService 초기화 (DatabaseService 전용) ===');
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): CUEMiningService {
    if (!CUEMiningService.instance) {
      CUEMiningService.instance = new CUEMiningService();
    }
    return CUEMiningService.instance;
  }

  /**
   * 서비스 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔧 CUEMiningService 초기화 중...');
    
    try {
      // DatabaseService 연결 확인
      if (!this.db.isConnected()) {
        await this.db.connect();
      }

      this.isInitialized = true;
      console.log('✅ CUEMiningService 초기화 완료');
    } catch (error) {
      console.error('❌ CUEMiningService 초기화 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💰 메인 마이닝 기능들
  // ============================================================================

  /**
   * AI 상호작용으로부터 CUE 토큰 마이닝 (개선된 버전)
   */
  public async mineFromInteraction(params: MiningParams): Promise<number> {
    console.log('⛏️ === AI 상호작용 CUE 마이닝 시작 ===');
    
    await this.initialize();

    try {
      const { 
        userDid, 
        messageContent, 
        aiResponse, 
        model, 
        personalContextUsed, 
        responseTime,
        conversationId 
      } = params;

      console.log('📝 마이닝 파라미터:', {
        userDid: userDid.substring(0, 20) + '...',
        messageLength: messageContent.length,
        responseLength: aiResponse.length,
        model,
        contextUsed: personalContextUsed,
        responseTime: `${responseTime}ms`
      });

      // 기본 보상 계산
      let baseReward = parseFloat(process.env.CUE_BASE_REWARD || '3');
      console.log(`💰 기본 보상: ${baseReward} CUE`);
      
      // 개인화 컨텍스트 사용량에 따른 보너스
      const contextBonus = Math.min(personalContextUsed * 0.5, 5.0);
      console.log(`🎯 개인화 보너스: ${contextBonus} CUE (컨텍스트: ${personalContextUsed}개)`);
      
      // 응답 품질에 따른 보너스 (응답 시간 기반)
      const qualityBonus = responseTime < 3000 ? 2.0 : responseTime < 5000 ? 1.0 : 0;
      console.log(`⚡ 응답 속도 보너스: ${qualityBonus} CUE (${responseTime}ms)`);
      
      // 메시지 길이에 따른 보너스
      const lengthBonus = Math.min(messageContent.length * 0.01, 3.0);
      console.log(`📏 메시지 길이 보너스: ${lengthBonus} CUE (${messageContent.length}자)`);
      
      // AI 응답 품질 보너스
      const responseQualityBonus = Math.min(aiResponse.length * 0.005, 2.0);
      console.log(`🤖 응답 품질 보너스: ${responseQualityBonus} CUE (${aiResponse.length}자)`);
      
      // 모델 타입별 보너스
      const modelBonus = this.calculateModelBonus(model);
      console.log(`🧠 모델 보너스: ${modelBonus} CUE (${model})`);
      
      // 총 보상 계산
      const totalReward = Math.round(
        (baseReward + contextBonus + qualityBonus + lengthBonus + responseQualityBonus + modelBonus) * 100
      ) / 100; // 소수점 둘째자리까지

      // 최대 보상 제한
      const maxReward = parseFloat(process.env.CUE_MAX_REWARD || '25');
      const finalReward = Math.min(totalReward, maxReward);

      console.log('💎 보상 계산 완료:', {
        기본보상: baseReward,
        개인화보너스: contextBonus,
        속도보너스: qualityBonus,
        길이보너스: lengthBonus,
        응답품질보너스: responseQualityBonus,
        모델보너스: modelBonus,
        총보상: totalReward,
        최종보상: finalReward
      });

      // CUE 토큰 지급
      await this.awardCUE({
        user_did: userDid,
        amount: finalReward,
        source: 'ai_interaction',
        metadata: {
          conversationId,
          model,
          messageLength: messageContent.length,
          responseLength: aiResponse.length,
          personalContextUsed,
          responseTime,
          rewards: {
            base: baseReward,
            context: contextBonus,
            quality: qualityBonus,
            length: lengthBonus,
            responseQuality: responseQualityBonus,
            model: modelBonus,
            total: totalReward,
            final: finalReward
          }
        }
      });

      console.log(`✅ CUE 마이닝 완료: ${finalReward} CUE 지급`);
      return finalReward;

    } catch (error: any) {
      console.error('❌ AI 상호작용 마이닝 실패:', error);
      throw new Error(`CUE 마이닝 실패: ${error.message}`);
    }
  }

  /**
   * 데이터 추출로부터 CUE 마이닝
   */
  public async mineFromDataExtraction(params: DataExtractionParams): Promise<number> {
    console.log('⛏️ === 데이터 추출 CUE 마이닝 시작 ===');
    
    await this.initialize();

    try {
      const { userDid, dataType, dataSize, extractionQuality, processingTime } = params;

      console.log('📊 데이터 추출 파라미터:', {
        userDid: userDid.substring(0, 20) + '...',
        dataType,
        dataSize: `${dataSize} bytes`,
        quality: extractionQuality,
        processingTime: `${processingTime}ms`
      });

      // 데이터 크기 기반 점수
      const sizeScore = Math.min(dataSize / 1000, 10);
      console.log(`📏 크기 점수: ${sizeScore} (${dataSize} bytes)`);
      
      // 데이터 타입별 가중치
      const typeMultipliers: Record<string, number> = {
        'text': 1.0,
        'image': 1.2,
        'video': 1.5,
        'audio': 1.3,
        'document': 1.1,
        'code': 1.4,
        'conversation': 1.6,
        'personal_data': 2.0
      };
      
      const typeMultiplier = typeMultipliers[dataType] || 1.0;
      console.log(`🏷️ 타입 가중치: ${typeMultiplier} (${dataType})`);
      
      // 추출 품질 보너스
      const qualityBonus = extractionQuality * 2;
      console.log(`⭐ 품질 보너스: ${qualityBonus} (품질: ${extractionQuality})`);
      
      // 처리 효율성 보너스
      const efficiencyBonus = processingTime < 10000 ? 1.5 : processingTime < 30000 ? 1.0 : 0.5;
      console.log(`⚡ 효율성 보너스: ${efficiencyBonus} (${processingTime}ms)`);

      // 총 보상 계산
      const totalReward = Math.round(
        (sizeScore * typeMultiplier + qualityBonus + efficiencyBonus) * 100
      ) / 100;

      const finalReward = Math.min(totalReward, 15); // 데이터 추출 최대 보상 제한

      console.log('💎 데이터 추출 보상 계산:', {
        크기점수: sizeScore,
        타입가중치: typeMultiplier,
        품질보너스: qualityBonus,
        효율성보너스: efficiencyBonus,
        총보상: totalReward,
        최종보상: finalReward
      });

      // CUE 토큰 지급
      await this.awardCUE({
        user_did: userDid,
        amount: finalReward,
        source: 'data_extraction',
        metadata: {
          dataType,
          dataSize,
          extractionQuality,
          processingTime,
          rewards: {
            sizeScore,
            typeMultiplier,
            qualityBonus,
            efficiencyBonus,
            total: totalReward,
            final: finalReward
          }
        }
      });

      console.log(`✅ 데이터 추출 마이닝 완료: ${finalReward} CUE 지급`);
      return finalReward;

    } catch (error: any) {
      console.error('❌ 데이터 추출 마이닝 실패:', error);
      throw new Error(`데이터 추출 마이닝 실패: ${error.message}`);
    }
  }

  // ============================================================================
  // 💰 CUE 토큰 관리 기능들
  // ============================================================================

  /**
   * CUE 토큰 지급
   */
  public async awardCUE(params: {
    user_did: string;
    amount: number;
    source: string;
    metadata?: any;
  }): Promise<void> {
    console.log('💰 === CUE 토큰 지급 ===');

    try {
      const { user_did, amount, source, metadata = {} } = params;

      // 현재 잔액 조회
      const currentBalance = await this.db.getCUEBalance(user_did);
      console.log(`현재 잔액: ${currentBalance} CUE`);

      // 거래 기록 생성
      const transactionData = {
        user_did,
        transaction_type: 'mining' as const,
        amount: amount,
        status: 'completed' as const,
        source,
        description: `CUE mined from ${source}`,
        metadata: {
          ...metadata,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + amount,
          timestamp: new Date().toISOString()
        }
      };

      // DatabaseService를 통한 거래 기록
      await this.recordTransaction(transactionData);

      // 사용자 잔액 업데이트 (DatabaseService의 updateUser 사용)
      const user = await this.db.getUserByDID(user_did);
      if (user) {
        await this.db.updateUser(user.id, {
          cue_tokens: currentBalance + amount
        });
      }

      console.log(`✅ CUE 지급 완료: ${amount} CUE → 총 잔액: ${currentBalance + amount} CUE`);
    } catch (error: any) {
      console.error('❌ CUE 토큰 지급 실패:', error);
      throw new Error(`CUE 지급 실패: ${error.message}`);
    }
  }

  /**
   * CUE 토큰 소비
   */
  public async spendCUE(userDid: string, amount: number, purpose: string, metadata: any = {}): Promise<number> {
    console.log(`💸 === CUE 토큰 소비: ${amount} CUE (${purpose}) ===`);

    try {
      // 현재 잔액 확인
      const balance = await this.db.getCUEBalance(userDid);
      console.log(`현재 잔액: ${balance} CUE, 소비 요청: ${amount} CUE`);

      if (balance < amount) {
        throw new Error(`CUE 잔액 부족. Current: ${balance}, Required: ${amount}`);
      }

      // 소비 트랜잭션 생성
      await this.recordTransaction({
        user_did: userDid,
        transaction_type: 'spending',
        amount: -amount, // 음수로 기록
        status: 'completed',
        source: purpose,
        description: `CUE spent on ${purpose}`,
        metadata: {
          ...metadata,
          originalAmount: amount,
          spendingPurpose: purpose,
          balanceBefore: balance,
          balanceAfter: balance - amount
        }
      });

      // 사용자 잔액 업데이트
      const user = await this.db.getUserByDID(userDid);
      if (user) {
        await this.db.updateUser(user.id, {
          cue_tokens: balance - amount
        });
      }

      console.log(`✅ CUE 소비 완료: ${amount} CUE (${purpose})`);
      return amount;
    } catch (error: any) {
      console.error('❌ CUE 소비 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 CUE 잔액 조회
   */
  public async getBalance(userDid: string): Promise<number> {
    try {
      await this.initialize();
      return await this.db.getCUEBalance(userDid);
    } catch (error: any) {
      console.error('❌ CUE 잔액 조회 실패:', error);
      return 0;
    }
  }

  /**
   * 거래 내역 조회
   */
  public async getTransactionHistory(userDid: string, limit = 50): Promise<any[]> {
    try {
      await this.initialize();
      return await this.db.getCUETransactions(userDid, limit);
    } catch (error: any) {
      console.error('❌ 거래 내역 조회 실패:', error);
      return [];
    }
  }

  // ============================================================================
  // 🔧 내부 헬퍼 메서드들
  // ============================================================================

  /**
   * 거래 기록 저장
   */
  private async recordTransaction(transactionData: TransactionData): Promise<void> {
    try {
      console.log('📝 거래 기록 저장:', {
        type: transactionData.transaction_type,
        amount: transactionData.amount,
        source: transactionData.source
      });

      await this.db.createCUETransaction({
        id: uuidv4(),
        ...transactionData,
        created_at: new Date().toISOString()
      });

      console.log('✅ 거래 기록 저장 완료');
    } catch (error: any) {
      console.error('❌ 거래 기록 저장 실패:', error);
      throw new Error(`거래 기록 실패: ${error.message}`);
    }
  }

  /**
   * 모델별 보너스 계산
   */
  private calculateModelBonus(model: string): number {
    const modelBonuses: Record<string, number> = {
      // Ollama 모델들
      'llama3.2:3b': 1.0,
      'llama3.2:1b': 0.8,
      'llama3.1:8b': 1.2,
      'llama3.1:70b': 1.5,
      'deepseek-coder:6.7b': 1.3,
      'codellama:7b': 1.2,
      'codellama:13b': 1.4,
      'phi3:mini': 0.9,
      'phi3:latest': 1.1,
      'mistral:latest': 1.0,
      'mistral:7b': 1.0,
      'mixtral:8x7b': 1.3,
      'magicoder:7b': 1.2,
      'starcoder2:15b': 1.4
    };

    // 정확한 모델명 매칭
    if (modelBonuses[model]) {
      return modelBonuses[model];
    }

    // 부분 매칭
    for (const [modelPattern, bonus] of Object.entries(modelBonuses)) {
      if (model.includes(modelPattern.split(':')[0])) {
        return bonus * 0.8; // 부분 매칭시 보너스 감소
      }
    }

    return 0.5; // 기본 보너스
  }

  /**
   * 일일 마이닝 보너스 지급
   */
  public async awardDailyBonus(userDid: string): Promise<number> {
    console.log('🎁 === 일일 마이닝 보너스 지급 ===');

    try {
      await this.initialize();

      const bonusAmount = parseFloat(process.env.DAILY_BONUS_CUE || '50');

      await this.awardCUE({
        user_did: userDid,
        amount: bonusAmount,
        source: 'daily_bonus',
        metadata: {
          bonusType: 'daily',
          date: new Date().toISOString().split('T')[0]
        }
      });

      console.log(`✅ 일일 보너스 지급 완료: ${bonusAmount} CUE`);
      return bonusAmount;
    } catch (error: any) {
      console.error('❌ 일일 보너스 지급 실패:', error);
      throw error;
    }
  }

  /**
   * 웰컴 보너스 지급
   */
  public async awardWelcomeBonus(userDid: string): Promise<number> {
    console.log('🎉 === 웰컴 보너스 지급 ===');

    try {
      await this.initialize();

      const welcomeAmount = parseFloat(process.env.WELCOME_CUE_AMOUNT || '100');

      await this.awardCUE({
        user_did: userDid,
        amount: welcomeAmount,
        source: 'welcome_bonus',
        metadata: {
          bonusType: 'welcome',
          firstTime: true
        }
      });

      console.log(`✅ 웰컴 보너스 지급 완료: ${welcomeAmount} CUE`);
      return welcomeAmount;
    } catch (error: any) {
      console.error('❌ 웰컴 보너스 지급 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 📊 통계 및 분석
  // ============================================================================

  /**
   * 마이닝 통계 조회
   */
  public async getMiningStats(userDid: string): Promise<any> {
    try {
      await this.initialize();

      const transactions = await this.db.getCUETransactions(userDid, 1000);
      const miningTransactions = transactions.filter(t => t.transaction_type === 'mining');

      const totalMined = miningTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalSpent = transactions
        .filter(t => t.transaction_type === 'spending')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const currentBalance = await this.db.getCUEBalance(userDid);

      // 소스별 마이닝 통계
      const sourceStats = miningTransactions.reduce((stats, transaction) => {
        const source = transaction.source || 'unknown';
        if (!stats[source]) {
          stats[source] = { count: 0, total: 0 };
        }
        stats[source].count++;
        stats[source].total += transaction.amount;
        return stats;
      }, {} as Record<string, { count: number; total: number }>);

      return {
        currentBalance,
        totalMined,
        totalSpent,
        netEarnings: totalMined - totalSpent,
        miningCount: miningTransactions.length,
        sourceBreakdown: sourceStats,
        averagePerMining: miningTransactions.length > 0 ? totalMined / miningTransactions.length : 0,
        lastMiningAt: miningTransactions[0]?.created_at || null,
        stats: {
          last7Days: this.calculateRecentStats(miningTransactions, 7),
          last30Days: this.calculateRecentStats(miningTransactions, 30)
        }
      };
    } catch (error: any) {
      console.error('❌ 마이닝 통계 조회 실패:', error);
      return null;
    }
  }

  /**
   * 최근 기간 통계 계산
   */
  private calculateRecentStats(transactions: any[], days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentTransactions = transactions.filter(t => 
      new Date(t.created_at) > cutoffDate
    );

    const total = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const count = recentTransactions.length;
    const average = count > 0 ? total / count : 0;

    return { total, count, average };
  }

  /**
   * 서비스 상태 정보
   */
  public getServiceStatus(): any {
    return {
      serviceName: 'CUEMiningService',
      initialized: this.isInitialized,
      databaseConnected: this.db.isConnected(),
      version: '2.0.0',
      features: [
        'ai_interaction_mining',
        'data_extraction_mining',
        'transaction_management',
        'daily_bonus',
        'welcome_bonus',
        'mining_statistics'
      ],
      configuration: {
        baseReward: process.env.CUE_BASE_REWARD || '3',
        maxReward: process.env.CUE_MAX_REWARD || '25',
        dailyBonus: process.env.DAILY_BONUS_CUE || '50',
        welcomeBonus: process.env.WELCOME_CUE_AMOUNT || '100'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 서비스 정리 (DI Container에서 호출)
   */
  public dispose(): void {
    console.log('🧹 CUEMiningService 정리 중...');
    this.isInitialized = false;
    console.log('✅ CUEMiningService 정리 완료');
  }
}