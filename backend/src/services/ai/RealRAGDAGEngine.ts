// ============================================================================
// 🧠 실제 RAG-DAG 엔진 (Mock 제거, 실제 벡터 검색 구현)
// 경로: backend/src/services/ai/RealRAGDAGEngine.ts
// 목적: Personal Cues를 활용한 실제 개인화 AI 시스템
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';
import { EmbeddingService } from './EmbeddingService';

interface PersonalCue {
  id: string;
  user_id: string;
  cue_key: string;
  cue_type: string;
  cue_category: string;
  cue_data: any;
  confidence_metrics: any;
  application_rules: any;
  created_at: string;
  updated_at: string;
}

interface RAGContext {
  relevantCues: PersonalCue[];
  contextSummary: string;
  personalityFactors: string[];
  confidenceScore: number;
  usedCueKeys: string[];
}

interface SearchResult {
  cue: PersonalCue;
  similarity: number;
  relevanceScore: number;
}

export class RealRAGDAGEngine {
  private static instance: RealRAGDAGEngine;
  private db: DatabaseService;
  private embeddingService: EmbeddingService;
  private isInitialized: boolean = false;

  private constructor() {
    console.log('🧠 === RealRAGDAGEngine 초기화 시작 ===');
    this.db = DatabaseService.getInstance();
    this.embeddingService = EmbeddingService.getInstance();
  }

  public static getInstance(): RealRAGDAGEngine {
    if (!RealRAGDAGEngine.instance) {
      RealRAGDAGEngine.instance = new RealRAGDAGEngine();
    }
    return RealRAGDAGEngine.instance;
  }

  /**
   * RAG-DAG 엔진 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔧 RAG-DAG 엔진 초기화 중...');
    
    try {
      // 데이터베이스 연결 확인
      if (!this.db.isConnected()) {
        await this.db.connect();
      }

      this.isInitialized = true;
      console.log('✅ RAG-DAG 엔진 초기화 완료');
    } catch (error) {
      console.error('❌ RAG-DAG 엔진 초기화 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🔍 Personal Cues 검색 및 RAG 시스템
  // ============================================================================

  /**
   * 사용자 쿼리에 대한 관련 Personal Cues 검색 (벡터 기반)
   */
  public async searchRelevantCues(
    userId: string, 
    query: string, 
    limit: number = 10
  ): Promise<SearchResult[]> {
    console.log(`🔍 === Personal Cues 벡터 검색 시작 ===`);
    console.log(`👤 사용자: ${userId}`);
    console.log(`🔍 쿼리: "${query.substring(0, 100)}..."`);
    console.log(`📊 제한: ${limit}개`);

    await this.initialize();

    try {
      // 1. 사용자의 모든 Personal Cues 조회
      const allCues = await this.db.getPersonalCues(userId, 100); // 더 많이 가져와서 정확도 높임
      
      if (allCues.length === 0) {
        console.log('📭 Personal Cues 없음, 빈 결과 반환');
        return [];
      }

      console.log(`📚 조회된 Personal Cues: ${allCues.length}개`);

      // 2. 쿼리 임베딩 생성
      console.log('🧠 쿼리 임베딩 생성 중...');
      const queryEmbedding = await this.embeddingService.generateEmbeddingWithCache(query);
      console.log(`✅ 쿼리 임베딩 생성 완료: ${queryEmbedding.length}차원`);

      // 3. 각 CUE와의 유사도 계산
      console.log('📊 유사도 계산 중...');
      const searchResults: SearchResult[] = [];

      for (const cue of allCues) {
        try {
          // CUE 텍스트 내용 추출
          const cueText = this.extractCueText(cue);
          
          // CUE 임베딩 생성
          const cueEmbedding = await this.embeddingService.generateEmbeddingWithCache(cueText);
          
          // 코사인 유사도 계산
          const similarity = this.embeddingService.calculateCosineSimilarity(
            queryEmbedding, 
            cueEmbedding
          );

          // 관련성 점수 계산 (유사도 + 메타데이터 가중치)
          const relevanceScore = this.calculateRelevanceScore(cue, similarity, query);

          searchResults.push({
            cue,
            similarity,
            relevanceScore
          });

          console.log(`📊 CUE "${cue.cue_key}": 유사도=${similarity.toFixed(3)}, 관련성=${relevanceScore.toFixed(3)}`);

        } catch (error) {
          console.warn(`⚠️ CUE 처리 실패 (${cue.cue_key}):`, error);
        }
      }

      // 4. 관련성 점수로 정렬 및 제한
      const sortedResults = searchResults
        .filter(result => result.relevanceScore > 0.1) // 최소 임계값
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

      console.log(`✅ 벡터 검색 완료: ${sortedResults.length}개 관련 CUE 발견`);
      
      // 상위 결과 로깅
      sortedResults.slice(0, 3).forEach((result, index) => {
        console.log(`🎯 #${index + 1} "${result.cue.cue_key}" (점수: ${result.relevanceScore.toFixed(3)})`);
      });

      return sortedResults;

    } catch (error) {
      console.error('💥 Personal Cues 검색 실패:', error);
      return [];
    }
  }

