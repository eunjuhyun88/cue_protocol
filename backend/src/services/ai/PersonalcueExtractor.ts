// ============================================================================
// 🧠 Personal CUE 추출 및 저장 서비스
// 경로: backend/src/services/ai/PersonalCueExtractor.ts
// 용도: 채팅 메시지에서 개인화 데이터를 추출하여 CUE로 저장
// ============================================================================

import { SupabaseService } from '../database/SupabaseService';

interface ChatContext {
  userMessage: string;
  aiResponse: string;
  model: string;
  timestamp: Date;
  conversationId: string;
}

interface ExtractedCue {
  cue_key: string;
  cue_type: 'conversation' | 'behavior' | 'preference' | 'skill' | 'pattern';
  cue_category: string;
  cue_data: any;
  confidence_score: number;
  evidence_quality: 'low' | 'medium' | 'high';
}

export class PersonalCueExtractor {
  private db: SupabaseService;

  constructor() {
    this.db = new SupabaseService();
  }

  /**
   * 채팅 컨텍스트에서 개인화 CUE 데이터 추출
   */
  async extractAndStoreCues(userDid: string, context: ChatContext): Promise<ExtractedCue[]> {
    try {
      console.log(`🧠 Personal CUE 추출 시작: ${userDid}`);

      const extractedCues: ExtractedCue[] = [];

      // 1. 기술 선호도 추출
      const techCues = this.extractTechnicalPreferences(context);
      extractedCues.push(...techCues);

      // 2. 커뮤니케이션 스타일 추출
      const commCues = this.extractCommunicationStyle(context);
      extractedCues.push(...commCues);

      // 3. 학습 패턴 추출
      const learningCues = this.extractLearningPatterns(context);
      extractedCues.push(...learningCues);

      // 4. 관심 주제 추출
      const topicCues = this.extractTopicInterests(context);
      extractedCues.push(...topicCues);

      // 5. 데이터베이스에 저장
      const savedCues = await this.saveCuesToDatabase(userDid, extractedCues, context);

      console.log(`✅ ${savedCues.length}개 CUE 데이터 저장 완료`);
      return savedCues;

    } catch (error) {
      console.error('❌ CUE 추출 오류:', error);
      return [];
    }
  }

  /**
   * 기술 선호도 추출
   */
  private extractTechnicalPreferences(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage, aiResponse } = context;
    const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();

    // 프로그래밍 언어 감지
    const languages = {
      'javascript': ['javascript', 'js', 'node.js', 'nodejs'],
      'typescript': ['typescript', 'ts'],
      'python': ['python', 'py', 'django', 'flask'],
      'react': ['react', 'jsx', 'react.js'],
      'vue': ['vue', 'vue.js', 'vuejs'],
      'angular': ['angular', 'ng'],
      'java': ['java', 'spring', 'springboot'],
      'go': ['golang', 'go'],
      'rust': ['rust', 'cargo'],
      'php': ['php', 'laravel', 'symfony']
    };

    Object.entries(languages).forEach(([lang, keywords]) => {
      const mentioned = keywords.some(keyword => combinedText.includes(keyword));
      if (mentioned) {
        // 빈도 및 맥락 분석으로 관심도 계산
        const frequency = keywords.reduce((count, keyword) => {
          return count + (combinedText.match(new RegExp(keyword, 'g')) || []).length;
        }, 0);

        cues.push({
          cue_key: `tech_preference_${lang}`,
          cue_type: 'preference',
          cue_category: 'programming_language',
          cue_data: {
            language: lang,
            mentioned_keywords: keywords.filter(k => combinedText.includes(k)),
            frequency,
            context: this.extractSurroundingContext(combinedText, keywords[0]),
            interest_level: this.calculateInterestLevel(frequency, userMessage.length)
          },
          confidence_score: Math.min(0.9, 0.4 + (frequency * 0.2)),
          evidence_quality: frequency > 2 ? 'high' : frequency > 1 ? 'medium' : 'low'
        });
      }
    });

    // 개발 도구 선호도
    const tools = {
      'vscode': ['vscode', 'visual studio code'],
      'git': ['git', 'github', 'gitlab'],
      'docker': ['docker', 'container'],
      'kubernetes': ['kubernetes', 'k8s'],
      'aws': ['aws', 'amazon web services'],
      'npm': ['npm', 'yarn', 'package manager']
    };

    Object.entries(tools).forEach(([tool, keywords]) => {
      const mentioned = keywords.some(keyword => combinedText.includes(keyword));
      if (mentioned) {
        cues.push({
          cue_key: `tool_preference_${tool}`,
          cue_type: 'preference',
          cue_category: 'development_tools',
          cue_data: {
            tool,
            mentioned_keywords: keywords.filter(k => combinedText.includes(k)),
            usage_context: this.extractUsageContext(combinedText, keywords[0])
          },
          confidence_score: 0.7,
          evidence_quality: 'medium'
        });
      }
    });

