// ============================================================================
// 📁 frontend/src/components/chat/EnhancedChatInterface.tsx
// 💬 로컬 Ollama 전용 채팅 인터페이스 (완전 개선)
// ============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Zap, Cpu, Brain, Settings, Mic } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { MessageList } from './MessageList';
import type { Message } from '../../types/chat.types';
import type { UnifiedAIPassport } from '../../types/passport.types';

interface EnhancedChatInterfaceProps {
  passport?: UnifiedAIPassport;
  backendConnected: boolean;
  user?: any;
  socketConnected?: boolean;
  onCueMining?: () => void;
}

interface OllamaModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  available: boolean;
  type: 'local';
  speed: 'very-fast' | 'fast' | 'moderate' | 'slow';
  recommended?: boolean;
  size?: string;
}

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  passport,
  backendConnected,
  user,
  socketConnected = false,
  onCueMining
}) => {
  // State Management
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b');
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🦙 로컬 Ollama 모델들 정의 (실제 사용자 설치 모델 기반)
  const defaultOllamaModels: OllamaModel[] = [
    {
      id: 'llama3.2:3b',
      name: '🦙 Llama 3.2 (3B)',
      provider: 'Meta/Ollama',
      description: '최적화된 3B 모델 - 2GB, 빠른 응답',
      available: true,
      type: 'local',
      speed: 'fast',
      recommended: true,
      size: '2GB'
    },
    {
      id: 'llama3.2:1b',
      name: '🚀 Llama 3.2 (1B)',
      provider: 'Meta/Ollama',
      description: '초고속 1B 모델 - 1.3GB, 실시간',
      available: true,
      type: 'local',
      speed: 'very-fast',
      recommended: true,
      size: '1.3GB'
    },
    {
      id: 'llama3.1:8b',
      name: '🧠 Llama 3.1 (8B)',
      provider: 'Meta/Ollama',
      description: '고품질 8B 모델 - 4.9GB',
      available: true,
      type: 'local',
      speed: 'moderate',
      size: '4.9GB'
    },
    {
      id: 'phi3:mini',
      name: '⚡ Phi3 Mini',
      provider: 'Microsoft/Ollama',
      description: '효율적인 소형 모델 - 2.2GB',
      available: true,
      type: 'local',
      speed: 'fast',
      size: '2.2GB'
    },
    {
      id: 'deepseek-coder:6.7b',
      name: '💻 DeepSeek Coder',
      provider: 'DeepSeek/Ollama',
      description: '코딩 전문 AI - 3.8GB',
      available: true,
      type: 'local',
      speed: 'moderate',
      size: '3.8GB'
    },
    {
      id: 'mistral:latest',
      name: '🇫🇷 Mistral 7B',
      provider: 'Mistral/Ollama',
      description: '유럽산 고품질 모델 - 4.1GB',
      available: true,
      type: 'local',
      speed: 'moderate',
      size: '4.1GB'
    }
  ];

  // 초기화
  useEffect(() => {
    initializeChat();
    loadChatHistory();
  }, []);

  // 자동 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 백엔드 연결 시 모델 목록 가져오기
  useEffect(() => {
    if (backendConnected) {
      fetchAvailableModels();
      checkOllamaConnection();
    }
  }, [backendConnected]);

  const initializeChat = () => {
    setMessages([
      {
        id: '1',
        content: `**🦙 로컬 Ollama AI 시스템 준비됨**

안녕하세요! AI Passport 기반 개인화된 로컬 AI 어시스턴트입니다.

**현재 설정:**
• **선택된 모델**: ${selectedModel}
• **개인화 레벨**: ${passport?.personalityProfile?.type || '학습 중...'}
• **CUE 토큰**: ${passport?.cueTokens || 0}
• **백엔드 상태**: ${backendConnected ? '✅ 연결됨' : '❌ 오프라인'}

무엇을 도와드릴까요?`,
        type: 'ai',
        timestamp: new Date(),
        model: selectedModel,
        cueTokensEarned: 0
      }
    ]);
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/api/ai/models');
      const data = await response.json();
      
      if (data.success) {
        const ollamaModels = data.models.filter((model: any) => model.type === 'local');
        setAvailableModels(ollamaModels.length > 0 ? ollamaModels : defaultOllamaModels);
      } else {
        setAvailableModels(defaultOllamaModels);
      }
    } catch (error) {
      console.error('모델 목록 가져오기 실패:', error);
      setAvailableModels(defaultOllamaModels);
    }
  };

  const checkOllamaConnection = async () => {
    try {
      const response = await fetch('/api/ai/ollama/health');
      const data = await response.json();
      setOllamaConnected(data.connected);
    } catch (error) {
      setOllamaConnected(false);
    }
  };

  const loadChatHistory = () => {
    // 로컬 스토리지에서 채팅 기록 로드
    try {
      const saved = localStorage.getItem('chat_history');
      if (saved) {
        const history = JSON.parse(saved);
        if (history.length > 1) { // 초기 메시지 외에 기록이 있는 경우
          setMessages(history);
        }
      }
    } catch (error) {
      console.error('채팅 기록 로드 실패:', error);
    }
  };

  const saveChatHistory = useCallback((newMessages: Message[]) => {
    try {
      localStorage.setItem('chat_history', JSON.stringify(newMessages));
    } catch (error) {
      console.error('채팅 기록 저장 실패:', error);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    // 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      type: 'user',
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // 백엔드에 메시지 전송
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          model: selectedModel,
          user_did: user?.did || 'local-user',
          passport_data: passport
        }),
      });

      const data = await response.json();

      if (data.success) {
        // AI 응답 메시지 추가
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.message.content,
          type: 'ai',
          timestamp: new Date(),
          model: selectedModel,
          cueTokensEarned: data.message.cueTokensEarned || 0,
          responseTimeMs: data.message.responseTimeMs,
          personalContext: data.personalContext
        };

        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        saveChatHistory(finalMessages);

        // CUE 마이닝 트리거
        if (onCueMining && data.message.cueTokensEarned > 0) {
          onCueMining();
        }
      } else {
        throw new Error(data.error || '응답 생성 실패');
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      
      // 에러 메시지 추가
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ **연결 오류**\n\n${backendConnected ? '서버' : 'Ollama 서버'}에 연결할 수 없습니다.\n\n**해결 방법:**\n1. Ollama가 실행 중인지 확인\n2. 백엔드 서버 상태 확인\n3. 모델이 다운로드되어 있는지 확인`,
        type: 'ai',
        timestamp: new Date(),
        model: selectedModel,
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

  const getSpeedBadgeColor = (speed: string) => {
    switch (speed) {
      case 'very-fast': return 'bg-green-100 text-green-800';
      case 'fast': return 'bg-blue-100 text-blue-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'slow': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 채팅 헤더 */}
      <div className="border-b border-gray-200 p-4 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">로컬 AI 어시스턴트</h2>
              <p className="text-sm text-gray-500">
                {passport?.personalityProfile?.type || 'Learning...'} • {passport?.cueTokens || 0} CUE
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <StatusBadge variant={ollamaConnected ? 'success' : 'warning'} size="sm">
              🦙 {ollamaConnected ? 'Ollama 연결됨' : 'Ollama 오프라인'}
            </StatusBadge>
            <StatusBadge variant={backendConnected ? 'success' : 'warning'} size="sm">
              {backendConnected ? '백엔드 연결됨' : '오프라인 모드'}
            </StatusBadge>
          </div>
        </div>

        {/* 모델 선택기 */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI 모델 선택
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedModel === model.id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{model.name}</span>
                  {model.recommended && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                      추천
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{model.description}</p>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${getSpeedBadgeColor(model.speed)}`}>
                    {model.speed === 'very-fast' ? '매우빠름' : 
                     model.speed === 'fast' ? '빠름' : 
                     model.speed === 'moderate' ? '보통' : '느림'}
                  </span>
                  {model.size && (
                    <span className="text-xs text-gray-500">{model.size}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메시지 영역 - 독립 스크롤 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* 채팅 입력 영역 - 하단 고정 */}
      <div className="border-t border-gray-200 p-4 bg-white sticky bottom-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`${selectedModel}에게 메시지를 입력하세요... (Shift+Enter로 줄바꿈)`}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={isLoading}
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsVoiceMode(!isVoiceMode)}
                className={isVoiceMode ? 'bg-red-50 border-red-200' : ''}
              >
                <Mic className={`w-4 h-4 ${isVoiceMode ? 'text-red-600' : 'text-gray-600'}`} />
              </Button>
              
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-3"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* 상태 표시 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>모델: {selectedModel}</span>
              <span>토큰: {passport?.cueTokens || 0} CUE</span>
              {isLoading && <span className="text-blue-600">AI가 응답 중...</span>}
            </div>
            
            <div className="flex items-center space-x-2">
              {socketConnected && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600">실시간</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};