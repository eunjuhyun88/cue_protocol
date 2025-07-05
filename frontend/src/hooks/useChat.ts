// ============================================================================
// 💬 useChat Hook - 완전 통합 최적화 버전
// 파일: frontend/src/hooks/useChat.ts
// 특징: 정교한 대화 세션 관리 + 실시간 채팅 + 모듈화 구조
// ============================================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatAPI, ChatMessage, ChatResponse, ModelInfo, AIServiceStatus } from '../services/api/ChatAPI';
import { useAuth } from './useAuth';
import { useSocket } from './useSocket';

// 타입 정의 추가 (기존 프로젝트 타입과 호환)
interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'mock' | 'unknown';
  available: boolean;
  description: string;
}

interface AIServiceStatus {
  overall: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    primaryProvider: string;
  };
  providers: {
    [key: string]: {
      available: boolean;
      latency: number;
    };
  };
}

// 기존 Message 타입과 호환되는 ChatMessage 정의
interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: string;
  model?: string;
  tokensUsed?: number;
  cueEarned?: number;
  conversationId?: string;
  metadata?: {
    processingTime?: number;
    isOfflineResponse?: boolean;
    originalMessage?: string;
    timestamp: string;
    [key: string]: any;
  };
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentModel: string;
  conversationId: string | null;
  isTyping: boolean;
  lastResponse: ChatResponse | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  messageStats: {
    totalMessages: number;
    totalCueEarned: number;
    totalTokensUsed: number;
    averageProcessingTime: number;
    errorRate: number;
  };
}

interface RealtimeState {
  onlineUsers: string[];
  typingUsers: string[];
  isConnected: boolean;
}

interface UseChatOptions {
  passport?: any;
  autoLoadHistory?: boolean;
  maxMessages?: number;
  enableRealtime?: boolean;
  enablePersistence?: boolean;
}

interface UseChatReturn {
  // 기본 상태
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentModel: string;
  conversationId: string | null;
  isTyping: boolean;
  connectionStatus: ChatState['connectionStatus'];
  messageStats: ChatState['messageStats'];
  
  // 실시간 상태
  onlineUsers: string[];
  typingUsers: string[];
  isRealtimeConnected: boolean;
  
  // 핵심 액션
  sendMessage: (message: string, options?: SendMessageOptions) => Promise<ChatResponse | null>;
  setModel: (model: string) => void;
  clearChat: () => void;
  startNewConversation: () => string;
  clearError: () => void;
  
  // 모델 관리
  availableModels: ModelInfo[];
  loadModels: () => Promise<void>;
  serviceStatus: AIServiceStatus | null;
  checkServiceStatus: () => Promise<void>;
  
  // 히스토리 관리
  loadHistory: (options?: { limit?: number; conversationId?: string }) => Promise<void>;
  exportChat: () => string;
  saveChatLocal: () => void;
  loadChatLocal: () => void;
  
  // 실시간 기능
  sendTyping: () => void;
  sendStoppedTyping: () => void;
  
  // 유틸리티
  retryLastMessage: () => Promise<void>;
  getDebugInfo: () => any;
  getStats: () => ChatState['messageStats'];
}

interface SendMessageOptions {
  model?: string;
  personalizedContext?: any;
  passportData?: any;
  skipPersistence?: boolean;
}

