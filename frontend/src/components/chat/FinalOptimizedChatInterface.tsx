// ============================================================================
// 🏆 최종 권장 프론트엔드 (OptimizedChatInterface 기반)
// 경로: frontend/src/components/chat/FinalOptimizedChatInterface.tsx
// 특징: 간단한 UI + 23개 Ollama 모델 + 백엔드 완전 호환
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Paperclip, Settings, Zap, Brain, Globe, Bot } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  provider?: 'ollama' | 'openai' | 'claude' | 'mock';
  model?: string;
  tokensUsed?: number;
  cueTokensEarned?: number;
  responseTimeMs?: number;
  isError?: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  available: boolean;
  type: 'local' | 'cloud';
  speed: string;
  category: string;
  recommended?: boolean;
  cueBonus?: number;
}

interface ProvidersStatus {
  ollama: {
    connected: boolean;
    models: number;
    availableModels: string[];
  };
}

const FinalOptimizedChatInterface: React.FC<{
  passport?: any;
  user?: any;
  backendConnected?: boolean;
  onCueEarned?: (amount: number) => void;
}> = ({ passport, user, backendConnected = true, onCueEarned }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [providersStatus, setProvidersStatus] = useState<ProvidersStatus>({
    ollama: { connected: false, models: 0, availableModels: [] }
  });
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ============================================================================
  // 🔄 초기화 및 상태 모니터링
  // ============================================================================
  useEffect(() => {
    initializeChat();
    loadModelsAndStatus();
    
    // 30초마다 상태 확인
    const interval = setInterval(loadModelsAndStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = () => {
    setMessages([{
      id: 'welcome',
      content: `**🦙 AI Passport 채팅 시스템**

안녕하세요! 23개의 Ollama 모델을 활용한 개인화된 AI 어시스턴트입니다.

**현재 설정:**
• **모델**: ${selectedModel} (초고속)
• **CUE 토큰**: ${passport?.cueTokens || 0}
• **개인화**: ${passport?.personalityProfile?.type || '학습 중...'}

**특징:**
🚀 **초고속 모델**: 1-3B (실시간 응답, +3 CUE)
⚖️ **균형형 모델**: 3-8B (품질+속도, +2 CUE)  
💻 **코딩 특화**: DeepSeek, CodeLlama (+1 CUE)

무엇을 도와드릴까요?`,
      type: 'ai',
      timestamp: new Date(),
      provider: 'ollama'
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModelsAndStatus = async () => {
    try {
      const response = await fetch('/api/ai/models');
      if (response.ok) {
        const data = await response.json();
        
        // 모델 목록 설정
        if (data.models) {
          setAvailableModels(data.models);
        }
        
        // Ollama 상태 설정
        if (data.ollama) {
          setProvidersStatus({
            ollama: data.ollama
          });
        }
        
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
  // 💬 메시지 전송 (백엔드 API 호환)
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
      // 백엔드 API 호출 (paste.txt 스펙에 맞춤)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel,
          user_did: user?.did || `did:final0626:${Date.now()}`,
          passport_data: passport,
          userId: user?.id || `user_${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.message) {
        const aiMessage: Message = {
          id: data.message.id,
          content: data.message.content,
          type: 'ai',
          timestamp: new Date(),
          model: selectedModel,
          provider: data.message.provider,
          tokensUsed: data.message.tokensUsed,
          cueTokensEarned: data.message.cueTokensEarned,
          responseTimeMs: data.message.responseTimeMs
        };

        setMessages(prev => [...prev, aiMessage]);
        
        // CUE 토큰 획득 알림
        if (data.message.cueTokensEarned && onCueEarned) {
          onCueEarned(data.message.cueTokensEarned);
        }

        console.log(`✅ 채팅 성공: ${data.message.responseTimeMs}ms, +${data.message.cueTokensEarned} CUE`);
      } else {
        throw new Error(data.error || '응답 생성 실패');
      }
    } catch (error: any) {
      console.error('메시지 전송 오류:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `❌ **연결 오류**

**문제**: ${error.message}

**해결 방법:**
1. **Ollama 서버**: \`ollama serve\` 실행
2. **모델 확인**: \`ollama list\` 
3. **백엔드 확인**: http://localhost:3001/health

**현재 상태:**
• Ollama: ${providersStatus.ollama.connected ? '✅ 연결됨' : '❌ 오프라인'}
• 모델 수: ${providersStatus.ollama.models}개
• 백엔드: ${backendConnected ? '✅ 연결됨' : '❌ 오프라인'}`,
        type: 'ai',
        timestamp: new Date(),
        provider: 'error',
        isError: true
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
      case 'error': return <div className="w-4 h-4 bg-red-500 rounded-full" />;
      default: return <Bot className="w-4 h-4 text-gray-400" />;
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

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'very-fast': return 'text-green-600';
      case 'fast': return 'text-blue-600';
      case 'moderate': return 'text-yellow-600';
      case 'slow': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  // 카테고리별 모델 분류
  const categorizeModels = () => {
    const categories = {
      ultraFast: availableModels.filter(m => m.speed === 'very-fast'),
      balanced: availableModels.filter(m => m.speed === 'fast'),
      coding: availableModels.filter(m => m.category === 'coding'),
      advanced: availableModels.filter(m => ['moderate', 'slow', 'very-slow'].includes(m.speed) && m.category !== 'coding'),
      cloud: availableModels.filter(m => m.type === 'cloud')
    };
    return categories;
  };

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-xs">
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
        providersStatus.ollama.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <Zap className="w-3 h-3" />
        <span>Ollama ({providersStatus.ollama.models})</span>
        <div className={`w-2 h-2 rounded-full ${
          providersStatus.ollama.connected ? 'bg-green-500' : 'bg-red-500'
        }`} />
      </div>
      
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
        backendConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <Bot className="w-3 h-3" />
        <span>백엔드</span>
        <div className={`w-2 h-2 rounded-full ${
          backendConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            AI Passport 채팅
          </h3>
          <ConnectionStatus />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            {passport?.cueTokens || 0} CUE
          </div>
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">{selectedModel}</span>
          </button>
        </div>
      </div>

      {/* 간소화된 모델 선택기 */}
      {showModelSelector && (
        <div className="p-4 border-b bg-gray-50">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              🦙 사용 가능한 모델 ({availableModels.length}개)
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {availableModels.slice(0, 12).map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }}
                  className={`p-2 text-left text-sm rounded-lg border transition-colors ${
                    selectedModel === model.id
                      ? 'bg-purple-100 border-purple-300 text-purple-800'
                      : 'bg-white border-gray-200 hover:bg-purple-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">
                      {model.name.replace('🦙 ', '')}
                    </span>
                    {model.recommended && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">★</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={getSpeedColor(model.speed)}>
                      {model.speed === 'very-fast' ? '매우빠름' : 
                       model.speed === 'fast' ? '빠름' : 
                       model.speed === 'moderate' ? '보통' : '느림'}
                    </span>
                    {model.cueBonus && (
                      <span className="text-yellow-600">+{model.cueBonus} CUE</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {availableModels.length > 12 && (
              <p className="text-xs text-gray-500 text-center">
                + {availableModels.length - 12}개 모델 더 사용 가능
              </p>
            )}
          </div>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg ${
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
                <span className="text-sm text-gray-500">{selectedModel} 처리 중...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`${selectedModel}에게 메시지를 입력하세요... (Enter로 전송)`}
              className="w-full p-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={isLoading}
            />
            
            {/* 입력 도구들 */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button 
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="파일 첨부"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button 
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="음성 입력"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="메시지 전송"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* 하단 상태바 */}
        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span>모델: {selectedModel.split(':')[0]}</span>
            <span>대화: {Math.max(0, messages.length - 1)}</span>
            <span>CUE: {passport?.cueTokens || 0}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`${
              providersStatus.ollama.connected && backendConnected
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {providersStatus.ollama.connected && backendConnected
                ? '🟢 시스템 정상' : '🔴 연결 확인 필요'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalOptimizedChatInterface;