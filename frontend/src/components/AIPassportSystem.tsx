'use client';

// ============================================================================
// 📁 src/components/AIPassportSystem.tsx  
// 🎯 완전히 리팩토링된 메인 AI Passport 시스템 컴포넌트
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Fingerprint, CheckCircle, AlertCircle, Database,
  Wifi, WifiOff, MessageCircle, User, Coins, Settings, LogOut,
  Loader2, X, Menu, Send, Mic, MicOff, Paperclip, Sparkles,
  Activity, BarChart3, Globe, Star, Zap, Brain, Target, Award,
  Plus, RefreshCw, ChevronDown, Copy, Key, Eye, Clock,
  TrendingUp, Heart, Coffee, Lock
} from 'lucide-react';

// ============================================================================
// 🔧 Import 분리된 컴포넌트들
// ============================================================================

// API 클라이언트들
import { PersistentDataAPIClient, checkWebAuthnSupport } from '../services/api/PersistentDataAPIClient';

// UI 컴포넌트들
import { LoadingSpinner } from './ui/LoadingSpinner';
import { BackendStatus } from './ui/BackendStatus';

// 레이아웃 컴포넌트들
import { OnboardingFlow } from './auth/OnBoardingFlow';
import { MainLayout } from './layout/MainLayout';

// ============================================================================
// 🔧 타입 정의
// ============================================================================

interface User {
  id: string;
  username: string;
  email?: string;
  did: string;
  walletAddress?: string;
  cueBalance: number;
  trustScore: number;
  passportLevel: string;
  biometricVerified: boolean;
  registeredAt: string;
}

interface AIPassport {
  did: string;
  username: string;
  trustScore: number;
  passportLevel: string;
  cueBalance: number;
  totalMined: number;
  dataVaults: Array<{
    name: string;
    type: string;
    size: string;
    items: number;
  }>;
  connectedPlatforms: string[];
  personalityProfile: {
    traits: string[];
    communicationStyle: string;
    expertise: string[];
  };
  achievements: Array<{
    name: string;
    icon: string;
    earned: boolean;
    description: string;
  }>;
  ragDagStats: {
    learnedConcepts: number;
    connectionStrength: number;
    lastLearningActivity: string;
    knowledgeNodes: number;
    personalityAccuracy: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  analytics: any; // Replace 'any' with the actual type if known
  createdAt: string;
}

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
}

// ============================================================================
// 🎯 메인 AI Passport 시스템 컴포넌트
// ============================================================================