// ============================================================================
// 💬 통합 최적화된 useChat Hook
// ============================================================================

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    passport,
    autoLoadHistory = true,
    maxMessages = 100,
    enableRealtime = true,
    enablePersistence = true
  } = options;

  const { user } = useAuth();
  const chatAPI = useRef<ChatAPI>(new ChatAPI());
  
  // ============================================================================
  // 🔧 상태 관리
  // ============================================================================
  
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    currentModel: 'personalized-agent',
    conversationId: null,
    isTyping: false,
    lastResponse: null,
    connectionStatus: 'disconnected',
    messageStats: {
      totalMessages: 0,
      totalCueEarned: 0,
      totalTokensUsed: 0,
      averageProcessingTime: 0,
      errorRate: 0
    }
  });

  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    onlineUsers: [],
    typingUsers: [],
    isConnected: false
  });

  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [serviceStatus, setServiceStatus] = useState<AIServiceStatus | null>(null);
  
  // 요청 중복 방지 및 통계 추적
  const sendingRef = useRef<boolean>(false);
  const lastMessageRef = useRef<{ message: string; options?: SendMessageOptions } | null>(null);
  const responseTimes = useRef<number[]>([]);
  const errorCount = useRef<number>(0);

  // ============================================================================
  // 🔗 실시간 소켓 연결
  // ============================================================================
  
  const { socket, isConnected: socketConnected, sendEvent } = useSocket({
    enabled: enableRealtime,
    userId: user?.did,
    autoConnect: true
  });

  // 실시간 이벤트 핸들러
  useEffect(() => {
    if (!socket || !enableRealtime) return;

    // 온라인 사용자 목록 업데이트
    socket.on('online_users', (users: string[]) => {
      setRealtimeState(prev => ({ ...prev, onlineUsers: users }));
    });

    // 타이핑 상태 업데이트
    socket.on('user_typing', (data: { userDid: string }) => {
      setRealtimeState(prev => ({
        ...prev,
        typingUsers: prev.typingUsers.includes(data.userDid) 
          ? prev.typingUsers 
          : [...prev.typingUsers, data.userDid]
      }));
    });

    socket.on('user_stopped_typing', (data: { userDid: string }) => {
      setRealtimeState(prev => ({
        ...prev,
        typingUsers: prev.typingUsers.filter(id => id !== data.userDid)
      }));
    });

    // 실시간 메시지 수신 (다른 사용자 채팅)
    socket.on('new_message', (data: { message: ChatMessage; fromUser: string }) => {
      if (data.fromUser !== user?.did) {
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, data.message]
        }));
      }
    });

    // 연결 상태 업데이트
    socket.on('connect', () => {
      setRealtimeState(prev => ({ ...prev, isConnected: true }));
      setChatState(prev => ({ ...prev, connectionStatus: 'connected' }));
    });

    socket.on('disconnect', () => {
      setRealtimeState(prev => ({ ...prev, isConnected: false }));
      setChatState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    });

    return () => {
      socket.off('online_users');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.off('new_message');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, enableRealtime, user?.did]);

  // ============================================================================
  // 💬 핵심 메시지 전송 기능
  // ============================================================================
  
  const sendMessage = useCallback(async (
    message: string, 
    options: SendMessageOptions = {}
  ): Promise<ChatResponse | null> => {
    
    // 중복 전송 방지
    if (sendingRef.current) {
      console.log('⏳ 이미 메시지 전송 중 - 요청 무시');
      return null;
    }

    if (!message || message.trim().length === 0) {
      setChatState(prev => ({ ...prev, error: '메시지를 입력해주세요.' }));
      return null;
    }

    console.log('💬 === 메시지 전송 시작 ===');
    console.log(`📝 내용: "${message.substring(0, 100)}..."`);
    console.log(`🎯 모델: ${options.model || chatState.currentModel}`);

    const startTime = Date.now();
    sendingRef.current = true;
    lastMessageRef.current = { message, options };

    // 상태 업데이트 (로딩 시작)
    setChatState(prev => ({
      ...prev,
      isLoading: true,
      isTyping: true,
      error: null,
      connectionStatus: 'connecting'
    }));

    try {
      // 사용자 메시지를 즉시 UI에 추가
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        content: message,
        type: 'user',
        timestamp: new Date().toISOString(),
        conversationId: chatState.conversationId || undefined
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage]
      }));

      // 실시간으로 타이핑 중지 신호 전송
      if (enableRealtime && socket) {
        sendEvent('stopped_typing', { userDid: user?.did });
      }

      // AI 응답 요청 (기존 ChatAPI 시그니처에 맞춰 수정)
      const response = await chatAPI.current.sendChatMessage(
        message,
        options.model || chatState.currentModel,
        passport || {
          did: user?.did || 'anonymous',
          username: user?.username,
          cueBalance: user?.cueBalance,
          personalityProfile: passport?.personalityProfile
        }
      );

      if (!response) {
        throw new Error('AI 응답을 받지 못했습니다.');
      }

      const responseTime = Date.now() - startTime;
      responseTimes.current = [...responseTimes.current.slice(-19), responseTime];

      // AI 응답 메시지 생성
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        content: response.message,
        type: 'ai',
        timestamp: response.metadata.timestamp,
        model: response.model,
        tokensUsed: response.tokensUsed,
        cueEarned: response.cueEarned,
        conversationId: response.conversationId,
        metadata: {
          ...response.metadata,
          processingTime: responseTime
        }
      };

      // 통계 계산
      const newStats = calculateMessageStats([...chatState.messages, userMessage, aiMessage]);

      // 상태 업데이트 (성공)
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages.filter(m => m.id !== userMessage.id), userMessage, aiMessage],
        isLoading: false,
        isTyping: false,
        error: null,
        conversationId: response.conversationId,
        lastResponse: response,
        connectionStatus: 'connected',
        messageStats: newStats
      }));

      // 실시간으로 새 메시지 브로드캐스트
      if (enableRealtime && socket) {
        sendEvent('new_message', {
          message: aiMessage,
          fromUser: user?.did,
          conversationId: response.conversationId
        });
      }

      // 로컬 지속성 저장
      if (enablePersistence && !options.skipPersistence) {
        saveChatToLocal([...chatState.messages, userMessage, aiMessage]);
      }

      // 메시지 수 제한 적용
      if (chatState.messages.length >= maxMessages) {
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.slice(-maxMessages)
        }));
      }

      console.log('✅ 메시지 전송 완료:', {
        model: response.model,
        tokensUsed: response.tokensUsed,
        cueEarned: response.cueEarned,
        processingTime: responseTime
      });

      return response;

    } catch (error: any) {
      console.error('❌ 메시지 전송 실패:', error);
      
      errorCount.current++;
      
      // 오프라인 폴백 처리
      if (error.message.includes('fetch') || error.message.includes('network')) {
        await handleOfflineResponse(message, options.model || chatState.currentModel);
      } else {
        // 에러 상태 업데이트
        setChatState(prev => ({
          ...prev,
          isLoading: false,
          isTyping: false,
          error: error.message || 'AI 응답 생성에 실패했습니다.',
          connectionStatus: 'error'
        }));
      }

      return null;

    } finally {
      sendingRef.current = false;
    }
  }, [chatState, user, passport, enableRealtime, enablePersistence, socket, sendEvent, maxMessages]);

  // ============================================================================
  // 🛠️ 오프라인 폴백 처리
  // ============================================================================
  
  const handleOfflineResponse = useCallback(async (
    message: string, 
    model: string
  ): Promise<void> => {
    console.log('📱 오프라인 모드 - 로컬 응답 생성');

    const offlineResponses = [
      `"${message}"에 대한 답변을 드리고 싶지만, 현재 AI 서비스에 연결할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요.`,
      '현재 오프라인 모드입니다. 인터넷 연결이 복구되면 자동으로 재연결됩니다.',
      '서버와의 연결이 일시적으로 끊어졌습니다. 잠시 후 다시 시도해주시거나 네트워크 설정을 확인해주세요.'
    ];

    const randomResponse = offlineResponses[Math.floor(Math.random() * offlineResponses.length)];

    const offlineMessage: ChatMessage = {
      id: `msg_${Date.now()}_offline`,
      content: randomResponse,
      type: 'ai',
      timestamp: new Date().toISOString(),
      model: `${model}-offline`,
      metadata: {
        isOfflineResponse: true,
        originalMessage: message,
        timestamp: new Date().toISOString()
      }
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, offlineMessage],
      isLoading: false,
      isTyping: false,
      connectionStatus: 'error'
    }));
  }, []);

  // ============================================================================
  // 🔧 모델 및 상태 관리
  // ============================================================================
  
  const setModel = useCallback((model: string) => {
    console.log(`🎯 AI 모델 변경: ${chatState.currentModel} → ${model}`);
    setChatState(prev => ({ ...prev, currentModel: model }));
  }, [chatState.currentModel]);

  const loadModels = useCallback(async () => {
    try {
      console.log('📋 AI 모델 목록 로드 중...');
      // 기존 ChatAPI.getAvailableModels 시그니처에 맞춰 수정
      const models = await chatAPI.current.getAvailableModels();
      
      // string[] 형태로 반환되므로 ModelInfo 형태로 변환
      const modelInfos: ModelInfo[] = models.map(modelId => ({
        id: modelId,
        name: modelId.toUpperCase(),
        provider: modelId.includes('gpt') ? 'openai' : 
                 modelId.includes('claude') ? 'anthropic' : 
                 modelId.includes('gemini') ? 'google' : 'unknown',
        available: true,
        description: `${modelId} AI model`
      }));
      
      setAvailableModels(modelInfos);
      console.log(`✅ 모델 목록 로드 완료: ${modelInfos.length}개`);
    } catch (error: any) {
      console.error('❌ 모델 목록 로드 실패:', error);
      
      // 기본 모델 목록 설정
      const defaultModels: ModelInfo[] = [
        { id: 'gpt-4', name: 'GPT-4', provider: 'openai', available: false, description: 'OpenAI GPT-4' },
        { id: 'claude-3', name: 'Claude 3', provider: 'anthropic', available: false, description: 'Anthropic Claude 3' },
        { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', available: false, description: 'Google Gemini Pro' },
        { id: 'mock-ai', name: 'Mock AI', provider: 'mock', available: true, description: 'Mock AI for testing' }
      ];
      
      setAvailableModels(defaultModels);
      setChatState(prev => ({ 
        ...prev, 
        error: `모델 목록 로드 실패: ${error.message}` 
      }));
    }
  }, []);

  const checkServiceStatus = useCallback(async () => {
    try {
      console.log('📊 AI 서비스 상태 확인 중...');
      
      // ChatAPI에 getServiceStatus 메서드가 없으므로 임시 구현
      // 실제로는 기본 연결 테스트로 대체
      const testModels = await chatAPI.current.getAvailableModels();
      
      const mockServiceStatus: AIServiceStatus = {
        overall: {
          status: testModels.length > 0 ? 'healthy' : 'degraded',
          primaryProvider: 'mock'
        },
        providers: {
          openai: { available: testModels.includes('gpt-4'), latency: 120 },
          anthropic: { available: testModels.includes('claude-3'), latency: 150 },
          google: { available: testModels.includes('gemini-pro'), latency: 100 }
        }
      };
      
      setServiceStatus(mockServiceStatus);
      setChatState(prev => ({ 
        ...prev, 
        connectionStatus: mockServiceStatus.overall.status === 'healthy' ? 'connected' : 'error' 
      }));
      console.log('✅ AI 서비스 상태 확인 완료:', mockServiceStatus.overall.primaryProvider);
    } catch (error: any) {
      console.error('❌ AI 서비스 상태 확인 실패:', error);
      setServiceStatus(null);
      setChatState(prev => ({ ...prev, connectionStatus: 'error' }));
    }
  }, []);

  // ============================================================================
  // 📜 히스토리 관리
  // ============================================================================
  
  const loadHistory = useCallback(async (options: { 
    limit?: number; 
    conversationId?: string 
  } = {}) => {
    if (!user?.did) {
      console.log('👤 사용자 정보 없음 - 히스토리 로드 건너뜀');
      return;
    }

    try {
      console.log('📜 채팅 히스토리 로드 중...');
      // 기존 ChatAPI.getChatHistory 메서드 시그니처에 맞춰 수정
      const history = await chatAPI.current.getChatHistory(user.did);
      
      if (history && history.length > 0) {
        // 기존 Message 타입에 맞춰 변환
        const convertedMessages: ChatMessage[] = history.map((msg: any) => ({
          id: msg.id || `history_${Date.now()}_${Math.random()}`,
          content: msg.content,
          type: msg.type === 'user' ? 'user' : 'ai',
          timestamp: msg.timestamp || new Date().toISOString(),
          model: msg.model,
          tokensUsed: msg.tokensUsed,
          cueEarned: msg.cueTokensEarned || msg.cueEarned,
          conversationId: msg.conversationId
        }));

        setChatState(prev => ({
          ...prev,
          messages: convertedMessages,
          messageStats: calculateMessageStats(convertedMessages)
        }));
        console.log(`✅ 채팅 히스토리 로드 완료: ${convertedMessages.length}개`);
      } else {
        console.log('📜 로드할 히스토리 없음');
      }
    } catch (error: any) {
      console.error('❌ 히스토리 로드 실패:', error);
      // 로컬 히스토리 폴백
      if (enablePersistence) {
        loadChatLocal();
      }
    }
  }, [user?.did, enablePersistence]);

  // ============================================================================
  // 💾 로컬 지속성 관리
  // ============================================================================
  
  const saveChatToLocal = useCallback((messages: ChatMessage[]) => {
    if (!enablePersistence || !user?.did) return;
    
    try {
      const chatData = {
        messages,
        conversationId: chatState.conversationId,
        timestamp: new Date().toISOString(),
        userDid: user.did,
        stats: chatState.messageStats
      };
      
      const storageKey = `chat_${user.did}_${chatState.conversationId || 'default'}`;
      localStorage.setItem(storageKey, JSON.stringify(chatData));
      console.log(`💾 로컬 채팅 저장: ${messages.length}개 메시지`);
    } catch (error) {
      console.warn('⚠️ 로컬 저장 실패:', error);
    }
  }, [enablePersistence, user?.did, chatState.conversationId, chatState.messageStats]);

  const saveChatLocal = useCallback(() => {
    saveChatToLocal(chatState.messages);
  }, [saveChatToLocal, chatState.messages]);

  const loadChatLocal = useCallback(() => {
    if (!enablePersistence || !user?.did) return;
    
    try {
      const storageKey = `chat_${user.did}_${chatState.conversationId || 'default'}`;
      const saved = localStorage.getItem(storageKey);
      
      if (saved) {
        const chatData = JSON.parse(saved);
        setChatState(prev => ({
          ...prev,
          messages: chatData.messages || [],
          messageStats: chatData.stats || prev.messageStats
        }));
        console.log(`💾 로컬 채팅 로드: ${chatData.messages?.length || 0}개 메시지`);
      }
    } catch (error) {
      console.warn('⚠️ 로컬 로드 실패:', error);
    }
  }, [enablePersistence, user?.did, chatState.conversationId]);

  // ============================================================================
  // 🔗 실시간 타이핑 기능
  // ============================================================================
  
  const sendTyping = useCallback(() => {
    if (enableRealtime && socket && user?.did) {
      sendEvent('typing', { userDid: user.did });
    }
  }, [enableRealtime, socket, sendEvent, user?.did]);

  const sendStoppedTyping = useCallback(() => {
    if (enableRealtime && socket && user?.did) {
      sendEvent('stopped_typing', { userDid: user.did });
    }
  }, [enableRealtime, socket, sendEvent, user?.did]);

  // ============================================================================
  // 🔧 유틸리티 함수들
  // ============================================================================
  
  const clearChat = useCallback(() => {
    console.log('🧹 채팅 초기화');
    setChatState(prev => ({
      ...prev,
      messages: [],
      error: null,
      conversationId: null,
      lastResponse: null,
      messageStats: {
        totalMessages: 0,
        totalCueEarned: 0,
        totalTokensUsed: 0,
        averageProcessingTime: 0,
        errorRate: 0
      }
    }));
    
    responseTimes.current = [];
    errorCount.current = 0;
    chatAPI.current.clearLocalHistory();
    
    // 로컬 저장소도 초기화
    if (enablePersistence && user?.did) {
      const storageKey = `chat_${user.did}_${chatState.conversationId || 'default'}`;
      localStorage.removeItem(storageKey);
    }
  }, [enablePersistence, user?.did, chatState.conversationId]);

  const startNewConversation = useCallback((): string => {
    const newConversationId = chatAPI.current.startNewConversation();
    setChatState(prev => ({ 
      ...prev, 
      conversationId: newConversationId,
      messages: [], // 새 대화 시작 시 메시지 초기화
      error: null
    }));
    console.log(`💬 새 대화 시작: ${newConversationId}`);
    return newConversationId;
  }, []);

  const clearError = useCallback(() => {
    setChatState(prev => ({ ...prev, error: null }));
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current) {
      console.log('⚠️ 재시도할 마지막 메시지가 없습니다');
      return;
    }

    console.log('🔄 마지막 메시지 재시도');
    const { message, options } = lastMessageRef.current;
    await sendMessage(message, options);
  }, [sendMessage]);

  const exportChat = useCallback((): string => {
    const chatData = {
      conversationId: chatState.conversationId,
      model: chatState.currentModel,
      timestamp: new Date().toISOString(),
      userDid: user?.did,
      messageCount: chatState.messages.length,
      stats: chatState.messageStats,
      realtimeState,
      messages: chatState.messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model,
        tokensUsed: msg.tokensUsed,
        cueEarned: msg.cueEarned,
        metadata: msg.metadata
      }))
    };

    return JSON.stringify(chatData, null, 2);
  }, [chatState, user?.did, realtimeState]);

  const getDebugInfo = useCallback(() => {
    return {
      chatState,
      realtimeState,
      apiDebug: chatAPI.current.getDebugInfo(),
      user: user ? { did: user.did, username: user.username } : null,
      sendingInProgress: sendingRef.current,
      lastMessage: lastMessageRef.current,
      responseTimes: responseTimes.current,
      errorCount: errorCount.current,
      persistence: enablePersistence,
      realtime: enableRealtime
    };
  }, [chatState, realtimeState, user, enablePersistence, enableRealtime]);

  const getStats = useCallback(() => {
    return {
      ...chatState.messageStats,
      errorRate: chatState.messageStats.totalMessages > 0 
        ? Math.round((errorCount.current / chatState.messageStats.totalMessages) * 100)
        : 0
    };
  }, [chatState.messageStats]);

  // ============================================================================
  // 🔄 초기화 및 이펙트
  // ============================================================================
  
  useEffect(() => {
    // 컴포넌트 마운트 시 초기화
    loadModels();
    checkServiceStatus();
    
    // 사용자가 로그인되어 있으면 히스토리 로드
    if (user?.did && autoLoadHistory) {
      loadHistory({ limit: 50 });
    }
  }, [user?.did, autoLoadHistory]); // user.did 변경 시에만 실행

  // 주기적 서비스 상태 체크 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      checkServiceStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkServiceStatus]);

  // 연결 상태 복구 감지 (온라인 이벤트)
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 네트워크 온라인 - AI 서비스 재연결');
      checkServiceStatus();
      if (chatState.connectionStatus === 'error') {
        setChatState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      }
    };

    const handleOffline = () => {
      console.log('📵 네트워크 오프라인');
      setChatState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkServiceStatus, chatState.connectionStatus]);

  // ============================================================================
  // 📊 통계 계산 함수
  // ============================================================================
  
  function calculateMessageStats(messages: ChatMessage[]): ChatState['messageStats'] {
    const totalMessages = messages.length;
    const totalCueEarned = messages.reduce((sum, msg) => sum + (msg.cueEarned || 0), 0);
    const totalTokensUsed = messages.reduce((sum, msg) => sum + (msg.tokensUsed || 0), 0);
    
    const aiMessages = messages.filter(msg => msg.type === 'ai' && msg.metadata?.processingTime);
    const averageProcessingTime = aiMessages.length > 0
      ? aiMessages.reduce((sum, msg) => sum + (msg.metadata?.processingTime || 0), 0) / aiMessages.length
      : 0;

    const errorRate = totalMessages > 0 
      ? Math.round((errorCount.current / totalMessages) * 100)
      : 0;

    return {
      totalMessages,
      totalCueEarned,
      totalTokensUsed,
      averageProcessingTime: Math.round(averageProcessingTime),
      errorRate
    };
  }

  // ============================================================================
  // 📤 Return 객체
  // ============================================================================
  
  return {
    // 기본 상태
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    error: chatState.error,
    currentModel: chatState.currentModel,
    conversationId: chatState.conversationId,
    isTyping: chatState.isTyping,
    connectionStatus: chatState.connectionStatus,
    messageStats: chatState.messageStats,
    
    // 실시간 상태
    onlineUsers: realtimeState.onlineUsers,
    typingUsers: realtimeState.typingUsers,
    isRealtimeConnected: realtimeState.isConnected,
    
    // 핵심 액션
    sendMessage,
    setModel,
    clearChat,
    startNewConversation,
    clearError,
    
    // 모델 관리
    availableModels,
    loadModels,
    serviceStatus,
    checkServiceStatus,
    
    // 히스토리 관리
    loadHistory,
    exportChat,
    saveChatLocal,
    loadChatLocal,
    
    // 실시간 기능
    sendTyping,
    sendStoppedTyping,
    
    // 유틸리티
    retryLastMessage,
    getDebugInfo,
    getStats
  };
}