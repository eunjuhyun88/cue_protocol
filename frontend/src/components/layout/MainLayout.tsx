// ============================================================================
// 📁 src/components/layout/MainLayout.tsx
// 🎯 독립적 스크롤 & 하단 고정 채팅 레이아웃
// ============================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, X, Settings, Wifi, WifiOff, Star, Send, Paperclip, 
  Mic, MicOff, MessageCircle, Activity, Fingerprint, Database,
  Globe, BarChart3, ChevronDown, Plus, RefreshCw, Shield
} from 'lucide-react';

// 기존 컴포넌트들 import
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChatInterface } from '../chat/ChatInterface';
import { BackendStatus } from '../ui/BackendStatus';

// 타입 import
import type { 
  UnifiedAIPassport
} from '../../types/passport.types';

// TODO: 아래 타입들을 실제 정의된 곳에서 import 하거나 임시로 정의하세요.
type Message = {
  id: string;
  type: 'user' | 'ai';
  content: string;
};

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface MainLayoutProps {
  // 패스포트 데이터
  passport?: UnifiedAIPassport;
  cueBalance: number;
  todaysMining: number;
  
  // 백엔드 상태
  backendConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectionDetails?: any;
  
  // 채팅 데이터
  messages: Message[];
  isLoadingChat: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  
  // 뷰 상태
  currentView: 'chat' | 'dashboard' | 'passport' | 'vaults' | 'platforms' | 'analytics';
  onViewChange: (view: string) => void;
  
  // 핸들러들
  onSendMessage: (message: string, model: string) => void;
  onUpdatePassport: (updates: any) => void;
  onLogout: () => void;
  onRetryConnection: () => void;
}

