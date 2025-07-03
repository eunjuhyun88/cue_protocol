// ============================================================================
// 🧠 벡터 임베딩 서비스 (실제 구현)
// 경로: backend/src/services/ai/EmbeddingService.ts
// 목적: 텍스트를 벡터로 변환하여 의미적 검색 가능하게 함
// ============================================================================

export class EmbeddingService {
  private static instance: EmbeddingService;
  private openaiClient: any = null;
  private isInitialized: boolean = false;

  private constructor() {
    console.log('🧠 EmbeddingService 초기화 시작...');
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * OpenAI 클라이언트 초기화 (지연 로딩)
   */
  private async initializeOpenAI(): Promise<void> {
    if (this.isInitialized) return;

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-openai-key-here') {
      console.log('⚠️ OpenAI API 키가 설정되지 않음 - 로컬 임베딩 사용');
      this.isInitialized = true;
      return;
    }

    try {
      console.log('🔄 OpenAI 클라이언트 동적 로딩...');
      const { default: OpenAI } = await import('openai');
      
      this.openaiClient = new OpenAI({ apiKey });
      this.isInitialized = true;
      
      console.log('✅ OpenAI 임베딩 클라이언트 초기화 완료');
    } catch (error) {
      console.error('❌ OpenAI 클라이언트 초기화 실패:', error);
      this.isInitialized = true; // 로컬 모드로 계속
    }
  }

  /**
   * 텍스트를 벡터로 변환 (OpenAI Ada-002 또는 로컬)
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    console.log(`🧠 임베딩 생성 시작: "${text.substring(0, 100)}..."`);
    
    await this.initializeOpenAI();

    // 입력 검증
    if (!text || text.trim().length === 0) {
      console.warn('⚠️ 빈 텍스트, 기본 벡터 반환');
      return this.generateDefaultEmbedding();
    }

    // 텍스트 전처리
    const cleanText = this.preprocessText(text);
    console.log(`📝 전처리된 텍스트 길이: ${cleanText.length}자`);

    try {
      if (this.openaiClient) {
        return await this.generateOpenAIEmbedding(cleanText);
      } else {
        return await this.generateLocalEmbedding(cleanText);
      }
    } catch (error) {
      console.error('❌ 임베딩 생성 실패, 로컬 모드로 fallback:', error);
      return await this.generateLocalEmbedding(cleanText);
    }
  }

  /**
   * OpenAI API를 사용한 임베딩 생성
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    console.log('🔄 OpenAI Ada-002로 임베딩 생성 중...');
    
    try {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
        encoding_format: 'float'
      });

      const embedding = response.data[0].embedding;
      console.log(`✅ OpenAI 임베딩 생성 완료: ${embedding.length}차원`);
      
      return embedding;
    } catch (error) {
      console.error('❌ OpenAI 임베딩 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 로컬 임베딩 생성 (간단한 TF-IDF 기반)
   */
  private async generateLocalEmbedding(text: string): Promise<number[]> {
    console.log('🏠 로컬 임베딩 생성 중...');
    
    try {
      // 간단한 단어 빈도 기반 임베딩 (768차원으로 맞춤)
      const words = text.toLowerCase().split(/\s+/);
      const wordCounts = new Map<string, number>();
      
      // 단어 빈도 계산
      words.forEach(word => {
        const cleaned = word.replace(/[^\w]/g, '');
        if (cleaned.length > 0) {
          wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1);
        }
      });

      // 768차원 벡터 생성
      const embedding = new Array(768).fill(0);
      
      // 단어들을 해시하여 벡터의 다른 위치에 분산 배치
      Array.from(wordCounts.entries()).forEach(([word, count]) => {
        const hash = this.simpleHash(word);
        const indices = [
          hash % 768,
          (hash * 17) % 768,
          (hash * 31) % 768
        ];
        
        indices.forEach(index => {
          embedding[index] += count / words.length;
        });
      });

      // 정규화
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        for (let i = 0; i < embedding.length; i++) {
          embedding[i] /= magnitude;
        }
      }

      console.log(`✅ 로컬 임베딩 생성 완료: ${embedding.length}차원`);
      return embedding;
    } catch (error) {
      console.error('❌ 로컬 임베딩 생성 실패:', error);
      return this.generateDefaultEmbedding();
    }
  }

  /**
   * 배치 임베딩 생성 (여러 텍스트 동시 처리)
   */
  public async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`🧠 배치 임베딩 생성 시작: ${texts.length}개 텍스트`);
    
    if (texts.length === 0) {
      console.warn('⚠️ 빈 텍스트 배열');
      return [];
    }

    try {
      const embeddings = await Promise.all(
        texts.map(text => this.generateEmbedding(text))
      );
      
      console.log(`✅ 배치 임베딩 생성 완료: ${embeddings.length}개`);
      return embeddings;
    } catch (error) {
      console.error('❌ 배치 임베딩 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 코사인 유사도 계산
   */
  public calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      console.warn('⚠️ 벡터 차원이 다름');
      return 0;
    }

    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    const similarity = dotProduct / (magnitudeA * magnitudeB);
    return Math.max(-1, Math.min(1, similarity)); // -1과 1 사이로 제한
  }

  /**
   * 텍스트 전처리
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ') // 특수문자 제거, 한글 유지
      .replace(/\s+/g, ' ') // 연속 공백 제거
      .trim()
      .substring(0, 8000); // 길이 제한 (OpenAI 제한)
  }

  /**
   * 간단한 해시 함수
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash);
  }

  /**
   * 기본 임베딩 생성 (오류 시 fallback)
   */
  private generateDefaultEmbedding(): number[] {
    console.log('🔄 기본 임베딩 생성');
    const embedding = new Array(768).fill(0);
    // 무작위 값으로 초기화 (작은 값들)
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = (Math.random() - 0.5) * 0.1;
    }
    return embedding;
  }

  /**
   * 임베딩 캐시 관리 (메모리 기반)
   */
  private embeddingCache = new Map<string, number[]>();
  private readonly CACHE_SIZE_LIMIT = 1000;

  public async generateEmbeddingWithCache(text: string): Promise<number[]> {
    const cacheKey = this.simpleHash(text).toString();
    
    // 캐시에서 확인
    if (this.embeddingCache.has(cacheKey)) {
      console.log('📦 캐시에서 임베딩 반환');
      return this.embeddingCache.get(cacheKey)!;
    }

    // 새로 생성
    const embedding = await this.generateEmbedding(text);
    
    // 캐시 크기 관리
    if (this.embeddingCache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    
    // 캐시에 저장
    this.embeddingCache.set(cacheKey, embedding);
    
    return embedding;
  }

  /**
   * 캐시 상태 확인
   */
  public getCacheStats(): any {
    return {
      size: this.embeddingCache.size,
      limit: this.CACHE_SIZE_LIMIT,
      hitRate: 0, // 실제 구현시 hit rate 계산
      memoryUsage: this.embeddingCache.size * 768 * 8 // 대략적인 메모리 사용량
    };
  }
}