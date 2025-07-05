// ============================================================================
// 🧠 Personal CUE 추출 서비스 (DatabaseService 전용 버전)
// 경로: backend/src/services/ai/PersonalCueExtractor.ts
// 용도: 채팅 메시지에서 개인화 데이터를 추출하여 CUE로 저장
// 호출구조: DIContainer → PersonalCueExtractor → DatabaseService
// ============================================================================

import { DatabaseService } from '../database/DatabaseService';

interface ChatContext {
  userMessage: string;
  aiResponse: string;
  model: string;
  timestamp: Date;
  conversationId: string;
  userId: string;
}

interface ExtractedCue {
  cue_key: string;
  cue_type: 'conversation' | 'behavior' | 'preference' | 'skill' | 'pattern' | 'context';
  cue_category: string;
  cue_data: any;
  confidence_score: number;
  evidence_quality: 'low' | 'medium' | 'high';
  extraction_reason: string;
}

export class PersonalCueExtractor {
  private static instance: PersonalCueExtractor;
  private db: DatabaseService;
  private isInitialized: boolean = false;

  private constructor() {
    console.log('🧠 === PersonalCueExtractor 초기화 (DatabaseService 전용) ===');
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): PersonalCueExtractor {
    if (!PersonalCueExtractor.instance) {
      PersonalCueExtractor.instance = new PersonalCueExtractor();
    }
    return PersonalCueExtractor.instance;
  }

  /**
   * CUE 추출기 초기화
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔧 Personal CUE 추출기 초기화 중...');
    
    try {
      // DatabaseService 연결 확인
      if (this.db && typeof this.db.testConnection === 'function') {
        await this.db.testConnection();
      }

      this.isInitialized = true;
      console.log('✅ Personal CUE 추출기 초기화 완료');
    } catch (error) {
      console.error('❌ Personal CUE 추출기 초기화 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 🧠 메인 CUE 추출 프로세스
  // ============================================================================

  /**
   * 채팅 컨텍스트에서 Personal CUE 추출 및 저장
   */
  public async extractAndStoreCues(
    userId: string, 
    context: ChatContext
  ): Promise<ExtractedCue[]> {
    console.log(`🧠 === Personal CUE 추출 시작 ===`);
    console.log(`👤 사용자: ${userId}`);
    console.log(`💬 메시지 길이: ${context.userMessage?.length || 0}자`);
    console.log(`🤖 응답 길이: ${context.aiResponse?.length || 0}자`);

    await this.initialize();

    try {
      const extractedCues: ExtractedCue[] = [];

      // 1. 기술적 선호도 추출
      console.log('🔧 기술적 선호도 추출 중...');
      const techCues = this.extractTechnicalPreferences(context);
      extractedCues.push(...techCues);
      console.log(`   ✅ ${techCues.length}개 기술 CUE 추출`);

      // 2. 커뮤니케이션 스타일 추출
      console.log('💬 커뮤니케이션 스타일 추출 중...');
      const commCues = this.extractCommunicationStyle(context);
      extractedCues.push(...commCues);
      console.log(`   ✅ ${commCues.length}개 소통 CUE 추출`);

      // 3. 학습 패턴 추출
      console.log('📚 학습 패턴 추출 중...');
      const learningCues = this.extractLearningPatterns(context);
      extractedCues.push(...learningCues);
      console.log(`   ✅ ${learningCues.length}개 학습 CUE 추출`);

      // 4. 관심 주제 추출
      console.log('🎯 관심 주제 추출 중...');
      const topicCues = this.extractTopicInterests(context);
      extractedCues.push(...topicCues);
      console.log(`   ✅ ${topicCues.length}개 주제 CUE 추출`);

      // 5. 행동 패턴 추출
      console.log('🎭 행동 패턴 추출 중...');
      const behaviorCues = this.extractBehaviorPatterns(context);
      extractedCues.push(...behaviorCues);
      console.log(`   ✅ ${behaviorCues.length}개 행동 CUE 추출`);

      // 6. 문맥적 정보 추출
      console.log('🔍 문맥적 정보 추출 중...');
      const contextCues = this.extractContextualInfo(context);
      extractedCues.push(...contextCues);
      console.log(`   ✅ ${contextCues.length}개 문맥 CUE 추출`);

      console.log(`🎯 총 ${extractedCues.length}개 CUE 추출 완료`);

      // 7. DatabaseService를 통해 저장
      if (extractedCues.length > 0) {
        console.log('💾 추출된 CUE들을 데이터베이스에 저장 중...');
        const savedCues = await this.saveCuesToDatabase(userId, extractedCues, context);
        console.log(`✅ ${savedCues.length}개 CUE 저장 완료`);
        return savedCues;
      } else {
        console.log('📭 추출된 CUE 없음');
        return [];
      }

    } catch (error) {
      console.error('💥 Personal CUE 추출 실패:', error);
      return [];
    }
  }

  // ============================================================================
  // 🔍 개별 CUE 추출 메서드들
  // ============================================================================

