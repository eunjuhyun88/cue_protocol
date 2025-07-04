// ============================================================================
// 📁 frontend/src/hooks/useChat.ts
// 💬 채팅 훅 - 백엔드 완전 연동 (기존 구조 호환)
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { getUnifiedChatAPI, UnifiedChatAPI } from '../services/api/UnifiedChatAPI';
import type { 
  SendChatRequest, 
  SendChatResponse, 
  AIModel,
  PersonalizationContext 
} from '../services/api/UnifiedChatAPI';
import type { ChatMessage } from '../types/chat.types';

// ============================================================================
// 📝 타입 정의
// ============================================================================

export interface UseChatOptions {
  autoLoadModels?: boolean;
  autoLoadContext?: boolean;
  autoLoadHistory?: boolean;
  defaultModel?: string;
  enableRealtimeUpdates?: boolean;
}

export interface ChatState {
  // 메시지 관련
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  
  // 모델 관련
  availableModels: AIModel[];
  selectedModel: string;
  modelsLoading: boolean;
  
  // 개인화 관련
  personalizationContext: PersonalizationContext | null;
  contextLoading: boolean;
  
  // 시스템 상태
  isConnected: boolean;
  lastError: string | null;
  
  // 통계
  totalCueEarned: number;
  totalMessages: number;
}

export interface ChatActions {
  // 메시지 전송
  sendMessage: (message: string, options?: Partial<SendChatRequest>) => Promise<void>;
  
  // 모델 관리
  changeModel: (modelId: string) => void;
  loadModels: () => Promise<void>;
  
  // 개인화
  loadPersonalizationContext: () => Promise<void>;
  
  // 기록 관리
  loadChatHistory: (options?: { page?: number; limit?: number }) => Promise<void>;
  clearHistory: () => void;
  
  // 시스템
  testConnection: () => Promise<boolean>;
  resetError: () => void;
  
  // 유틸리티
  retry: () => Promise<void>;
  exportHistory: () => void;
}

// ============================================================================
// 🎯 useChat 훅 (백엔드 완전 연동)
// ============================================================================