  /**
   * RAG 컨텍스트 구성 (검색된 CUEs를 개인화 컨텍스트로 변환)
   */
  public async buildRAGContext(
    userId: string, 
    query: string, 
    maxCues: number = 5
  ): Promise<RAGContext> {
    console.log(`🧠 === RAG 컨텍스트 구성 시작 ===`);
    console.log(`👤 사용자: ${userId}`);
    console.log(`🎯 최대 CUE 수: ${maxCues}`);

    try {
      // 관련 CUEs 검색
      const searchResults = await this.searchRelevantCues(userId, query, maxCues);
      
      if (searchResults.length === 0) {
        console.log('📭 관련 CUE 없음, 기본 컨텍스트 반환');
        return {
          relevantCues: [],
          contextSummary: '개인화 학습을 위해 대화를 계속해주세요.',
          personalityFactors: [],
          confidenceScore: 0,
          usedCueKeys: []
        };
      }

      const relevantCues = searchResults.map(result => result.cue);
      
      // 컨텍스트 요약 생성
      const contextSummary = this.generateContextSummary(relevantCues);
      
      // 개성 요소 추출
      const personalityFactors = this.extractPersonalityFactors(relevantCues);
      
      // 전체 신뢰도 점수 계산
      const confidenceScore = this.calculateOverallConfidence(searchResults);
      
      // 사용된 CUE 키 목록
      const usedCueKeys = relevantCues.map(cue => cue.cue_key);

      console.log(`✅ RAG 컨텍스트 구성 완료:`);
      console.log(`   - 사용된 CUE: ${usedCueKeys.length}개`);
      console.log(`   - 신뢰도: ${confidenceScore.toFixed(3)}`);
      console.log(`   - 개성 요소: ${personalityFactors.length}개`);

      return {
        relevantCues,
        contextSummary,
        personalityFactors,
        confidenceScore,
        usedCueKeys
      };

    } catch (error) {
      console.error('💥 RAG 컨텍스트 구성 실패:', error);
      
      return {
        relevantCues: [],
        contextSummary: '컨텍스트 로드 중 오류가 발생했습니다.',
        personalityFactors: [],
        confidenceScore: 0,
        usedCueKeys: []
      };
    }
  }

  /**
   * 개인화된 AI 프롬프트 생성 (RAG-DAG 핵심 기능)
   */
  public async generatePersonalizedPrompt(
    userId: string,
    userQuery: string,
    baseModel: string = 'general'
  ): Promise<string> {
    console.log(`🎯 === 개인화 프롬프트 생성 시작 ===`);
    console.log(`👤 사용자: ${userId}`);
    console.log(`🤖 기본 모델: ${baseModel}`);
    console.log(`❓ 사용자 질문: "${userQuery.substring(0, 100)}..."`);

    try {
      // RAG 컨텍스트 구성
      const ragContext = await this.buildRAGContext(userId, userQuery, 7);
      
      if (ragContext.relevantCues.length === 0) {
        console.log('📝 기본 프롬프트 반환 (개인화 CUE 없음)');
        return this.generateBasicPrompt(userQuery, baseModel);
      }

      // 개인화된 프롬프트 구성
      let personalizedPrompt = '';
      
      // 1. 시스템 컨텍스트
      personalizedPrompt += `당신은 사용자의 개인적 특성을 잘 알고 있는 AI 어시스턴트입니다.\n\n`;
      
      // 2. 개인화 컨텍스트 추가
      personalizedPrompt += `**사용자 개인화 정보:**\n`;
      personalizedPrompt += `${ragContext.contextSummary}\n\n`;
      
      // 3. 구체적인 CUE 정보
      if (ragContext.personalityFactors.length > 0) {
        personalizedPrompt += `**개성 및 선호도:**\n`;
        ragContext.personalityFactors.forEach(factor => {
          personalizedPrompt += `- ${factor}\n`;
        });
        personalizedPrompt += `\n`;
      }

      // 4. 적용 지침
      personalizedPrompt += `**응답 지침:**\n`;
      personalizedPrompt += `- 위의 개인화 정보를 고려하여 맞춤형 답변을 제공하세요\n`;
      personalizedPrompt += `- 사용자의 학습 스타일과 선호도에 맞춰 설명하세요\n`;
      personalizedPrompt += `- 신뢰도 점수: ${(ragContext.confidenceScore * 100).toFixed(1)}%\n\n`;
      
      // 5. 실제 사용자 질문
      personalizedPrompt += `**사용자 질문:**\n${userQuery}\n\n`;
      
      // 6. 마지막 지시
      personalizedPrompt += `위의 개인화 정보를 바탕으로 친근하고 도움이 되는 답변을 제공해주세요.`;

      console.log(`✅ 개인화 프롬프트 생성 완료:`);
      console.log(`   - 전체 길이: ${personalizedPrompt.length}자`);
      console.log(`   - 활용된 CUE: ${ragContext.usedCueKeys.join(', ')}`);
      console.log(`   - 신뢰도: ${(ragContext.confidenceScore * 100).toFixed(1)}%`);

      return personalizedPrompt;

    } catch (error) {
      console.error('💥 개인화 프롬프트 생성 실패:', error);
      return this.generateBasicPrompt(userQuery, baseModel);
    }
  }