export function MainLayout({
  passport,
  cueBalance,
  todaysMining,
  backendConnected,
  connectionStatus,
  connectionDetails,
  messages,
  isLoadingChat,
  selectedModel,
  onModelChange,
  currentView,
  onViewChange,
  onSendMessage,
  onUpdatePassport,
  onLogout,
  onRetryConnection
}: MainLayoutProps) {
  // UI 상태
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // 채팅 상태
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // 스크롤 참조
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 반응형 처리
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowMobileSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 메시지 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  // AI 모델 목록
  const models = [
    { id: 'personalized-agent', name: 'Personal Agent', description: 'AI Passport 기반' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI 최고 모델' },
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Anthropic' },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google AI' }
  ];

  // 뷰 탭 목록
  const viewTabs = [
    { id: 'chat', label: `${backendConnected ? 'Real' : 'Mock'} AI Chat`, icon: MessageCircle },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'passport', label: 'AI Passport', icon: Fingerprint },
    { id: 'vaults', label: 'Data Vaults', icon: Database },
    { id: 'platforms', label: 'Platforms', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    
    setIsTyping(true);
    try {
      await onSendMessage(newMessage, selectedModel);
      setNewMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // 파일 첨부 핸들러
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 - 고정 */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900">AI Passport + CUE Protocol</h1>
              <p className="text-sm text-gray-500">
                {backendConnected ? 'Real Backend Integration' : 'Mock Mode (Backend Offline)'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <BackendStatus 
              status={connectionStatus} 
              onRetry={onRetryConnection}
              connectionDetails={connectionDetails}
            />
            
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨테이너 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 모바일 사이드바 오버레이 */}
        {isMobile && showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* 왼쪽 사이드바 - 독립적 스크롤 */}
        <aside 
          ref={sidebarRef}
          className={`
            ${isMobile ? 'fixed z-50' : 'relative'}
            ${isMobile && !showMobileSidebar ? '-translate-x-full' : 'translate-x-0'}
            w-80 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out
            flex flex-col overflow-hidden
          `}
          style={{ 
            height: isMobile ? '100vh' : 'calc(100vh - 73px)',
            top: isMobile ? '0' : 'auto',
            left: isMobile ? '0' : 'auto'
          }}
        >
          {/* 모바일 사이드바 헤더 */}
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">AI Passport</h2>
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* 사이드바 내용 - 독립적 스크롤 */}
          <div 
            className="flex-1 overflow-y-auto p-6 space-y-6"
            style={{ scrollbarWidth: 'thin' }}
          >
            {/* AI Passport 메인 카드 */}
            <div className={`rounded-xl p-5 text-white relative overflow-hidden ${
              backendConnected 
                ? 'bg-gradient-to-br from-blue-600 to-blue-800' 
                : 'bg-gradient-to-br from-gray-500 to-gray-700'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">AI Passport</h3>
                      <p className={`text-sm ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                        {passport?.passportLevel || 'Basic'} Level {backendConnected ? '' : '(Mock)'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{passport?.trustScore || 85}%</div>
                    <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                      Trust Score
                    </div>
                  </div>
                </div>

                {/* DID 정보 */}
                <div className="space-y-2 mb-5">
                  <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                    Decentralized ID
                  </div>
                  <div className="font-mono text-sm bg-black bg-opacity-20 rounded-lg p-2 truncate">
                    {passport?.did || 'did:ai:loading...'}
                  </div>
                </div>

                {/* 연결 상태 */}
                <div className="space-y-2 mb-5">
                  <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                    Backend Status
                  </div>
                  <div className="font-mono text-xs bg-black bg-opacity-20 rounded-lg p-2">
                    {backendConnected ? '🟢 Real Backend Connected' : '🔴 Mock Mode (Offline)'}
                  </div>
                </div>

                {/* 주요 메트릭 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition-colors cursor-pointer">
                    <div className="text-lg font-bold">{cueBalance.toLocaleString()}</div>
                    <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                      CUE Tokens
                    </div>
                  </div>
                  <div className="text-center hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition-colors cursor-pointer">
                    <div className="text-lg font-bold">{passport?.dataVaults?.length || 2}</div>
                    <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                      Data Vaults
                    </div>
                  </div>
                  <div className="text-center hover:bg-white hover:bg-opacity-10 rounded-lg p-2 transition-colors cursor-pointer">
                    <div className="text-lg font-bold">{passport?.connectedPlatforms?.length || 3}</div>
                    <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                      Platforms
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 오늘의 마이닝 */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 border ${
                backendConnected ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Star className={`w-4 h-4 ${backendConnected ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${backendConnected ? 'text-blue-800' : 'text-gray-700'}`}>
                    Today's Mining
                  </span>
                </div>
                <div className={`text-2xl font-bold ${backendConnected ? 'text-blue-700' : 'text-gray-600'}`}>
                  +{todaysMining}
                </div>
                <div className={`text-xs ${backendConnected ? 'text-blue-600' : 'text-gray-500'}`}>
                  CUE Tokens {backendConnected ? '' : '(Mock)'}
                </div>
              </div>
              
              <div className={`rounded-xl p-4 border ${
                backendConnected ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className={`w-4 h-4 ${backendConnected ? 'text-green-600' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${backendConnected ? 'text-green-800' : 'text-gray-700'}`}>
                    AI Chats
                  </span>
                </div>
                <div className={`text-2xl font-bold ${backendConnected ? 'text-green-700' : 'text-gray-600'}`}>
                  {backendConnected ? messages.length : '0'}
                </div>
                <div className={`text-xs ${backendConnected ? 'text-green-600' : 'text-gray-500'}`}>
                  Today
                </div>
              </div>
            </div>

            {/* 추가 컨텐츠 (스크롤 테스트용) */}
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <h5 className="font-medium text-gray-900 mb-2">
                    {backendConnected ? 'Real Backend' : 'Mock'} Section {i}
                  </h5>
                  <p className="text-sm text-gray-600">
                    독립적 스크롤 테스트 섹션 {i}. 사이드바와 메인 영역이 각각 독립적으로 스크롤됩니다.
                    {backendConnected 
                      ? ' 실제 백엔드 데이터가 연동되어 있습니다.' 
                      : ' Mock 데이터로 시뮬레이션 중입니다.'
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 오른쪽 메인 영역 - 독립적 스크롤 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 뷰 탭 네비게이션 */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
            <div className="flex space-x-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              {viewTabs.map(view => (
                <button
                  key={view.id}
                  onClick={() => {
                    onViewChange(view.id);
                    if (isMobile) setShowMobileSidebar(false);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    currentView === view.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <view.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {isMobile ? view.label.split(' ')[0] : view.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 채팅 뷰 전용 레이아웃 */}
          {currentView === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 채팅 상태 헤더 */}
              <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  backendConnected ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    {backendConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
                    <span className={`text-sm font-medium ${backendConnected ? 'text-green-700' : 'text-red-700'}`}>
                      {backendConnected ? 'Real AI Backend Connected' : 'Mock AI (Backend Offline)'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-xs text-gray-500">
                      💎 {cueBalance.toLocaleString()} CUE
                    </div>
                    <div className="text-xs text-blue-600">
                      오늘 +{todaysMining} 마이닝
                    </div>
                  </div>
                </div>
              </div>

              {/* 메시지 영역 - 독립적 스크롤 */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-6"
                style={{ 
                  height: 'calc(100vh - 320px)',
                  scrollBehavior: 'smooth',
                  scrollbarWidth: 'thin'
                }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto px-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                      <MessageCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {backendConnected ? 'Real AI Backend Ready' : 'Mock AI Chat'}
                    </h2>
                    <p className="text-gray-600 text-lg mb-8">
                      {backendConnected 
                        ? 'AI Passport 기반 개인화된 AI와 대화하고 CUE 토큰을 마이닝하세요.' 
                        : 'Mock 모드입니다. 실제 AI 경험을 위해 백엔드 서버를 실행해주세요.'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map(message => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] lg:max-w-[70%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                          {message.type === 'ai' && (
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Star className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {backendConnected ? 'Personal AI Agent' : 'Mock AI Agent'}
                              </span>
                            </div>
                          )}
                          
                          <div className={`p-5 rounded-xl ${
                            message.type === 'user' 
                              ? 'bg-blue-600 text-white shadow-sm' 
                              : 'bg-white border border-gray-200 shadow-sm'
                          }`}>
                            <div className="whitespace-pre-wrap text-base leading-relaxed">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                          <div className="flex items-center space-x-3">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {backendConnected ? 'Real AI thinking...' : 'Mock AI thinking...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* 채팅 입력 영역 - 하단 고정 */}
              <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white sticky bottom-0">
                <div className="max-w-4xl mx-auto">
                  {/* 첨부파일 미리보기 */}
                  {attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            onClick={() => removeAttachment(index)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex space-x-3 items-end">
                    {/* AI 모델 선택 */}
                    <div className="flex-shrink-0">
                      <select
                        value={selectedModel}
                        onChange={(e) => onModelChange(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm hover:bg-gray-100 focus:border-blue-500 focus:outline-none transition-colors"
                      >
                        {models.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* 메시지 입력 */}
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={`${backendConnected ? 'Real AI' : 'Mock mode'} - Send message...`}
                        className="w-full min-h-[48px] max-h-[120px] px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:bg-white focus:border-blue-500 transition-all text-base pr-20"
                        rows={1}
                      />
                      
                      {/* 입력 도구들 */}
                      <div className="absolute right-2 bottom-2 flex items-center space-x-1">
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
                          className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer rounded transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                        </label>
                        
                        <button
                          onClick={() => setIsVoiceMode(!isVoiceMode)}
                          className={`p-1.5 rounded transition-colors ${
                            isVoiceMode 
                              ? 'text-blue-600 bg-blue-50' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {/* 전송 버튼 */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() && attachments.length === 0}
                        className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-sm ${
                          (newMessage.trim() || attachments.length > 0)
                            ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md transform hover:-translate-y-0.5'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 다른 뷰들 */}
          {currentView !== 'chat' && (
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                  backendConnected ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {viewTabs.find(tab => tab.id === currentView)?.icon && 
                    React.createElement(viewTabs.find(tab => tab.id === currentView)!.icon, {
                      className: `w-8 h-8 ${backendConnected ? 'text-blue-600' : 'text-gray-600'}`
                    })
                  }
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentView.charAt(0).toUpperCase() + currentView.slice(1)} 
                  {backendConnected ? ' (Real Backend)' : ' (Mock Mode)'}
                </h2>
                <p className="text-gray-600 mb-8 max-w-md">
                  {backendConnected 
                    ? `Real ${currentView} functionality with backend integration.`
                    : `Mock ${currentView} view. Connect backend for full functionality.`
                  }
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}