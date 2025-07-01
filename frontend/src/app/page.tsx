// ============================================================================
// 📁 src/components/AIPassportSystem.tsx
// 🎯 메인 AI Passport 시스템 컴포넌트 (기존 구조 활용)
// ============================================================================

'use client';

import React, { useEffect, useState } from 'react';

// 기존 컴포넌트들 import
import { RegistrationFlow } from '../components/auth/RegistrationFlow';
import { LoginForm } from '../components/auth/LoginForm';
import { MainLayout } from '../components/layout/MainLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// 기존 훅들 import
import { useBackendConnection } from '../hooks/useBackendConnection';
import { useWebAuthn } from '../hooks/useWebAuthn';
import { usePassport } from '../hooks/usePassport';
import { useChat } from '../hooks/useChat';
import { useCue } from '../hooks/useCue';

// 기존 타입들 import
import type { 
  UnifiedAIPassport,
  Message,
  ConnectionStatus 
} from '../types/passport.types';

export default function AIPassportSystem() {
  // 초기화 상태
  const [isInitialized, setIsInitialized] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard' | 'passport' | 'vaults'>('chat');

  // 기존 훅들 사용
  const {
    connectionStatus,
    isConnected: backendConnected,
    connectionDetails,
    retryConnection
  } = useBackendConnection();

  const {
    isAuthenticated,
    isRegistering,
    registrationStep,
    registrationError,
    user,
    register,
    login,
    logout,
    clearError
  } = useWebAuthn(backendConnected);

  const {
    passport,
    loading: passportLoading,
    error: passportError,
    loadPassport,
    updatePassport,
    clearError: clearPassportError
  } = usePassport(backendConnected);

  const {
    messages,
    isLoading: chatLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    clearMessages,
    addWelcomeMessage
  } = useChat(passport, backendConnected);

  const {
    balance: cueBalance,
    todaysMining,
    history: cueHistory,
    miningState,
    loading: cueLoading,
    mineCue,
    toggleMining
  } = useCue(passport?.did, backendConnected);

  // 초기화
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 AI Passport System 초기화...');
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ 초기화 실패:', error);
        setIsInitialized(true);
      }
    };
    initializeApp();
  }, []);

  // 인증 후 패스포트 로드
  useEffect(() => {
    if (isAuthenticated && user?.did) {
      loadPassport(user.did);
    }
  }, [isAuthenticated, user?.did, loadPassport]);

  // 패스포트 로드 후 환영 메시지
  useEffect(() => {
    if (passport && messages.length === 0) {
      addWelcomeMessage();
    }
  }, [passport, messages.length, addWelcomeMessage]);

  // 핸들러들
  const handleRegister = async () => {
    try {
      clearError();
      await register('demo@example.com');
    } catch (error) {
      console.error('등록 실패:', error);
    }
  };

  const handleLogin = async () => {
    try {
      clearError();
      await login();
    } catch (error) {
      console.error('로그인 실패:', error);
    }
  };

  const handleSendMessage = async (message: string, model: string) => {
    try {
      await sendMessage(message, model);
      
      // CUE 마이닝
      if (passport?.did) {
        await mineCue({
          userDid: passport.did,
          messageContent: message,
          model,
          personalityProfile: passport.personalityProfile
        });
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  const handleUpdatePassport = async (updates: Partial<UnifiedAIPassport>) => {
    try {
      await updatePassport(updates);
    } catch (error) {
      console.error('패스포트 업데이트 실패:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setShowLoginForm(false);
    clearMessages();
    clearError();
    clearPassportError();
  };

  // 로딩 상태
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">AI Passport System 시작 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 상태
  if (!isAuthenticated) {
    // 등록 진행 중
    if (isRegistering || registrationStep !== 'waiting') {
      return (
        <RegistrationFlow
          registrationStep={registrationStep}
          isRegistering={isRegistering}
          onStart={handleRegister}
          backendConnected={backendConnected}
          registrationError={registrationError}
        />
      );
    }

    // 로그인 폼
    if (showLoginForm) {
      return (
        <LoginForm
          onLogin={handleLogin}
          onRegister={() => setShowLoginForm(false)}
          isLoading={false}
          backendConnected={backendConnected}
          error={registrationError}
        />
      );
    }

    // 첫 화면
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl">🛡️</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Passport + CUE</h1>
          <p className="text-gray-600 mb-8">
            개인화된 AI 경험을 위한 Web3 디지털 신원증
          </p>

          <div className="space-y-4">
            <button
              onClick={handleRegister}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              30초 원클릭 등록
            </button>
            
            <button
              onClick={() => setShowLoginForm(true)}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              기존 계정 로그인
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {backendConnected ? '🌐 Real Backend' : '🔧 Mock Mode'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 패스포트 로딩
  if (passportLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">AI Passport 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 패스포트 오류
  if (!passport && passportError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">패스포트 로드 실패</h2>
          <p className="text-gray-600 mb-6">{passportError}</p>
          <div className="space-y-3">
            <button
              onClick={() => user?.did && loadPassport(user.did)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              다시 시도
            </button>
            <button
              onClick={handleLogout}
              className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 메인 앱
  return (
    <MainLayout
      // 패스포트 데이터
      passport={passport}
      cueBalance={cueBalance}
      todaysMining={todaysMining}
      
      // 백엔드 상태
      backendConnected={backendConnected}
      connectionStatus={connectionStatus}
      connectionDetails={connectionDetails}
      
      // 채팅 데이터
      messages={messages}
      isLoadingChat={chatLoading}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      
      // 뷰 상태
      currentView={currentView}
      onViewChange={setCurrentView}
      
      // 핸들러들
      onSendMessage={handleSendMessage}
      onUpdatePassport={handleUpdatePassport}
      onLogout={handleLogout}
      onRetryConnection={retryConnection}
    />
  );
}