// ============================================================================
// 📁 frontend/src/components/chat/ChatInterface.tsx (기존 파일 개선)
// 💬 AI 채팅 인터페이스 컴포넌트 - 로컬 Ollama 최적화
// ============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Zap, Cpu, Brain, Settings, Mic, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatusBadge } from '../ui/StatusBadge';
import { MessageList } from '../chat/MessageList';
import { ModelSelector } from '../chat/ModelSelector';
import type { Message } from '../../types/chat.types';
import type { UnifiedAIPassport } from '../../types/passport.types';

interface ChatInterfaceProps {
  passport?: UnifiedAIPassport;
  backendConnected: boolean;
  onSendMessage?: (message: string, model: string) => Promise<any>;
  messages?: Message[];
  isLoading?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  passport,
  backendConnected,
  onSendMessage,
  messages = [],
  isLoading = false
}) => {
  // 기본 상태 관리
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b'); // 🔥 기본값을 Ollama로
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState({
    connected: false,
    models: 0,
    status: 'checking'
  });
  
  // UI 상태
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 백엔드 연결 시 모델 목록 로드
  useEffect(() => {
    if (backendConnected) {
      fetchModels();
      checkOllamaStatus();
    }
  }, [backendConnected]);

  // 🔥 모델 목록 가져오기 (Ollama 우선)
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/ai/models');
      const data = await response.json();
      
      if (data.success) {
        // 로컬 모델을 먼저 정렬
        const sortedModels = data.models.sort((a: any, b: any) => {
          if (a.type === 'local' && b.type !== 'local') return -1;
          if (a.type !== 'local' && b.type === 'local') return 1;
          if (a.recommended && !b.recommended) return -1;
          if (!a.recommended && b.recommended) return 1;
          return 0;
        });
        
        setAvailableModels(sortedModels);
        
        // 첫 번째 사용 가능한 로컬 모델로 설정
        const firstLocalModel = sortedModels.find((m: any) => m.type === 'local' && m.available);
        if (firstLocalModel) {
          setSelectedModel(firstLocalModel.id);
        }
      }
    } catch (error) {
      console.error('모델 목록 가져오기 실패:', error);
    }
  };

  // 🔥 Ollama 상태 확인
  const checkOllamaStatus = async () => {
    try {
      const response = await fetch('/api/ai/ollama/health');
      const data = await response.json();
      
      setOllamaStatus({
        connected: data.connected,
        models: data.modelCount || 0,
        status: data.status || 'unknown'
      });
    } catch (error) {
      setOllamaStatus({
        connected: false,
        models: 0,
        status: 'error'
      });
    }
  };

  // 🔥 모델 다운로드
  const downloadModel = async (modelName: string) => {
    try {
      const response = await fetch('/api/ai/ollama/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`모델 ${modelName} 다운로드가 시작되었습니다.`);
        // 모델 목록 새로고침
        setTimeout(() => {
          fetchModels();
          checkOllamaStatus();
        }, 2000);
      } else {
        alert(`다운로드 실패: ${data.error}`);
      }
    } catch (error) {
      alert('다운로드 요청 실패');
    }
  };

  // 메시지 전송 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput('');

    if (onSendMessage) {
      try {
        await onSendMessage(messageText, selectedModel);
      } catch (error) {
        console.error('메시지 전송 실패:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // 모델 타입별 아이콘
  const getModelIcon = (model: any) => {
    if (model.type === 'local') return <Cpu className="w-4 h-4 text-green-600" />;
    if (model.type === 'cloud') return <Brain className="w-4 h-4 text-blue-600" />;
    return <Zap className="w-4 h-4 text-purple-600" />;
  };

  // 속도 배지 색상
  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'very-fast': return 'bg-green-100 text-green-800';
      case 'fast': return 'bg-blue-100 text-blue-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 🔥 채팅 헤더 - Ollama 상태 포함 */}
      <div className="border-b border-gray-200 p-4 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">🦙 로컬 AI 어시스턴트</h2>
              <p className="text-sm text-gray-500">
                {passport?.personalityProfile?.type || 'Learning...'} • {passport?.cueTokens || 0} CUE
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <StatusBadge variant={ollamaStatus.connected ? 'success' : 'warning'} size="sm">
              🦙 {ollamaStatus.connected ? `${ollamaStatus.models}개 모델` : 'Ollama 오프라인'}
            </StatusBadge>
            <StatusBadge variant={backendConnected ? 'success' : 'warning'} size="sm">
              {backendConnected ? '백엔드 연결됨' : '오프라인 모드'}
            </StatusBadge>
          </div>
        </div>

        {/* 🔥 간단한 모델 선택기 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI 모델 선택
          </label>
          <div className="flex items-center space-x-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.type === 'local' ? '(로컬)' : '(클라우드)'} 
                  {model.recommended ? ' ⭐' : ''}
                </option>
              ))}
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="px-3"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 🔥 상세 모델 선택기 (토글) */}
        {showModelSelector && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableModels.map((model) => (
                <div
                  key={model.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedModel === model.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      {getModelIcon(model)}
                      <span className="font-medium text-sm">{model.name}</span>
                    </div>
                    {model.recommended && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                        추천
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-2">{model.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {model.speed && (
                        <span className={`text-xs px-2 py-1 rounded ${getSpeedColor(model.speed)}`}>
                          {model.speed === 'very-fast' ? '매우빠름' : 
                           model.speed === 'fast' ? '빠름' : 
                           model.speed === 'moderate' ? '보통' : '느림'}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {model.type === 'local' ? '로컬' : '클라우드'}
                      </span>
                    </div>
                    
                    {model.type === 'local' && !model.available && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadModel(model.id);
                        }}
                        className="text-xs px-2 py-1"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        다운로드
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 메시지 영역 - 독립 스크롤 */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      {/* 🔥 채팅 입력 영역 - 하단 고정 */}
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
                title="음성 입력"
              >
                <Mic className={`w-4 h-4 ${isVoiceMode ? 'text-red-600' : 'text-gray-600'}`} />
              </Button>
              
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-3"
                title="메시지 전송"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* 🔥 상태 표시 바 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>모델: {selectedModel}</span>
              <span>CUE: {passport?.cueTokens || 0}</span>
              {isLoading && <span className="text-blue-600">AI가 응답 중...</span>}
            </div>
            
            <div className="flex items-center space-x-2">
              {ollamaStatus.connected && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600">로컬 AI 준비됨</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};