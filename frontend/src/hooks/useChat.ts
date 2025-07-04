// ============================================================================
// 🪝 개선된 useChat 훅 (실제 백엔드 연동, Mock 제거)
// 경로: frontend/src/hooks/useChat.ts
// 수정 사항: 백엔드 직접 연동, 에러 처리 강화, 상태 관리 개선
// 호출 구조: 컴포넌트 → useChat → ChatAPI → 백엔드
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatAPI } from '../services/api/ChatAPI';
import type { UnifiedAIPassport } from '../types/passport.types';

// ============================================================================
// 🏷️ 타입 정의
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  cueReward?: number;
  error?: boolean;
  loading?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  selectedModel: string;
  lastCueReward: number;
  totalCueEarned: number;
  messageCount: number;
}

export interface UseChatOptions {
  passport?: UnifiedAIPassport;
  backendConnected?: boolean;
  autoLoadHistory?: boolean;
  maxMessages?: number;
  enableRealtime?: boolean;
}

export interface UseChatReturn extends ChatState {
  sendMessage: (message: string, model?: string) => Promise<void>;
  setSelectedModel: (model: string) => void;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  loadHistory: () => Promise<void>;
  getAvailableModels: () => Promise<string[]>;
  exportHistory: () => ChatMessage[];
  stats: {
    totalMessages: number;
    totalCueEarned: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

// ============================================================================
// 🪝 개선된 useChat 훅
// ============================================================================

export const useChat = (options: UseChatOptions = {}): UseChatReturn => {
  const {
    passport,
    backendConnected = true,
    autoLoadHistory = true,
    maxMessages = 100,
    enableRealtime = false
  } = options;

  // ============================================================================
  // 📊 상태 관리
  // ============================================================================

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ChatState['connectionStatus']>('disconnected');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [lastCueReward, setLastCueReward] = useState(0);
  const [totalCueEarned, setTotalCueEarned] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  // ============================================================================
  // 📈 통계 추적
  // ============================================================================

  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const lastMessageRef = useRef<{ message: string; model: string } | null>(null);

  // ============================================================================
  // 🔧 API 클라이언트 초기화
  // ============================================================================

  const chatAPI = useRef(new ChatAPI()).current;

  // ============================================================================
  // 🔄 초기화 및 히스토리 로드
  // ============================================================================

  useEffect(() => {
    const initializeChat = async () => {
      console.log('🪝 useChat 초기화 시작...');
      
      try {
        setConnectionStatus('connecting');
        
        // 백엔드 연결 상태 확인
        if (backendConnected) {
          console.log('🔗 백엔드 연결 확인 중...');
          
          // 간단한 헬스체크 요청
          const healthCheck = await fetch('http://localhost:3001/health');
          if (healthCheck.ok) {
            setConnectionStatus('connected');
            console.log('✅ 백엔드 연결 성공');
          } else {
            throw new Error('백엔드 헬스체크 실패');
          }
          
          // 자동 히스토리 로드
          if (autoLoadHistory && passport?.did) {
            await loadChatHistory();
          }
          
        } else {
          setConnectionStatus('disconnected');
          console.log('⚠️ 백엔드 연결 없음 - 로컬 모드');
        }
        
      } catch (error) {
        console.error('❌ useChat 초기화 실패:', error);
        setConnectionStatus('error');
        setError('채팅 서비스 연결에 실패했습니다');
      }
    };

    initializeChat();
  }, [backendConnected, passport?.did, autoLoadHistory]);

  // ============================================================================
  // 💬 메시지 전송 (핵심 기능)
  // ============================================================================

  const sendMessage = useCallback(async (message: string, model?: string) => {
    if (!message.trim()) {
      setError('메시지를 입력해주세요');
      return;
    }

    if (isLoading) {
      console.warn('⚠️ 이미 메시지 처리 중입니다');
      return;
    }

    const startTime = Date.now();
    const effectiveModel = model || selectedModel;
    const userMessageId = `user_${Date.now()}`;
    const aiMessageId = `ai_${Date.now()}`;

    // 사용자 메시지 즉시 추가
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: message,
      timestamp: new Date(),
      model: effectiveModel
    };

    // 로딩 상태의 AI 메시지 추가
    const loadingMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: effectiveModel,
      loading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);
    setError(null);
    setConnectionStatus('connecting');
    lastMessageRef.current = { message, model: effectiveModel };

    console.log(`💬 메시지 전송: "${message.substring(0, 50)}..." (모델: ${effectiveModel})`);

    try {
      // 실제 백엔드 API 호출
      const response = await chatAPI.sendMessage(message, effectiveModel, passport?.did);
      
      if (response.success) {
        const responseTime = Date.now() - startTime;
        
        // AI 응답으로 로딩 메시지 교체
        const aiResponseMessage: ChatMessage = {
          id: aiMessageId,
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          model: response.model || effectiveModel,
          cueReward: response.cueReward || 0,
          loading: false
        };

        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId ? aiResponseMessage : msg
          )
        );

        // 통계 업데이트
        setLastCueReward(response.cueReward || 0);
        setTotalCueEarned(prev => prev + (response.cueReward || 0));
        setMessageCount(prev => prev + 1);
        setResponseTimes(prev => [...prev.slice(-19), responseTime]); // 최근 20개만 유지
        setConnectionStatus('connected');

        console.log(`✅ AI 응답 완료 (${responseTime}ms, CUE: ${response.cueReward || 0})`);
        
      } else {
        throw new Error(response.error || 'AI 응답 생성 실패');
      }

    } catch (error: any) {
      console.error('❌ 메시지 전송 실패:', error);
      
      setErrorCount(prev => prev + 1);
      setConnectionStatus('error');
      
      // 에러 메시지로 로딩 메시지 교체
      const errorMessage: ChatMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: `죄송합니다. 메시지 처리 중 오류가 발생했습니다: ${error.message}`,
        timestamp: new Date(),
        model: effectiveModel,
        error: true,
        loading: false
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId ? errorMessage : msg
        )
      );

      setError(`메시지 전송 실패: ${error.message}`);
      
      // 연결 상태에 따른 폴백 처리
      if (!backendConnected || error.message.includes('fetch')) {
        await handleOfflineResponse(message, effectiveModel, aiMessageId);
      }
    } finally {
      setIsLoading(false);
      
      // 메시지 수 제한 적용
      setMessages(prev => 
        prev.length > maxMessages ? prev.slice(-maxMessages) : prev
      );
    }
  }, [isLoading, selectedModel, passport?.did, chatAPI, backendConnected, maxMessages]);

  // ============================================================================
  // 🔄 히스토리 로드
  // ============================================================================

  const loadChatHistory = async (): Promise<void> => {
    if (!passport?.did) {
      console.log('⚠️ 사용자 DID 없음 - 히스토리 로드 생략');
      return;
    }

    console.log('📋 채팅 히스토리 로드 중...');

    try {
      const response = await fetch(`http://localhost:3001/api/ai/history/${passport.did}?limit=50`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.history) {
          const historyMessages: ChatMessage[] = data.history.map((msg: any) => ({
            id: msg.id || `history_${Date.now()}_${Math.random()}`,
            role: msg.message_type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at || msg.timestamp),
            model: msg.ai_model,
            cueReward: msg.cue_tokens_earned || 0
          }));

          setMessages(historyMessages);
          
          // 통계 업데이트
          const totalCue = historyMessages
            .filter(msg => msg.role === 'assistant')
            .reduce((sum, msg) => sum + (msg.cueReward || 0), 0);
          
          setTotalCueEarned(totalCue);
          setMessageCount(historyMessages.filter(msg => msg.role === 'user').length);
          
          console.log(`✅ 히스토리 로드 완료: ${historyMessages.length}개 메시지`);
        }
      } else {
        console.warn('⚠️ 히스토리 로드 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 히스토리 로드 오류:', error);
    }
  };

  // ============================================================================
  // 🛠️ 오프라인 폴백 처리
  // ============================================================================

  const handleOfflineResponse = async (
    message: string, 
    model: string, 
    messageId: string
  ): Promise<void> => {
    console.log('📱 오프라인 모드 - 로컬 응답 생성');

    const offlineResponses = [
      `"${message}"에 대한 답변을 드리고 싶지만, 현재 AI 서비스에 연결할 수 없습니다.`,
      '현재 오프라인 모드입니다. 네트워크 연결을 확인하고 다시 시도해주세요.',
      '서버와의 연결이 끊어졌습니다. 잠시 후 다시 시도해주시거나 설정을 확인해주세요.'
    ];

    const randomResponse = offlineResponses[Math.floor(Math.random() * offlineResponses.length)];

    const offlineMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: randomResponse,
      timestamp: new Date(),
      model: `${model}-offline`,
      cueReward: 0,
      error: true
    };

    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? offlineMessage : msg
      )
    );
  };

  // ============================================================================
  // 🔄 재시도 기능
  // ============================================================================

  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!lastMessageRef.current) {
      setError('재시도할 메시지가 없습니다');
      return;
    }

    const { message, model } = lastMessageRef.current;
    console.log('🔄 마지막 메시지 재시도:', message.substring(0, 30));
    
    await sendMessage(message, model);
  }, [sendMessage]);

  // ============================================================================
  // 🤖 사용 가능한 모델 조회
  // ============================================================================

  const getAvailableModels = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch('http://localhost:3001/api/ai/models');
      
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((model: any) => model.id) || ['gpt-4', 'claude-3-sonnet'];
      }
    } catch (error) {
      console.warn('⚠️ 모델 목록 조회 실패:', error);
    }
    
    // 기본 모델 목록
    return ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'];
  }, []);

  // ============================================================================
  // 🧹 유틸리티 함수들
  // ============================================================================

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setLastCueReward(0);
    setMessageCount(0);
    setResponseTimes([]);
    setErrorCount(0);
    console.log('🧹 채팅 메시지 초기화 완료');
  }, []);

  const exportHistory = useCallback((): ChatMessage[] => {
    return [...messages];
  }, [messages]);

  // ============================================================================
  // 📊 통계 계산
  // ============================================================================

  const stats = {
    totalMessages: messageCount,
    totalCueEarned,
    averageResponseTime: responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0,
    errorRate: messageCount > 0 
      ? Math.round((errorCount / messageCount) * 100) 
      : 0
  };

  // ============================================================================
  // 🔄 모델 변경 처리
  // ============================================================================

  const handleSetSelectedModel = useCallback((model: string) => {
    setSelectedModel(model);
    console.log(`🤖 AI 모델 변경: ${model}`);
  }, []);

  // ============================================================================
  // 📤 반환값
  // ============================================================================

  return {
    // 상태
    messages,
    isLoading,
    error,
    connectionStatus,
    selectedModel,
    lastCueReward,
    totalCueEarned,
    messageCount,
    
    // 액션
    sendMessage,
    setSelectedModel: handleSetSelectedModel,
    clearMessages,
    retryLastMessage,
    loadHistory: loadChatHistory,
    getAvailableModels,
    exportHistory,
    
    // 통계
    stats
  };
};