  // ============================================================================
  // 🔧 헬퍼 메서드들
  // ============================================================================

  /**
   * CUE에서 텍스트 내용 추출
   */
  private extractCueText(cue: PersonalCue): string {
    let text = `${cue.cue_key} ${cue.cue_type} ${cue.cue_category}`;
    
    if (cue.cue_data) {
      if (typeof cue.cue_data === 'string') {
        text += ` ${cue.cue_data}`;
      } else {
        // JSON 객체인 경우 주요 값들 추출
        const dataStr = JSON.stringify(cue.cue_data);
        text += ` ${dataStr}`;
      }
    }
    
    return text;
  }

  /**
   * 관련성 점수 계산 (유사도 + 메타데이터 가중치)
   */
  private calculateRelevanceScore(
    cue: PersonalCue, 
    similarity: number, 
    query: string
  ): number {
    let score = similarity;
    
    // 신뢰도 가중치
    const confidence = cue.confidence_metrics?.confidence_score || 0.5;
    score *= (0.5 + confidence * 0.5); // 신뢰도에 따라 0.5~1.0 가중치
    
    // 최근성 가중치 (최근 업데이트된 CUE에 더 높은 점수)
    const daysSinceUpdate = this.getDaysSinceUpdate(cue.updated_at);
    const recencyWeight = Math.max(0.5, 1 - daysSinceUpdate / 365); // 1년 기준으로 감소
    score *= recencyWeight;
    
    // 카테고리 관련성 (특정 카테고리에 더 높은 가중치)
    if (cue.cue_category === 'communication' && query.includes('설명')) {
      score *= 1.2;
    }
    if (cue.cue_category === 'technical' && /코드|프로그래밍|개발/.test(query)) {
      score *= 1.3;
    }
    
    return Math.min(1.0, score); // 최대 1.0으로 제한
  }

  /**
   * 컨텍스트 요약 생성
   */
  private generateContextSummary(cues: PersonalCue[]): string {
    if (cues.length === 0) {
      return '개인화 데이터가 없습니다.';
    }

    const summaryParts: string[] = [];
    
    // 주요 특성들 추출
    const communicationStyles = cues
      .filter(cue => cue.cue_category === 'communication')
      .map(cue => cue.cue_key);
    
    const technicalPrefs = cues
      .filter(cue => cue.cue_category === 'technical')
      .map(cue => cue.cue_key);
      
    const personalPrefs = cues
      .filter(cue => cue.cue_category === 'personal')
      .map(cue => cue.cue_key);

    if (communicationStyles.length > 0) {
      summaryParts.push(`소통 스타일: ${communicationStyles.slice(0, 2).join(', ')}`);
    }
    
    if (technicalPrefs.length > 0) {
      summaryParts.push(`기술적 선호도: ${technicalPrefs.slice(0, 2).join(', ')}`);
    }
    
    if (personalPrefs.length > 0) {
      summaryParts.push(`개인적 특성: ${personalPrefs.slice(0, 2).join(', ')}`);
    }

    return summaryParts.join(' | ') || '일반적인 학습 패턴';
  }

  /**
   * 개성 요소 추출
   */
  private extractPersonalityFactors(cues: PersonalCue[]): string[] {
    const factors: string[] = [];
    
    cues.forEach(cue => {
      if (cue.cue_data) {
        // 주요 특성 추출
        if (cue.cue_type === 'preference') {
          factors.push(`선호: ${cue.cue_key}`);
        } else if (cue.cue_type === 'behavior') {
          factors.push(`행동: ${cue.cue_key}`);
        } else if (cue.cue_type === 'skill') {
          factors.push(`능력: ${cue.cue_key}`);
        }
      }
    });
    
    return factors.slice(0, 5); // 최대 5개로 제한
  }