    return cues;
  }

  /**
   * 커뮤니케이션 스타일 추출
   */
  private extractCommunicationStyle(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage } = context;

    // 메시지 길이 분석
    const messageLength = userMessage.length;
    const wordCount = userMessage.split(/\s+/).length;

    // 질문 스타일 분석
    const questionMarks = (userMessage.match(/\?/g) || []).length;
    const exclamationMarks = (userMessage.match(/!/g) || []).length;

    // 예의 표현 분석
    const politeWords = ['please', '부탁', '감사', '죄송', 'thank', 'sorry'];
    const politeCount = politeWords.reduce((count, word) => {
      return count + (userMessage.toLowerCase().match(new RegExp(word, 'g')) || []).length;
    }, 0);

    // 기술적 세부사항 요구 수준
    const technicalWords = ['구체적', 'specific', '자세히', 'detail', '예시', 'example'];
    const technicalDetailLevel = technicalWords.reduce((count, word) => {
      return count + (userMessage.toLowerCase().match(new RegExp(word, 'g')) || []).length;
    }, 0);

    // 커뮤니케이션 스타일 CUE 생성
    cues.push({
      cue_key: 'communication_style_analysis',
      cue_type: 'behavior',
      cue_category: 'communication_pattern',
      cue_data: {
        message_length_preference: messageLength > 100 ? 'detailed' : messageLength > 30 ? 'moderate' : 'concise',
        question_frequency: questionMarks,
        enthusiasm_level: exclamationMarks,
        politeness_score: politeCount,
        technical_detail_preference: technicalDetailLevel > 0 ? 'high' : 'standard',
        avg_word_count: wordCount,
        communication_traits: this.analyzeCommunicationTraits(userMessage)
      },
      confidence_score: 0.6,
      evidence_quality: 'medium'
    });

    return cues;
  }

  /**
   * 학습 패턴 추출
   */
  private extractLearningPatterns(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage, aiResponse } = context;

    // 학습 스타일 키워드 분석
    const learningIndicators = {
      'visual': ['그림', '도표', 'diagram', 'visual', '예시', 'example'],
      'hands_on': ['실습', 'practice', '직접', 'hands-on', '해보', '만들어'],
      'theoretical': ['이론', 'theory', '원리', 'principle', '개념', 'concept'],
      'step_by_step': ['단계', 'step', '순서', 'order', '하나씩', 'gradually']
    };

    const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();
    const detectedStyles: string[] = [];

    Object.entries(learningIndicators).forEach(([style, keywords]) => {
      const mentions = keywords.reduce((count, keyword) => {
        return count + (combinedText.match(new RegExp(keyword, 'g')) || []).length;
      }, 0);

      if (mentions > 0) {
        detectedStyles.push(style);
      }
    });

    if (detectedStyles.length > 0) {
      cues.push({
        cue_key: 'learning_style_preference',
        cue_type: 'pattern',
        cue_category: 'learning_behavior',
        cue_data: {
          preferred_styles: detectedStyles,
          learning_indicators: learningIndicators,
          pattern_strength: detectedStyles.length,
          context: 'chat_interaction'
        },
        confidence_score: 0.5 + (detectedStyles.length * 0.1),
        evidence_quality: detectedStyles.length > 2 ? 'high' : 'medium'
      });
    }

    return cues;
  }

  /**
   * 관심 주제 추출
   */
  private extractTopicInterests(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage } = context;

    // 주제 카테고리 분석
    const topics = {
      'web_development': ['웹', 'web', 'frontend', 'backend', 'fullstack'],
      'mobile_development': ['앱', 'app', 'mobile', 'ios', 'android', 'react native'],
      'data_science': ['데이터', 'data', 'machine learning', 'ai', '인공지능'],
      'devops': ['배포', 'deploy', 'ci/cd', 'devops', '운영'],
      'ui_ux': ['디자인', 'design', 'ui', 'ux', '사용자'],
      'performance': ['성능', 'performance', '최적화', 'optimization'],
      'security': ['보안', 'security', '인증', 'auth', '권한']
    };

    const messageText = userMessage.toLowerCase();

    Object.entries(topics).forEach(([topic, keywords]) => {
      const relevantKeywords = keywords.filter(keyword => messageText.includes(keyword));
      
      if (relevantKeywords.length > 0) {
        cues.push({
          cue_key: `topic_interest_${topic}`,
          cue_type: 'preference',
          cue_category: 'subject_interest',
          cue_data: {
            topic,
            mentioned_keywords: relevantKeywords,
            interest_context: this.extractInterestContext(messageText, relevantKeywords[0]),
            question_type: this.categorizeQuestionType(userMessage)
          },
          confidence_score: 0.6 + (relevantKeywords.length * 0.1),
          evidence_quality: relevantKeywords.length > 1 ? 'high' : 'medium'
        });
      }
    });

    return cues;
  }

  /**
   * CUE 데이터를 데이터베이스에 저장
   */
  private async saveCuesToDatabase(
    userDid: string, 
    cues: ExtractedCue[], 
    context: ChatContext
  ): Promise<ExtractedCue[]> {
    const savedCues: ExtractedCue[] = [];

    for (const cue of cues) {
      try {
        // 기존 CUE 확인 (중복 방지 및 업데이트)
        const existingCue = await this.findExistingCue(userDid, cue.cue_key, cue.cue_type);

        if (existingCue) {
          // 기존 CUE 업데이트 (강화 학습)
          await this.updateExistingCue(existingCue.id, cue, context);
        } else {
          // 새 CUE 생성
          await this.createNewCue(userDid, cue, context);
        }

        savedCues.push(cue);

      } catch (error) {
        console.error(`❌ CUE 저장 실패 (${cue.cue_key}):`, error);
      }
    }

    return savedCues;
  }

  /**
   * 기존 CUE 검색
   */
  private async findExistingCue(userDid: string, cueKey: string, cueType: string): Promise<any> {
    try {
      return await this.db.getPersonalCue(userDid, cueKey, cueType);
    } catch (error) {
      return null;
    }
  }

  /**
   * 기존 CUE 업데이트 (강화 학습)
   */
  private async updateExistingCue(cueId: string, newCue: ExtractedCue, context: ChatContext): Promise<void> {
    const updateData = {
      cue_data: {
        ...newCue.cue_data,
        reinforcement_count: 1, // 기존 값에 +1 (실제로는 기존 값 조회 후 증가)
        last_reinforcement: context.timestamp,
        recent_context: context.userMessage
      },
      confidence_metrics: {
        confidence_score: Math.min(0.95, newCue.confidence_score + 0.1), // 신뢰도 증가
        evidence_count: 1, // 기존 값에 +1
        evidence_quality: newCue.evidence_quality,
        reliability_score: 0.8
      },
      last_reinforced: context.timestamp,
      updated_at: new Date()
    };

    await this.db.updatePersonalCue(cueId, updateData);
    console.log(`🔄 CUE 업데이트: ${newCue.cue_key}`);
  }

  /**
   * 새 CUE 생성
   */
  private async createNewCue(userDid: string, cue: ExtractedCue, context: ChatContext): Promise<void> {
    const cueData = {
      user_did: userDid,
      cue_key: cue.cue_key,
      cue_type: cue.cue_type,
      cue_category: cue.cue_category,
      cue_data: {
        ...cue.cue_data,
        first_observed: context.timestamp,
        conversation_id: context.conversationId,
        ai_model: context.model
      },
      confidence_metrics: {
        confidence_score: cue.confidence_score,
        evidence_count: 1,
        evidence_quality: cue.evidence_quality,
        reliability_score: 0.5
      },
      source_data: {
        platform_sources: ['ai_chat'],
        extraction_methods: ['natural_language_processing'],
        interaction_ids: [context.conversationId]
      },
      status: 'active',
      validation_status: 'unvalidated',
      first_observed: context.timestamp,
      last_reinforced: context.timestamp
    };

    await this.db.createPersonalCue(cueData);
    console.log(`➕ 새 CUE 생성: ${cue.cue_key}`);
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들
  // ============================================================================

  private extractSurroundingContext(text: string, keyword: string): string {
    const index = text.indexOf(keyword);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + keyword.length + 50);
    return text.slice(start, end);
  }

  private extractUsageContext(text: string, keyword: string): string {
    // 키워드 주변 맥락 추출
    return this.extractSurroundingContext(text, keyword);
  }

  private calculateInterestLevel(frequency: number, messageLength: number): string {
    const ratio = frequency / Math.max(1, messageLength / 100);
    if (ratio > 0.1) return 'high';
    if (ratio > 0.05) return 'medium';
    return 'low';
  }

  private analyzeCommunicationTraits(message: string): string[] {
    const traits: string[] = [];
    
    if (message.length > 200) traits.push('detailed_communicator');
    if (message.includes('?')) traits.push('question_oriented');
    if (message.includes('!')) traits.push('enthusiastic');
    if (/please|부탁|감사/i.test(message)) traits.push('polite');
    if (/specific|구체적|자세히/i.test(message)) traits.push('detail_oriented');
    
    return traits;
  }

  private extractInterestContext(text: string, keyword: string): string {
    return this.extractSurroundingContext(text, keyword);
  }

  private categorizeQuestionType(message: string): string {
    if (/how|어떻게|방법/.test(message.toLowerCase())) return 'how_to';
    if (/what|무엇|뭔가/.test(message.toLowerCase())) return 'definition';
    if (/why|왜|이유/.test(message.toLowerCase())) return 'explanation';
    if (/can|할 수|가능/.test(message.toLowerCase())) return 'capability';
    return 'general';
  }
}