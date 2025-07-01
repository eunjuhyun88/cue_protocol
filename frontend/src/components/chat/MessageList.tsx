// ============================================================================
// 📁 src/components/chat/MessageList.tsx
// 💬 채팅 메시지 목록 컴포넌트
// ============================================================================
// 이 컴포넌트는 AI 채팅 인터페이스에서 메시지 목록을
// 렌더링합니다. 메시지가 없을 경우 초기 안내 메시지를 표시하며,      

// ============================================================================

'use client';

import React from 'react';
import { MessageBubble } from '../chat/MessageBubble';
import type { Message } from '../../types/chat.types';
import type { UnifiedAIPassport } from '../../types/passport.types';

interface MessageListProps {
  messages: Message[];
  passport?: UnifiedAIPassport;
  backendConnected: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  passport,
  backendConnected
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            AI Passport 어시스턴트
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            개인화된 AI 어시스턴트가 준비되었습니다.
            {passport && (
              <span className="block mt-1 text-blue-600">
                {passport.personalityProfile?.type} 성격 프로필 적용됨
              </span>
            )}
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <div>💡 질문하시면 개인화된 답변을 드립니다</div>
            <div>⚡ 대화할 때마다 CUE 토큰을 획득합니다</div>
            <div>{backendConnected ? '🌐 실시간 AI 연동' : '🔧 Mock 모드 체험'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          passport={passport}
          backendConnected={backendConnected}
        />
      ))}
    </div>
  );
};