// ============================================================================
// 💬 최적화된 채팅 인터페이스 (Ollama 연동)
// 경로: frontend/src/components/chat/OptimizedChatInterface.tsx
// 용도: Ollama 우선, 실시간 상태 표시, 개선된 UX
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Paperclip, Settings, Zap, Brain, Globe } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  provider?: 'ollama' | 'openai' | 'claude' | 'mock';
  tokensUsed?: number;
  cueTokensEarned?: number;
  processingTime?: number;
  extractedCues?: number;
}

interface ModelInfo {
  connected: boolean;
  models: string[];
  status: 'ready' | 'disconnected' | 'error';
  error?: string;
}

interface ProvidersStatus {
  ollama: ModelInfo;
  openai: { available: boolean; models: string[] };
  claude: { available: boolean; models: string[] };
}

const OptimizedChatInterface: React.FC<{
  userId?: string;
  onCueEarned?: (amount: number) => void;
}> = ({ userId, onCueEarned }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [providersStatus, setProvidersStatus] = useState<ProvidersStatus | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ============================================================================
  // 🔄 초기화 및 상태 모니터링
  // ============================================================================
  useEffect(() => {
    loadModelsAndStatus();
    
    // 30초마다 상태 확인
    const interval = setInterval(loadModelsAndStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModelsAndStatus = async () => {
    try {
      const response = await fetch('/api/ai/models');
      if (response.ok) {
        const data = await response.json();
        setProvidersStatus(data.providers);
        
        // 추천 모델로 자동 설정
        if (data.recommended && data.recommended !== selectedModel) {
          setSelectedModel(data.recommended);
        }
      }
    } catch (error) {
      console.error('모델 상태 로드 실패:', error);
    }
  };

  // ============================================================================
  // 💬 메시지 전송
  // ============================================================================
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputMessage.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel,
          userId,
          sessionId: `session-${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: data.data.id,
          content: data.data.message,
          type: 'ai',
          timestamp: new Date(data.data.timestamp),
          provider: data.data.provider,
          tokensUsed: data.data.tokensUsed,
          cueTokensEarned: data.data.cueTokensEarned,
          processingTime: data.data.processingTime,
          extractedCues: data.data.extractedCues
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // CUE 토큰 획득 알림
        if (data.data.cueTokensEarned && onCueEarned) {
          onCueEarned(data.data.cueTokensEarned);
        }
      } else {
        throw new Error(data.error || '응답 생성 실패');
      }
    } catch (error: any) {
      console.error('메시지 전송 오류:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `오류: ${error.message}. Ollama 서버가 실행 중인지 확인해주세요.`,
        type: 'ai',
        timestamp: new Date(),
        provider: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ============================================================================
  // 🎨 UI 렌더링 함수들
  // ============================================================================
  const getProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'ollama': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'openai': return <Brain className="w-4 h-4 text-green-500" />;
      case 'claude': return <Globe className="w-4 h-4 text-blue-500" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const getProviderBadge = (provider?: string) => {
    const colors = {
      ollama: 'bg-purple-100 text-purple-800',
      openai: 'bg-green-100 text-green-800',
      claude: 'bg-blue-100 text-blue-800',
      mock: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800'
    };
    
    return colors[provider as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const ConnectionStatus = () => {
    if (!providersStatus) return null;

    const { ollama, openai, claude } = providersStatus;
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
          ollama.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <Zap className="w-3 h-3" />
          <span>Ollama</span>
          <div className={`w-2 h-2 rounded-full ${
            ollama.connected ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>
        
        {openai.available && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800">
            <Brain className="w-3 h-3" />
            <span>OpenAI</span>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        )}
        
        {claude.available && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800">
            <Globe className="w-3 h-3" />
            <span>Claude</span>
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div>
          <h3 className="font-semibold text-gray-800">AI 채팅</h3>
          <ConnectionStatus />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">{selectedModel}</span>
          </button>
        </div>
      </div>

      {/* 모델 선택기 */}
      {showModelSelector && providersStatus && (
        <div className="p-4 border-b bg-gray-50">
          <div className="space-y-3">
            {/* Ollama 모델들 */}
            {providersStatus.ollama.connected && (
              <div>
                <h4 className="text-sm font-medium text-purple-800 mb-2">
                  🦙 Ollama (로컬, 빠름)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {providersStatus.ollama.models.slice(0, 6).map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        setSelectedModel(model);
                        setShowModelSelector(false);
                      }}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        selectedModel === model
                          ? 'bg-purple-100 border-purple-300 text-purple-800'
                          : 'bg-white border-gray-200 hover:bg-purple-50'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 클라우드 모델들 */}
            {(providersStatus.openai.available || providersStatus.claude.available) && (
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  ☁️ 클라우드 모델 (백업)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {providersStatus.openai.available && 
                    providersStatus.openai.models.map((model) => (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedModel(model);
                          setShowModelSelector(false);
                        }}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          selectedModel === model
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : 'bg-white border-gray-200 hover:bg-green-50'
                        }`}
                      >
                        {model}
                      </button>
                    ))
                  }
                  {providersStatus.claude.available && 
                    providersStatus.claude.models.map((model) => (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedModel(model);
                          setShowModelSelector(false);
                        }}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          selectedModel === model
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-white border-gray-200 hover:bg-blue-50'
                        }`}
                      >
                        {model.replace('claude-3-', '').replace('-20240307', '')}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-6xl mb-4">🤖</div>
            <p className="text-lg font-medium">AI 어시스턴트와 대화해보세요</p>
            <p className="text-sm">Ollama로 빠르고 개인화된 응답을 받아보세요</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* AI 메시지 메타데이터 */}
              {message.type === 'ai' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    {getProviderIcon(message.provider)}
                    <span className={`px-2 py-1 rounded-full text-xs ${getProviderBadge(message.provider)}`}>
                      {message.provider}
                    </span>
                  </div>
                  
                  {message.cueTokensEarned && (
                    <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      +{message.cueTokensEarned} CUE
                    </div>
                  )}
                  
                  {message.processingTime && (
                    <span className="text-xs text-gray-500">
                      {message.processingTime}ms
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
                <span className="text-sm text-gray-500">AI가 생각 중...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              className="w-full p-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={isLoading}
            />
            
            {/* 추가 기능 버튼들 */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>
            {providersStatus?.ollama.connected 
              ? '🟢 Ollama 연결됨' 
              : '🔴 Ollama 연결 안됨 - 백업 서비스 사용'
            }
          </span>
          <span>{messages.length} 메시지</span>
        </div>
      </div>
    </div>
  );
};

export default OptimizedChatInterface;