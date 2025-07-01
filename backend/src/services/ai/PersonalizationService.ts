// ============================================================================
// 🧠 src/services/ai/PersonalizationService.ts - 완전한 구현
// ============================================================================
//// 개인화 서비스 - 사용자의 성격 프로필, 행동 패턴, 선호도 등을 기반으로
// 개인화된 컨텍스트를 생성하고, 관련성 높은 CUE들을
// 추출하여 AI 응답을 개선하는 서비스입니다.  
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';

export class PersonalizationService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * 사용자의 개인화된 컨텍스트를 가져옵니다
   */
  async getPersonalizedContext(
    userDid: string,
    currentMessage: string,
    options: {
      includeFullProfile?: boolean;
      includeBehaviorPatterns?: boolean;
      includeRecentInteractions?: boolean;
    } = {}
  ): Promise<{
    personalityProfile: any;
    cues: any[];
    vaultIds: string[];
    behaviorPatterns: string[];
    preferences: any;
    personalityMatch: number;
    recentInteractions?: any[];
    primaryVaultId: string | null;
  }> {
    try {
      // 1. AI Passport 정보 가져오기
      const passport = await this.db.getPassport(userDid);
      const personalityProfile = passport?.personality_profile || this.getDefaultPersonalityProfile();

      // 2. 관련성 높은 개인화 CUE들 가져오기
      const relevantCues = await this.getRelevantCues(userDid, currentMessage);

      // 3. 데이터 볼트 정보
      const vaults = await this.db.getDataVaults(userDid);
      const vaultIds = vaults.map((v: any) => v.id);
      const primaryVaultId = vaults.length > 0 ? vaults[0].id : null;

      // 4. 행동 패턴 추출
      const behaviorPatterns = options.includeBehaviorPatterns 
        ? await this.extractBehaviorPatterns(relevantCues)
        : [];

      // 5. 최근 상호작용 패턴
      const recentInteractions = options.includeRecentInteractions 
        ? await this.getRecentInteractionPatterns(userDid)
        : [];

      // 6. 개인화 매치 점수 계산
      const personalityMatch = this.calculatePersonalityMatch(personalityProfile, currentMessage);

      // 7. 사용자 선호도
      const preferences = passport?.preferences || {};

      return {
        personalityProfile,
        cues: relevantCues,
        vaultIds,
        behaviorPatterns,
        preferences,
        personalityMatch,
        recentInteractions,
        primaryVaultId
      };

    } catch (error) {
      console.error('Get personalized context error:', error);
      
      // 에러 시 기본 컨텍스트 반환
      return this.getDefaultContext();
    }
  }

  /**
   * 현재 메시지와 관련성 높은 개인화 CUE들을 가져옵니다
   */
  private async getRelevantCues(userDid: string, message: string, limit = 10): Promise<any[]> {
    try {
      // 메시지에서 키워드 추출
      const keywords = this.extractKeywordsFromMessage(message);
      
      if (keywords.length > 0) {
        // 키워드 기반 검색
        const keywordBasedCues = await this.db.searchPersonalCues(userDid, keywords, limit);
        if (keywordBasedCues.length > 0) {
          return keywordBasedCues;
        }
      }

      // 키워드가 없거나 검색 결과가 없으면 최근 중요도 높은 CUE 반환
      const allCues = await this.db.getPersonalCues(userDid, limit);
      return allCues;

    } catch (error) {
      console.error('Get relevant cues error:', error);
      return [];
    }
  }

  /**
   * 메시지에서 키워드를 추출합니다
   */
  private extractKeywordsFromMessage(message: string): string[] {
    // 간단한 키워드 추출 (실제로는 NLP 라이브러리 사용 권장)
    const words = message.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));

    // 중복 제거 후 상위 5개 키워드만 반환
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * 개인화 CUE들에서 행동 패턴을 추출합니다
   */
  private async extractBehaviorPatterns(cues: any[]): Promise<string[]> {
    const patterns = new Set<string>();
    
    cues.forEach(cue => {
      // 토픽에서 패턴 추출
      if (cue.topics && Array.isArray(cue.topics)) {
        cue.topics.forEach((topic: string) => patterns.add(topic));
      }
      
      // 키워드에서 패턴 추출
      if (cue.keywords && Array.isArray(cue.keywords)) {
        cue.keywords.slice(0, 3).forEach((keyword: string) => patterns.add(keyword));
      }
    });

    return Array.from(patterns).slice(0, 5);
  }

  /**
   * 최근 상호작용 패턴을 가져옵니다
   */
  private async getRecentInteractionPatterns(userDid: string): Promise<any[]> {
    try {
      const recentInteractions = await this.db.getRecentInteractions(userDid, 10);
      
      // 패턴 분석을 위한 데이터 구조화
      return recentInteractions.map((interaction: any) => ({
        content: interaction.content,
        model: interaction.ai_model,
        timestamp: interaction.created_at,
        type: interaction.message_type
      }));

    } catch (error) {
      console.error('Get recent interaction patterns error:', error);
      return [];
    }
  }

  /**
   * 메시지와 성격 프로필의 일치도를 계산합니다
   */
  private calculatePersonalityMatch(profile: any, message: string): number {
    if (!profile || !profile.type) return 0.5;
    
    const lowerMessage = message.toLowerCase();
    let matchScore = 0.5; // 기본 점수

    // 기술적 성향 매치
    const technicalTerms = ['code', 'api', 'algorithm', 'system', 'data', 'tech', '개발', '시스템', '데이터'];
    const hasTechnicalContent = technicalTerms.some(term => lowerMessage.includes(term));
    
    if (profile.type.includes('Technical') || profile.type.includes('INTJ')) {
      matchScore += hasTechnicalContent ? 0.3 : -0.1;
    }

    // 메시지 길이 기반 매치 (상세형 vs 간결형)
    if (profile.communicationStyle?.includes('Direct') && message.length < 50) {
      matchScore += 0.2;
    } else if (profile.communicationStyle?.includes('Detailed') && message.length > 100) {
      matchScore += 0.2;
    }

    // 질문 형태 매치
    const hasQuestion = message.includes('?') || lowerMessage.includes('how') || 
                       lowerMessage.includes('what') || lowerMessage.includes('어떻게') ||
                       lowerMessage.includes('무엇');
                       
    if (profile.learningPattern?.includes('Interactive') && hasQuestion) {
      matchScore += 0.2;
    }

    // 점수 범위 제한 (0 ~ 1)
    return Math.max(0, Math.min(1, matchScore));
  }

  /**
   * 기본 성격 프로필을 반환합니다
   */
  private getDefaultPersonalityProfile() {
    return {
      type: 'Adaptive',
      communicationStyle: 'Balanced',
      learningPattern: 'Visual',
      workingStyle: 'Flexible',
      responsePreference: 'Helpful',
      decisionMaking: 'Analytical'
    };
  }

  /**
   * 기본 컨텍스트를 반환합니다 (에러 시 사용)
   */
  private getDefaultContext() {
    return {
      personalityProfile: this.getDefaultPersonalityProfile(),
      cues: [],
      vaultIds: [],
      behaviorPatterns: [],
      preferences: {},
      personalityMatch: 0.5,
      recentInteractions: [],
      primaryVaultId: null
    };
  }

  /**
   * 불용어 체크
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      // 영어 불용어
      'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but', 'in', 'with', 'a', 'an', 'as', 
      'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'to', 'of', 
      'for', 'from', 'by', 'about', 'into', 'through', 'during', 'before', 'after',
      
      // 한국어 불용어
      '은', '는', '이', '가', '을', '를', '의', '와', '과', '에', '에서', '로', '으로', 
      '까지', '부터', '보다', '처럼', '같이', '하고', '하지만', '그리고', '또는', '또한',
      '그런데', '하지만', '있다', '없다', '이다', '아니다', '한다', '된다', '있는', '없는'
    ];
    
    return stopWords.includes(word);
  }

  /**
   * 사용자의 성격 프로필을 업데이트합니다
   */
  async updatePersonalityProfile(userDid: string, interactions: any[]): Promise<void> {
    try {
      // 상호작용 패턴 분석
      const analysis = this.analyzeInteractionPatterns(interactions);
      
      // 기존 프로필 가져오기
      const passport = await this.db.getPassport(userDid);
      const currentProfile = passport?.personality_profile || this.getDefaultPersonalityProfile();
      
      // 프로필 업데이트
      const updatedProfile = this.mergePersonalityProfiles(currentProfile, analysis);
      
      // 데이터베이스에 저장
      await this.db.updatePassport(userDid, {
        personality_profile: updatedProfile,
        last_activity_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update personality profile error:', error);
    }
  }

  /**
   * 상호작용 패턴을 분석합니다
   */
  private analyzeInteractionPatterns(interactions: any[]): any {
    // 간단한 패턴 분석 (실제로는 더 정교한 ML 알고리즘 사용)
    const avgMessageLength = interactions.reduce((sum, msg) => sum + msg.content.length, 0) / interactions.length;
    const technicalContentRatio = interactions.filter(msg => 
      /code|api|system|data|tech/i.test(msg.content)
    ).length / interactions.length;
    
    const questionRatio = interactions.filter(msg => 
      msg.content.includes('?') || /how|what|why|when|where/i.test(msg.content)
    ).length / interactions.length;

    return {
      communicationStyle: avgMessageLength > 100 ? 'Detailed' : 'Concise',
      technicalOrientation: technicalContentRatio > 0.3 ? 'High' : 'Moderate',
      interactionStyle: questionRatio > 0.4 ? 'Inquisitive' : 'Statement-based',
      lastAnalyzed: new Date().toISOString()
    };
  }

  /**
   * 성격 프로필을 병합합니다
   */
  private mergePersonalityProfiles(current: any, analysis: any): any {
    return {
      ...current,
      communicationStyle: analysis.communicationStyle || current.communicationStyle,
      technicalOrientation: analysis.technicalOrientation,
      interactionStyle: analysis.interactionStyle,
      lastUpdated: analysis.lastAnalyzed,
      confidence: Math.min((current.confidence || 0.5) + 0.1, 1.0) // 점진적 신뢰도 증가
    };
  }
}