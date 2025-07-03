// ============================================================================
// 📁 src/components/chat/IndependentMainContent.tsx (마크다운 렌더링 추가)
// 기존 파일의 상단에 import 추가하고 MessageBubble 컴포넌트 수정
// ============================================================================

'use client';

import React, { useRef, useEffect, useState } from 'react';
// ✨ 마크다운 렌더링 라이브러리 추가
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

import {
  Send, Paperclip, Mic, MicOff, Star, Coins, MessageCircle, X,
  Wifi, WifiOff, Coffee, Zap, Target, ChevronDown, Copy, 
  RefreshCw, Settings, BarChart3, Brain, Eye, Hash
} from 'lucide-react';

// 기존 interface들 그대로 유지...
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  model?: string;
  cueReward?: number;
  trustScore?: number;
  contextLearned?: boolean;
  qualityScore?: number;
  attachments?: File[];
  metadata?: any;
}

interface IndependentMainContentProps {
  messages: Message[];
  isTyping: boolean;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (message: string, model: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  backendConnected: boolean;
  todaysMining: number;
  attachments: File[];
  setAttachments: (files: File[]) => void;
  isVoiceMode: boolean;
  setIsVoiceMode: (enabled: boolean) => void;
}

// ============================================================================
// 💬 개선된 메시지 버블 컴포넌트 (마크다운 렌더링 포함)
// ============================================================================

const MessageBubble = ({ message, index }: { message: Message; index: number }) => {
  const [showDetails, setShowDetails] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: 토스트 알림 추가
  };

  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] lg:max-w-[70%]">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 md:p-5 rounded-xl shadow-sm">
            <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">
              {message.content}
            </div>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white border-opacity-20">
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center space-x-1 bg-white bg-opacity-20 px-2 py-1 rounded">
                      <Paperclip className="w-3 h-3" />
                      <span className="text-xs">{file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2 text-xs text-blue-100">
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              <button 
                onClick={() => copyToClipboard(message.content)}
                className="hover:text-white transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✨ AI 메시지 - 마크다운 렌더링 적용
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] lg:max-w-[70%]">
        {/* AI 에이전트 헤더 */}
        <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Star className="w-3 h-3 md:w-4 md:h-4 text-white" />
          </div>
          <span className="text-xs md:text-sm font-medium text-gray-700">
            Personal AI Agent
          </span>
          {message.model && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {message.model}
            </span>
          )}
        </div>
        
        {/* ✨ 메시지 내용 - 마크다운 렌더링 */}
        <div className="bg-white border border-gray-200 p-4 md:p-5 rounded-xl shadow-sm">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                // 커스텀 스타일링 컴포넌트들
                h1: ({children}) => (
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-3">{children}</h1>
                ),
                h2: ({children}) => (
                  <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-2">{children}</h2>
                ),
                h3: ({children}) => (
                  <h3 className="text-sm md:text-base font-medium text-gray-700 mb-2">{children}</h3>
                ),
                p: ({children}) => (
                  <p className="text-gray-700 mb-3 leading-relaxed text-sm md:text-base">{children}</p>
                ),
                ul: ({children}) => (
                  <ul className="list-disc list-inside mb-3 space-y-1 text-sm md:text-base">{children}</ul>
                ),
                ol: ({children}) => (
                  <ol className="list-decimal list-inside mb-3 space-y-1 text-sm md:text-base">{children}</ol>
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
                    <code className="block bg-gray-800 text-gray-100 p-3 rounded-lg text-sm font-mono overflow-x-auto">
                      {children}
                    </code>
                  ),
                pre: ({children}) => (
                  <pre className="bg-gray-800 p-3 rounded-lg overflow-x-auto mb-3">
                    {children}
                  </pre>
                ),
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 mb-3">
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
                // 테이블 스타일링
                table: ({children}) => (
                  <table className="min-w-full border border-gray-200 rounded-lg mb-3">
                    {children}
                  </table>
                ),
                th: ({children}) => (
                  <th className="border border-gray-200 px-3 py-2 bg-gray-50 font-semibold text-left">
                    {children}
                  </th>
                ),
                td: ({children}) => (
                  <td className="border border-gray-200 px-3 py-2">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* CUE 토큰 및 메타 정보 표시 */}
          {(message.cueReward || message.trustScore || message.qualityScore) && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 md:space-x-4">
                  {message.cueReward && (
                    <div className="flex items-center space-x-1">
                      <Coins className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                      <span className="text-xs md:text-sm text-yellow-600 font-medium">
                        +{message.cueReward} CUE
                      </span>
                    </div>
                  )}
                  {message.trustScore && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
                      <span className="text-xs md:text-sm text-blue-600">
                        {Math.round(message.trustScore * 100)}%
                      </span>
                    </div>
                  )}
                  {message.contextLearned && (
                    <div className="flex items-center space-x-1">
                      <Brain className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />
                      <span className="text-xs text-purple-600">Learned</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {showDetails && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Quality Score:</span>
                    <span>{message.qualityScore ? Math.round(message.qualityScore * 100) + '%' : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timestamp:</span>
                    <span>{new Date(message.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Message ID:</span>
                    <span className="font-mono">{message.id.slice(-8)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 액션 버튼들 */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => copyToClipboard(message.content)}
                className="hover:text-gray-700 transition-colors"
                title="Copy message"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button className="hover:text-gray-700 transition-colors" title="Regenerate">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🎯 기존 IndependentMainContent 컴포넌트 (MessageBubble 교체)
// ============================================================================

export const IndependentMainContent: React.FC<IndependentMainContentProps> = ({
  messages,
  isTyping,
  newMessage,
  setNewMessage,
  onSendMessage,
  selectedModel,
  onModelChange,
  backendConnected,
  todaysMining,
  attachments,
  setAttachments,
  isVoiceMode,
  setIsVoiceMode
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 기존 로직들 그대로 유지...
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  // AI 모델 목록
  const models = [
    { id: 'personalized-agent', name: 'Personal Agent', description: 'AI Passport 기반', icon: '🧠' },
    { id: 'llama3.2:3b', name: 'Llama 3.2 (3B)', description: '로컬 고속', icon: '🦙' },
    { id: 'llama3.2:1b', name: 'Llama 3.2 (1B)', description: '로컬 초고속', icon: '🦙' },
    { id: 'qwen2.5:3b', name: 'Qwen 2.5 (3B)', description: '한국어 우수', icon: '🇰🇷' },
    { id: 'gemma2:2b', name: 'Gemma 2 (2B)', description: 'Google 로컬', icon: '🤖' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI 클라우드', icon: '☁️' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5', description: 'Anthropic 클라우드', icon: '☁️' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google 클라우드', icon: '☁️' }
  ];

  // 메시지 전송 핸들러 등 기존 함수들 그대로 유지...
  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    
    try {
      await onSendMessage(newMessage, selectedModel);
      setNewMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 빠른 프롬프트
  const quickPrompts = [
    "CUE Protocol 설명해줘",
    "AI Passport가 뭐야?",
    "RAG-DAG 학습 방식",
    "개인화 AI의 장점"
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ⭐️ 상단 상태 바 (고정) - 기존과 동일 */}
      <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200 bg-gray-50">
        <div className={`flex items-center justify-between p-2 md:p-3 rounded-lg ${
          backendConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2 md:space-x-3">
            {backendConnected ? 
              <Wifi className="w-3 h-3 md:w-4 md:h-4 text-green-600" /> : 
              <WifiOff className="w-3 h-3 md:w-4 md:h-4 text-yellow-600" />
            }
            <span className={`text-xs md:text-sm font-medium ${
              backendConnected ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {backendConnected ? 'Real AI Backend Connected' : 'Mock AI (Backend Offline)'}
            </span>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="flex items-center space-x-1">
              <Coffee className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
              <span className="text-xs text-gray-600">오늘 +{todaysMining} 마이닝</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
              <span className="text-xs text-blue-600">실시간 학습</span>
            </div>
          </div>
        </div>
      </div>

      {/* ⭐️ 메시지 영역 (독립 스크롤) */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6"
        style={{ 
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 #F7FAFC'
        }}
      >
        {/* CSS 스크롤바 스타일링 */}
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: #F7FAFC;
          }
          div::-webkit-scrollbar-thumb {
            background: #CBD5E0;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #A0AEC0;
          }
        `}</style>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg">
              <MessageCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              안녕하세요! 👋
            </h2>
            <p className="text-gray-600 text-sm md:text-lg mb-6 md:mb-8 leading-relaxed">
              CUE Protocol AI 어시스턴트입니다.<br />
              개인화된 AI와 대화하고 CUE 토큰을 마이닝하세요.
            </p>
            
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setNewMessage(prompt)}
                  className="px-3 md:px-4 py-2 bg-white border border-gray-200 rounded-full text-xs md:text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {!backendConnected && (
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-xs md:text-sm text-yellow-800">
                  ⚠️ Mock 모드로 실행 중입니다. 실제 AI 경험을 위해 백엔드 서버를 연결해주세요.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ✨ 개선된 MessageBubble 사용 */}
            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} index={index} />
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[85%] lg:max-w-[70%]">
                  <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-3">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <Star className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-gray-700">
                      Personal AI Agent
                    </span>
                  </div>
                  <div className="bg-white border border-gray-200 p-3 md:p-5 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="text-xs md:text-sm text-gray-600">AI가 생각하는 중...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ⭐️ 하단 입력창 (완전 고정) - 기존과 동일 */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 md:p-4 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* 첨부파일 미리보기 */}
          {attachments.length > 0 && (
            <div className="mb-2 md:mb-3 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-100 px-2 md:px-3 py-1 md:py-2 rounded-lg">
                  <Paperclip className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                  <span className="text-xs md:text-sm text-gray-700 truncate max-w-20 md:max-w-none">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex space-x-2 md:space-x-3 items-end">
            {/* AI 모델 선택 */}
            <div className="flex-shrink-0">
              <select
                value={selectedModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="px-2 md:px-3 py-2 md:py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-xs md:text-sm hover:bg-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.icon} {model.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 메시지 입력 */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="CUE Protocol AI와 대화하기..."
                className="w-full min-h-[44px] md:min-h-[52px] max-h-[100px] md:max-h-[120px] px-3 md:px-4 py-2 md:py-3 bg-gray-50 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:bg-white focus:border-blue-500 transition-all text-sm md:text-base pr-16 md:pr-20"
                rows={1}
              />
              
              <div className="absolute right-1 md:right-2 bottom-1 md:bottom-2 flex items-center space-x-1">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="p-1 md:p-2 text-gray-400 hover:text-gray-600 cursor-pointer rounded transition-colors"
                  title="파일 첨부"
                >
                  <Paperclip className="w-3 h-3 md:w-4 md:h-4" />
                </label>
                
                <button
                  onClick={() => setIsVoiceMode(!isVoiceMode)}
                  className={`p-1 md:p-2 rounded transition-colors ${
                    isVoiceMode 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title={isVoiceMode ? '음성 모드 끄기' : '음성 모드 켜기'}
                >
                  {isVoiceMode ? 
                    <MicOff className="w-3 h-3 md:w-4 md:h-4" /> : 
                    <Mic className="w-3 h-3 md:w-4 md:h-4" />
                  }
                </button>
              </div>
            </div>
            
            {/* 전송 버튼 */}
            <div className="flex-shrink-0">
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() && attachments.length === 0}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all flex items-center space-x-1 md:space-x-2 shadow-lg ${
                  (newMessage.trim() || attachments.length > 0)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline text-xs md:text-sm">Send</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center mt-1 md:mt-2 text-xs text-gray-500">
            <span>Enter 전송, Shift+Enter 줄바꿈 • CUE 토큰 마이닝 활성</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndependentMainContent;