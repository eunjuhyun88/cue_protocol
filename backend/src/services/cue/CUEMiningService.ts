// ============================================================================
// ⛏️ CUE 마이닝 서비스 (통합된 완전한 버전)
// 경로: backend/src/services/cue/CUEMiningService.ts
// 용도: CUE 토큰 마이닝 로직 및 보상 계산
// 수정사항: 기존 간단한 버전과 고급 버전 통합
// ============================================================================

// Make sure the following import path is correct and the file exists.
// If the file does not exist, create it or update the path accordingly.
import { DatabaseService } from '../database/DatabaseService';
import { supabaseService } from '../database/SupabaseService';
import { v4 as uuidv4 } from 'uuid';

export class CUEMiningService {
  private db: any;

  constructor(database?: any) {
    // 자동으로 적절한 데이터베이스 서비스 선택
    this.db = database || (
      process.env.USE_MOCK_DATABASE === 'true' || 
      !process.env.SUPABASE_URL || 
      process.env.SUPABASE_URL.includes('dummy')
        ? DatabaseService.getInstance()
        : supabaseService
    );
  }

  /**
   * AI 상호작용으로부터 CUE 토큰을 마이닝합니다 (개선된 버전)
   */
  async mineFromInteraction(params: {
    userDid: string;
    messageContent: string;
    aiResponse: string;
    model: string;
    personalContextUsed: number;
    responseTime: number;
    conversationId: string;
  }): Promise<number> {
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

      // 기본 보상
      let baseReward = 2.0;
      
      // 개인화 컨텍스트 사용량에 따른 보너스
      const contextBonus = Math.min(personalContextUsed * 0.5, 5.0);
      
      // 응답 품질에 따른 보너스 (응답 시간 기반)
      const qualityBonus = responseTime < 3000 ? 1.0 : 0.5;
      
      // 메시지 복잡도에 따른 보너스
      const complexityBonus = Math.min(messageContent.length / 100, 3.0);
      
      // AI 모델별 가중치
      const modelMultipliers: Record<string, number> = {
        'personalized-agent': 1.5,
        'gpt-4o': 1.2,
        'gpt-4': 1.2,
        'claude-3.5-sonnet': 1.2,
        'claude-sonnet': 1.1,
        'gemini-pro': 1.0
      };
      const modelMultiplier = modelMultipliers[model] || 1.0;
      
      // 고급 분석 추가
      const advancedAnalysis = this.performAdvancedAnalysis(messageContent, aiResponse);
      
      const totalReward = (
        baseReward + 
        contextBonus + 
        qualityBonus + 
        complexityBonus + 
        advancedAnalysis.bonus
      ) * modelMultiplier;
      
      const finalAmount = Math.round(totalReward * 100) / 100;

      // CUE 트랜잭션 생성
      await this.recordTransaction({
        user_did: userDid,
        transaction_type: 'mining',
        amount: finalAmount,
        status: 'completed',
        source: 'ai_chat',
        description: `CUE mined from AI chat interaction (${model})`,
        metadata: {
          model,
          messageLength: messageContent.length,
          responseLength: aiResponse.length,
          responseTime,
          contextUsed: personalContextUsed,
          conversationId,
          baseReward,
          contextBonus,
          qualityBonus,
          complexityBonus,
          modelMultiplier,
          advancedAnalysis,
          calculationTimestamp: new Date().toISOString()
        }
      });

      console.log(`⛏️ CUE 마이닝 완료: ${finalAmount} tokens for ${userDid}`);
      return finalAmount;

    } catch (error) {
      console.error('CUE 마이닝 오류:', error);
      return 0;
    }
  }

  /**
   * 고급 분석 수행 (메시지 품질, 기술적 복잡도 등)
   */
  private performAdvancedAnalysis(messageContent: string, aiResponse: string): {
    bonus: number;
    factors: string[];
    details: any;
  } {
    let bonus = 0;
    const factors: string[] = [];
    const details: any = {};

    // 질문 복잡도 분석
    const hasQuestion = messageContent.includes('?') || 
                       /how|what|why|when|where|어떻게|무엇|왜|언제|어디/.test(messageContent.toLowerCase());
    if (hasQuestion) {
      bonus += 0.5;
      factors.push('질문 포함');
      details.hasQuestion = true;
    }

    // 기술적 용어 분석
    const techTerms = ['api', 'code', 'algorithm', 'system', 'data', 'programming', 
                      '개발', '시스템', '알고리즘', 'database', 'server', 'client'];
    const techTermCount = techTerms.filter(term => 
      messageContent.toLowerCase().includes(term)
    ).length;
    
    if (techTermCount > 0) {
      const techBonus = Math.min(techTermCount * 0.3, 1.5);
      bonus += techBonus;
      factors.push(`기술 용어 ${techTermCount}개`);
      details.techTermCount = techTermCount;
      details.techBonus = techBonus;
    }

    // 응답 품질 분석
    const responseQuality = this.analyzeResponseQuality(aiResponse);
    bonus += responseQuality.bonus;
    factors.push(...responseQuality.factors);
    details.responseQuality = responseQuality;

    // 대화 길이 보너스
    const conversationLengthBonus = this.calculateConversationBonus(messageContent, aiResponse);
    bonus += conversationLengthBonus;
    if (conversationLengthBonus > 0) {
      factors.push('대화 길이 보너스');
      details.conversationLengthBonus = conversationLengthBonus;
    }

    return {
      bonus: Math.round(bonus * 100) / 100,
      factors,
      details
    };
  }

  /**
   * AI 응답 품질 분석
   */
  private analyzeResponseQuality(aiResponse: string): {
    bonus: number;
    factors: string[];
  } {
    let bonus = 0;
    const factors: string[] = [];

    // 응답 길이 적절성
    if (aiResponse.length >= 100 && aiResponse.length <= 2000) {
      bonus += 0.3;
      factors.push('적절한 응답 길이');
    } else if (aiResponse.length > 2000) {
      bonus += 0.5;
      factors.push('상세한 응답');
    }

    // 구조화된 응답 (리스트, 제목 등)
    const hasStructure = /[\*\-\d+\.]\s/.test(aiResponse) || 
                        aiResponse.includes('**') || 
                        aiResponse.includes('##');
    if (hasStructure) {
      bonus += 0.4;
      factors.push('구조화된 응답');
    }

    // 코드 블록 포함
    if (aiResponse.includes('```') || aiResponse.includes('`')) {
      bonus += 0.6;
      factors.push('코드 예제 포함');
    }

    return { bonus, factors };
  }

  /**
   * 대화 길이 보너스 계산
   */
  private calculateConversationBonus(messageContent: string, aiResponse: string): number {
    const totalLength = messageContent.length + aiResponse.length;
    
    if (totalLength > 1000) return 0.5;
    if (totalLength > 500) return 0.3;
    if (totalLength > 200) return 0.1;
    
    return 0;
  }

  /**
   * 거래 기록 생성 (호환성 보장)
   */
  private async recordTransaction(transactionData: any): Promise<void> {
    try {
      // 적절한 메서드 사용 (호환성)
      if (typeof this.db.recordCueTransaction === 'function') {
        await this.db.recordCueTransaction(transactionData);
      } else if (typeof this.db.createCUETransaction === 'function') {
        await this.db.createCUETransaction(transactionData);
      } else if (typeof this.db.createCUETransactionTyped === 'function') {
        await this.db.createCUETransactionTyped(transactionData);
      } else {
        console.warn('⚠️ CUE 거래 기록 메서드를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('CUE 거래 기록 오류:', error);
      // 거래 기록 실패는 전체 프로세스를 중단시키지 않음
    }
  }

  /**
   * CUE 소비 (기능 사용 시)
   */
  async spendCUE(userDid: string, amount: number, purpose: string, metadata: any = {}): Promise<number> {
    try {
      // CUE 잔액 확인
      const balance = await this.getBalance(userDid);
      
      if (balance < amount) {
        throw new Error(`Insufficient CUE balance. Current: ${balance}, Required: ${amount}`);
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

      console.log(`💰 CUE 소비 완료: ${amount} tokens (${purpose})`);
      return amount;
    } catch (error) {
      console.error('CUE 소비 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자 CUE 잔액 조회
   */
  async getBalance(userDid: string): Promise<number> {
    try {
      if (typeof this.db.getCUEBalance === 'function') {
        return await this.db.getCUEBalance(userDid);
      } else {
        console.warn('CUE 잔액 조회 메서드를 찾을 수 없습니다');
        return 0;
      }
    } catch (error) {
      console.error('CUE 잔액 조회 오류:', error);
      return 0;
    }
  }

  /**
   * 거래 내역 조회
   */
  async getTransactionHistory(userDid: string, limit = 50): Promise<any[]> {
    try {
      if (typeof this.db.getCUETransactions === 'function') {
        return await this.db.getCUETransactions(userDid, limit);
      } else if (this.db.getClient && typeof this.db.getClient === 'function') {
        // Supabase 직접 접근
        const { data: transactions, error } = await this.db.getClient()
          .from('cue_transactions')
          .select('*')
          .eq('user_did', userDid)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return transactions || [];
      } else {
        console.warn('거래 내역 조회 메서드를 찾을 수 없습니다');
        return [];
      }
    } catch (error) {
      console.error('거래 내역 조회 오류:', error);
      return [];
    }
  }

  /**
   * 데이터 추출로부터 CUE 마이닝
   */
  async mineFromDataExtraction(params: {
    userDid: string;
    dataType: string;
    dataSize: number;
    extractionQuality: number;
    processingTime: number;
  }): Promise<number> {
    try {
      const { userDid, dataType, dataSize, extractionQuality, processingTime } = params;

      // 데이터 크기 기반 점수
      const sizeScore = Math.min(dataSize / 1000, 10);
      
      // 데이터 타입별 가중치
      const typeMultipliers: Record<string, number> = {
        'text': 1.0,
        'image': 1.2,
        'video': 1.5,
        'audio': 1.3,
        'document': 1.1,
        'code': 1.4
      };
      
      const typeMultiplier = typeMultipliers[dataType] || 1.0;
      const qualityBonus = extractionQuality * 2;
      const efficiencyBonus = processingTime < 10000 ? 1 : 0.5;
      
      const totalCue = Math.round(
        (sizeScore * typeMultiplier + qualityBonus + efficiencyBonus) * 100
      ) / 100;

      await this.recordTransaction({
        user_did: userDid,
        transaction_type: 'mining',
        amount: totalCue,
        status: 'completed',
        source: 'data_extraction',
        description: `Data extraction CUE mining (${dataType})`,
        metadata: {
          dataType,
          dataSize,
          extractionQuality,
          processingTime,
          sizeScore,
          typeMultiplier,
          qualityBonus,
          efficiencyBonus
        }
      });

      console.log(`⛏️ 데이터 추출 CUE 마이닝 완료: ${totalCue} tokens`);
      return totalCue;
    } catch (error) {
      console.error('데이터 추출 CUE 마이닝 오류:', error);
      return 0;
    }
  }

  /**
   * 일일 로그인 보너스
   */
  async mineLoginBonus(userDid: string): Promise<number> {
    try {
      const bonusAmount = 5.0;

      await this.recordTransaction({
        user_did: userDid,
        transaction_type: 'reward',
        amount: bonusAmount,
        status: 'completed',
        source: 'daily_login',
        description: 'Daily login bonus',
        metadata: {
          bonusType: 'daily_login',
          timestamp: new Date().toISOString()
        }
      });

      console.log(`⛏️ 일일 로그인 보너스: ${bonusAmount} CUE`);
      return bonusAmount;
    } catch (error) {
      console.error('로그인 보너스 마이닝 오류:', error);
      return 0;
    }
  }

  /**
   * CUE 마이닝 통계 조회
   */
  async getMiningStats(userDid: string, days: number = 7): Promise<{
    totalMined: number;
    dailyAverage: number;
    topSources: Array<{ source: string; amount: number }>;
    recentTransactions: any[];
  }> {
    try {
      const transactions = await this.getTransactionHistory(userDid, days * 10);
      
      // 마이닝 거래만 필터링
      const miningTransactions = transactions.filter(tx => 
        (tx.transaction_type === 'mining' || tx.transaction_type === 'reward') && 
        new Date(tx.created_at) > new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      );

      const totalMined = miningTransactions.reduce((sum, tx) => 
        sum + parseFloat(tx.amount), 0
      );
      const dailyAverage = totalMined / days;

      // 소스별 집계
      const sourceMap = new Map<string, number>();
      miningTransactions.forEach(tx => {
        const source = tx.source || 'unknown';
        sourceMap.set(source, (sourceMap.get(source) || 0) + parseFloat(tx.amount));
      });

      const topSources = Array.from(sourceMap.entries())
        .map(([source, amount]) => ({ source, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      return {
        totalMined: Math.round(totalMined * 100) / 100,
        dailyAverage: Math.round(dailyAverage * 100) / 100,
        topSources,
        recentTransactions: miningTransactions.slice(0, 10)
      };
    } catch (error) {
      console.error('마이닝 통계 조회 오류:', error);
      return {
        totalMined: 0,
        dailyAverage: 0,
        topSources: [],
        recentTransactions: []
      };
    }
  }

  /**
   * CUE 보상 지급 (시스템 보상)
   */
  async awardCUE(params: {
    userDid: string;
    amount: number;
    reason: string;
    description?: string;
    metadata?: any;
  }): Promise<number> {
    try {
      const { userDid, amount, reason, description, metadata } = params;

      await this.recordTransaction({
        user_did: userDid,
        transaction_type: 'reward',
        amount: amount,
        status: 'completed',
        source: reason,
        description: description || `CUE reward: ${reason}`,
        metadata: metadata || {}
      });

      console.log(`🎁 CUE 보상 지급: ${amount} tokens (${reason})`);
      return amount;
    } catch (error) {
      console.error('CUE 보상 지급 오류:', error);
      return 0;
    }
  }
}

export default CUEMiningService;