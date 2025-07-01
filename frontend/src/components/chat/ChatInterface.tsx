// ============================================================================
// 📁 src/components/chat/ChatInterface.tsx
// 💬 AI 채팅 인터페이스 컴포넌트
// ============================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Zap } from 'lucide-react';
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
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 채팅 헤더 */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500">
                개인화된 AI 어시스턴트 ({passport?.personalityProfile?.type || 'Learning...'})
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <StatusBadge variant={backendConnected ? 'success' : 'warning'} size="sm">
              {backendConnected ? 'Live' : 'Mock'}
            </StatusBadge>
            {passport && (
              <StatusBadge variant="info" size="sm">
                {passport.cueTokens.toLocaleString()} CUE
              </StatusBadge>
            )}
          </div>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto">
        <MessageList 
          messages={messages}
          passport={passport}
          backendConnected={backendConnected}
        />
        
        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-gray-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        {/* 모델 선택 */}
        <div className="mb-3">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            backendConnected={backendConnected}
          />
        </div>

        {/* 메시지 입력 */}
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요... (개인화된 AI가 응답합니다)"
              disabled={isLoading}
              className="border-gray-300 focus:border-blue-500"
            />
          </div>
          
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            loading={isLoading}
            className="px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* 힌트 메시지 */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>💡 개인화된 응답을 위해 AI Passport 데이터를 활용합니다</span>
          </div>
          {passport && (
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span>대화 시 CUE 토큰을 획득할 수 있습니다</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};