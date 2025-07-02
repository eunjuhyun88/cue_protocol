// ============================================================================
// 🦙 Ollama 서비스 - 로컬 AI 모델 관리
// 파일: backend/src/services/ollama.ts
// 역할: Ollama 로컬 AI 모델 연동 및 관리
// ============================================================================

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

class OllamaService {
  private baseUrl: string;
  private isConnected: boolean = false;
  private availableModels: string[] = [];
  private lastCheck: number = 0;
  private checkInterval: number = 5 * 60 * 1000; // 5분

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    console.log(`🦙 Ollama 서비스 초기화 - URL: ${this.baseUrl}`);
  }

  // ============================================================================
  // 🔍 Ollama 연결 상태 확인
  // ============================================================================

  public async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // 캐시된 결과 사용 (5분 이내)
    if (now - this.lastCheck < this.checkInterval && this.lastCheck > 0) {
      return this.isConnected;
    }

    try {
      console.log('🔍 Ollama 연결 상태 확인 중...');
      
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        timeout: 5000 // 5초 타임아웃
      } as any);

      if (response.ok) {
        const version = await response.json();
        console.log(`✅ Ollama 연결 성공 - 버전: ${version.version || 'unknown'}`);
        this.isConnected = true;
      } else {
        console.log('❌ Ollama 응답 오류:', response.status);
        this.isConnected = false;
      }
    } catch (error: any) {
      console.log('❌ Ollama 연결 실패:', error.message);
      this.isConnected = false;
    }

    this.lastCheck = now;
    return this.isConnected;
  }

  // ============================================================================
  // 📋 사용 가능한 모델 목록 조회
  // ============================================================================

  public async getModels(): Promise<string[]> {
    try {
      console.log('📋 Ollama 모델 목록 조회 중...');
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 10000
      } as any);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const models = data.models?.map((model: any) => model.name) || [];
      
      this.availableModels = models;
      console.log(`✅ Ollama 모델 목록 조회 성공 - ${models.length}개 모델`);
      console.log('🔹 사용 가능한 모델:', models.join(', '));
      
      return models;
    } catch (error: any) {
      console.error('❌ Ollama 모델 목록 조회 실패:', error.message);
      return [];
    }
  }

  // ============================================================================
  // 🤖 채팅 응답 생성
  // ============================================================================

  public async chat(
    model: string, 
    messages: OllamaMessage[], 
    stream: boolean = false
  ): Promise<string> {
    try {
      console.log(`🤖 Ollama 채팅 요청 - 모델: ${model}, 메시지: ${messages.length}개`);

      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Ollama is not connected');
      }

      const requestBody = {
        model: model,
        messages: messages,
        stream: stream,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1
        }
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        timeout: 60000 // 60초 타임아웃
      } as any);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (stream) {
        // 스트리밍 응답 처리
        return await this.handleStreamResponse(response);
      } else {
        // 일반 응답 처리
        const data: OllamaResponse = await response.json();
        console.log(`✅ Ollama 응답 생성 완료 - 길이: ${data.response?.length || 0}자`);
        return data.response || '';
      }

    } catch (error: any) {
      console.error(`❌ Ollama 채팅 오류 (${model}):`, error.message);
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }

  // ============================================================================
  // 🔽 모델 다운로드
  // ============================================================================

  public async pullModel(modelName: string): Promise<void> {
    try {
      console.log(`🔽 Ollama 모델 다운로드 시작 - ${modelName}`);

      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName,
          stream: false
        })
      } as any);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      console.log(`✅ Ollama 모델 다운로드 시작됨 - ${modelName}`);
      
      // 모델 목록 캐시 무효화
      this.availableModels = [];
      this.lastCheck = 0;

    } catch (error: any) {
      console.error(`❌ Ollama 모델 다운로드 실패 (${modelName}):`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // 📊 모델 정보 조회
  // ============================================================================

  public async getModelInfo(modelName: string): Promise<any> {
    try {
      console.log(`📊 Ollama 모델 정보 조회 - ${modelName}`);

      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName
        })
      } as any);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const modelInfo = await response.json();
      console.log(`✅ 모델 정보 조회 성공 - ${modelName}`);
      
      return {
        name: modelInfo.name,
        size: modelInfo.size,
        digest: modelInfo.digest,
        modified: modelInfo.modified_at,
        parameters: modelInfo.parameters,
        template: modelInfo.template,
        details: modelInfo.details
      };

    } catch (error: any) {
      console.error(`❌ 모델 정보 조회 실패 (${modelName}):`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // 🗑️ 모델 삭제
  // ============================================================================

  public async deleteModel(modelName: string): Promise<void> {
    try {
      console.log(`🗑️ Ollama 모델 삭제 - ${modelName}`);

      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName
        })
      } as any);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✅ 모델 삭제 완료 - ${modelName}`);
      
      // 모델 목록 캐시 무효화
      this.availableModels = this.availableModels.filter(m => m !== modelName);

    } catch (error: any) {
      console.error(`❌ 모델 삭제 실패 (${modelName}):`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // 🔧 일반 생성 (레거시 지원)
  // ============================================================================

  public async generate(
    model: string, 
    prompt: string, 
    stream: boolean = false
  ): Promise<string> {
    try {
      console.log(`🔧 Ollama 텍스트 생성 - 모델: ${model}`);

      const requestBody = {
        model: model,
        prompt: prompt,
        stream: stream,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40
        }
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        timeout: 60000
      } as any);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (stream) {
        return await this.handleStreamResponse(response);
      } else {
        const data = await response.json();
        return data.response || '';
      }

    } catch (error: any) {
      console.error(`❌ Ollama 텍스트 생성 오류:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // 🛠️ 프라이빗 헬퍼 메서드들
  // ============================================================================

  private async handleStreamResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('스트림 응답을 읽을 수 없습니다');
    }

    let fullResponse = '';
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
            }
            if (data.done) {
              return fullResponse;
            }
          } catch (parseError) {
            // JSON 파싱 오류 무시 (부분 응답일 수 있음)
          }
        }
      }

      return fullResponse;
    } finally {
      reader.releaseLock();
    }
  }

  // ============================================================================
  // 📊 공개 유틸리티 메서드들
  // ============================================================================

  public getConnectionStatus(): {
    connected: boolean;
    url: string;
    lastCheck: string;
    modelCount: number;
  } {
    return {
      connected: this.isConnected,
      url: this.baseUrl,
      lastCheck: new Date(this.lastCheck).toISOString(),
      modelCount: this.availableModels.length
    };
  }

  public getCachedModels(): string[] {
    return [...this.availableModels];
  }

  public getRecommendedModels(): Array<{
    name: string;
    size: string;
    description: string;
    recommended: boolean;
  }> {
    return [
      {
        name: 'llama3.2:1b',
        size: '1.3GB',
        description: '가장 빠른 소형 모델 - 일반 대화용',
        recommended: true
      },
      {
        name: 'llama3.2:3b',
        size: '2.0GB',
        description: '균형잡힌 성능과 속도 - 권장 모델',
        recommended: true
      },
      {
        name: 'gemma2:2b',
        size: '1.6GB',
        description: 'Google 기반 효율적 모델',
        recommended: false
      },
      {
        name: 'qwen2.5:3b',
        size: '1.9GB',
        description: '다국어 지원 우수 모델',
        recommended: false
      },
      {
        name: 'llama3.1:8b',
        size: '4.7GB',
        description: '고성능 대형 모델 - 고급 작업용',
        recommended: false
      }
    ];
  }

  public async healthCheck(): Promise<{
    status: string;
    connected: boolean;
    models: number;
    version?: string;
    error?: string;
  }> {
    try {
      const isConnected = await this.checkConnection();
      
      if (!isConnected) {
        return {
          status: 'disconnected',
          connected: false,
          models: 0,
          error: 'Ollama service is not available'
        };
      }

      const models = await this.getModels();
      
      return {
        status: 'healthy',
        connected: true,
        models: models.length,
        version: 'unknown' // 버전 정보는 별도 API로 조회 가능
      };

    } catch (error: any) {
      return {
        status: 'error',
        connected: false,
        models: 0,
        error: error.message
      };
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
export const ollamaService = new OllamaService();

// 클래스도 export (테스트용)
export { OllamaService };