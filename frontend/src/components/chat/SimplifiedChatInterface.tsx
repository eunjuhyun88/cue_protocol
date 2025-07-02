// ============================================================================
// 💬 간소화된 채팅 인터페이스 (Ollama + HuggingFace)
// 경로: frontend/src/components/chat/SimplifiedChatInterface.tsx
// 특징: 클라우드 제거, HuggingFace 무료 모델 추가, 깔끔한 UI
// ============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Zap, Settings, Mic, Code, MessageSquare, Brain, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  model?: string;
  provider?: 'ollama' | 'huggingface' | 'mock';
  cueTokensEarned?: number;
  responseTimeMs?: number;
  tokensUsed?: number;
  isError?: boolean;
}

interface AIModel {
  id: string;
  name: string;
  provider: 'ollama' | 'huggingface';
  description: string;
  available: boolean;
  type: 'local' | 'cloud';
  speed: 'very-fast' | 'fast' | 'moderate' | 'slow';
  category: 'general' | 'coding' | 'conversation';
  recommended?: boolean;
  free?: boolean;
}

interface ModelCategories {
  ultraFast: AIModel[];
  balanced: AIModel[];
  coding: AIModel[];
  conversation: AIModel[];
}

interface SimplifiedChatInterfaceProps {
  passport?: any;
  backendConnected: boolean;
  user?: any;
  onCueMining?: (amount: number) => void;
}