const AIPassportSystem: React.FC = () => {
  // ============================================================================
  // 🔧 상태 관리
  // ============================================================================
  
  // 초기화 및 인증 상태
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'waiting' | 'passport' | 'auth' | 'wallet' | 'complete'>('waiting');
  const [error, setError] = useState('');
  
  // 사용자 및 패스포트 데이터
  const [user, setUser] = useState<User | null>(null);
  const [passport, setPassport] = useState<AIPassport | null>(null);
  
  // UI 상태
  const [currentView, setCurrentView] = useState('chat');
  const [selectedModel, setSelectedModel] = useState('personalized-agent');
  const [messages, setMessages] = useState<Message[]>([]);
  const [cueBalance, setCueBalance] = useState(3200);
  const [todaysMining, setTodaysMining] = useState(47);
  
  // 연결 상태
  const [backendConnected, setBackendConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  
  // WebAuthn 지원 확인
  const [webauthnSupport] = useState(() => checkWebAuthnSupport());
  
  // API 클라이언트 인스턴스
  const [api] = useState(() => new PersistentDataAPIClient());

  // ============================================================================
  // 🚀 시스템 초기화 및 세션 복원
  // ============================================================================
  
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        console.log('🚀 === AI Passport 시스템 초기화 시작 ===');
        
        // 백엔드 연결 상태 확인
        const health = await api.checkHealth();
        setBackendConnected(health.connected);
        setConnectionStatus(health.connected ? 'connected' : 'disconnected');
        
        // WebAuthn 라이브러리 로드
        if (webauthnSupport.supported) {
          // WebAuthn 라이브러리 동적 로드는 api 내부에서 처리
          setIsLibraryLoaded(true);
        }
        
        // 세션 복원 시도
        console.log('🔧 저장된 세션 복원 시도...');
        const restoredSession = await api.restoreSession();
        
        if (restoredSession && restoredSession.success) {
          console.log('✅ 세션 복원 성공! 자동 로그인 처리');
          
          setUser(restoredSession.user);
          
          // 패스포트 데이터 로드
          if (restoredSession.user.did) {
            try {
              const passportData = await api.loadPassport(restoredSession.user.did);
              setPassport(passportData);
              setCueBalance(passportData.cueBalance || restoredSession.user.cueBalance || 0);
            } catch (error) {
              console.warn('⚠️ 패스포트 로드 실패, 기본값 사용:', error.message);
              setCueBalance(restoredSession.user.cueBalance || 0);
            }
          } else {
            setCueBalance(restoredSession.user.cueBalance || 0);
          }
          
          setIsAuthenticated(true);
          console.log('🎉 자동 로그인 완료!');
        } else {
          console.log('❌ 저장된 세션 없음 또는 만료됨');
        }
        
        setIsInitialized(true);
        console.log('✅ 시스템 초기화 완료');
        
      } catch (error) {
        console.error('❌ 초기화 실패:', error);
        setIsInitialized(true);
      }
    };
    
    initializeSystem();
  }, [api, webauthnSupport]);

  // ============================================================================
  // 🔧 백엔드 연결 재시도
  // ============================================================================
  
  const retryBackendConnection = useCallback(async () => {
    console.log('🔄 백엔드 연결 재시도...');
    const health = await api.checkHealth();
    setBackendConnected(health.connected);
    setConnectionStatus(health.connected ? 'connected' : 'disconnected');
  }, [api]);

  // ============================================================================
  // 🔐 WebAuthn 등록/로그인 처리
  // ============================================================================
  
  const handleRegister = async () => {
    try {
      console.log('🚀 === WebAuthn 등록/로그인 프로세스 시작 ===');
      
      setError('');
      setIsRegistering(true);
      setRegistrationStep('auth');

      const result = await api.startWebAuthnRegistration();
      
      if (!result.success || !result.user) {
        throw new Error('등록 응답이 올바르지 않습니다');
      }

      console.log('✅ WebAuthn 처리 성공:', {
        action: result.action,
        isExisting: result.isExistingUser,
        userId: result.user.id
      });

      // 기존 사용자인지 신규 사용자인지에 따라 처리
      if (result.isExistingUser || result.action === 'login') {
        console.log('🔄 기존 사용자 데이터 복원 중...');
        setUser(result.user);
        
        if (result.user.did) {
          try {
            const passportData = await api.loadPassport(result.user.did);
            setPassport(passportData);
            setCueBalance(passportData.cueBalance || result.user.cueBalance || 0);
          } catch (error) {
            console.warn('패스포트 로드 실패, 기본값 사용');
            setCueBalance(result.user.cueBalance || 0);
          }
        }
        
        setRegistrationStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log('🆕 신규 사용자 등록 처리');
        
        // 신규 사용자 등록 단계별 진행
        setRegistrationStep('wallet');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setRegistrationStep('passport');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUser(result.user);
        
        if (result.user.did) {
          try {
            const passportData = await api.loadPassport(result.user.did);
            setPassport(passportData);
            setCueBalance(passportData.cueBalance || result.user.cueBalance || 0);
          } catch (error) {
            console.warn('패스포트 로드 실패, 기본값 사용');
            setCueBalance(result.user.cueBalance || 0);
          }
        }
        
        setRegistrationStep('complete');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      console.log('🎉 처리 완료! 메인 화면으로 전환...');
      setIsAuthenticated(true);
      setIsRegistering(false);
      setRegistrationStep('waiting');

    } catch (error) {
      console.error('💥 등록/로그인 실패:', error);
      
      // 에러 메시지 사용자 친화적으로 변환
      let errorMessage = error.message;
      if (error.message.includes('취소')) {
        errorMessage = '생체인증이 취소되었습니다. 다시 시도해주세요.';
      } else if (error.message.includes('지원하지 않')) {
        errorMessage = '이 기기는 생체인증을 지원하지 않습니다. 다른 기기를 사용해주세요.';
      } else if (error.message.includes('백엔드')) {
        errorMessage = '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      }
      
      setError(errorMessage);
      setIsRegistering(false);
      setRegistrationStep('waiting');
    }
  };

  // ============================================================================
  // 🚪 로그아웃 처리
  // ============================================================================
  
  const handleLogout = async () => {
    console.log('🔧 === 로그아웃 프로세스 시작 ===');
    
    try {
      await api.logout();
      
      // 상태 초기화
      setIsAuthenticated(false);
      setUser(null);
      setPassport(null);
      setMessages([]);
      setCueBalance(0);
      setTodaysMining(0);
      setRegistrationStep('waiting');
      setError('');
      
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('💥 로그아웃 오류:', error);
      // 에러가 발생해도 로컬 상태는 초기화
      setIsAuthenticated(false);
      setUser(null);
      setPassport(null);
      setMessages([]);
    }
  };

  // ============================================================================
  // 💬 채팅 메시지 전송 처리
  // ============================================================================
  
  const handleSendMessage = async (message: string, model: string) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await api.sendChatMessage(message, model, user?.did);
      
      const aiMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        type: 'ai',
        content: response.response,
        timestamp: new Date().toISOString(),
        model: response.model,
        cueReward: response.cueReward,
        trustScore: response.trustScore,
        contextLearned: response.contextLearned,
        qualityScore: response.qualityScore
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // CUE 토큰 마이닝 결과 반영
      if (response.cueReward) {
        setCueBalance(prev => prev + response.cueReward);
        setTodaysMining(prev => prev + response.cueReward);
      }
      
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      
      // 에러 메시지 표시
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: '죄송합니다. 메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // ============================================================================
  // 🔍 디버그 기능
  // ============================================================================
  
  const handleDebugCredential = useCallback(() => {
    const debugInfo = api.getDebugInfo();
    console.log('🔍 Mock 패스키 디버그 정보:', debugInfo);
    
    alert(`Mock 패스키 정보:\nID: ${debugInfo.mockCredential.id}\n세션 토큰: ${debugInfo.sessionToken ? '있음' : '없음'}\n세션 ID: ${debugInfo.sessionId ? '있음' : '없음'}`);
  }, [api]);

  // ============================================================================
  // 🎨 렌더링
  // ============================================================================

  // 초기화 중인 경우
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">CUE Protocol 초기화 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 온보딩 화면
  if (!isAuthenticated) {
    return (
      <OnboardingFlow
        step={registrationStep}
        isLoading={isRegistering}
        onStart={handleRegister}
        backendConnected={backendConnected}
        backendMode={connectionStatus}
        webauthnSupport={webauthnSupport}
        error={error}
        onRetryConnection={retryBackendConnection}
        onDebugCredential={handleDebugCredential}
      />
    );
  }

  // 인증된 경우 메인 레이아웃
  return (
    <MainLayout
      passport={passport ?? undefined}
      cueBalance={cueBalance}
      todaysMining={todaysMining}
      backendConnected={backendConnected}
      connectionStatus={connectionStatus as import('./layout/MainLayout').ConnectionStatus}
      connectionDetails={{}}
      messages={messages}
      isLoadingChat={false}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      currentView={currentView as import('./layout/MainLayout').ViewType}
      onViewChange={setCurrentView as (view: import('./layout/MainLayout').ViewType) => void}
      onSendMessage={handleSendMessage}
      onUpdatePassport={() => {}}
      onLogout={handleLogout}
      onRetryConnection={retryBackendConnection}
    />
  );
};

export default AIPassportSystem;