export function useChat(options: UseChatOptions = {}): ChatState & ChatActions {
  const {
    autoLoadModels = true,
    autoLoadContext = true,
    autoLoadHistory = true,
    defaultModel = 'gpt-4o',
    enableRealtimeUpdates = false
  } = options;

  // ============================================================================
  // 📊 상태 관리
  // ============================================================================

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isTyping: false,
    availableModels: [],
    selectedModel: defaultModel,
    modelsLoading: false,
    personalizationContext: null,
    contextLoading: false,
    isConnected: false,
    lastError: null,
    totalCueEarned: 0,
    totalMessages: 0
  });

  // API 인스턴스 및 참조
  const apiRef = useRef<UnifiedChatAPI>(getUnifiedChatAPI());
  const lastMessageRef = useRef<string>(''); // 재시도용

  // ============================================================================
  // 🔧 유틸리티 함수들
  // ============================================================================

  /**
   * 상태 업데이트 헬퍼
   */
  const updateState = useCallback((updates: Partial<ChatState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 에러 처리 헬퍼
   */
  const handleError = useCallback((error: Error, context?: string) => {
    console.error(`💥 Chat 오류${context ? ` (${context})` : ''}:`, error);
    updateState({ 
      lastError: error.message,
      isLoading: false,
      isTyping: false 
    });
  }, [updateState]);

  /**
   * 새 메시지를 상태에 추가
   */
  const addMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      totalMessages: prev.totalMessages + 1
    }));

    return newMessage;
  }, []);

  // ============================================================================
  // 💬 채팅 핵심 기능
  // ============================================================================

  /**
   * 메시지 전송 (백엔드 연동)
   */
  const sendMessage = useCallback(async (message: string, options: Partial<SendChatRequest> = {}) => {
    if (!message.trim()) {
      console.warn('빈 메시지는 전송할 수 없습니다');
      return;
    }

    lastMessageRef.current = message; // 재시도용 저장

    try {
      // 로딩 상태 시작
      updateState({ 
        isLoading: true, 
        isTyping: true, 
        lastError: null 
      });

      // 사용자 메시지 추가
      addMessage({
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        metadata: { model: state.selectedModel }
      });

      console.log('💬 메시지 전송:', { message, model: state.selectedModel });

      // 백엔드로 메시지 전송
      const request: SendChatRequest = {
        message,
        model: state.selectedModel,
        includeContext: true,
        ...options
      };

      const response: SendChatResponse = await apiRef.current.sendMessage(request);

      if (!response.success) {
        throw new Error(response.error || 'AI 응답 실패');
      }

      // AI 응답 메시지 추가
      addMessage({
        type: 'ai',
        content: response.response,
        timestamp: response.timestamp,
        model: response.model,
        cueReward: response.cueReward,
        trustScore: response.trustScore,
        contextLearned: response.contextLearned,
        qualityScore: response.qualityScore,
        metadata: {
          processingTime: response.processingTime,
          tokensUsed: response.tokensUsed,
          messageId: response.aiMetadata.messageId,
          conversationId: response.aiMetadata.conversationId,
          personalityMatch: response.aiMetadata.personalityMatch
        }
      });

      // CUE 토큰 누적
      updateState({
        totalCueEarned: state.totalCueEarned + (response.cueReward || 0)
      });

      console.log('✅ 메시지 전송 완료:', {
        model: response.model,
        cueReward: response.cueReward,
        processingTime: response.processingTime
      });

    } catch (error) {
      handleError(error as Error, '메시지 전송');
      
      // 에러 메시지 추가
      addMessage({
        type: 'ai',
        content: `죄송합니다. 메시지 처리 중 오류가 발생했습니다: ${error.message}`,
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      });

    } finally {
      updateState({ 
        isLoading: false, 
        isTyping: false 
      });
    }
  }, [state.selectedModel, state.totalCueEarned, updateState, handleError, addMessage]);

  // ============================================================================
  // 🤖 모델 관리
  // ============================================================================

  /**
   * 사용 가능한 모델 목록 로드
   */
  const loadModels = useCallback(async () => {
    try {
      updateState({ modelsLoading: true, lastError: null });

      console.log('📋 모델 목록 로드 중...');
      const models = await apiRef.current.getAvailableModels();

      updateState({ 
        availableModels: models,
        modelsLoading: false 
      });

      console.log('✅ 모델 목록 로드 완료:', models.length, '개');

    } catch (error) {
      handleError(error as Error, '모델 목록 로드');
      updateState({ modelsLoading: false });
    }
  }, [updateState, handleError]);

  /**
   * 모델 변경
   */
  const changeModel = useCallback((modelId: string) => {
    console.log('🔄 모델 변경:', state.selectedModel, '→', modelId);
    updateState({ selectedModel: modelId });
    
    // 모델 변경 알림 메시지 추가 (선택사항)
    addMessage({
      type: 'ai',
      content: `AI 모델이 ${modelId}로 변경되었습니다.`,
      timestamp: new Date().toISOString(),
      metadata: { system: true, modelChange: true }
    });
  }, [state.selectedModel, updateState, addMessage]);

  // ============================================================================
  // 🧠 개인화 기능
  // ============================================================================

  /**
   * 개인화 컨텍스트 로드
   */
  const loadPersonalizationContext = useCallback(async () => {
    try {
      updateState({ contextLoading: true, lastError: null });

      console.log('🧠 개인화 컨텍스트 로드 중...');
      const context = await apiRef.current.getPersonalizationContext();

      updateState({ 
        personalizationContext: context,
        contextLoading: false 
      });

      console.log('✅ 개인화 컨텍스트 로드 완료:', context);

    } catch (error) {
      handleError(error as Error, '개인화 컨텍스트 로드');
      updateState({ contextLoading: false });
    }
  }, [updateState, handleError]);

  // ============================================================================
  // 📚 대화 기록 관리
  // ============================================================================

  /**
   * 대화 기록 로드
   */
  const loadChatHistory = useCallback(async (options: { page?: number; limit?: number } = {}) => {
    try {
      updateState({ isLoading: true, lastError: null });

      console.log('📚 대화 기록 로드 중...');
      const history = await apiRef.current.getChatHistory(options);

      // 기록을 ChatMessage 형식으로 변환
      const convertedHistory: ChatMessage[] = history.map(msg => ({
        id: msg.id || `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model,
        cueReward: msg.cueReward,
        trustScore: msg.trustScore,
        contextLearned: msg.contextLearned,
        qualityScore: msg.qualityScore,
        metadata: msg.metadata
      }));

      updateState({ 
        messages: convertedHistory,
        totalMessages: convertedHistory.length,
        isLoading: false 
      });

      console.log('✅ 대화 기록 로드 완료:', convertedHistory.length, '개');

    } catch (error) {
      handleError(error as Error, '대화 기록 로드');
    }
  }, [updateState, handleError]);

  /**
   * 대화 기록 초기화
   */
  const clearHistory = useCallback(() => {
    console.log('🧹 대화 기록 초기화');
    updateState({ 
      messages: [],
      totalMessages: 0,
      totalCueEarned: 0 
    });
  }, [updateState]);

  // ============================================================================
  // 🔍 시스템 관리
  // ============================================================================

  /**
   * 연결 상태 테스트
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 연결 상태 테스트 중...');
      const isConnected = await apiRef.current.testConnection();
      
      updateState({ isConnected });
      
      if (isConnected) {
        console.log('✅ 백엔드 연결 정상');
      } else {
        console.log('❌ 백엔드 연결 실패');
      }
      
      return isConnected;
    } catch (error) {
      console.error('💥 연결 테스트 오류:', error);
      updateState({ isConnected: false });
      return false;
    }
  }, [updateState]);

  /**
   * 에러 상태 리셋
   */
  const resetError = useCallback(() => {
    updateState({ lastError: null });
  }, [updateState]);

  /**
   * 마지막 작업 재시도
   */
  const retry = useCallback(async () => {
    if (lastMessageRef.current) {
      console.log('🔄 마지막 메시지 재시도:', lastMessageRef.current);
      await sendMessage(lastMessageRef.current);
    } else {
      console.log('🔄 연결 상태 재시도');
      await testConnection();
    }
  }, [sendMessage, testConnection]);

  /**
   * 대화 기록 내보내기
   */
  const exportHistory = useCallback(() => {
    try {
      const exportData = {
        messages: state.messages,
        totalMessages: state.totalMessages,
        totalCueEarned: state.totalCueEarned,
        selectedModel: state.selectedModel,
        exportedAt: new Date().toISOString()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      console.log('💾 대화 기록 내보내기 완료');
    } catch (error) {
      handleError(error as Error, '대화 기록 내보내기');
    }
  }, [state, handleError]);

  // ============================================================================
  // 🚀 초기화 및 생명주기
  // ============================================================================

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      console.log('🚀 useChat 초기화 시작');

      // 연결 상태 확인
      const isConnected = await testConnection();
      
      if (!mounted) return;

      if (isConnected) {
        // 모델 목록 로드
        if (autoLoadModels) {
          await loadModels();
        }

        // 개인화 컨텍스트 로드
        if (autoLoadContext) {
          await loadPersonalizationContext();
        }

        // 대화 기록 로드
        if (autoLoadHistory) {
          await loadChatHistory({ limit: 50 });
        }
      }

      console.log('✅ useChat 초기화 완료');
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [autoLoadModels, autoLoadContext, autoLoadHistory]);

  // 실시간 업데이트 (선택사항)
  useEffect(() => {
    if (!enableRealtimeUpdates) return;

    const interval = setInterval(async () => {
      await testConnection();
    }, 30000); // 30초마다 연결 상태 확인

    return () => clearInterval(interval);
  }, [enableRealtimeUpdates, testConnection]);

  // ============================================================================
  // 📤 반환값
  // ============================================================================

  return {
    // 상태
    ...state,
    
    // 액션
    sendMessage,
    changeModel,
    loadModels,
    loadPersonalizationContext,
    loadChatHistory,
    clearHistory,
    testConnection,
    resetError,
    retry,
    exportHistory
  };
}

// ============================================================================
// 📤 편의 훅들
// ============================================================================

/**
 * 간단한 채팅 훅 (최소 기능)
 */
export function useSimpleChat(defaultModel?: string) {
  return useChat({
    autoLoadModels: false,
    autoLoadContext: false,
    autoLoadHistory: false,
    defaultModel
  });
}

/**
 * 완전한 채팅 훅 (모든 기능)
 */
export function useFullChat() {
  return useChat({
    autoLoadModels: true,
    autoLoadContext: true,
    autoLoadHistory: true,
    enableRealtimeUpdates: true
  });
}

export default useChat;