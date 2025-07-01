// ============================================================================
// 📁 src/components/chat/MessageBubble.tsx
// 💬 개별 메시지 버블 컴포넌트
// ============================================================================
// 이 컴포넌트는 AI 채팅 인터페이스에서 각 메시지를 표시하는
// 버블 형태의 UI를 제공합니다. 사용자 메시지와 AI 응답을 구분하여
// 각각 다른 스타일로 렌더링하며, 메시지의 타임스   
// ============================================================================

'use client';

import React from 'react';
import { User, Bot, Zap, Shield, Clock } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import type { Message } from '../../types/chat.types';
import type { UnifiedAIPassport } from '../../types/passport.types';

interface MessageBubbleProps {
  message: Message;
  passport?: UnifiedAIPassport;
  backendConnected: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  passport,
  backendConnected
}) => {
  const isUser = message.type === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start space-x-3 max-w-3xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* 아바타 */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isUser ? 'bg-blue-500' : 'bg-gradient-to-r from-purple-500 to-blue-600'}
        `}>
          {isUser ? 
            <User className="w-5 h-5 text-white" /> : 
            <Bot className="w-5 h-5 text-white" />
          }
        </div>

        {/* 메시지 내용 */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* 메시지 버블 */}
          <div className={`
            rounded-lg p-3 max-w-none
            ${isUser ? 
              'bg-blue-600 text-white' : 
              'bg-gray-100 text-gray-900 border border-gray-200'
            }
          `}>
            {/* AI 메시지의 경우 마크다운 스타일 적용 */}
            {!isUser ? (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>')
                    .replace(/\n/g, '<br>')
                }}
              />
            ) : (
              <p className="text-sm">{message.content}</p>
            )}
          </div>

          {/* 메타 정보 */}
          <div className={`flex items-center space-x-2 mt-1 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <span className="text-xs text-gray-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {timestamp}
            </span>

            {/* AI 메시지 추가 정보 */}
            {!isUser && (
              <>
                {message.cueTokensEarned && (
                  <StatusBadge variant="success" size="sm">
                    <Zap className="w-3 h-3 mr-1" />
                    +{message.cueTokensEarned} CUE
                  </StatusBadge>
                )}

                {message.verification?.biometric && (
                  <StatusBadge variant="info" size="sm">
                    <Shield className="w-3 h-3 mr-1" />
                    인증됨
                  </StatusBadge>
                )}

                {!backendConnected && (
                  <StatusBadge variant="warning" size="sm">
                    Mock
                  </StatusBadge>
                )}
              </>
            )}

            {/* 사용자 메시지 추가 정보 */}
            {isUser && message.cueTokensUsed && (
              <StatusBadge variant="neutral" size="sm">
                -{message.cueTokensUsed} CUE
              </StatusBadge>
            )}
          </div>

          {/* 개인화 정보 (AI 메시지만) */}
          {!isUser && message.usedPassportData && message.usedPassportData.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <span>🎯 개인화 적용:</span>
                <span className="text-blue-600">
                  {message.usedPassportData.slice(0, 2).join(', ')}
                  {message.usedPassportData.length > 2 && ` 외 ${message.usedPassportData.length - 2}개`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};