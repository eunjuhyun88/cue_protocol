// ============================================================================
// 🚀 개선된 AIPassportSystem.tsx - 기존 훅 완전 통합
// 경로: frontend/src/components/AIPassportSystem.tsx
// ============================================================================
// 기존 1000+ 줄을 300줄로 압축하면서 모든 기능 유지
// useChat, useCue, usePassport 훅을 완전히 활용하여 코드 중복 제거

'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  User, 
  Settings, 
  Coins, 
  Send, 
  Fingerprint,
  Brain,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// 🔧 기존 훅들 사용 - 프로젝트에 이미 구현되어 있음
// ============================================================================
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useBackendConnection } from '../hooks/useBackendConnection';
import { useCue } from '../hooks/useCue';
import { usePassport } from '../hooks/usePassport';

// ============================================================================
// 🎨 기존 UI 컴포넌트들 사용
// ============================================================================
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { StatusBadge } from './ui/StatusBadge';

// ============================================================================
// 📝 기존 타입들 사용
// ============================================================================
import type { UnifiedAIPassport } from '../types/passport.types';
import type { Message } from '../types/chat.types';

// ============================================================================
// 🎯 메인 AIPassportSystem 컴포넌트 (훅 중심으로 완전 재작성)
// ============================================================================
const AIPassportSystem: React.FC = () => {
  // ============================================================================
  // 🔧 모든 기존 훅들 사용 - 상태 관리를 훅에 위임
  // ============================================================================
  
  // 인증 관련 - useAuth 훅 사용
  const {
    isAuthenticated,
    user,
    login,
    register,
    logout,
    isLoading: authLoading,
    error: authError
  } = useAuth();

  // 백엔드 연결 상태 - useBackendConnection 훅 사용
  const {
    isConnected: backendConnected,
    latency,
    error: connectionError,
    checkConnection
  } = useBackendConnection();

  // 패스포트 관리 - usePassport 훅 사용
  const {
    passport,
    isLoading: passportLoading,
    refreshPassport,
    error: passportError
  } = usePassport(user?.did, backendConnected);

  // 채팅 관리 - useChat 훅 사용 (패스포트와 연결)
  const {
    messages,
    isLoading: chatLoading,
    selectedModel,
    availableModels,
    sendMessage,
    clearMessages,
    setSelectedModel,
    addWelcomeMessage
  } = useChat(passport, backendConnected);

  // CUE 토큰 관리 - useCue 훅 사용
  const {
    balance: cueBalance,
    history: cueHistory,
    miningState,
    isLoading: cueLoading,
    mineCue,
    toggleMining,
    getMiningMultiplier,
    canMineNow
  } = useCue(user?.did, backendConnected);

  // 소켓 연결 - useSocket 훅 사용
  const {
    isConnected: socketConnected,
    emit
  } = useSocket();

  // ============================================================================
  // 🎛️ 로컬 UI 상태만 관리 (비즈니스 로직은 모두 훅에서 처리)
  // ============================================================================
  const [inputMessage, setInputMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // ============================================================================
  // 🔄 컴포넌트 마운트 시 초기화
  // ============================================================================
  useEffect(() => {
    console.log('🚀 AIPassportSystem 초기화 - 훅 기반');
    
    // 백엔드 연결 확인
    checkConnection();
    
    // 웰컴 메시지 추가 (useChat 훅에서 관리)
    if (messages.length === 0) {
      addWelcomeMessage();
    }
  }, [checkConnection, addWelcomeMessage, messages.length]);

  // ============================================================================
  // 🔄 메시지 전송 핸들러 (useChat 훅 활용)
  // ============================================================================
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || chatLoading) return;

    const messageContent = inputMessage;
    setInputMessage('');

    try {
      console.log('📤 메시지 전송 (useChat 훅 사용):', messageContent);
      
      // useChat 훅의 sendMessage 사용
      await sendMessage(messageContent, selectedModel);

      // CUE 마이닝 트리거 (useCue 훅 사용)
      if (passport && messageContent.length > 10 && canMineNow()) {
        try {
          const miningResult = await mineCue('ai_chat', {
            messageLength: messageContent.length,
            model: selectedModel,
            hasPassport: true
          });
          console.log('🪙 CUE 마이닝 성공:', miningResult);
        } catch (miningError) {
          console.warn('⚠️ CUE 마이닝 실패:', miningError);
        }
      }

    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
    }
  };

  // ============================================================================
  // 🔧 인증 핸들러들 (useAuth 훅 활용)
  // ============================================================================
  const handleRegister = async () => {
    try {
      console.log('🔐 WebAuthn 등록 시작 (useAuth 훅 사용)');
      await register();
    } catch (error) {
      console.error('❌ 등록 실패:', error);
    }
  };

  const handleLogin = async () => {
    try {
      console.log('🔐 WebAuthn 로그인 시작 (useAuth 훅 사용)');
      await login();
    } catch (error) {
      console.error('❌ 로그인 실패:', error);
    }
  };

  // ============================================================================
  // 🎨 렌더링 - 기존 UI 유지하되 훅 데이터 사용
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Passport System</h1>
                <p className="text-sm text-gray-500">
                  {backendConnected ? '✅ 실제 백엔드 연결됨' : '⚠️ Mock 모드'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isAuthenticated && (
                <Button onClick={logout} variant="outline" size="sm">
                  로그아웃
                </Button>
              )}
              <Button onClick={() => setShowSettings(!showSettings)} variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 인증되지 않은 경우 */}
        {!isAuthenticated && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="max-w-md mx-auto">
              <Fingerprint className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h2 className="text-2xl font-bold mb-2">시작하기</h2>
              <p className="text-gray-600 mb-6">
                WebAuthn을 사용하여 안전하게 인증하고 개인화된 AI 경험을 시작하세요.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleLogin} 
                  className="w-full"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Fingerprint className="w-4 h-4 mr-2" />
                  )}
                  로그인
                </Button>
                
                <Button 
                  onClick={handleRegister} 
                  variant="outline" 
                  className="w-full"
                  disabled={authLoading}
                >
                  계정 생성
                </Button>
              </div>

              {authError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{authError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 인증된 경우 메인 인터페이스 */}
        {isAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* 사이드바 */}
            <div className="lg:col-span-1 space-y-4">
              
              {/* 패스포트 카드 - usePassport 훅 데이터 사용 */}
              <Card className="p-4">
                {passportLoading ? (
                  <div className="text-center">
                    <LoadingSpinner size="sm" />
                    <p className="text-sm text-gray-500 mt-2">패스포트 로딩 중...</p>
                  </div>
                ) : passport ? (
                  <>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{passport.did.slice(0, 12)}...</div>
                        <div className="text-sm text-gray-500">{passport.passportLevel}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">신뢰도</span>
                        <span className="text-sm font-medium">{passport.trustScore}%</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">CUE 토큰</span>
                        <span className="text-sm font-medium flex items-center">
                          <Coins className="w-4 h-4 mr-1 text-yellow-500" />
                          {passport.cueTokens.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">연결된 플랫폼</span>
                        <span className="text-sm font-medium">{passport.connectedPlatforms.length}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">생체인증</span>
                        <StatusBadge status={passport.biometricVerified ? 'verified' : 'unverified'} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500">
                    <User className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm">패스포트 정보 없음</div>
                  </div>
                )}
              </Card>

              {/* 연결 상태 카드 */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">시스템 상태</h3>
                  <Button onClick={checkConnection} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">백엔드</span>
                    <StatusBadge status={backendConnected ? 'connected' : 'disconnected'} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">실시간 통신</span>
                    <StatusBadge status={socketConnected ? 'connected' : 'disconnected'} />
                  </div>

                  {latency && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">지연시간</span>
                      <span className="text-sm text-gray-500">{latency}ms</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* CUE 토큰 카드 - useCue 훅 데이터 사용 */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">CUE 토큰</h3>
                  <Button 
                    onClick={toggleMining} 
                    variant={miningState.isActive ? "outline" : "default"} 
                    size="sm"
                  >
                    {miningState.isActive ? '마이닝 중지' : '마이닝 시작'}
                  </Button>
                </div>
                
                {cueLoading ? (
                  <LoadingSpinner size="sm" />
                ) : cueBalance ? (
                  <>
                    <div className="text-2xl font-bold flex items-center mb-2">
                      <Coins className="w-5 h-5 mr-2 text-yellow-500" />
                      {cueBalance.total.toLocaleString()}
                    </div>
                    
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>사용 가능: {cueBalance.available.toLocaleString()}</div>
                      <div>배수: {getMiningMultiplier()}x</div>
                      <div>상태: {canMineNow() ? '마이닝 가능' : '쿨다운'}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500">잔액 정보 없음</div>
                )}
              </Card>

              {/* AI 모델 선택 */}
              <Card className="p-4">
                <h3 className="font-medium mb-3">AI 모델</h3>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  disabled={chatLoading}
                >
                  {availableModels.map(model => (
                    <option key={model} value={model}>
                      {model.toUpperCase()}
                    </option>
                  ))}
                </select>
              </Card>
            </div>

            {/* 메인 채팅 영역 */}
            <div className="lg:col-span-3">
              <Card className="h-[600px] flex flex-col">
                
                {/* 채팅 헤더 */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-medium">AI 채팅</span>
                      <span className="text-sm text-gray-500">({selectedModel})</span>
                    </div>
                    <Button onClick={clearMessages} variant="outline" size="sm">
                      대화 초기화
                    </Button>
                  </div>
                </div>

                {/* 메시지 목록 - useChat 훅 데이터 사용 */}
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>AI와 대화를 시작해보세요!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                    </div>
                  )}

                  {/* 로딩 상태 */}
                  {chatLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-gray-600">AI가 응답 중...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 입력 영역 */}
                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={chatLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || chatLoading}
                    >
                      {chatLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* 연결 상태 경고 */}
                  {!backendConnected && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      백엔드 연결이 끊어졌습니다. Mock 모드로 동작합니다.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 💬 메시지 버블 컴포넌트 (기존 UI 유지)
// ============================================================================
interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        <div className="text-sm">{message.content}</div>
        
        {/* 메시지 메타데이터 */}
        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          
          {/* CUE 토큰 정보 */}
          {(message.cueTokensUsed || message.cueTokensEarned) && (
            <div className="flex items-center space-x-2">
              {message.cueTokensUsed && (
                <span className="flex items-center">
                  <Coins className="w-3 h-3 mr-1" />
                  -{message.cueTokensUsed}
                </span>
              )}
              {message.cueTokensEarned && (
                <span className="flex items-center text-green-400">
                  <Coins className="w-3 h-3 mr-1" />
                  +{message.cueTokensEarned}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 사용된 패스포트 데이터 표시 */}
        {message.usedPassportData && message.usedPassportData.length > 0 && (
          <div className="mt-2 text-xs opacity-70">
            <div className="flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              사용된 데이터: {message.usedPassportData.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPassportSystem;