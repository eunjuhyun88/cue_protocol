// ============================================================================
// 🦙 정리된 Ollama 전용 AI 서비스
// 위치: backend/src/services/ai/OllamaAIService.ts
// 목적: Ollama만 지원, 클라우드 AI 코드 완전 제거
// ============================================================================

import axios, { AxiosInstance } from 'axios';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
  processingTime: number;
  confidence: number;
  metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    modelSize?: string;
    quantization?: string;
    error?: string;
    fallback?: boolean;
  };
}

export interface AIModel {
  id: string;
  name: string;
  available: boolean;
  type: 'chat' | 'code' | 'reasoning' | 'embedding';
  size: string;
  description: string;
  recommended?: boolean;
}

/**
 * Ollama 전용 AI 서비스
 * - OpenAI, Claude, Gemini 코드 완전 제거
 * - Ollama 서버와만 통신
 * - 현재 설치된 모델들 최대 활용
 */
export class OllamaAIService {
  private client: AxiosInstance;
  private baseURL: string;
  private timeout: number;
  private availableModels: Map<string, OllamaModelInfo> = new Map();
  private modelConfigs: Map<string, any> = new Map();

  constructor() {
    this.baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000');

    // Axios 클라이언트 설정
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`🦙 OllamaAIService 초기화 - ${this.baseURL}`);
    
    // 모델별 설정 초기화
    this.initializeModelConfigs();
    