export const SimplifiedChatInterface: React.FC<SimplifiedChatInterfaceProps> = ({
  passport,
  backendConnected,
  user,
  onCueMining
}) => {
  // State Management
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [modelCategories, setModelCategories] = useState<ModelCategories>({
    ultraFast: [],
    balanced: [],
    coding: [],
    conversation: []
  });
  const [providersStatus, setProvidersStatus] = useState({
    ollama: { connected: false, models: 0 },
    huggingface: { available: false, models: 0 }
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ultraFast');
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // 🔄 초기화 및 상태 모니터링
  // ============================================================================
  useEffect(() => {
    initializeChat();
    loadChatHistory();
    fetchModelsAndStatus();
    
    // 30초마다 상태 확인
    const interval = setInterval(fetchModelsAndStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      content: `**🚀 AI Passport 채팅 시스템**

안녕하세요! 로컬과 클라우드 AI를 통합한 어시스턴트입니다.

**사용 가능한 AI:**
🦙 **Ollama** (로컬): 빠르고 프라이버시 보장
🤗 **HuggingFace** (무료): 다양한 특화 모델

**현재 상태:**
• 모델: ${selectedModel}
• CUE 토큰: ${passport?.cueTokens || 0}
• 백엔드: ${backendConnected ? '✅ 연결됨' : '❌ 오프라인'}

무엇을 도와드릴까요?`,
      type: 'ai',
      timestamp: new Date(),
      model: selectedModel,
      provider: 'ollama',
      cueTokensEarned: 0
    };

    setMessages([welcomeMessage]);
  };

  const fetchModelsAndStatus = async () => {
    try {
      const response = await fetch('/api/ai/models');
      const data = await response.json();
      
      if (data.success) {
        setModelCategories(data.categories || {
          ultraFast: [],
          balanced: [],
          coding: [],
          conversation: []
        });
        
        setProvidersStatus({
          ollama: data.providers?.ollama || { connected: false, models: 0 },
          huggingface: data.providers?.huggingface || { available: false, models: 0 }
        });
        
        // 추천 모델로 자동 설정
        if (data.recommended && data.recommended !== selectedModel) {
          setSelectedModel(data.recommended);
        }
      }
    } catch (error) {
      console.error('모델/상태 로드 실패:', error);
    }
  };

  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem('ai_chat_history_v2');
      if (saved) {
        const history = JSON.parse(saved);
        if (history.length > 1) {
          setMessages(history);
          return;
        }
      }
    } catch (error) {
      console.error('채팅 기록 로드 실패:', error);
    }
  };

  const saveChatHistory = useCallback((newMessages: Message[]) => {
    try {
      localStorage.setItem('ai_chat_history_v2', JSON.stringify(newMessages));
    } catch (error) {
      console.error('채팅 기록 저장 실패:', error);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ============================================================================
  // 💬 메시지 전송 (통합 API 스펙)
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    // 사용자 메시지 추가
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: messageText,
      type: 'user',
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // 통합 API 호출
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          model: selectedModel,
          user_did: user?.did || `did:final0626:${Date.now()}`,
          passport_data: passport,
          userId: user?.id || `user_${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.message) {
        // AI 응답 메시지 추가
        const aiMessage: Message = {
          id: data.message.id,
          content: data.message.content,
          type: 'ai',
          timestamp: new Date(),
          model: selectedModel,
          provider: data.message.provider,
          cueTokensEarned: data.message.cueTokensEarned || 0,
          responseTimeMs: data.message.responseTimeMs,
          tokensUsed: data.message.tokensUsed
        };

        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        saveChatHistory(finalMessages);

        // CUE 토큰 획득 알림
        if (data.message.cueTokensEarned && onCueMining) {
          onCueMining(data.message.cueTokensEarned);
        }

        console.log(`✅ 채팅 성공: ${data.message.responseTimeMs}ms, ${data.message.provider}`);
      } else {
        throw new Error(data.error || '응답 생성 실패');
      }
    } catch (error: any) {
      console.error('메시지 전송 오류:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: `❌ **연결 오류**

**문제**: ${error.message}

**해결 방법:**
1. **Ollama**: \`ollama serve\` 실행
2. **HuggingFace**: API 토큰 확인
3. **백엔드**: 서버 상태 확인

현재 상태:
• Ollama: ${providersStatus.ollama.connected ? '✅' : '❌'}
• HuggingFace: ${providersStatus.huggingface.available ? '✅' : '❌'}
• 백엔드: ${backendConnected ? '✅' : '❌'}`,
        type: 'ai',
        timestamp: new Date(),
        isError: true
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // ============================================================================
  // 🎨 UI 렌더링 함수들
  // ============================================================================
  const getProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'ollama': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'huggingface': return <HelpCircle className="w-4 h-4 text-orange-500" />;
      default: return <Bot className="w-4 h-4 text-gray-400" />;
    }
  };

  const getProviderBadge = (provider?: string) => {
    const colors = {
      ollama: 'bg-purple-100 text-purple-800',
      huggingface: 'bg-orange-100 text-orange-800',
      mock: 'bg-gray-100 text-gray-800'
    };
    return colors[provider as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ultraFast': return <Zap className="w-4 h-4 text-green-600" />;
      case 'balanced': return <Brain className="w-4 h-4 text-blue-600" />;
      case 'coding': return <Code className="w-4 h-4 text-purple-600" />;
      case 'conversation': return <MessageSquare className="w-4 h-4 text-orange-600" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getCategoryName = (category: string) => {
    const names = {
      ultraFast: '🚀 초고속',
      balanced: '⚖️ 균형형',
      coding: '💻 코딩',
      conversation: '💬 대화형'
    };
    return names[category as keyof typeof names] || category;
  };

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-xs">
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
        providersStatus.ollama.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <Zap className="w-3 h-3" />
        <span>Ollama ({providersStatus.ollama.models})</span>
      </div>
      
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
        providersStatus.huggingface.available ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
      }`}>
        <HelpCircle className="w-3 h-3" />
        <span>HF ({providersStatus.huggingface.models})</span>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg">
      {/* 헤더 */}
      <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-purple-50 to-orange-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-orange-500 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">통합 AI 어시스턴트</h2>
              <p className="text-sm text-gray-500">
                로컬 + 클라우드 • {passport?.cueTokens || 0} CUE
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ConnectionStatus />
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">{selectedModel.split(':')[0] || selectedModel}</span>
            </button>
          </div>
        </div>

        {/* 모델 선택기 */}
        {showModelSelector && (
          <div className="bg-white rounded-lg border p-4 space-y-4">
            {/* 카테고리 탭 */}
            <div className="flex space-x-2 overflow-x-auto">
              {Object.entries(modelCategories).map(([key, models]) => (
                models.length > 0 && (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      activeCategory === key
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getCategoryIcon(key)}
                    {getCategoryName(key)}
                    <span className="bg-white px-1 rounded text-xs">{models.length}</span>
                  </button>
                )
              ))}
            </div>

            {/* 모델 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {modelCategories[activeCategory as keyof ModelCategories]?.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedModel === model.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{model.name}</span>
                    {model.recommended && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">추천</span>
                    )}
                    {model.free && (
                      <span className="text-xs bg-green-100 text-green-800 px-1 rounded">무료</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{model.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      model.provider === 'ollama' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {model.provider === 'ollama' ? '로컬' : '클라우드'}
                    </span>
                    <span className="text-xs text-gray-500">{model.speed}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : message.isError
                  ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* AI 메시지 메타데이터 */}
              {message.type === 'ai' && !message.isError && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    {getProviderIcon(message.provider)}
                    <span className={`px-2 py-1 rounded-full text-xs ${getProviderBadge(message.provider)}`}>
                      {message.provider}
                    </span>
                  </div>
                  
                  {message.cueTokensEarned && message.cueTokensEarned > 0 && (
                    <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      +{message.cueTokensEarned} CUE
                    </div>
                  )}
                  
                  {message.responseTimeMs && (
                    <span className="text-xs text-gray-500">
                      {message.responseTimeMs}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm text-gray-500">AI 처리 중...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${selectedModel}에게 메시지를 입력하세요...`}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          {/* 상태 표시 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>모델: {selectedModel.split(':')[0]}</span>
              <span>CUE: {passport?.cueTokens || 0}</span>
              <span>대화: {messages.length - 1}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`${
                providersStatus.ollama.connected || providersStatus.huggingface.available 
                  ? 'text-green-600' : 'text-red-600'
              }`}>
                {providersStatus.ollama.connected || providersStatus.huggingface.available 
                  ? '🟢 AI 연결됨' : '🔴 AI 오프라인'}
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};