  /**
   * 기술적 선호도 추출
   */
  private extractTechnicalPreferences(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage } = context;
    
    console.log('🔧 기술적 선호도 분석 중...');

    // 프로그래밍 언어 선호도
    const languages = {
      'javascript': ['javascript', 'js', 'node', 'react', 'vue', 'angular'],
      'python': ['python', 'django', 'flask', 'numpy', 'pandas'],
      'java': ['java', 'spring', 'kotlin'],
      'typescript': ['typescript', 'ts'],
      'go': ['golang', 'go'],
      'rust': ['rust'],
      'swift': ['swift', 'ios'],
      'kotlin': ['kotlin', 'android'],
      'php': ['php', 'laravel', 'symfony'],
      'csharp': ['c#', 'csharp', '.net', 'dotnet']
    };

    const messageText = userMessage.toLowerCase();

    Object.entries(languages).forEach(([language, keywords]) => {
      const mentionedKeywords = keywords.filter(keyword => 
        new RegExp(`\\b${keyword}\\b`, 'i').test(messageText)
      );
      
      if (mentionedKeywords.length > 0) {
        cues.push({
          cue_key: `prefers_${language}`,
          cue_type: 'preference',
          cue_category: 'technical',
          cue_data: {
            language,
            mentioned_keywords: mentionedKeywords,
            context: this.extractSentenceContext(messageText, mentionedKeywords[0]),
            confidence_factors: {
              keyword_count: mentionedKeywords.length,
              context_positive: this.isPositiveContext(messageText, mentionedKeywords[0])
            }
          },
          confidence_score: Math.min(0.9, 0.3 + mentionedKeywords.length * 0.2),
          evidence_quality: mentionedKeywords.length > 2 ? 'high' : 'medium',
          extraction_reason: `언급된 키워드: ${mentionedKeywords.join(', ')}`
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
      'vercel': ['vercel'],
      'netlify': ['netlify'],
      'firebase': ['firebase'],
      'mongodb': ['mongodb', 'mongo'],
      'postgresql': ['postgresql', 'postgres'],
      'mysql': ['mysql'],
      'redis': ['redis']
    };

    Object.entries(tools).forEach(([tool, keywords]) => {
      const mentionedKeywords = keywords.filter(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      
      if (mentionedKeywords.length > 0) {
        cues.push({
          cue_key: `uses_${tool}`,
          cue_type: 'behavior',
          cue_category: 'technical',
          cue_data: {
            tool,
            mentioned_keywords: mentionedKeywords,
            usage_context: this.extractSentenceContext(messageText, mentionedKeywords[0])
          },
          confidence_score: 0.7,
          evidence_quality: 'medium',
          extraction_reason: `도구 사용 언급: ${mentionedKeywords.join(', ')}`
        });
      }
    });

    console.log(`🔧 기술적 선호도 ${cues.length}개 추출 완료`);
    return cues;
  }

  /**
   * 커뮤니케이션 스타일 추출
   */
  private extractCommunicationStyle(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage } = context;
    
    console.log('💬 커뮤니케이션 스타일 분석 중...');

    // 질문 스타일 분석
    const questionPatterns = {
      'detailed_questions': /어떻게|왜|무엇|언제|어디서|어떤/g,
      'direct_questions': /^(할 수 있나|가능한가|방법은)/,
      'exploratory_questions': /알려줘|설명해|이해하고 싶어/,
      'practical_questions': /실제로|실무에서|현실적으로/
    };

    Object.entries(questionPatterns).forEach(([style, pattern]) => {
      const matches = userMessage.match(pattern);
      if (matches && matches.length > 0) {
        cues.push({
          cue_key: `communication_${style}`,
          cue_type: 'pattern',
          cue_category: 'communication',
          cue_data: {
            style,
            examples: matches.slice(0, 3),
            frequency: matches.length,
            message_context: userMessage.substring(0, 100)
          },
          confidence_score: Math.min(0.8, 0.4 + matches.length * 0.1),
          evidence_quality: matches.length > 2 ? 'high' : 'medium',
          extraction_reason: `${matches.length}개 패턴 감지`
        });
      }
    });

    // 정중함 수준 분석
    const politenessIndicators = ['부탁', '죄송', '감사', '고마워', '도움', '양해', 'please', 'thank', 'sorry'];
    const politenessCount = politenessIndicators.filter(indicator => 
      userMessage.toLowerCase().includes(indicator.toLowerCase())
    ).length;

    if (politenessCount > 0) {
      cues.push({
        cue_key: 'polite_communication',
        cue_type: 'behavior',
        cue_category: 'communication',
        cue_data: {
          politeness_level: politenessCount > 2 ? 'high' : 'medium',
          indicators_found: politenessCount,
          context: 'formal_polite'
        },
        confidence_score: 0.6 + politenessCount * 0.1,
        evidence_quality: politenessCount > 2 ? 'high' : 'medium',
        extraction_reason: `정중한 표현 ${politenessCount}개 사용`
      });
    }

    // 응답 선호도 분석
    const responsePreferences = {
      'wants_examples': /예시|example|샘플|사례/,
      'wants_step_by_step': /단계|스텝|순서|절차/,
      'wants_detailed': /자세히|상세히|구체적으로|detail/,
      'wants_summary': /요약|간단히|핵심만|brief/
    };

    Object.entries(responsePreferences).forEach(([preference, pattern]) => {
      if (pattern.test(userMessage)) {
        cues.push({
          cue_key: `prefers_${preference}`,
          cue_type: 'preference',
          cue_category: 'communication',
          cue_data: {
            preference,
            context: this.extractSentenceContext(userMessage, preference.split('_')[1])
          },
          confidence_score: 0.7,
          evidence_quality: 'medium',
          extraction_reason: `응답 스타일 선호도 감지`
        });
      }
    });

    console.log(`💬 커뮤니케이션 스타일 ${cues.length}개 추출 완료`);
    return cues;
  }

  /**
   * 학습 패턴 추출
   */
  private extractLearningPatterns(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage } = context;
    
    console.log('📚 학습 패턴 분석 중...');

    // 학습 접근 방식
    const learningApproaches = {
      'visual_learner': /그림|도표|차트|시각|보여줘|diagram/,
      'practical_learner': /실습|해보기|실제로|practice|hands-on/,
      'theoretical_learner': /이론|원리|why|이유|개념|concept/,
      'example_based': /예시|example|샘플|case study/
    };

    Object.entries(learningApproaches).forEach(([approach, pattern]) => {
      if (pattern.test(userMessage)) {
        cues.push({
          cue_key: `learning_${approach}`,
          cue_type: 'pattern',
          cue_category: 'learning',
          cue_data: {
            approach,
            evidence: this.extractSentenceContext(userMessage, approach.split('_')[0]),
            learning_preference: true
          },
          confidence_score: 0.6,
          evidence_quality: 'medium',
          extraction_reason: `학습 접근 방식 감지: ${approach}`
        });
      }
    });

    // 난이도 선호도
    const difficultyIndicators = {
      'beginner': /초보|기초|basic|시작|처음|입문/,
      'intermediate': /중급|어느정도|intermediate|일반적/,
      'advanced': /고급|advanced|심화|전문적|깊이/
    };

    Object.entries(difficultyIndicators).forEach(([level, pattern]) => {
      if (pattern.test(userMessage)) {
        cues.push({
          cue_key: `difficulty_${level}`,
          cue_type: 'preference',
          cue_category: 'learning',
          cue_data: {
            preferred_level: level,
            context: this.extractSentenceContext(userMessage, level)
          },
          confidence_score: 0.5,
          evidence_quality: 'medium',
          extraction_reason: `난이도 선호도 감지: ${level}`
        });
      }
    });

    console.log(`📚 학습 패턴 ${cues.length}개 추출 완료`);
    return cues;
  }

  /**
   * 관심 주제 추출
   */
  private extractTopicInterests(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage } = context;
    
    console.log('🎯 관심 주제 분석 중...');

    // 주제 카테고리 분석
    const topics = {
      'web_development': {
        keywords: ['웹', 'web', 'frontend', 'backend', 'fullstack', 'html', 'css'],
        weight: 1.0
      },
      'mobile_development': {
        keywords: ['앱', 'app', 'mobile', 'ios', 'android', 'react native', 'flutter'],
        weight: 1.2
      },
      'ai_machine_learning': {
        keywords: ['ai', '인공지능', 'machine learning', '머신러닝', 'deep learning', 'ml', '딥러닝'],
        weight: 1.3
      },
      'data_science': {
        keywords: ['데이터', 'data', '분석', 'analytics', 'visualization', '시각화'],
        weight: 1.1
      },
      'devops': {
        keywords: ['배포', 'deploy', 'ci/cd', 'devops', '운영', 'infrastructure'],
        weight: 1.0
      },
      'blockchain': {
        keywords: ['블록체인', 'blockchain', 'crypto', '암호화폐', 'web3', 'defi'],
        weight: 1.4
      },
      'ui_ux': {
        keywords: ['디자인', 'design', 'ui', 'ux', '사용자', 'interface', 'experience'],
        weight: 0.9
      },
      'security': {
        keywords: ['보안', 'security', '인증', 'auth', '권한', 'authentication'],
        weight: 1.2
      },
      'performance': {
        keywords: ['성능', 'performance', '최적화', 'optimization', '속도'],
        weight: 1.0
      }
    };

    const messageText = userMessage.toLowerCase();

    Object.entries(topics).forEach(([topic, config]) => {
      const relevantKeywords = config.keywords.filter(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      
      if (relevantKeywords.length > 0) {
        const interestScore = relevantKeywords.length * config.weight;
        
        cues.push({
          cue_key: `interest_${topic}`,
          cue_type: 'preference',
          cue_category: 'topic_interest',
          cue_data: {
            topic,
            mentioned_keywords: relevantKeywords,
            interest_strength: interestScore,
            interest_context: this.extractInterestContext(messageText, relevantKeywords[0]),
            question_type: this.categorizeQuestionType(userMessage)
          },
          confidence_score: Math.min(0.9, 0.4 + relevantKeywords.length * 0.15),
          evidence_quality: relevantKeywords.length > 2 ? 'high' : 'medium',
          extraction_reason: `주제 관심도: ${relevantKeywords.join(', ')}`
        });
      }
    });

    console.log(`🎯 관심 주제 ${cues.length}개 추출 완료`);
    return cues;
  }

  /**
   * 행동 패턴 추출
   */
  private extractBehaviorPatterns(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage, timestamp } = context;
    
    console.log('🎭 행동 패턴 분석 중...');

    // 시간 패턴 분석
    const hour = timestamp.getHours();
    let timePattern = '';
    if (hour >= 6 && hour < 12) timePattern = 'morning_active';
    else if (hour >= 12 && hour < 18) timePattern = 'afternoon_active';
    else if (hour >= 18 && hour < 22) timePattern = 'evening_active';
    else timePattern = 'night_active';

    cues.push({
      cue_key: `activity_${timePattern}`,
      cue_type: 'behavior',
      cue_category: 'temporal',
      cue_data: {
        time_pattern: timePattern,
        hour,
        activity_context: 'chat_interaction'
      },
      confidence_score: 0.3, // 낮은 신뢰도 (한 번의 데이터로는 패턴이라 할 수 없음)
      evidence_quality: 'low',
      extraction_reason: `${hour}시 활동 기록`
    });

    // 질문 복잡도 패턴
    const questionComplexity = this.analyzeQuestionComplexity(userMessage);
    if (questionComplexity !== 'unknown') {
      cues.push({
        cue_key: `question_complexity_${questionComplexity}`,
        cue_type: 'pattern',
        cue_category: 'cognitive',
        cue_data: {
          complexity_level: questionComplexity,
          message_length: userMessage.length,
          sentence_count: userMessage.split(/[.!?]/).length
        },
        confidence_score: 0.5,
        evidence_quality: 'medium',
        extraction_reason: `질문 복잡도: ${questionComplexity}`
      });
    }

    // 인내심 수준 (재질문, 추가 설명 요청 등)
    const patienceIndicators = ['다시', '또', '계속', '더', '추가로', '그리고', 'more'];
    const patienceLevel = patienceIndicators.filter(indicator => 
      userMessage.includes(indicator)
    ).length;

    if (patienceLevel > 0) {
      cues.push({
        cue_key: 'patience_level',
        cue_type: 'behavior',
        cue_category: 'cognitive',
        cue_data: {
          patience_indicators: patienceLevel,
          wants_deeper_info: true,
          follow_up_tendency: true
        },
        confidence_score: 0.4 + patienceLevel * 0.1,
        evidence_quality: patienceLevel > 2 ? 'high' : 'low',
        extraction_reason: `추가 정보 요청 패턴 감지`
      });
    }

    console.log(`🎭 행동 패턴 ${cues.length}개 추출 완료`);
    return cues;
  }

  /**
   * 문맥적 정보 추출
   */
  private extractContextualInfo(context: ChatContext): ExtractedCue[] {
    const cues: ExtractedCue[] = [];
    const { userMessage, model, conversationId } = context;
    
    console.log('🔍 문맥적 정보 분석 중...');

    // 선호하는 AI 모델 패턴
    if (model) {
      cues.push({
        cue_key: `prefers_model_${model}`,
        cue_type: 'preference',
        cue_category: 'ai_interaction',
        cue_data: {
          model_used: model,
          interaction_context: 'chat',
          conversation_id: conversationId
        },
        confidence_score: 0.3, // 낮은 신뢰도 (단일 사용으로는 선호도 판단 어려움)
        evidence_quality: 'low',
        extraction_reason: `AI 모델 사용: ${model}`
      });
    }

    // 응답 길이 선호도
    const messageLength = userMessage.length;
    let lengthPreference = '';
    if (messageLength < 50) lengthPreference = 'brief';
    else if (messageLength < 200) lengthPreference = 'moderate';
    else lengthPreference = 'detailed';

    cues.push({
      cue_key: `message_length_${lengthPreference}`,
      cue_type: 'behavior',
      cue_category: 'communication',
      cue_data: {
        length_preference: lengthPreference,
        character_count: messageLength,
        communication_style: 'written'
      },
      confidence_score: 0.4,
      evidence_quality: 'medium',
      extraction_reason: `메시지 길이 패턴: ${messageLength}자`
    });

    // 언어 사용 패턴 (한국어/영어 혼용)
    const englishWords = userMessage.match(/[a-zA-Z]+/g) || [];
    const koreanChars = userMessage.match(/[가-힣]/g) || [];
    
    if (englishWords.length > 0 && koreanChars.length > 0) {
      const bilingualRatio = englishWords.length / (englishWords.length + koreanChars.length);
      
      cues.push({
        cue_key: 'bilingual_communication',
        cue_type: 'pattern',
        cue_category: 'language',
        cue_data: {
          english_word_count: englishWords.length,
          korean_char_count: koreanChars.length,
          bilingual_ratio: bilingualRatio,
          mixed_language: true
        },
        confidence_score: 0.6,
        evidence_quality: 'medium',
        extraction_reason: `한영 혼용 패턴 감지`
      });
    }

    console.log(`🔍 문맥적 정보 ${cues.length}개 추출 완료`);
    return cues;
  }

  // ============================================================================
  // 💾 데이터베이스 저장 (DatabaseService 사용)
  // ============================================================================

  /**
   * 추출된 CUE들을 DatabaseService를 통해 저장
   */
  private async saveCuesToDatabase(
    userId: string, 
    cues: ExtractedCue[], 
    context: ChatContext
  ): Promise<ExtractedCue[]> {
    console.log(`💾 === 데이터베이스에 ${cues.length}개 CUE 저장 시작 ===`);
    
    const savedCues: ExtractedCue[] = [];

    for (const cue of cues) {
      try {
        console.log(`💾 CUE 저장 중: ${cue.cue_key} (${cue.cue_type})`);

        // 기존 CUE 확인 (중복 방지 및 업데이트)
        const existingCue = await this.findExistingCue(userId, cue.cue_key, cue.cue_type);

        if (existingCue) {
          // 기존 CUE 업데이트 (강화 학습)
          console.log(`🔄 기존 CUE 업데이트: ${cue.cue_key}`);
          await this.updateExistingCue(existingCue, cue, context);
        } else {
          // 새 CUE 생성
          console.log(`🆕 새 CUE 생성: ${cue.cue_key}`);
          await this.createNewCue(userId, cue, context);
        }

        savedCues.push(cue);
        console.log(`✅ CUE 저장 완료: ${cue.cue_key}`);

      } catch (error) {
        console.error(`❌ CUE 저장 실패 (${cue.cue_key}):`, error);
      }
    }

    console.log(`✅ 총 ${savedCues.length}개 CUE 저장 완료`);
    return savedCues;
  }

  /**
   * 기존 CUE 검색 (DatabaseService 사용)
   */
  private async findExistingCue(
    userId: string, 
    cueKey: string, 
    cueType: string
  ): Promise<any> {
    try {
      // DatabaseService의 getPersonalCue 메서드 사용
      if (this.db && typeof this.db.getPersonalCue === 'function') {
        return await this.db.getPersonalCue(userId, cueKey, cueType);
      }
      return null;
    } catch (error) {
      console.warn(`⚠️ 기존 CUE 검색 실패 (${cueKey}):`, error);
      return null;
    }
  }

  /**
   * 기존 CUE 업데이트 (강화 학습) - DatabaseService 사용
   */
  private async updateExistingCue(
    existingCue: any, 
    newCue: ExtractedCue, 
    context: ChatContext
  ): Promise<void> {
    console.log(`🔄 기존 CUE 강화 학습: ${existingCue.cue_key}`);

    try {
      // 강화 학습 데이터 계산
      const currentConfidence = existingCue.confidence_metrics?.confidence_score || 0.5;
      const newConfidence = newCue.confidence_score;
      
      // 점진적 신뢰도 업데이트 (가중 평균)
      const updatedConfidence = Math.min(0.95, (currentConfidence * 0.7) + (newConfidence * 0.3));
      
      // 사용 빈도 증가
      const currentFrequency = existingCue.temporal_data?.usage_frequency || 0;
      const updatedFrequency = currentFrequency + 1;

      // 업데이트 데이터 구성
      const updateData = {
        cue_data: {
          ...existingCue.cue_data,
          ...newCue.cue_data,
          reinforcement_history: [
            ...(existingCue.cue_data?.reinforcement_history || []),
            {
              timestamp: new Date().toISOString(),
              context: context.userMessage.substring(0, 100),
              confidence_boost: newConfidence - currentConfidence
            }
          ].slice(-10) // 최근 10개만 유지
        },
        confidence_metrics: {
          ...existingCue.confidence_metrics,
          confidence_score: updatedConfidence,
          evidence_count: (existingCue.confidence_metrics?.evidence_count || 1) + 1,
          last_reinforcement: new Date().toISOString(),
          trend_direction: 'stable',
          seasonal_patterns: [],
          context_evolution: []
        },
        source_data: {
          platform_sources: ['ai_chat'],
          extraction_methods: ['real_time_analysis'],
          interaction_ids: [context.conversationId],
          conversation_contexts: [context.userMessage.substring(0, 200)],
          ai_model_sources: [context.model],
          human_feedback: []
        },
        effectiveness_metrics: {
          application_success_rate: 0.0,
          user_feedback_score: 0.0,
          impact_on_satisfaction: 0.0,
          response_quality_improvement: 0.0,
          context_relevance_score: newCue.confidence_score,
          personalization_effectiveness: 0.0
        },
        relationship_data: {
          related_cues: [],
          conflicting_cues: [],
          dependency_chains: [],
          cluster_membership: [newCue.cue_category],
          semantic_similarity: {},
          causal_relationships: []
        },
        status: 'active',
        validation_status: 'unvalidated',
        privacy_level: 'private',
        sharing_permissions: 'none',
        first_observed: existingCue.first_observed || new Date().toISOString(),
        last_reinforced: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // DatabaseService를 통한 업데이트
      if (this.db && typeof this.db.updatePersonalCue === 'function') {
        await this.db.updatePersonalCue(existingCue.id, updateData);
      } else {
        console.warn('⚠️ updatePersonalCue 메서드를 찾을 수 없음');
      }
      
      console.log(`✅ CUE 강화 완료: ${existingCue.cue_key} (신뢰도: ${currentConfidence.toFixed(3)} → ${updatedConfidence.toFixed(3)})`);

    } catch (error) {
      console.error(`❌ CUE 업데이트 실패 (${existingCue.cue_key}):`, error);
      throw error;
    }
  }

  /**
   * 새 CUE 생성 - DatabaseService 사용
   */
  private async createNewCue(
    userId: string, 
    cue: ExtractedCue, 
    context: ChatContext
  ): Promise<void> {
    console.log(`🆕 새 CUE 생성: ${cue.cue_key}`);

    try {
      const cueData = {
        user_id: userId,
        cue_key: cue.cue_key,
        cue_type: cue.cue_type,
        cue_category: cue.cue_category,
        cue_data: {
          ...cue.cue_data,
          extraction_context: {
            conversation_id: context.conversationId,
            model_used: context.model,
            extraction_timestamp: context.timestamp.toISOString(),
            user_message_preview: context.userMessage.substring(0, 100)
          },
          creation_metadata: {
            extractor_version: '2.0',
            extraction_reason: cue.extraction_reason,
            initial_confidence: cue.confidence_score
          }
        },
        confidence_metrics: {
          confidence_score: cue.confidence_score,
          evidence_count: 1,
          evidence_quality: cue.evidence_quality,
          reliability_score: cue.confidence_score,
          source_diversity: 1,
          temporal_consistency: 0.5,
          validation_status: 'unvalidated'
        },
        application_rules: {
          applicable_contexts: [cue.cue_category],
          context_specificity: 'general',
          priority_level: Math.floor(cue.confidence_score * 10),
          activation_threshold: Math.max(0.3, cue.confidence_score - 0.2),
          combination_rules: [],
          exclusion_rules: [],
          temporal_relevance: 'permanent'
        },
        temporal_data: {
          usage_frequency: 1.0,
          decay_rate: 0.02,
          reinforcement_schedule: 'variable',
          last_reinforcement: new Date().toISOString(),
          prediction_accuracy: 0.0,
          adaptation_rate: 0.1,
          context_evolution: []
        },
        source_data: {
          platform_sources: ['ai_chat'],
          extraction_methods: ['real_time_analysis'],
          interaction_ids: [context.conversationId],
          conversation_contexts: [context.userMessage.substring(0, 200)],
          ai_model_sources: [context.model],
          human_feedback: []
        },
        effectiveness_metrics: {
          application_success_rate: 0.0,
          user_feedback_score: 0.0,
          impact_on_satisfaction: 0.0,
          response_quality_improvement: 0.0,
          context_relevance_score: cue.confidence_score,
          personalization_effectiveness: 0.0
        },
        relationship_data: {
          related_cues: [],
          conflicting_cues: [],
          dependency_chains: [],
          cluster_membership: [cue.cue_category],
          semantic_similarity: {},
          causal_relationships: []
        },
        status: 'active',
        validation_status: 'unvalidated',
        privacy_level: 'private',
        sharing_permissions: 'none',
        first_observed: new Date().toISOString(),
        last_reinforced: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // DatabaseService를 통한 저장
      if (this.db && typeof this.db.savePersonalCue === 'function') {
        await this.db.savePersonalCue(cueData);
      } else if (this.db && typeof this.db.createPersonalCue === 'function') {
        await this.db.createPersonalCue(cueData);
      } else {
        console.log('📝 CUE 저장 스킵 (DB 메소드 없음):', cue.cue_key);
      }
      
      console.log(`✅ 새 CUE 생성 완료: ${cue.cue_key} (신뢰도: ${cue.confidence_score.toFixed(3)})`);

    } catch (error) {
      console.error(`❌ 새 CUE 생성 실패 (${cue.cue_key}):`, error);
      throw error;
    }
  }

  // ============================================================================
  // 🔧 헬퍼 메서드들
  // ============================================================================

  /**
   * 문장 맥락 추출
   */
  private extractSentenceContext(text: string, keyword: string): string {
    const sentences = text.split(/[.!?]/);
    const relevantSentence = sentences.find(sentence => 
      sentence.toLowerCase().includes(keyword.toLowerCase())
    );
    return relevantSentence?.trim() || text.substring(0, 100);
  }

  /**
   * 긍정적 맥락 판별
   */
  private isPositiveContext(text: string, keyword: string): boolean {
    const context = this.extractSentenceContext(text, keyword);
    const positiveWords = ['좋아', '선호', '추천', '좋은', '최고', '훌륭', '좋아요', 'like', 'prefer', 'love'];
    const negativeWords = ['싫어', '안좋아', '별로', '나쁜', '문제', '어려워', 'hate', 'dislike', 'bad'];
    
    const positiveCount = positiveWords.filter(word => context.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => context.toLowerCase().includes(word)).length;
    
    return positiveCount > negativeCount;
  }

  /**
   * 관심 맥락 추출
   */
  private extractInterestContext(text: string, keyword: string): string {
    const context = this.extractSentenceContext(text, keyword);
    if (context.includes('배우고') || context.includes('learn')) return 'learning_intent';
    if (context.includes('사용하고') || context.includes('use')) return 'usage_intent';
    if (context.includes('알고싶어') || context.includes('want to know')) return 'curiosity';
    if (context.includes('질문') || context.includes('question')) return 'inquiry';
    return 'general_interest';
  }

  /**
   * 질문 유형 분류
   */
  private categorizeQuestionType(message: string): string {
    if (message.includes('어떻게') || message.includes('how')) return 'how_to';
    if (message.includes('왜') || message.includes('why')) return 'why';
    if (message.includes('무엇') || message.includes('what')) return 'what';
    if (message.includes('언제') || message.includes('when')) return 'when';
    if (message.includes('어디') || message.includes('where')) return 'where';
    if (message.endsWith('?')) return 'direct_question';
    return 'general';
  }

  /**
   * 질문 복잡도 분석
   */
  private analyzeQuestionComplexity(message: string): string {
    const words = message.split(/\s+/);
    const sentences = message.split(/[.!?]/).filter(s => s.trim().length > 0);
    const questionMarks = (message.match(/\?/g) || []).length;
    
    if (words.length < 10 && sentences.length === 1) return 'simple';
    if (words.length < 30 && sentences.length <= 2) return 'moderate';
    if (words.length >= 30 || sentences.length > 2 || questionMarks > 1) return 'complex';
    return 'unknown';
  }

  // ============================================================================
  // 📊 통계 및 분석 메서드
  // ============================================================================

  /**
   * 추출 성능 분석
   */
  public async analyzeExtractionPerformance(userId: string): Promise<any> {
    console.log(`📊 CUE 추출 성능 분석: ${userId}`);

    try {
      await this.initialize();
      
      const allCues = await this.db.getPersonalCues(userId, 1000);
      
      const performance = {
        totalCues: allCues.length,
        byCategory: this.groupByCategory(allCues),
        byType: this.groupByType(allCues),
        confidenceDistribution: this.analyzeConfidenceDistribution(allCues),
        recentExtractions: this.analyzeRecentExtractions(allCues),
        extractionTrends: this.analyzeExtractionTrends(allCues),
        qualityMetrics: this.calculateQualityMetrics(allCues)
      };

      console.log(`✅ 추출 성능 분석 완료: ${performance.totalCues}개 CUE 분석`);
      return performance;

    } catch (error) {
      console.error('❌ 추출 성능 분석 실패:', error);
      throw error;
    }
  }

  private groupByCategory(cues: any[]): any {
    const groups: { [key: string]: number } = {};
    cues.forEach(cue => {
      groups[cue.cue_category] = (groups[cue.cue_category] || 0) + 1;
    });
    return groups;
  }

  private groupByType(cues: any[]): any {
    const groups: { [key: string]: number } = {};
    cues.forEach(cue => {
      groups[cue.cue_type] = (groups[cue.cue_type] || 0) + 1;
    });
    return groups;
  }

  private analyzeConfidenceDistribution(cues: any[]): any {
    const confidences = cues.map(cue => 
      cue.confidence_metrics?.confidence_score || 0.5
    );

    return {
      average: confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length,
      median: this.calculateMedian(confidences),
      high: confidences.filter(conf => conf > 0.8).length,
      medium: confidences.filter(conf => conf >= 0.5 && conf <= 0.8).length,
      low: confidences.filter(conf => conf < 0.5).length
    };
  }

  private analyzeRecentExtractions(cues: any[]): any {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentDay = cues.filter(cue => 
      new Date(cue.created_at) > oneDayAgo
    );
    const recentWeek = cues.filter(cue => 
      new Date(cue.created_at) > oneWeekAgo
    );

    return {
      last24Hours: recentDay.length,
      last7Days: recentWeek.length,
      dailyAverage: recentWeek.length / 7,
      extractionRate: recentDay.length > 0 ? 'active' : 'low'
    };
  }

  private analyzeExtractionTrends(cues: any[]): any {
    // 시간대별 추출 패턴 분석
    const hourlyDistribution: { [key: number]: number } = {};
    
    cues.forEach(cue => {
      const hour = new Date(cue.created_at).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourlyDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      hourlyDistribution,
      peakHours,
      mostActiveTime: peakHours[0] || 'unknown'
    };
  }

  private calculateQualityMetrics(cues: any[]): any {
    const highQualityCues = cues.filter(cue => 
      cue.confidence_metrics?.evidence_quality === 'high'
    );
    const mediumQualityCues = cues.filter(cue => 
      cue.confidence_metrics?.evidence_quality === 'medium'
    );

    return {
      qualityDistribution: {
        high: highQualityCues.length,
        medium: mediumQualityCues.length,
        low: cues.length - highQualityCues.length - mediumQualityCues.length
      },
      averageQuality: this.calculateAverageQuality(cues),
      improvementSuggestions: this.generateQualityImprovement(cues)
    };
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  private calculateAverageQuality(cues: any[]): number {
    const qualityScores = cues.map(cue => {
      const quality = cue.confidence_metrics?.evidence_quality;
      if (quality === 'high') return 1.0;
      if (quality === 'medium') return 0.6;
      return 0.3;
    });

    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  private generateQualityImprovement(cues: any[]): string[] {
    const suggestions: string[] = [];
    
    const lowQualityCount = cues.filter(cue => 
      cue.confidence_metrics?.evidence_quality === 'low'
    ).length;

    const lowConfidenceCount = cues.filter(cue => 
      (cue.confidence_metrics?.confidence_score || 0.5) < 0.5
    ).length;

    if (lowQualityCount > cues.length * 0.3) {
      suggestions.push('더 구체적이고 명확한 질문을 해보세요');
    }

    if (lowConfidenceCount > cues.length * 0.4) {
      suggestions.push('일관된 행동 패턴을 보여 신뢰도를 높이세요');
    }

    if (cues.length < 20) {
      suggestions.push('더 많은 대화를 통해 개인화 학습을 향상시키세요');
    }

    return suggestions;
  }

  // ============================================================================
  // 🔧 유틸리티 메서드
  // ============================================================================

  /**
   * 추출기 상태 확인
   */
  public getExtractorStatus(): any {
    return {
      serviceName: 'PersonalCueExtractor',
      initialized: this.isInitialized,
      databaseConnected: this.db.isConnected(),
      version: '2.0.0',
      capabilities: [
        'technical_preferences',
        'communication_style',
        'learning_patterns',
        'topic_interests',
        'behavior_patterns',
        'contextual_info'
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 배치 CUE 추출 (여러 대화 동시 처리)
   */
  public async extractBatchCues(
    userId: string, 
    contexts: ChatContext[]
  ): Promise<ExtractedCue[]> {
    console.log(`🧠 배치 CUE 추출 시작: ${contexts.length}개 대화`);

    const allExtractedCues: ExtractedCue[] = [];

    for (const context of contexts) {
      try {
        const cues = await this.extractAndStoreCues(userId, context);
        allExtractedCues.push(...cues);
      } catch (error) {
        console.error(`❌ 배치 처리 중 오류 (대화 ${context.conversationId}):`, error);
      }
    }

    console.log(`✅ 배치 CUE 추출 완료: 총 ${allExtractedCues.length}개 CUE`);
    return allExtractedCues;
  }

  /**
   * CUE 품질 검증
   */
  public validateCueQuality(cue: ExtractedCue): boolean {
    // 최소 신뢰도 기준
    if (cue.confidence_score < 0.3) return false;
    
    // 필수 데이터 확인
    if (!cue.cue_key || !cue.cue_type || !cue.cue_category) return false;
    
    // 추출 이유 확인
    if (!cue.extraction_reason || cue.extraction_reason.length < 5) return false;
    
    return true;
  }

  /**
   * 중복 CUE 감지
   */
  public detectDuplicateCues(cues: ExtractedCue[]): ExtractedCue[] {
    const seen = new Set<string>();
    return cues.filter(cue => {
      const key = `${cue.cue_key}_${cue.cue_type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * CUE 추출 통계
   */
  public async getExtractionStats(userId: string): Promise<any> {
    try {
      if (this.db && typeof this.db.getPersonalCues === 'function') {
        const cues = await this.db.getPersonalCues(userId);
        return {
          totalCues: cues.length,
          categories: this.groupByCategory(cues)
        };
      }
      return { totalCues: 0, categories: {} };
    } catch (error) {
      console.error('❌ CUE 통계 조회 실패:', error);
      return { totalCues: 0, categories: {} };
    }
  }

  /**
   * 서비스 정리 (DI Container에서 호출)
   */
  public dispose(): void {
    console.log('🧹 PersonalCueExtractor 정리 중...');
    this.isInitialized = false;
    console.log('✅ PersonalCueExtractor 정리 완료');
  }
}