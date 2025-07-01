// ============================================================================
// 📡 src/services/socket/SocketService.ts - 실시간 통신 서비스
// ============================================================================
// Socket.IO를 사용하여 실시간 통신을 처리하는 서비스입니다.
// 이 서비스는 사용자 연결 관리, CUE 마이닝 알림, AI 채팅 상태 전송,
// 데이터 추출 진행상황 업데이트 등을 담당합니다.

// ============================================================================

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../database/DatabaseService';

export class SocketService {
  private io: Server;
  private db: DatabaseService;
  private connectedUsers: Map<string, { socketId: string; userDid: string; username: string }> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.db = DatabaseService.getInstance();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // 사용자 연결 등록
      socket.on('user:register', (data) => {
        this.registerUser(socket, data);
      });

      // CUE 마이닝 실시간 알림
      socket.on('cue:mine', (data) => {
        this.handleCueMining(socket, data);
      });

      // AI 채팅 상태 실시간 전송
      socket.on('chat:typing', (data) => {
        this.handleTypingStatus(socket, data);
      });

      // 데이터 추출 진행상황 실시간 전송
      socket.on('extraction:progress', (data) => {
        this.handleExtractionProgress(socket, data);
      });

      // 연결 해제
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async authenticateSocket(socket: any, next: Function) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.userDid = decoded.did;
      socket.username = decoded.username;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  }

  private registerUser(socket: any, data: any): void {
    const userInfo = {
      socketId: socket.id,
      userDid: socket.userDid,
      username: socket.username
    };

    this.connectedUsers.set(socket.userDid, userInfo);
    
    // 사용자에게 연결 확인 전송
    socket.emit('connection:confirmed', {
      success: true,
      userDid: socket.userDid,
      connectedUsers: this.connectedUsers.size
    });

    console.log(`✅ User registered: ${socket.username} (${socket.userDid})`);
  }

  private async handleCueMining(socket: any, data: any): Promise<void> {
    try {
      // CUE 마이닝 실시간 알림
      const miningData = {
        userDid: socket.userDid,
        amount: data.amount,
        source: data.source,
        timestamp: new Date().toISOString()
      };

      // 해당 사용자에게 마이닝 완료 알림
      socket.emit('cue:mined', {
        success: true,
        ...miningData,
        message: `💎 ${data.amount} CUE tokens mined from ${data.source}!`
      });

      // 시스템 로그 저장
      await this.db.createSystemLog({
        user_did: socket.userDid,
        level: 'info',
        service: 'socket',
        action: 'cue_mining_notification',
        message: `CUE mining notification sent: ${data.amount} tokens`,
        details: miningData
      });

    } catch (error) {
      console.error('Handle CUE mining error:', error);
      socket.emit('cue:error', {
        success: false,
        error: 'Failed to process CUE mining'
      });
    }
  }

  private handleTypingStatus(socket: any, data: any): void {
    // 타이핑 상태를 다른 참여자들에게 브로드캐스트
    // (현재는 개인용이므로 구현하지 않음, 추후 다중 사용자 채팅 시 사용)
    socket.emit('chat:typing:ack', {
      success: true,
      timestamp: new Date().toISOString()
    });
  }

  private handleExtractionProgress(socket: any, data: any): void {
    // 데이터 추출 진행상황 실시간 업데이트
    socket.emit('extraction:progress:update', {
      step: data.step,
      progress: data.progress,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnect(socket: any): void {
    if (socket.userDid) {
      this.connectedUsers.delete(socket.userDid);
      console.log(`❌ User disconnected: ${socket.username} (${socket.userDid})`);
    }
  }

  // 특정 사용자에게 메시지 전송
  public sendToUser(userDid: string, event: string, data: any): void {
    const userInfo = this.connectedUsers.get(userDid);
    if (userInfo) {
      this.io.to(userInfo.socketId).emit(event, data);
    }
  }

  // 모든 연결된 사용자에게 브로드캐스트
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // 특정 사용자의 CUE 밸런스 업데이트 알림
  public notifyCueBalanceUpdate(userDid: string, newBalance: number, change: number): void {
    this.sendToUser(userDid, 'cue:balance:updated', {
      newBalance,
      change,
      timestamp: new Date().toISOString()
    });
  }

  // AI 응답 실시간 스트리밍 (추후 구현)
  public streamAIResponse(userDid: string, chunk: string): void {
    this.sendToUser(userDid, 'ai:response:chunk', {
      chunk,
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================================================
// 🔧 src/services/ai/SemanticCompressionService.ts - 완전한 구현
// ============================================================================

export class SemanticCompressionService {
  private readonly DEFAULT_COMPRESSION_RATIO = 0.15; // 85% 압축, 15% 유지
  private readonly MIN_SEMANTIC_PRESERVATION = 0.85; // 최소 85% 의미 보존

  /**
   * 텍스트 컨텐츠를 의미적으로 압축합니다
   */
  async compressContent(content: string, targetRatio = this.DEFAULT_COMPRESSION_RATIO): Promise<{
    compressedContent: string;
    compressionRatio: number;
    semanticPreservation: number;
    keywords: string[];
    entities: any[];
    topics: string[];
  }> {
    
    try {
      // 1. 키워드 추출
      const keywords = this.extractKeywords(content);
      
      // 2. Named Entity Recognition
      const entities = this.extractEntities(content);
      
      // 3. 토픽 추출
      const topics = this.extractTopics(content);
      
      // 4. 의미적 압축 수행
      const compressedContent = this.performSemanticCompression(
        content, 
        keywords, 
        entities, 
        topics, 
        targetRatio
      );
      
      // 5. 압축률 및 의미 보존율 계산
      const compressionRatio = compressedContent.length / content.length;
      const semanticPreservation = this.calculateSemanticPreservation(
        content, 
        compressedContent, 
        keywords, 
        entities
      );

      return {
        compressedContent,
        compressionRatio: Math.round(compressionRatio * 10000) / 10000,
        semanticPreservation: Math.round(semanticPreservation * 10000) / 10000,
        keywords: keywords.slice(0, 10),
        entities,
        topics: topics.slice(0, 5)
      };

    } catch (error) {
      console.error('Content compression error:', error);
      throw new Error('Failed to compress content');
    }
  }

  /**
   * 대화를 분석하고 저장 여부를 결정합니다
   */
  async analyzeConversation(userMessage: string, aiResponse: string) {
    const fullConversation = `User: ${userMessage}\nAI: ${aiResponse}`;
    
    // 저장할 가치가 있는지 판단
    const shouldStore = this.shouldStoreConversation(userMessage, aiResponse);
    
    if (!shouldStore) {
      return { shouldStore: false };
    }

    try {
      // 대화 압축
      const compressionResult = await this.compressContent(fullConversation);
      
      // 감정 분석
      const sentiment = this.analyzeSentiment(userMessage);
      
      // 중요도 계산
      const importance = this.calculateImportance(userMessage, aiResponse);
      
      // CUE 값 계산
      const cueValue = this.calculateCUEValue(compressionResult, importance);

      return {
        shouldStore: true,
        ...compressionResult,
        sentiment,
        importance,
        cueValue
      };

    } catch (error) {
      console.error('Conversation analysis error:', error);
      return { shouldStore: false };
    }
  }

  /**
   * 키워드를 추출합니다
   */
  private extractKeywords(content: string): string[] {
    // 텍스트 전처리
    const words = content.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));

    // 빈도수 계산
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // TF-IDF 간단 구현 (빈도수 기반)
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);
  }

  /**
   * Named Entity를 추출합니다
   */
  private extractEntities(content: string): any[] {
    const entities: any[] = [];
    
    // 이메일 추출
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emails.forEach(email => entities.push({ type: 'email', value: email }));
    
    // URL 추출
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    urls.forEach(url => entities.push({ type: 'url', value: url }));
    
    // 날짜 추출 (ISO 형식)
    const dates = content.match(/\d{4}-\d{2}-\d{2}/g) || [];
    dates.forEach(date => entities.push({ type: 'date', value: date }));
    
    // 숫자 추출 (버전, ID 등)
    const numbers = content.match(/\b\d+\.\d+\b|\b\d+\b/g) || [];
    numbers.slice(0, 5).forEach(num => entities.push({ type: 'number', value: num }));

    // 코드 블록 추출
    const codeBlocks = content.match(/```[\s\S]*?```|`[^`]+`/g) || [];
    codeBlocks.forEach(code => entities.push({ type: 'code', value: code }));

    return entities;
  }

  /**
   * 토픽을 추출합니다
   */
  private extractTopics(content: string): string[] {
    const topicKeywords = {
      'technology': ['ai', 'api', 'code', 'programming', 'software', 'system', 'database', 'algorithm', 'tech', '개발', '시스템', '알고리즘'],
      'business': ['strategy', 'marketing', 'sales', 'revenue', 'customer', 'product', '비즈니스', '전략', '마케팅'],
      'personal': ['learning', 'personality', 'communication', 'decision', 'preference', '학습', '성격', '소통'],
      'education': ['learn', 'study', 'teach', 'knowledge', 'skill', 'course', '교육', '학습', '지식'],
      'creativity': ['design', 'creative', 'art', 'music', 'writing', '디자인', '창의적', '예술'],
      'health': ['health', 'fitness', 'medical', 'wellness', '건강', '의료', '웰니스'],
      'finance': ['money', 'investment', 'financial', 'economy', '금융', '투자', '경제']
    };
    
    const lowerContent = content.toLowerCase();
    const foundTopics: string[] = [];
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const hasKeyword = keywords.some(keyword => lowerContent.includes(keyword));
      if (hasKeyword) {
        foundTopics.push(topic);
      }
    });

    return foundTopics;
  }

  /**
   * 의미적 압축을 수행합니다
   */
  private performSemanticCompression(
    content: string, 
    keywords: string[], 
    entities: any[], 
    topics: string[], 
    targetRatio: number
  ): string {
    // 문장 단위로 분할
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 1) {
      return content; // 문장이 하나면 압축하지 않음
    }

    // 각 문장의 중요도 계산
    const sentenceScores = sentences.map(sentence => {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      // 키워드 포함 점수 (가중치 2)
      keywords.forEach(keyword => {
        if (lowerSentence.includes(keyword)) score += 2;
      });
      
      // 엔티티 포함 점수 (가중치 3)
      entities.forEach(entity => {
        if (lowerSentence.includes(entity.value.toLowerCase())) score += 3;
      });
      
      // 토픽 관련 점수 (가중치 1)
      topics.forEach(topic => {
        if (lowerSentence.includes(topic)) score += 1;
      });
      
      // 문장 길이 점수 (너무 짧거나 긴 문장 패널티)
      const lengthScore = sentence.length > 20 && sentence.length < 200 ? 1 : 0;
      score += lengthScore;
      
      return { sentence: sentence.trim(), score };
    });

    // 점수순으로 정렬하고 목표 비율만큼 선택
    const targetSentenceCount = Math.max(1, Math.floor(sentences.length * targetRatio));
    const selectedSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, targetSentenceCount)
      .map(item => item.sentence);

    // 원본 순서 복원
    const orderedSentences = sentences.filter(sentence => 
      selectedSentences.some(selected => selected.includes(sentence.trim()))
    );

    return orderedSentences.join('. ') + '.';
  }

  /**
   * 의미 보존율을 계산합니다
   */
  private calculateSemanticPreservation(
    original: string, 
    compressed: string, 
    keywords: string[], 
    entities: any[]
  ): number {
    const lowerOriginal = original.toLowerCase();
    const lowerCompressed = compressed.toLowerCase();
    
    // 키워드 보존율
    const preservedKeywords = keywords.filter(keyword => lowerCompressed.includes(keyword));
    const keywordPreservation = keywords.length > 0 ? preservedKeywords.length / keywords.length : 1;
    
    // 엔티티 보존율
    const preservedEntities = entities.filter(entity => 
      lowerCompressed.includes(entity.value.toLowerCase())
    );
    const entityPreservation = entities.length > 0 ? preservedEntities.length / entities.length : 1;
    
    // 전체 의미 보존율 (키워드 70%, 엔티티 30%)
    return (keywordPreservation * 0.7) + (entityPreservation * 0.3);
  }

  /**
   * 대화 저장 여부를 결정합니다
   */
  private shouldStoreConversation(userMessage: string, aiResponse: string): boolean {
    // 최소 길이 체크
    if (userMessage.length < 5 || aiResponse.length < 10) return false;
    
    // 인사말이나 단순 응답 필터링
    const greetings = ['hello', 'hi', 'hey', 'thanks', 'thank you', 'bye', 'goodbye', '안녕', '감사', '고마워'];
    const lowerMessage = userMessage.toLowerCase();
    
    if (greetings.some(greeting => lowerMessage.includes(greeting)) && userMessage.length < 30) {
      return false;
    }

    // 의미있는 내용 체크
    const meaningfulWords = userMessage.split(/\s+/).filter(word => word.length > 2);
    if (meaningfulWords.length < 3) return false;

    return true;
  }

  /**
   * 감정 분석을 수행합니다
   */
  private analyzeSentiment(content: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'happy', 'wonderful', 'fantastic', '좋은', '훌륭한', '멋진', '행복한'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', '나쁜', '끔찍한', '화난', '슬픈'];
    
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      const matches = (lowerContent.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    });
    
    negativeWords.forEach(word => {
      const matches = (lowerContent.match(new RegExp(word, 'g')) || []).length;
      score -= matches;
    });
    
    // -1 to 1 범위로 정규화
    return Math.max(-1, Math.min(1, score / 10));
  }

  /**
   * 컨텐츠 중요도를 계산합니다
   */
  private calculateImportance(userMessage: string, aiResponse: string): number {
    let importance = 0.3; // 기본 중요도
    
    // 메시지 길이 기반 (최대 0.3)
    const lengthScore = Math.min((userMessage.length + aiResponse.length) / 1000, 0.3);
    importance += lengthScore;
    
    // 기술적 내용 포함 (0.2)
    const techTerms = ['api', 'code', 'algorithm', 'system', 'data', 'ai', 'ml', 'programming', '개발', '시스템', '알고리즘'];
    const hasTechContent = techTerms.some(term => 
      userMessage.toLowerCase().includes(term) || aiResponse.toLowerCase().includes(term)
    );
    if (hasTechContent) importance += 0.2;
    
    // 질문 포함 (0.2)
    const hasQuestion = userMessage.includes('?') || 
                       /how|what|why|when|where|어떻게|무엇|왜|언제|어디/.test(userMessage.toLowerCase());
    if (hasQuestion) importance += 0.2;
    
    // 학습 관련 내용 (0.2)
    const learningTerms = ['learn', 'study', 'understand', 'explain', 'teach', '학습', '공부', '이해', '설명'];
    const hasLearningContent = learningTerms.some(term => 
      userMessage.toLowerCase().includes(term)
    );
    if (hasLearningContent) importance += 0.2;
    
    return Math.min(importance, 1.0);
  }

  /**
   * CUE 값을 계산합니다
   */
  private calculateCUEValue(compressionResult: any, importance: number): number {
    // 압축 효율성
    const compressionEfficiency = 1 - compressionResult.compressionRatio;
    
    // 의미 보존 품질
    const semanticQuality = compressionResult.semanticPreservation;
    
    // 키워드 풍부도
    const keywordRichness = Math.min(compressionResult.keywords.length / 10, 1);
    
    // 최종 CUE 값 계산
    const cueValue = (
      compressionEfficiency * 0.4 +
      semanticQuality * 0.4 +
      importance * 0.1 +
      keywordRichness * 0.1
    ) * 10; // 0-10 범위로 스케일링
    
    return Math.round(cueValue * 100) / 100;
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
      'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
      'then', 'once', 'very', 'also', 'just', 'now', 'here', 'there', 'when', 'where',
      
      // 한국어 불용어
      '은', '는', '이', '가', '을', '를', '의', '와', '과', '에', '에서', '로', '으로', 
      '까지', '부터', '보다', '처럼', '같이', '하고', '하지만', '그리고', '또는', '또한',
      '그런데', '하지만', '있다', '없다', '이다', '아니다', '한다', '된다', '있는', '없는',
      '그것', '이것', '저것', '여기', '저기', '어디', '언제', '어떻게', '무엇', '누구'
    ];
    
    return stopWords.includes(word);
  }
}