// ============================================================================
// 📤 추가 유틸리티 훅들
// ============================================================================

/**
 * 채팅 히스토리를 로컬 스토리지에 저장/복원하는 훅
 */
export const useChatPersistence = (userDid?: string) => {
  const storageKey = `chat_history_${userDid || 'anonymous'}`;

  const saveMessages = useCallback((messages: ChatMessage[]) => {
    try {
      const dataToSave = {
        messages,
        timestamp: new Date().toISOString(),
        userDid
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      console.log(`💾 채팅 히스토리 저장됨: ${messages.length}개 메시지`);
    } catch (error) {
      console.warn('⚠️ 로컬 저장 실패:', error);
    }
  }, [storageKey, userDid]);

  const loadMessages = useCallback((): ChatMessage[] => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        console.log(`💾 로컬 히스토리 로드됨: ${data.messages?.length || 0}개 메시지`);
        return data.messages || [];
      }
    } catch (error) {
      console.warn('⚠️ 로컬 로드 실패:', error);
    }
    return [];
  }, [storageKey]);

  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log('🧹 로컬 히스토리 삭제됨');
    } catch (error) {
      console.warn('⚠️ 로컬 삭제 실패:', error);
    }
  }, [storageKey]);

  return { saveMessages, loadMessages, clearStorage };
};

