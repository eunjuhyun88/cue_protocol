// ============================================================================
// 📁 frontend/src/app/chat/page.tsx (새로 생성)
// 💬 로컬 Ollama 채팅 전용 페이지
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { ChatInterface } from '../../components/chat/ChatInterface';
import { AIPassportSystem } from '../../components/AIPassportSystem';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { UnifiedAIPassport } from '../../types/passport.types';
import type { Message } from '../../types/chat.types';

interface User {
  id: string;
  username: string;
  did: string;
  email?: string;
}

interface BackendStatus {
  connected: boolean;
  mode: 'real' | 'mock';
  lastPing: string;
  latency: number;
  ollama?: {
    connected: boolean;
    models: number;
    status: string;
  };
}

export default function ChatPage() {
  // 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [passport, setPassport] = useState<UnifiedAIPassport | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    connected: false,
    mode: 'mock',
    lastPing: '',
    latency: 0
  });

  // 모바일 감지
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // 시스템 초기화
  useEffect(() => {
    initializeSystem();
  }, []);

  // 백엔드 상태 모니터링
  useEffect(() => {
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeSystem = async () => {
    try {
      await checkBackendHealth();

      // 로컬 스토리지에서 복원
      const savedUser = localStorage.getItem('cue_user');
      const savedPassport = localStorage.getItem('cue_passport');
      const savedMessages = localStorage.getItem('chat_messages');

      if (savedUser && savedPassport) {
        setUser(JSON.parse(savedUser));
        setPassport(JSON.parse(savedPassport));
        setIsAuthenticated(true);
        
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages));
        } else {
          initializeWelcomeMessage();
        }
      } else {
        await createGuestUser();
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('시스템 초기화 실패:', error);
      toast.error('시스템 초기화 중 오류가 발생했습니다');
      setIsInitialized(true);
    }
  };

  const checkBackendHealth = async () => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/health', { method: 'GET', cache: 'no-cache' });
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        
        let ollamaData = { connected: false, modelCount: 0, status: 'unknown' };
        try {
          const ollamaResponse = await fetch('/api/ai/ollama/health');
          ollamaData = await ollamaResponse.json();
        } catch (ollamaError) {
          console.warn('Ollama 상태 확인 실패:', ollamaError);
        }
        
        setBackendStatus({
          connected: true,
          mode: data.mockMode ? 'mock' : 'real',
          lastPing: new Date().toLocaleTimeString(),
          latency,
          ollama: {
            connected: ollamaData.connected,
            models: ollamaData.modelCount || 0,
            status: ollamaData.status || 'unknown'
          }
        });
        
        if (!backendStatus.connected) {
          toast.success('백엔드 연결됨');
        }
      } else {
        throw new Error('Backend unreachable');
      }
    } catch (error) {
      setBackendStatus(prev => ({
        ...prev,
        connected: false,
        lastPing: new Date().toLocaleTimeString()
      }));
      
      if (backendStatus.connected) {
        toast.error('백엔드 연결 실패');
      }
    }
  };

  const createGuestUser = async () => {
    const guestUser: User = {
      id: 'guest-' + Date.now(),
      username: 'Guest User',
      did: 'did:guest:' + Date.now()
    };

    const guestPassport: UnifiedAIPassport = {
      did: guestUser.did,
      walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      passkeyRegistered: false,
      trustScore: 0.5,
      cueTokens: 100,
      passportLevel: 1,
      biometricVerified: false,
      personalityProfile: {
        type: 'Adaptive',
        communicationStyle: 'Balanced',
        learningPattern: 'Visual',
        decisionMaking: 'Analytical',
        workingStyle: 'Flexible'
      },
      psychology: {
        cognitiveStyle: 'Balanced',
        emotionalIntelligence: 0.7,
        creativity: 0.6,
        riskTolerance: 0.5
      },
      expertise: {
        domains: [],
        skills: [],
        interests: []
      },
      platformSettings: {
        privacyLevel: 'medium',
        dataSharing: false,
        notifications: true
      },
      usageStats: {
        totalInteractions: 0,
        averageSessionLength: 0,
        mostActiveTime: '14:00',
        preferredFeatures: []
      },
      achievements: [],
      dataVaults: [],
      connectedPlatforms: [],
      cueConfig: {
        autoMining: true,
        compressionLevel: 'medium',
        retentionDays: 30
      }
    };

    setUser(guestUser);
    setPassport(guestPassport);
    setIsAuthenticated(true);

    localStorage.setItem('cue_user', JSON.stringify(guestUser));
    localStorage.setItem('cue_passport', JSON.stringify(guestPassport));

    initializeWelcomeMessage();
    toast.success('게스트 사용자로 로그인했습니다');
  };

  const initializeWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: '1',
      content: `**🦙 로컬 AI 채팅에 오신 것을 환영합니다!**

안녕하세요! AI Passport 기반 개인화된 로컬 AI 어시스턴트입니다.

**현재 설정:**
• **사용자**: ${user?.username || 'Guest User'}  
• **CUE 토큰**: ${passport?.cueTokens || 100}개
• **성격 유형**: ${passport?.personalityProfile?.type || 'Adaptive'}
• **백엔드**: ${backendStatus.connected ? '✅ 연결됨' : '❌ 오프라인'}
• **Ollama**: ${backendStatus.ollama?.connected ? `✅ ${backendStatus.ollama.models}개 모델` : '❌ 오프라인'}

**로컬 AI의 장점:**
🔒 **완전한 프라이버시** - 모든 대화가 로컬에서 처리
⚡ **빠른 응답** - 인터넷 연결 없이도 즉시 응답
💰 **무료 사용** - API 비용 없이 무제한 대화
🧠 **개인화** - AI Passport로 맞춤형 응답

무엇을 도와드릴까요?`,
      type: 'ai',
      timestamp: new Date(),
      model: 'llama3.2:3b',
      cueTokensEarned: 0
    };

    setMessages([welcomeMessage]);
    localStorage.setItem('chat_messages', JSON.stringify([welcomeMessage]));
  };

  const handleSendMessage = async (message: string, model: string): Promise<any> => {
    if (!user) {
      toast.error('사용자 정보가 없습니다');
      return;
    }

    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      type: 'user',
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          model,
          userId: user.id,
          passportData: passport
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.message.content,
          type: 'ai',
          timestamp: new Date(),
          model: model,
          cueTokensEarned: data.message.cueTokensEarned || 0,
          responseTimeMs: data.message.responseTimeMs,
          personalContext: data.personalContext,
          localModel: data.performance?.ollama || false
        };

        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);
        localStorage.setItem('chat_messages', JSON.stringify(finalMessages));

        // CUE 토큰 업데이트
        if (data.message.cueTokensEarned > 0 && passport) {
          const updatedPassport = {
            ...passport,
            cueTokens: (passport.cueTokens || 0) + data.message.cueTokensEarned
          };
          setPassport(updatedPassport);
          localStorage.setItem('cue_passport', JSON.stringify(updatedPassport));

          toast.success(`${data.message.cueTokensEarned} CUE 토큰을 획득했습니다!`);
        }

        return data;
      } else {
        throw new Error(data.error || '응답 생성 실패');
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ **연결 오류**

${backendStatus.connected ? 'AI 서버' : '백엔드 서버'}에 연결할 수 없습니다.

**해결 방법:**
${!backendStatus.connected ? 
  '1. 백엔드 서버가 실행 중인지 확인하세요' : 
  '1. Ollama 서버가 실행 중인지 확인하세요 (`ollama serve`)'
}
2. 모델이 다운로드되어 있는지 확인하세요
3. 네트워크 연결 상태를 확인하세요

다시 시도해주세요.`,
        type: 'ai',
        timestamp: new Date(),
        model: model,
        isError: true
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      localStorage.setItem('chat_messages', JSON.stringify(finalMessages));

      toast.error('메시지 전송에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-gray-600">시스템 초기화 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">🦙 로컬 AI 채팅</h1>
            <span className="text-sm text-gray-500">Ollama + CUE Protocol</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <StatusBadge variant={backendStatus.ollama?.connected ? 'success' : 'warning'} size="sm">
                🦙 {backendStatus.ollama?.connected ? `${backendStatus.ollama.models}개 모델` : 'Ollama 오프라인'}
              </StatusBadge>
              <StatusBadge variant={backendStatus.connected ? 'success' : 'warning'} size="sm">
                {backendStatus.connected ? '백엔드 연결됨' : '오프라인 모드'}
              </StatusBadge>
            </div>
            
            {/* 홈으로 돌아가기 버튼 */}
            <a 
              href="/" 
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              홈으로
            </a>
            
            {/* 모바일 메뉴 버튼 */}
            {isMobile && (
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {isAuthenticated ? (
        <div className="flex flex-1 overflow-hidden">
          {/* 왼쪽 AI Passport 영역 - 독립 스크롤 */}
          <aside className={`
            ${isMobile ? 
              `fixed inset-y-0 left-0 z-30 w-80 transform transition-transform duration-300 ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}` : 
              'w-1/3'
            } 
            h-full overflow-y-auto border-r border-gray-200 bg-white
          `}>
            <div className="p-4">
              <AIPassportSystem 
                passport={passport}
                backendConnected={backendStatus.connected}
                onPassportUpdate={(updated) => {
                  setPassport(updated);
                  localStorage.setItem('cue_passport', JSON.stringify(updated));
                }}
              />
            </div>
          </aside>

          {/* 오른쪽 채팅 영역 - 독립 스크롤 */}
          <main className={`${isMobile ? 'flex-1' : 'flex-1'} h-full overflow-hidden bg-white`}>
            <ChatInterface 
              passport={passport}
              backendConnected={backendStatus.connected}
              onSendMessage={handleSendMessage}
              messages={messages}
              isLoading={isLoading}
            />
          </main>

          {/* 모바일 오버레이 */}
          {isMobile && showMobileSidebar && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-20"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🦙 로컬 AI 채팅</h2>
            <p className="text-gray-600 mb-8">
              프라이버시를 보장하는 로컬 AI 어시스턴트에 오신 것을 환영합니다.
            </p>
            <button 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={createGuestUser}
            >
              게스트로 시작하기
            </button>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}