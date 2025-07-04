// ============================================================================
// 🤖 Chat Store - 채팅 상태 관리 (완전한 버전)
// 경로: frontend/src/store/chatStore.ts
// ============================================================================

import { create } from 'zustand';
import { ChatAPI } from '../services/api/ChatAPI';
import type { ChatMessage, ChatSession, ModelType } from '../types/chat.types';

interface ChatState {
  // 상태
  messages: ChatMessage[];
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  selectedModel: ModelType;
  isTyping: boolean;
  error: string | null;
  
  // 액션
  sendMessage: (content: string, passportData?: any) => Promise<void>;
  createSession: (name?: string) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  setSelectedModel: (model: ModelType) => void;
  clearMessages: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 초기 상태
  messages: [],
  sessions: [],
  currentSession: null,
  selectedModel: 'gpt-4',
  isTyping: false,
  error: null,

  // 메시지 전송
  sendMessage: async (content: string, passportData?: any) => {
    const { selectedModel, currentSession } = get();
    
    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      type: 'user',
      timestamp: new Date(),
      sessionId: currentSession?.id
    };

    set(state => ({ 
      messages: [...state.messages, userMessage],
      isTyping: true,
      error: null 
    }));

    try {
      const result = await ChatAPI.sendMessage({
        message: content,
        model: selectedModel,
        sessionId: currentSession?.id,
        passportData
      });

      if (result.success) {
        const aiMessage: ChatMessage = {
          id: result.messageId || (Date.now() + 1).toString(),
          content: result.response,
          type: 'ai',
          timestamp: new Date(),
          sessionId: result.sessionId,
          usedPassportData: result.usedPassportData,
          cueTokensEarned: result.cueTokensEarned,
          model: result.model
        };

        set(state => ({ 
          messages: [...state.messages, aiMessage],
          isTyping: false 
        }));

        // 새 세션이 생성된 경우 세션 목록 새로고침
        if (result.sessionId && !currentSession) {
          await get().loadSessions();
        }
      } else {
        set({ 
          error: result.error || 'AI 응답 실패',
          isTyping: false 
        });
      }
    } catch (error: any) {
      set({ 
        error: error.message,
        isTyping: false 
      });
    }
  },

  // 새 세션 생성
  createSession: async (name?: string) => {
    const { selectedModel } = get();
    
    try {
      const result = await ChatAPI.createSession({
        name: name || `Chat ${new Date().toLocaleDateString()}`,
        model: selectedModel
      });

      if (result.success && result.session) {
        set(state => ({
          sessions: [result.session!, ...state.sessions],
          currentSession: result.session!,
          messages: [],
          error: null
        }));
      } else {
        set({ error: result.error || '세션 생성 실패' });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // 세션 전환
  switchSession: async (sessionId: string) => {
    const { sessions } = get();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) return;

    set({ currentSession: session });

    try {
      const result = await ChatAPI.getChatHistory(sessionId);
      if (result.success) {
        set({ 
          messages: result.messages || [],
          error: null 
        });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // 세션 목록 로드
  loadSessions: async () => {
    try {
      const result = await ChatAPI.getSessions();
      if (result.success) {
        set({ 
          sessions: result.sessions || [],
          error: null 
        });
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // 모델 선택
  setSelectedModel: (model: ModelType) => set({ selectedModel: model }),

  // 메시지 클리어
  clearMessages: () => set({ messages: [] }),

  // 에러 클리어
  clearError: () => set({ error: null })
}));