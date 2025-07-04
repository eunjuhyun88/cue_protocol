// ============================================================================
// 📁 frontend/src/services/api/UnifiedChatAPI.ts
// 💬 통합 채팅 API 클라이언트 - 백엔드 완전 연동
// ============================================================================

// 기존 타입들 재사용
import type { ChatResponse, ChatMessage } from '../../types/chat.types';

export interface SendChatRequest {
  message: string;
  model?: string;
  includeContext?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface SendChatResponse {
  success: boolean;
  response: string;
  model: string;
  timestamp: string;
  cueReward: number;
  trustScore: number;
  contextLearned: boolean;
  qualityScore: number;
  processingTime: number;
  tokensUsed: number;
  user: {
    did: string;
    authenticated: boolean;
  };
  aiMetadata: {
    messageId: string;
    conversationId: string;
    personalityMatch: number;
  };
  error?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  available: boolean;
  recommended: boolean;
  description: string;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'low' | 'medium' | 'high';
}

export interface PersonalizationContext {
  personalityProfile: any;
  totalCues: number;
  vaultsCount: number;
  behaviorPatterns: string[];
  recentInteractions: any[];
  personalityMatch: number;
  preferences: any;
}

/**
 * 🎯 통합 채팅 API 클라이언트 (백엔드 완전 연동)
 * - 기존 API들과 호환
 * - 새로운 백엔드 API와 직접 연동
 * - 자동 폴백 및 에러 처리
 */
export class UnifiedChatAPI {
  private baseURL: string;
  private sessionToken: string | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.loadSessionToken();
    
    console.log('🔗 UnifiedChatAPI 초기화:', this.baseURL);
  }

  // ============================================================================
  // 🔧 설정 및 인증 관리
  // ============================================================================

  /**
   * 세션 토큰 로드 (로컬 스토리지에서)
   */
  private loadSessionToken(): void {
    try {
      if (typeof window !== 'undefined') {
        this.sessionToken = localStorage.getItem('session_token');
      }
    } catch (error) {
      console.warn('세션 토큰 로드 실패:', error);
    }
  }