    // 사용 가능한 모델 목록 로드
    this.loadAvailableModels();
  }

  // ============================================================================
  // 🔌 Ollama 서버 연결 관리
  // ============================================================================

  /**
   * Ollama 서버 연결 상태 확인
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      console.log('✅ Ollama 서버 연결 성공');
      return true;
    } catch (error: any) {
      console.warn('⚠️ Ollama 서버 연결 실패:', error.message);
      return false;
    }
  }

  /**
   * 사용 가능한 모델 목록 로드
   */
  async loadAvailableModels(): Promise<void> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      
      this.availableModels.clear();
      models.forEach((model: OllamaModelInfo) => {
        this.availableModels.set(model.name, model);
      });

      console.log(`✅ Ollama 모델 ${models.length}개 로드 완료:`, 
        Array.from(this.availableModels.keys()).join(', '));

    } catch (error: any) {
      console.error('❌ Ollama 모델 목록 로드 실패:', error.message);
    }
  }

  // ============================================================================
  // 🤖 모델 설정 및 관리
  // ============================================================================

  /**
   * 모델별 기본 설정 초기화
   */
  private initializeModelConfigs(): void {
    // 채팅 모델 설정
    this.modelConfigs.set('llama3.2:3b', {
      type: 'chat',
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt: "You are a helpful AI assistant specialized in conversational interactions."
    });

    this.modelConfigs.set('llama3.2:1b', {
      type: 'chat',
      temperature: 0.8,
      max_tokens: 1024,
      system_prompt: "You are a lightweight AI assistant for quick responses."
    });

    // 코딩 모델 설정
    this.modelConfigs.set('deepseek-coder:6.7b', {
      type: 'code',
      temperature: 0.3,
      max_tokens: 4096,
      system_prompt: "You are an expert programming assistant. Provide clear, well-commented code solutions."
    });

    this.modelConfigs.set('codellama:7b', {
      type: 'code',
      temperature: 0.2,
      max_tokens: 4096,
      system_prompt: "You are CodeLlama, an AI assistant specialized in code generation and explanation."
    });

    this.modelConfigs.set('codellama:13b', {
      type: 'code',
      temperature: 0.2,
      max_tokens: 4096,
      system_prompt: "You are CodeLlama 13B, providing detailed code analysis and solutions."
    });

    // 추론 모델 설정
    this.modelConfigs.set('phi3:mini', {
      type: 'reasoning',
      temperature: 0.5,
      max_tokens: 2048,
      system_prompt: "You are a logical reasoning assistant. Think step by step and provide detailed explanations."
    });

    this.modelConfigs.set('phi3:latest', {
      type: 'reasoning',
      temperature: 0.5,
      max_tokens: 2048,
      system_prompt: "You are Phi-3, focusing on analytical thinking and problem-solving."
    });

    // 범용 모델 설정
    this.modelConfigs.set('mistral:latest', {
      type: 'chat',
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt: "You are Mistral, a helpful and efficient AI assistant."
    });

    this.modelConfigs.set('mistral:7b', {
      type: 'chat',
      temperature: 0.7,
      max_tokens: 2048,
      system_prompt: "You are Mistral 7B, providing balanced and informative responses."
    });

    // 대형 모델 설정
    this.modelConfigs.set('llama3.1:8b', {
      type: 'chat',
      temperature: 0.7,
      max_tokens: 4096,
      system_prompt: "You are Llama 3.1 8B, providing comprehensive and detailed responses."
    });

    this.modelConfigs.set('llama3.1:70b', {
      type: 'chat',
      temperature: 0.6,
      max_tokens: 8192,
      system_prompt: "You are Llama 3.1 70B, a highly capable AI assistant for complex tasks."
    });

    console.log('✅ 모델 설정 초기화 완료:', this.modelConfigs.size, '개 모델');
  }

  // ============================================================================
  // 💬 AI 응답 생성 (메인 기능)
  // ============================================================================

  /**
   * AI 응답 생성 (Ollama 전용)
   */
  async generateResponse(
    message: string,
    modelId: string,
    personalizedContext?: any
  ): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // 모델 유효성 확인 및 선택
      const model = await this.validateAndSelectModel(modelId);
      
      // 메시지 구성
      const messages = this.buildMessages(message, model, personalizedContext);
      
      // Ollama API 호출
      const response = await this.callOllamaAPI(model, messages);
      
      // 응답 처리
      const processingTime = Date.now() - startTime;
      
      return {
        content: response.message.content,
        model: `${model} (Ollama)`,
        tokensUsed: this.estimateTokens(message + response.message.content),
        processingTime,
        confidence: 0.9,
        metadata: {
          promptTokens: this.estimateTokens(message),
          completionTokens: this.estimateTokens(response.message.content),
          modelSize: this.getModelSize(model),
          quantization: this.getModelQuantization(model)
        }
      };

    } catch (error: any) {
      console.error(`❌ Ollama 응답 생성 실패 (${modelId}):`, error.message);
      
      // 폴백 응답 생성
      return this.generateFallbackResponse(message, modelId, Date.now() - startTime);
    }
  }

  /**
   * Ollama API 직접 호출
   */
  private async callOllamaAPI(model: string, messages: OllamaMessage[]): Promise<OllamaResponse> {
    console.log(`🦙 Ollama API 호출: ${model}`);

    const response = await this.client.post('/api/chat', {
      model,
      messages,
      stream: false,
      options: {
        temperature: this.modelConfigs.get(model)?.temperature || 0.7,
        num_predict: this.modelConfigs.get(model)?.max_tokens || 2048
      }
    });

    if (!response.data || !response.data.message) {
      throw new Error('Invalid Ollama API response');
    }

    console.log(`✅ Ollama 응답 받음: ${response.data.message.content.length}자`);
    return response.data;
  }

  // ============================================================================
  // 📝 메시지 구성 및 프롬프트 생성
  // ============================================================================

  /**
   * 메시지 구성
   */
  private buildMessages(
    userMessage: string,
    model: string,
    context?: any
  ): OllamaMessage[] {
    const messages: OllamaMessage[] = [];
    
    // 시스템 프롬프트 추가
    const systemPrompt = this.buildSystemPrompt(model, context);
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 사용자 메시지 추가
    messages.push({
      role: 'user',
      content: userMessage
    });

    return messages;
  }

  /**
   * 시스템 프롬프트 생성
   */
  private buildSystemPrompt(model: string, context?: any): string {
    const basePrompt = this.modelConfigs.get(model)?.system_prompt || 
      "You are a helpful AI assistant.";

    if (!context) return basePrompt;

    const personalityInfo = context.personalityProfile?.type ? 
      `\n\nUser Profile: ${context.personalityProfile.type}` : '';
    
    const cueInfo = context.cues?.length ? 
      `\nAvailable Context: ${context.cues.length} data points` : '';

    return `${basePrompt}${personalityInfo}${cueInfo}

Please provide responses that match the user's communication style and preferences.`;
  }

  // ============================================================================
  // 🔍 모델 선택 및 관리
  // ============================================================================

  /**
   * 모델 유효성 확인 및 선택
   */
  private async validateAndSelectModel(requestedModel: string): Promise<string> {
    // 요청된 모델이 사용 가능한지 확인
    if (this.availableModels.has(requestedModel)) {
      return requestedModel;
    }

    // 모델 타입별 폴백 로직
    const fallbackModels = {
      'code': ['deepseek-coder:6.7b', 'codellama:7b', 'codellama:13b', 'magicoder:7b'],
      'chat': ['llama3.2:3b', 'llama3.2:1b', 'mistral:latest', 'llama3.1:8b'],
      'reasoning': ['phi3:mini', 'phi3:latest', 'llama3.2:3b']
    };

    // 요청된 모델의 타입 추정
    let modelType = 'chat';
    if (requestedModel.includes('code') || requestedModel.includes('coder')) {
      modelType = 'code';
    } else if (requestedModel.includes('phi') || requestedModel.includes('reasoning')) {
      modelType = 'reasoning';
    }

    // 폴백 모델 찾기
    const candidates = fallbackModels[modelType as keyof typeof fallbackModels];
    for (const candidate of candidates) {
      if (this.availableModels.has(candidate)) {
        console.log(`⚠️ 모델 폴백: ${requestedModel} → ${candidate}`);
        return candidate;
      }
    }

    // 최종 폴백: 사용 가능한 첫 번째 모델
    const firstAvailable = Array.from(this.availableModels.keys())[0];
    if (firstAvailable) {
      console.log(`⚠️ 최종 폴백: ${requestedModel} → ${firstAvailable}`);
      return firstAvailable;
    }

    throw new Error('사용 가능한 Ollama 모델이 없습니다');
  }

  /**
   * 사용 가능한 모델 목록 반환
   */
  async getAvailableModels(): Promise<AIModel[]> {
    await this.loadAvailableModels();

    const models: AIModel[] = [];
    
    this.availableModels.forEach((info, name) => {
      const config = this.modelConfigs.get(name);
      const size = this.formatSize(info.size);
      
      models.push({
        id: name,
        name: this.getDisplayName(name),
        available: true,
        type: config?.type || 'chat',
        size,
        description: this.getModelDescription(name),
        recommended: name === process.env.OLLAMA_DEFAULT_MODEL
      });
    });

    // 타입별 정렬
    return models.sort((a, b) => {
      const typeOrder = { 'chat': 0, 'code': 1, 'reasoning': 2, 'embedding': 3 };
      return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
    });
  }

  /**
   * 서비스 상태 정보 반환
   */
  async getServiceStatus(): Promise<any> {
    const isConnected = await this.checkConnection();
    await this.loadAvailableModels();

    return {
      provider: 'ollama',
      connected: isConnected,
      baseUrl: this.baseURL,
      modelsAvailable: this.availableModels.size,
      defaultModel: process.env.OLLAMA_DEFAULT_MODEL,
      models: Array.from(this.availableModels.keys()),
      lastChecked: new Date().toISOString()
    };
  }

  // ============================================================================
  // 🛠️ 유틸리티 메서드들
  // ============================================================================

  private estimateTokens(text: string): number {
    // 간단한 토큰 추정 (실제로는 tokenizer 라이브러리 사용 권장)
    return Math.ceil(text.length / 4);
  }

  private getModelSize(model: string): string {
    const info = this.availableModels.get(model);
    return info ? this.formatSize(info.size) : 'Unknown';
  }

  private getModelQuantization(model: string): string {
    const info = this.availableModels.get(model);
    return info?.details?.quantization_level || 'Unknown';
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private getDisplayName(modelName: string): string {
    const nameMap: { [key: string]: string } = {
      'llama3.2:3b': 'Llama 3.2 (3B)',
      'llama3.2:1b': 'Llama 3.2 (1B)',
      'llama3.2:latest': 'Llama 3.2 (3B)',
      'deepseek-coder:6.7b': 'DeepSeek Coder (6.7B)',
      'deepseek-coder:33b': 'DeepSeek Coder (33B)',
      'deepseek-coder-v2:16b': 'DeepSeek Coder v2 (16B)',
      'codellama:7b': 'Code Llama (7B)',
      'codellama:13b': 'Code Llama (13B)',
      'phi3:mini': 'Phi-3 Mini',
      'phi3:latest': 'Phi-3',
      'mistral:latest': 'Mistral 7B',
      'mistral:7b': 'Mistral 7B',
      'llama3.1:8b': 'Llama 3.1 (8B)',
      'llama3.1:70b': 'Llama 3.1 (70B)',
      'llama2:7b': 'Llama 2 (7B)',
      'llama2:13b': 'Llama 2 (13B)',
      'llama2:70b': 'Llama 2 (70B)',
      'mixtral:8x7b': 'Mixtral 8x7B',
      'magicoder:7b': 'MagiCoder (7B)',
      'starcoder2:15b': 'StarCoder2 (15B)',
      'qwen:7b': 'Qwen (7B)',
      'vicuna:7b': 'Vicuna (7B)',
      'nomic-embed-text:latest': 'Nomic Embed Text',
      'mxbai-embed-large:latest': 'MxBai Embed Large'
    };
    
    return nameMap[modelName] || modelName;
  }

  private getModelDescription(modelName: string): string {
    const descriptions: { [key: string]: string } = {
      'llama3.2:3b': '범용 대화 및 텍스트 생성에 최적화된 모델',
      'llama3.2:1b': '빠른 응답이 필요한 간단한 작업용 경량 모델',
      'deepseek-coder:6.7b': '코드 생성, 디버깅, 설명에 특화된 프로그래밍 전문 모델',
      'deepseek-coder:33b': '대규모 코드 프로젝트와 복잡한 프로그래밍 작업용',
      'codellama:7b': 'Meta의 코드 생성 전문 모델, 다양한 프로그래밍 언어 지원',
      'codellama:13b': '더 큰 코드 컨텍스트와 복잡한 로직 처리',
      'phi3:mini': '논리적 추론과 수학적 문제 해결에 강한 소형 모델',
      'mistral:latest': '효율적이고 빠른 응답을 제공하는 범용 모델',
      'llama3.1:8b': '향상된 성능의 중급 범용 모델',
      'llama3.1:70b': '최고 성능의 대형 언어 모델 (리소스 집약적)',
      'mixtral:8x7b': '전문가 혼합 모델, 다양한 작업에 특화',
      'nomic-embed-text:latest': '텍스트 임베딩 생성 전용 모델',
      'mxbai-embed-large:latest': '고품질 텍스트 임베딩 생성 모델'
    };
    
    return descriptions[modelName] || '범용 AI 모델';
  }

  /**
   * 폴백 응답 생성
   */
  private generateFallbackResponse(
    message: string,
    model: string,
    processingTime: number
  ): AIResponse {
    const fallbackContent = `죄송합니다. 현재 ${model} 모델을 사용할 수 없습니다.

**요청하신 메시지:** "${message}"

**상황:**
- Ollama 서버 연결 확인 필요
- 모델이 로드되지 않았을 수 있음
- 서버 리소스 부족 가능성

**해결 방법:**
1. Ollama 서버 상태 확인: \`ollama list\`
2. 모델 다시 로드: \`ollama run ${model}\`
3. 다른 모델 시도: llama3.2:3b 추천

잠시 후 다시 시도해주세요.`;

    return {
      content: fallbackContent,
      model: `Fallback (${model})`,
      tokensUsed: fallbackContent.length,
      processingTime,
      confidence: 0.3,
      metadata: {
        error: 'Service unavailable',
        fallback: true
      }
    };
  }
}