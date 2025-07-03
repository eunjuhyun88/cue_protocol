// ============================================================================
// 📁 src/components/chat/MessageBubble.tsx (마크다운 렌더링 개선)
// 기존 파일에서 AI 메시지 부분만 수정
// ============================================================================

'use client';

import React from 'react';
import { User, Bot, Zap, Shield, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
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
            {/* ✨ AI 메시지: 마크다운 렌더링 적용 */}
            {!isUser ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // 커스텀 스타일링
                    h1: ({children}) => (
                      <h1 className="text-lg font-bold text-gray-900 mb-2">{children}</h1>
                    ),
                    h2: ({children}) => (
                      <h2 className="text-base font-semibold text-gray-800 mb-2">{children}</h2>
                    ),
                    h3: ({children}) => (
                      <h3 className="text-sm font-medium text-gray-700 mb-1">{children}</h3>
                    ),
                    p: ({children}) => (
                      <p className="text-gray-700 mb-2 leading-relaxed">{children}</p>
                    ),
                    ul: ({children}) => (
                      <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                    ),
                    ol: ({children}) => (
                      <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                    ),
                    li: ({children}) => (
                      <li className="text-gray-700">{children}</li>
                    ),
                    code: ({inline, children}) => 
                      inline ? (
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono text-blue-600">
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-gray-800 text-gray-100 p-2 rounded text-sm font-mono overflow-x-auto">
                          {children}
                        </code>
                      ),
                    pre: ({children}) => (
                      <pre className="bg-gray-800 p-2 rounded overflow-x-auto mb-2">
                        {children}
                      </pre>
                    ),
                    blockquote: ({children}) => (
                      <blockquote className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 mb-2">
                        {children}
                      </blockquote>
                    ),
                    strong: ({children}) => (
                      <strong className="font-semibold text-gray-900">{children}</strong>
                    ),
                    em: ({children}) => (
                      <em className="italic text-gray-800">{children}</em>
                    ),
                    a: ({children, href}) => (
                      <a 
                        href={href} 
                        className="text-blue-600 hover:underline" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              // 사용자 메시지는 그대로
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