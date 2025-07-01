// ============================================================================
// 📁 src/types/chat.types.ts
// 💬 채팅 관련 타입 정의
// ============================================================================

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  usedPassportData?: string[];
  cueTokensUsed?: number;
  cueTokensEarned?: number;
  verification?: {
    biometric: boolean;
    did: boolean;
    signature: string;
  };
}

export type ResponseType = 'greeting' | 'question' | 'technical' | 'help' | 'general';

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  selectedModel: string;
  availableModels: string[];
}

export interface AIModelConfig {
  name: string;
  displayName: string;
  provider: 'openai' | 'anthropic' | 'google' | 'mock';
  maxTokens: number;
  temperature: number;
  available: boolean;
}

export interface ChatResponse {
  message: string;
  model: string;
  tokensUsed?: number;
  cueEarned?: number;
  processingTime?: number;
}