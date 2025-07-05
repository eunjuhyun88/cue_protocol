// ============================================================================
// 📁 frontend/src/components/AIPassportSystem.tsx - 최적화된 하이브리드 접근
// 🎯 useAuth (인증) + PersistentDataAPIClient (WebSocket, 백엔드 연결) 조합
// ============================================================================

'use client';

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
// 🔧 하이브리드 Import: useAuth + PersistentDataAPIClient 조합
// ============================================================================

// 🔐 인증 전용: useAuth 훅 사용
import { useAuth } from '../hooks/useAuth';

// 🔌 백엔드 연결 전용: PersistentDataAPIClient의 일부 기능만 사용
import { PersistentDataAPIClient } from '../services/api/PersistentDataAPIClient';

// UI 컴포넌트들
import { LoadingSpinner } from './ui/LoadingSpinner';
import { BackendStatus } from './ui/BackendStatus';
import { OnboardingFlow } from './auth/OnBoardingFlow';
import { MainLayout } from './layout/MainLayout';

// ============================================================================
// 🔧 타입 정의 (useAuth 호환)
// ============================================================================

interface User {
  id: string;
  username: string;
  email?: string;
  did: string;
  walletAddress?: string;
  wallet_address?: string;
  cueBalance: number;
  cue_tokens?: number;
  trustScore: number;
  trust_score?: number;
  passportLevel: string;
  passport_level?: string;
  biometricVerified: boolean;
  biometric_verified?: boolean;
  registeredAt: string;
  created_at?: string;
  authenticated: boolean;
}

