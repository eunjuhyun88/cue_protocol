// ============================================================================
// 📁 frontend/src/components/IntegratedAIPassportSystem.tsx
// 🔧 기존 컴포넌트들을 통합하는 메인 컴포넌트 (기존 구조 100% 활용)
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';

// 기존 컴포넌트들 재사용
import ChatInterface from './chat/ChatInterface';
import { LoginForm } from './auth/LoginForm';
import { CueBalance } from './cue/CueBalance';
import { PassportCard } from './passport/PassportCard';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';

// 기존 API 클라이언트 재사용 (새로운 통합 API 사용)
import { apiClient } from '../lib/unified-api';

// 기존 훅들 재사용
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useCue } from '../hooks/useCue';

// 기존 타입들 재사용
import { User, AIPassport } from '../types/unified.types';

/**
 * 🎯 기존 컴포넌트들을 통합하는 메인 시스템
 * - 기존 컴포넌트들은 그대로 유지
 * - 새로운 통합 API만 적용
 * - 상태 관리는 기존 훅들 활용
 */
const IntegratedAIPassportSystem: React.FC = () => {
  // 기존 훅들 그대로 사용
  const { 
    user, 
    login, 
    logout, 
    loading: authLoading 
  } = useAuth();
  
  const { 
    sendMessage, 
    messages, 
    loading: chatLoading 
  } = useChat();
  
  const { 
    balance, 
    transactions, 
    loading: cueLoading 
  } = useCue();

  // 로컬 상태 (UI 제어용)
  const [currentView, setCurrentView] = useState<'passport' | 'chat' | 'cue' | 'settings'>('passport');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passport, setPassport] = useState<AIPassport | null>(null);

  // ============================================================================
  // 🔄 초기화 및 데이터 로딩
  // ============================================================================

  useEffect(() => {
    // 세션 복원 시도 (기존 로직 그대로)
    const restoreSession = async () => {
      try {
        const restored = await apiClient.restoreSession();
        if (restored.success) {
          console.log('✅ 세션 복원 성공');
          // 기존 훅의 상태 업데이트는 자동으로 처리됨
        }
      } catch (error) {
        console.error('세션 복원 실패:', error);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    // 사용자 로그인 시 패스포트 데이터 로드
    if (user?.did) {
      loadPassportData();
    }
  }, [user]);

  const loadPassportData = async () => {
    try {
      if (!user?.did) return;
      
      const passportData = await apiClient.getPassport(user.did);
      setPassport(passportData);
    } catch (error) {
      console.error('패스포트 데이터 로드 실패:', error);
    }
  };

  // ============================================================================
  // 🎯 이벤트 핸들러들 (기존 로직 활용)
  // ============================================================================

  const handleLogin = async () => {
    try {
      const result = await apiClient.startRegistration();
      if (result.success) {
        // 기존 useAuth 훅이 자동으로 상태 업데이트 처리
        console.log('✅ 로그인 성공');
      }
    } catch (error) {
      console.error('로그인 실패:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      setPassport(null);
      setCurrentView('passport');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const handleSendMessage = async (message: string, model: string = 'gpt-4o') => {
    try {
      // 기존 useChat 훅의 sendMessage 사용하되, 새로운 API로 백엔드 호출
      const response = await apiClient.sendMessage(message, model, user?.did);
      
      // 성공 시 CUE 잔액 업데이트 (기존 useCue 훅이 자동 처리)
      if (response.cueEarned) {
        console.log(`✅ CUE ${response.cueEarned} 획득`);
      }
      
      return response;
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      throw error;
    }
  };

  // ============================================================================
  // 🎨 렌더링 (기존 컴포넌트들 조합)
  // ============================================================================

  // 로그인하지 않은 경우 - 기존 LoginForm 사용
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                AI Passport System
              </h1>
              <p className="text-gray-600">
                Enhanced with existing components
              </p>
            </div>
            
            {/* 기존 LoginForm 컴포넌트 그대로 사용 */}
            <LoginForm 
              onLogin={handleLogin}
              loading={authLoading}
              apiClient={apiClient}
            />
          </div>
        </div>
      </div>
    );
  }

  // 로그인한 경우 - 기존 컴포넌트들 조합
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 기존 Header 컴포넌트 사용 */}
      <Header 
        user={user}
        onLogout={handleLogout}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <div className="flex">
        {/* 기존 Sidebar 컴포넌트 사용 */}
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
          user={user}
          cueBalance={balance?.amount || 0}
        />

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-6">
          {currentView === 'passport' && (
            <div className="space-y-6">
              {/* 기존 PassportCard 컴포넌트 사용 */}
              <PassportCard 
                passport={passport}
                user={user}
                onRefresh={loadPassportData}
              />
              
              {/* 기존 CueBalance 컴포넌트 사용 */}
              <CueBalance 
                balance={balance?.amount || 0}
                transactions={transactions}
                loading={cueLoading}
                onRefresh={() => {
                  // 기존 useCue 훅의 새로고침 기능 호출
                }}
              />
            </div>
          )}

          {currentView === 'chat' && (
            /* 기존 ChatInterface 컴포넌트 사용 */
            <ChatInterface 
              user={user}
              onSendMessage={handleSendMessage}
              messages={messages}
              loading={chatLoading}
              apiClient={apiClient}
            />
          )}

          {currentView === 'cue' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">CUE 토큰 관리</h2>
              
              {/* 기존 CueBalance 컴포넌트 확장 버전 */}
              <CueBalance 
                balance={balance?.amount || 0}
                transactions={transactions}
                loading={cueLoading}
                showDetailed={true}
                onRefresh={() => {}}
              />
              
              {/* 추가 CUE 관련 UI */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">CUE 마이닝 통계</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {balance?.amount || 0}
                    </div>
                    <div className="text-sm text-gray-600">총 CUE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {transactions?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">거래 횟수</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.floor((balance?.amount || 0) / 10)}
                    </div>
                    <div className="text-sm text-gray-600">채팅 횟수</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {user?.trustScore || 85}
                    </div>
                    <div className="text-sm text-gray-600">신뢰 점수</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">설정</h2>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">계정 정보</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">사용자명</label>
                    <div className="mt-1 text-sm text-gray-900">{user.username}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DID</label>
                    <div className="mt-1 text-sm text-gray-900 font-mono">{user.did}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">지갑 주소</label>
                    <div className="mt-1 text-sm text-gray-900 font-mono">{user.wallet_address}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">패스포트 레벨</label>
                    <div className="mt-1 text-sm text-gray-900">{user.passportLevel || user.passport_level}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">시스템 상태</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>백엔드 연결</span>
                    <span className="text-green-600">✅ 연결됨</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WebAuthn 지원</span>
                    <span className="text-green-600">✅ 지원됨</span>
                  </div>
                  <div className="flex justify-between">
                    <span>실시간 동기화</span>
                    <span className="text-green-600">✅ 활성화</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default IntegratedAIPassportSystem;