/**
 * 실시간 채팅 상태를 관리하는 훅
 */
export const useChatRealtime = (userDid?: string, enabled: boolean = false) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !userDid) return;

    console.log('🔗 실시간 채팅 연결 시도...');

    try {
      const wsUrl = `ws://localhost:3001/chat?userDid=${userDid}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ 실시간 채팅 연결됨');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'online_users':
              setOnlineUsers(data.users || []);
              break;
            case 'user_typing':
              setTypingUsers(prev => 
                prev.includes(data.userDid) ? prev : [...prev, data.userDid]
              );
              break;
            case 'user_stopped_typing':
              setTypingUsers(prev => prev.filter(id => id !== data.userDid));
              break;
          }
        } catch (error) {
          console.warn('⚠️ 실시간 메시지 파싱 실패:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('❌ 실시간 채팅 오류:', error);
      };

      socket.onclose = () => {
        console.log('🔌 실시간 채팅 연결 종료');
      };

    } catch (error) {
      console.warn('⚠️ 실시간 채팅 초기화 실패:', error);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [enabled, userDid]);

  const sendTyping = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        userDid
      }));
    }
  }, [userDid]);

  const sendStoppedTyping = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'stopped_typing',
        userDid
      }));
    }
  }, [userDid]);

  return {
    onlineUsers,
    typingUsers,
    sendTyping,
    sendStoppedTyping,
    isConnected: socketRef.current?.readyState === WebSocket.OPEN
  };
};

/**
 * AI 모델 선택을 관리하는 훅
 */
export const useModelSelector = () => {
  const [availableModels, setAvailableModels] = useState<Array<{
    id: string;
    name: string;
    provider: string;
    available: boolean;
    recommended?: boolean;
  }>>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [loading, setLoading] = useState(false);

  const loadModels = useCallback(async () => {
    setLoading(true);
    console.log('🤖 사용 가능한 AI 모델 조회 중...');

    try {
      const response = await fetch('http://localhost:3001/api/ai/models');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.models) {
          setAvailableModels(data.models);
          console.log(`✅ AI 모델 로드 완료: ${data.models.length}개`);
          
          // 권장 모델이 있으면 자동 선택
          const recommendedModel = data.models.find((model: any) => model.recommended);
          if (recommendedModel && recommendedModel.available) {
            setSelectedModel(recommendedModel.id);
          }
        }
      } else {
        throw new Error('모델 목록 조회 실패');
      }
    } catch (error) {
      console.warn('⚠️ 모델 로드 실패, 기본 모델 사용:', error);
      
      // 기본 모델 목록
      setAvailableModels([
        { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', available: false },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', available: false },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', available: false },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', available: false }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const selectModel = useCallback((modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(modelId);
      console.log(`🤖 AI 모델 선택: ${model.name} (${model.provider})`);
    }
  }, [availableModels]);

  return {
    availableModels,
    selectedModel,
    loading,
    selectModel,
    refreshModels: loadModels
  };
};

// ============================================================================
// 📤 기본 export
// ============================================================================

export default useChat;