  /**
   * 전체 신뢰도 점수 계산
   */
  private calculateOverallConfidence(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) return 0;
    
    const avgRelevance = searchResults.reduce((sum, result) => 
      sum + result.relevanceScore, 0) / searchResults.length;
    
    const avgConfidence = searchResults.reduce((sum, result) => 
      sum + (result.cue.confidence_metrics?.confidence_score || 0.5), 0) / searchResults.length;
    
    return (avgRelevance + avgConfidence) / 2;
  }

  /**
   * 업데이트 이후 경과 일수 계산
   */
  private getDaysSinceUpdate(updatedAt: string): number {
    const updateDate = new Date(updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updateDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 기본 프롬프트 생성 (개인화 정보 없을 때)
   */
  private generateBasicPrompt(userQuery: string, baseModel: string): string {
    return `사용자의 질문에 친절하고 도움이 되는 답변을 제공해주세요.\n\n질문: ${userQuery}\n\n답변:`;
  }

  // ============================================================================
  // 📊 통계 및 진단 메서드
  // ============================================================================

  /**
   * RAG-DAG 시스템 상태 확인
   */
  public async getSystemStatus(): Promise<any> {
    console.log('📊 RAG-DAG 시스템 상태 확인');
    
    try {
      const embeddingStats = this.embeddingService.getCacheStats();
      
      return {
        initialized: this.isInitialized,
        databaseConnected: this.db.isConnected(),
        embeddingService: {
          available: true,
          cacheStats: embeddingStats
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 시스템 상태 확인 실패:', error);
      return {
        initialized: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 사용자별 RAG 성능 분석
   */
  public async analyzeUserRAGPerformance(userId: string): Promise<any> {
    console.log(`📊 사용자 RAG 성능 분석: ${userId}`);
    
    try {
      const allCues = await this.db.getPersonalCues(userId, 1000);
      
      const analysis = {
        totalCues: allCues.length,
        categoryDistribution: this.analyzeCategoryDistribution(allCues),
        confidenceDistribution: this.analyzeConfidenceDistribution(allCues),
        recentActivity: this.analyzeRecentActivity(allCues),
        recommendations: this.generateRecommendations(allCues)
      };

      console.log(`✅ RAG 성능 분석 완료: ${analysis.totalCues}개 CUE 분석`);
      return analysis;
    } catch (error) {
      console.error('❌ RAG 성능 분석 실패:', error);
      throw error;
    }
  }

  private analyzeCategoryDistribution(cues: PersonalCue[]): any {
    const distribution: { [key: string]: number } = {};
    cues.forEach(cue => {
      distribution[cue.cue_category] = (distribution[cue.cue_category] || 0) + 1;
    });
    return distribution;
  }

  private analyzeConfidenceDistribution(cues: PersonalCue[]): any {
    const confidences = cues.map(cue => cue.confidence_metrics?.confidence_score || 0.5);
    return {
      average: confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length,
      high: confidences.filter(conf => conf > 0.8).length,
      medium: confidences.filter(conf => conf >= 0.5 && conf <= 0.8).length,
      low: confidences.filter(conf => conf < 0.5).length
    };
  }

  private analyzeRecentActivity(cues: PersonalCue[]): any {
    const now = new Date();
    const week = 7 * 24 * 60 * 60 * 1000;
    const month = 30 * 24 * 60 * 60 * 1000;
    
    const recentCues = cues.filter(cue => {
      const updated = new Date(cue.updated_at);
      return now.getTime() - updated.getTime() < week;
    });
    
    const monthlyActivity = cues.filter(cue => {
      const updated = new Date(cue.updated_at);
      return now.getTime() - updated.getTime() < month;
    });

    return {
      lastWeek: recentCues.length,
      lastMonth: monthlyActivity.length,
      activityRate: monthlyActivity.length / Math.max(cues.length, 1)
    };
  }

  private generateRecommendations(cues: PersonalCue[]): string[] {
    const recommendations: string[] = [];
    
    if (cues.length < 10) {
      recommendations.push('더 많은 대화를 통해 개인화 학습을 향상시키세요');
    }
    
    const lowConfidenceCues = cues.filter(cue => 
      (cue.confidence_metrics?.confidence_score || 0.5) < 0.5
    );
    
    if (lowConfidenceCues.length > cues.length * 0.3) {
      recommendations.push('일관된 행동 패턴으로 CUE 신뢰도를 높이세요');
    }
    
    return recommendations;
  }
}