  /**
   * 세션 토큰 설정
   */
  public setSessionToken(token: string): void {
    this.sessionToken = token;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_token', token);
      }
    } catch (error) {
      console.warn('세션 토큰 저장 실패:', error);
    }
  }

  /**
   * HTTP 요청 헤더 생성
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    return headers;
  }

  /**
   * 안전한 fetch 요청
   */
  private async safeFetch(url: string, options: RequestInit = {}): Promise<any> {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
      
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API 요청 실패:', error);
      throw error;
    }
  }

  // ============================================================================
  // 💬 핵심 채팅 API
  // ============================================================================

  /**
   * AI 채팅 메시지 전송 (백엔드 직접 연동)
   */
  async sendMessage(request: SendChatRequest): Promise<SendChatResponse> {
    try {
      console.log('💬 AI 채팅 전송:', request);

      const response = await this.safeFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: request.message,
          model: request.model || 'gpt-4o',
          includeContext: request.includeContext !== false,
          temperature: request.temperature || 0.8,
          maxTokens: request.maxTokens || 2000
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'AI 채팅 실패');
      }

      console.log('✅ AI 채팅 응답 받음:', response);
      return response;

    } catch (error) {
      console.error('💥 AI 채팅 오류:', error);
      
      // 폴백 응답 생성
      return {
        success: false,
        response: `죄송합니다. AI 서비스에 일시적인 문제가 있습니다. (${error.message})`,
        model: request.model || 'fallback',
        timestamp: new Date().toISOString(),
        cueReward: 0,
        trustScore: 0,
        contextLearned: false,
        qualityScore: 0,
        processingTime: 0,
        tokensUsed: 0,
        user: {
          did: 'anonymous',
          authenticated: false
        },
        aiMetadata: {
          messageId: `fallback_${Date.now()}`,
          conversationId: `fallback_conv_${Date.now()}`,
          personalityMatch: 0
        },
        error: error.message
      };
    }
  }

  /**
   * 간단한 메시지 전송 (기존 API 호환)
   */
  async sendSimpleMessage(message: string, model: string = 'gpt-4o'): Promise<ChatResponse> {
    const request: SendChatRequest = { message, model };
    const response = await this.sendMessage(request);

    // 기존 ChatResponse 형식으로 변환
    return {
      response: response.response,
      model: response.model,
      timestamp: response.timestamp,
      cueReward: response.cueReward,
      trustScore: response.trustScore,
      contextLearned: response.contextLearned,
      qualityScore: response.qualityScore,
      processingTime: response.processingTime,
      tokensUsed: response.tokensUsed
    };
  }

  // ============================================================================
  // 📋 AI 모델 관리
  // ============================================================================

  /**
   * 사용 가능한 AI 모델 목록 조회
   */
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      console.log('📋 AI 모델 목록 조회');

      const response = await this.safeFetch('/api/ai/models');

      if (!response.success) {
        throw new Error(response.error || '모델 목록 조회 실패');
      }

      console.log('✅ AI 모델 목록 받음:', response.models.length, '개');
      return response.models;

    } catch (error) {
      console.error('💥 모델 목록 조회 오류:', error);
      
      // 기본 모델 목록 반환
      return [
        {
          id: 'gpt-4o',
          name: 'GPT-4 Omni',
          provider: 'OpenAI',
          available: true,
          recommended: true,
          description: '가장 강력한 범용 AI 모델',
          speed: 'medium',
          quality: 'high'
        }
      ];
    }
  }

  /**
   * 추천 모델 조회
   */
  async getRecommendedModels(): Promise<AIModel[]> {
    const models = await this.getAvailableModels();
    return models.filter(model => model.recommended);
  }

  // ============================================================================
  // 🧠 개인화 및 컨텍스트
  // ============================================================================

  /**
   * 개인화 컨텍스트 조회
   */
  async getPersonalizationContext(): Promise<PersonalizationContext> {
    try {
      console.log('🧠 개인화 컨텍스트 조회');

      const response = await this.safeFetch('/api/ai/personalization/context');

      if (!response.success) {
        throw new Error(response.error || '컨텍스트 조회 실패');
      }

      console.log('✅ 개인화 컨텍스트 받음:', response.context);
      return response.context;

    } catch (error) {
      console.error('💥 컨텍스트 조회 오류:', error);
      
      // 기본 컨텍스트 반환
      return {
        personalityProfile: {},
        totalCues: 0,
        vaultsCount: 0,
        behaviorPatterns: [],
        recentInteractions: [],
        personalityMatch: 0.5,
        preferences: {}
      };
    }
  }

  // ============================================================================
  // 📚 대화 기록 관리
  // ============================================================================

  /**
   * 대화 기록 조회
   */
  async getChatHistory(options: {
    page?: number;
    limit?: number;
    conversationId?: string;
  } = {}): Promise<ChatMessage[]> {
    try {
      const { page = 1, limit = 20, conversationId } = options;
      
      console.log('📚 대화 기록 조회:', options);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (conversationId) {
        params.append('conversationId', conversationId);
      }

      const response = await this.safeFetch(`/api/ai/history?${params}`);

      if (!response.success) {
        throw new Error(response.error || '대화 기록 조회 실패');
      }

      console.log('✅ 대화 기록 받음:', response.history.length, '개');
      return response.history;

    } catch (error) {
      console.error('💥 대화 기록 조회 오류:', error);
      return [];
    }
  }

  // ============================================================================
  // 📊 시스템 상태 및 통계
  // ============================================================================

  /**
   * AI 시스템 상태 조회
   */
  async getSystemStatus(): Promise<any> {
    try {
      console.log('📊 시스템 상태 조회');

      const response = await this.safeFetch('/api/ai/status');

      if (!response.success) {
        throw new Error(response.error || '상태 조회 실패');
      }

      console.log('✅ 시스템 상태 받음:', response.status);
      return response.status;

    } catch (error) {
      console.error('💥 시스템 상태 조회 오류:', error);
      
      return {
        ai: { status: 'error', available: false },
        cue: { status: 'error', available: false },
        features: {
          aiChat: false,
          personalization: false,
          cueRewards: false,
          multiModel: false,
          contextLearning: false
        },
        version: 'unknown',
        uptime: 0
      };
    }
  }

  /**
   * API 사용 가이드 조회
   */
  async getUsageGuide(): Promise<any> {
    try {
      const response = await this.safeFetch('/api/ai/guide');
      return response;
    } catch (error) {
      console.error('가이드 조회 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // 🔧 유틸리티 메서드들
  // ============================================================================

  /**
   * 연결 상태 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = await this.getSystemStatus();
      return status.features?.aiChat === true;
    } catch {
      return false;
    }
  }

  /**
   * 인증 상태 확인
   */
  public isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  /**
   * 로그아웃 (토큰 제거)
   */
  public logout(): void {
    this.sessionToken = null;
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_token');
      }
    } catch (error) {
      console.warn('토큰 제거 실패:', error);
    }
  }

  /**
   * Base URL 변경
   */
  public setBaseURL(url: string): void {
    this.baseURL = url;
    console.log('🔧 Base URL 변경:', url);
  }
}

// ============================================================================
// 📤 싱글톤 인스턴스 및 편의 함수
// ============================================================================

// 기본 인스턴스 생성
let defaultInstance: UnifiedChatAPI | null = null;

/**
 * 기본 UnifiedChatAPI 인스턴스 반환
 */
export function getUnifiedChatAPI(): UnifiedChatAPI {
  if (!defaultInstance) {
    defaultInstance = new UnifiedChatAPI();
  }
  return defaultInstance;
}

/**
 * 빠른 채팅 전송 함수
 */
export async function quickChat(message: string, model?: string): Promise<ChatResponse> {
  const api = getUnifiedChatAPI();
  return api.sendSimpleMessage(message, model);
}

/**
 * 빠른 모델 목록 조회
 */
export async function getModels(): Promise<AIModel[]> {
  const api = getUnifiedChatAPI();
  return api.getAvailableModels();
}

/**
 * 연결 상태 확인
 */
export async function checkConnection(): Promise<boolean> {
  const api = getUnifiedChatAPI();
  return api.testConnection();
}

// ============================================================================
// 📤 타입 및 기본 export
// ============================================================================

export type {
  SendChatRequest,
  SendChatResponse,
  AIModel,
  PersonalizationContext
};

export default UnifiedChatAPI;