interface AIPassport {
  did: string;
  username: string;
  trustScore: number;
  passportLevel: string;
  cueBalance: number;
  cueTokens?: number;
  totalMined: number;
  dataVaults: Array<{
    name: string;
    type: string;
    size: string;
    items: number;
    cueCount?: number;
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
// 🎯 최적화된 AI Passport 시스템 (하이브리드 접근)
// ============================================================================

const AIPassportSystem: React.FC = () => {
  // ============================================================================
  // 🔐 useAuth 훅: 인증 전용
  // ============================================================================
  
  const {
    // 상태
    user,
    isLoading: isAuthLoading,
    isAuthenticated,
    sessionToken,
    error: authError,
    
    // 통합 인증
    authenticateWithWebAuthn,
    
    // 세션 관리
    logout,
    refreshUser,
    
    // 에러 관리
    clearError,
    
    // 유틸리티
    validateDID
  } = useAuth();

  // ============================================================================
  // 🔌 PersistentDataAPIClient: 백엔드 연결 전용
  // ============================================================================
  
  const [api] = useState(() => new PersistentDataAPIClient());

  // ============================================================================
  // 🔧 로컬 상태 관리 (중복 제거됨)
  // ============================================================================
  
  // UI 상태만 관리
  const [currentView, setCurrentView] = useState('chat');
  const [selectedModel, setSelectedModel] = useState('personalized-agent');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'waiting' | 'passport' | 'auth' | 'wallet' | 'complete'>('waiting');
  
  // 패스포트 상태
  const [passport, setPassport] = useState<AIPassport | null>(null);
  
  // 백엔드 연결 상태 (PersistentDataAPIClient 담당)
  const [backendConnected, setBackendConnected] = useState(false);
  const [backendMode, setBackendMode] = useState('checking');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // ============================================================================
  // 🔧 데이터 정규화 (useAuth 호환)
  // ============================================================================
  
  const normalizeUserData = useCallback((userData: any): User => {
    return {
      id: userData.id,
      username: userData.username || userData.display_name || `User_${userData.id.slice(-8)}`,
      email: userData.email || null,
      did: userData.did || `did:final0626:${userData.id}`,
      walletAddress: userData.walletAddress || userData.wallet_address,
      cueBalance: userData.cueBalance || userData.cue_tokens || 15428,
      trustScore: userData.trustScore || userData.trust_score || 95,
      passportLevel: userData.passportLevel || userData.passport_level || 'Bronze',
      biometricVerified: userData.biometricVerified || userData.biometric_verified || true,
      registeredAt: userData.registeredAt || userData.created_at || new Date().toISOString(),
      authenticated: true
    };
  }, []);

  const createDefaultPassport = useCallback((userData: User): AIPassport => {
    return {
      did: userData.did,
      username: userData.username,
      trustScore: userData.trustScore,
      passportLevel: userData.passportLevel,
      cueBalance: userData.cueBalance,
      cueTokens: userData.cueBalance,
      totalMined: Math.floor(userData.cueBalance * 1.5),
      dataVaults: [
        {
          name: 'Personal Data',
          type: 'encrypted',
          size: '1.2MB',
          items: 247,
          cueCount: Math.floor(userData.cueBalance * 0.1)
        },
        {
          name: 'AI Conversations',
          type: 'conversations',
          size: '856KB',
          items: 89,
          cueCount: Math.floor(userData.cueBalance * 0.05)
        }
      ],
      connectedPlatforms: ['ChatGPT', 'Claude'],
      personalityProfile: {
        traits: ['analytical', 'creative', 'curious'],
        communicationStyle: 'friendly',
        expertise: ['AI', 'Technology']
      },
      achievements: [
        {
          name: 'First Steps',
          icon: '🎯',
          earned: true,
          description: 'AI Passport 생성 완료'
        },
        {
          name: 'Verified Identity',
          icon: '✅',
          earned: true,
          description: '생체인증으로 신원 확인'
        }
      ],
      ragDagStats: {
        learnedConcepts: 247,
        connectionStrength: 0.87,
        lastLearningActivity: new Date().toISOString(),
        knowledgeNodes: 1456,
        personalityAccuracy: 0.94
      },
      recentActivity: [
        {
          type: 'passport_created',
          description: 'AI Passport 생성됨',
          timestamp: new Date().toISOString()
        }
      ]
    };
  }, []);

  // ============================================================================
  // 🚀 하이브리드 초기화: useAuth + PersistentDataAPIClient
  // ============================================================================
  
  useEffect(() => {
    const initializeSystem = async () => {
      console.log('🚀 === 하이브리드 시스템 초기화 ===');
      
      // 1. 백엔드 연결 확인 (PersistentDataAPIClient)
      try {
        const health = await api.checkHealth();
        setBackendConnected(health.connected);
        setBackendMode(health.mode || 'mock');
        setConnectionStatus(health.connected ? 'connected' : 'disconnected');
        console.log('✅ 백엔드 상태 확인 완료:', health.connected ? 'Connected' : 'Mock Mode');
      } catch (error) {
        console.warn('⚠️ 백엔드 연결 실패, Mock 모드 사용');
        setBackendConnected(false);
        setBackendMode('mock');
        setConnectionStatus('disconnected');
      }

      // 2. WebSocket 연결 (PersistentDataAPIClient의 고유 기능)
      try {
        api.connectWebSocket();
        
        // 실시간 업데이트 리스너 설정
        const unsubscribe = api.onRealtimeUpdate((data) => {
          console.log('📡 실시간 업데이트 수신:', data.type);
          
          switch (data.type) {
            case 'cue_update':
              if (user && data.userId === user.id) {
                refreshUser(); // useAuth의 refreshUser 사용
              }
              break;
            case 'passport_update':
              if (passport && data.did === passport.did) {
                // 패스포트 새로고침
                loadPassportData(data.did);
              }
              break;
          }
        });

        // 컴포넌트 언마운트 시 리스너 정리
        return unsubscribe;
      } catch (error) {
        console.warn('⚠️ WebSocket 연결 실패, HTTP 폴백 사용');
      }
    };

    initializeSystem();
  }, [api, user, passport, refreshUser]);

  // ============================================================================
  // 🔧 패스포트 데이터 로드 (PersistentDataAPIClient 사용)
  // ============================================================================
  
  const loadPassportData = useCallback(async (did: string) => {
    try {
      console.log('📊 패스포트 로드 시도:', did);
      const passportData = await api.loadPassport(did);
      
      if (passportData && passportData.did) {
        const normalizedPassport = {
          ...passportData,
          cueTokens: passportData.cueBalance || user?.cueBalance || 0,
          dataVaults: passportData.dataVaults?.map(vault => ({
            ...vault,
            cueCount: vault.cueCount || 0
          })) || []
        };
        
        setPassport(normalizedPassport);
        console.log('✅ 패스포트 로드 성공:', normalizedPassport.did);
      } else {
        throw new Error('패스포트 데이터 형식 오류');
      }
    } catch (error) {
      console.warn('⚠️ 패스포트 로드 실패, 기본 패스포트 생성:', error);
      if (user) {
        const defaultPassport = createDefaultPassport(user);
        setPassport(defaultPassport);
      }
    }
  }, [api, user, createDefaultPassport]);

  // useAuth 사용자 변경 시 패스포트 로드
  useEffect(() => {
    if (user && isAuthenticated && user.did && validateDID(user.did)) {
      loadPassportData(user.did);
    }
  }, [user, isAuthenticated, validateDID, loadPassportData]);

  // ============================================================================
  // 🔐 인증 처리 (useAuth 사용)
  // ============================================================================
  
  const handleRegister = async () => {
    try {
      console.log('🚀 === useAuth 기반 인증 시작 ===');
      
      clearError();
      setIsRegistering(true);
      setRegistrationStep('auth');

      // useAuth의 통합 인증 사용
      const result = await authenticateWithWebAuthn();

      if (result.success && result.user) {
        console.log('✅ 인증 성공:', result.user.username);

        // 등록 플로우 애니메이션
        if (result.isExistingUser) {
          setRegistrationStep('complete');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          setRegistrationStep('wallet');
          await new Promise(resolve => setTimeout(resolve, 800));
          setRegistrationStep('passport');
          await new Promise(resolve => setTimeout(resolve, 800));
          setRegistrationStep('complete');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setIsRegistering(false);
        setRegistrationStep('waiting');
      } else {
        throw new Error(result.message || '인증 실패');
      }

    } catch (error: any) {
      console.error('💥 인증 실패:', error);
      setIsRegistering(false);
      setRegistrationStep('waiting');
    }
  };

  // ============================================================================
  // 🚪 로그아웃 (useAuth + PersistentDataAPIClient 정리)
  // ============================================================================
  
  const handleLogout = useCallback(async () => {
    try {
      console.log('🔧 하이브리드 로그아웃 시작...');
      
      // 1. useAuth 로그아웃
      await logout();
      
      // 2. PersistentDataAPIClient WebSocket 정리
      api.disconnectWebSocket();
      
      // 3. 로컬 상태 정리
      setPassport(null);
      setMessages([]);
      setCurrentView('chat');
      
      console.log('✅ 하이브리드 로그아웃 완료');
      
    } catch (error) {
      console.error('❌ 로그아웃 중 오류:', error);
    }
  }, [logout, api]);

  // ============================================================================
  // 💬 채팅 처리 (useAuth 토큰 + PersistentDataAPIClient API)
  // ============================================================================
  
  const handleSendMessage = useCallback(async (message: string, model: string) => {
    if (!message.trim() || !user) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      // PersistentDataAPIClient의 채팅 API 사용 (sessionToken 자동 포함)
      if (sessionToken) {
        api.setSessionToken(sessionToken); // useAuth 토큰을 PersistentDataAPIClient에 설정
      }

      const response = await api.sendChatMessage(message, model, user.did);
      
      if (response && response.response) {
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          type: 'ai',
          content: response.response,
          timestamp: new Date().toISOString(),
          model: model,
          cueReward: response.cueReward
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // CUE 토큰 획득 시 사용자 정보 새로고침
        if (response.cueReward) {
          await refreshUser();
        }
        
      } else {
        throw new Error('AI 응답 형식 오류');
      }
      
    } catch (error: any) {
      console.error('💥 AI 채팅 실패:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        type: 'ai',
        content: `죄송합니다. AI 서비스에 일시적인 문제가 발생했습니다: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [user, sessionToken, api, refreshUser]);

  // ============================================================================
  // 🔍 백엔드 연결 재시도 (PersistentDataAPIClient)
  // ============================================================================
  
  const retryBackendConnection = useCallback(async () => {
    console.log('🔄 백엔드 연결 재시도...');
    try {
      const health = await api.checkHealth();
      setBackendConnected(health.connected);
      setBackendMode(health.mode || 'mock');
      setConnectionStatus(health.connected ? 'connected' : 'disconnected');
    } catch (error) {
      setBackendConnected(false);
      setBackendMode('mock');
      setConnectionStatus('disconnected');
    }
  }, [api]);

  // ============================================================================
  // 🔍 디버그 기능 (하이브리드)
  // ============================================================================
  
  const handleDebugCredential = useCallback(() => {
    // PersistentDataAPIClient 정보
    const apiDebug = api.getDebugInfo?.() || {};
    
    // useAuth 정보
    const authDebug = {
      isAuthenticated,
      hasUser: !!user,
      userDID: user?.did,
      hasSessionToken: !!sessionToken,
      authError: authError || 'None'
    };

    console.log('🔍 하이브리드 디버그 정보:', { apiDebug, authDebug });
    
    alert(`하이브리드 시스템 디버그:
    
인증 (useAuth):
- 인증됨: ${authDebug.isAuthenticated}
- 사용자: ${authDebug.hasUser}
- DID: ${authDebug.userDID}
- 토큰: ${authDebug.hasSessionToken}

백엔드 (PersistentDataAPIClient):
- 연결됨: ${backendConnected}
- 모드: ${backendMode}
- WebSocket: ${api.websocket ? 'Connected' : 'Disconnected'}`);
  }, [api, isAuthenticated, user, sessionToken, authError, backendConnected, backendMode]);

  // ============================================================================
  // 🎨 렌더링
  // ============================================================================

  // useAuth 로딩 중
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">하이브리드 시스템 초기화 중...</p>
          <p className="text-sm text-gray-500 mt-2">useAuth + PersistentDataAPIClient</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <OnboardingFlow
        step={registrationStep}
        isLoading={isRegistering}
        onStart={handleRegister}
        backendConnected={backendConnected}
        backendMode={backendMode}
        webauthnSupport={{ supported: true, available: true }}
        error={authError || ''}
        onRetryConnection={retryBackendConnection}
        onDebugCredential={handleDebugCredential}
      />
    );
  }

  // 인증된 경우 메인 레이아웃
  return (
    <MainLayout
      passport={passport ?? undefined}
      cueBalance={user?.cueBalance || 0}
      todaysMining={47} // TODO: 실시간 데이터로 교체
      backendConnected={backendConnected}
      connectionStatus={connectionStatus as any}
      connectionDetails={{
        mode: backendMode,
        websocket: api.websocket ? 'connected' : 'disconnected',
        apiStatus: 'hybrid'
      }}
      messages={messages}
      isLoadingChat={false}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      currentView={currentView as any}
      onViewChange={setCurrentView as any}
      onSendMessage={handleSendMessage}
      onUpdatePassport={() => {
        if (user?.did) loadPassportData(user.did);
      }}
      onLogout={handleLogout}
      onRetryConnection={retryBackendConnection}
    />
  );
};

export default AIPassportSystem;