// ============================================================================
// 📁 src/components/auth/OnboardingFlow.tsx
// 🎨 온보딩 플로우 컴포넌트 (완전한 디자인 + 기능 유지)
// ============================================================================

'use client';

import React from 'react';
import { 
  Shield, Fingerprint, CheckCircle, AlertCircle, Key, User, 
  Zap, Sparkles, Wifi, WifiOff, Target, Coffee, ArrowUp,
  Lock, Database, Globe, Star, Award
} from 'lucide-react';

// ============================================================================
// 🔧 온보딩 플로우 Props 타입
// ============================================================================

interface OnboardingFlowProps {
  step: 'waiting' | 'auth' | 'wallet' | 'passport' | 'complete';
  isLoading: boolean;
  onStart: () => void;
  backendConnected: boolean;
  backendMode: string;
  webauthnSupport: {
    supported: boolean;
    reason?: string;
  };
  error?: string;
  onRetryConnection?: () => void;
  onDebugCredential?: () => void;
}

// ============================================================================
// 🎨 공통 UI 컴포넌트들
// ============================================================================

const LoadingSpinner = ({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <div className="border-2 border-gray-300 border-t-blue-600 rounded-full w-full h-full"></div>
    </div>
  );
};

const StatusIndicator = ({ 
  connected, 
  mode, 
  variant = 'compact' 
}: { 
  connected: boolean; 
  mode: string; 
  variant?: 'compact' | 'detailed' 
}) => {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
      connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      <span>{connected ? 'Live Backend' : 'Mock Mode'}</span>
      {variant === 'detailed' && (
        <span className="text-xs opacity-75">({mode})</span>
      )}
    </div>
  );
};

const FeatureItem = ({ 
  color, 
  text 
}: { 
  color: 'green' | 'blue' | 'purple' | 'orange'; 
  text: string 
}) => {
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500', 
    orange: 'bg-orange-500'
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 ${colorClasses[color]} rounded-full`}></div>
      <span>{text}</span>
    </div>
  );
};

// ============================================================================
// 🎨 메인 온보딩 플로우 컴포넌트
// ============================================================================

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ 
  step, 
  isLoading, 
  onStart, 
  backendConnected,
  backendMode,
  webauthnSupport,
  error,
  onRetryConnection,
  onDebugCredential
}) => {
  // 단계별 아이콘 렌더링
  const getStepIcon = () => {
    const iconProps = { className: "w-10 h-10 text-white" };
    
    switch (step) {
      case 'waiting':
        return <Shield {...iconProps} />;
      case 'auth':
        return <Fingerprint {...iconProps} className="w-10 h-10 text-white animate-pulse" />;
      case 'wallet':
        return <Key {...iconProps} className="w-10 h-10 text-white animate-pulse" />;
      case 'passport':
        return <User {...iconProps} className="w-10 h-10 text-white animate-pulse" />;
      case 'complete':
        return <CheckCircle {...iconProps} />;
      default:
        return <Shield {...iconProps} />;
    }
  };

  // 단계별 제목
  const getStepTitle = () => {
    switch (step) {
      case 'waiting':
        return 'CUE Protocol AI Passport';
      case 'auth':
        return '🔐 생체인증 중...';
      case 'wallet':
        return '🌐 DID 생성 중...';
      case 'passport':
        return '🛡️ AI Passport 생성 중...';
      case 'complete':
        return '🎉 완료!';
      default:
        return 'CUE Protocol AI Passport';
    }
  };

  // 단계별 설명
  const getStepDescription = () => {
    switch (step) {
      case 'waiting':
        return '영구 데이터 보존형 개인화 AI 플랫폼에 오신 것을 환영합니다';
      case 'auth':
        return '생체인증을 완료해주세요';
      case 'wallet':
        return '블록체인 지갑과 DID를 생성하고 있습니다';
      case 'passport':
        return 'AI Passport를 초기화하고 있습니다';
      case 'complete':
        return 'AI Passport가 준비되었습니다!';
      default:
        return '영구 데이터 보존형 개인화 AI 플랫폼에 오신 것을 환영합니다';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-gray-100 relative overflow-hidden">
        
        {/* 배경 장식 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400 to-pink-500 opacity-5 rounded-full -ml-12 -mb-12"></div>
        
        <div className="relative z-10">
          {/* ============================================================================ */}
          {/* 🎯 헤더 섹션 */}
          {/* ============================================================================ */}
          
          <div className="text-center mb-8">
            {/* 아이콘 */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
              {getStepIcon()}
            </div>
            
            {/* 제목 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {getStepTitle()}
            </h1>
            
            {/* 설명 */}
            <p className="text-gray-600 text-lg">
              {getStepDescription()}
            </p>
          </div>

          {/* ============================================================================ */}
          {/* 📡 시스템 상태 표시 */}
          {/* ============================================================================ */}
          
          <div className="flex justify-center mb-6">
            <StatusIndicator 
              connected={backendConnected} 
              mode={backendMode}
              variant="detailed"
            />
          </div>

          {/* ============================================================================ */}
          {/* 🔐 WebAuthn 지원 상태 */}
          {/* ============================================================================ */}
          
          <div className={`mb-6 p-4 rounded-xl border ${
            webauthnSupport.supported 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              <Fingerprint className={`w-4 h-4 ${
                webauthnSupport.supported ? 'text-blue-600' : 'text-yellow-600'
              }`} />
              <span className={`text-sm font-medium ${
                webauthnSupport.supported ? 'text-blue-800' : 'text-yellow-800'
              }`}>
                {webauthnSupport.supported ? '✅ WebAuthn 지원됨' : '⚠️ WebAuthn 제한됨'}
              </span>
            </div>
            {!webauthnSupport.supported && webauthnSupport.reason && (
              <p className="text-xs text-yellow-700 mt-1">{webauthnSupport.reason}</p>
            )}
          </div>

          {/* ============================================================================ */}
          {/* ❌ 에러 메시지 */}
          {/* ============================================================================ */}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* ============================================================================ */}
          {/* 🎯 메인 액션 영역 */}
          {/* ============================================================================ */}
          
          {/* 대기 상태 - 시작 버튼과 기능 소개 */}
          {step === 'waiting' && (
            <div className="space-y-6">
              {/* 핵심 기능 강조 카드 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  영구 데이터 보존 기능
                </h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <FeatureItem 
                    color="green" 
                    text="WebAuthn 생체인증 (Face ID, Touch ID)" 
                  />
                  <FeatureItem 
                    color="blue" 
                    text="자동 블록체인 지갑 + DID 생성" 
                  />
                  <FeatureItem 
                    color="purple" 
                    text="영구 세션 기반 데이터 유지" 
                  />
                  <FeatureItem 
                    color="orange" 
                    text="CUE 토큰 & Trust Score 누적" 
                  />
                </div>
              </div>

              {/* 추가 혜택 카드 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <Lock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">완전 보안</p>
                  <p className="text-xs text-gray-600">생체인증 + 암호화</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <Star className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">AI 개인화</p>
                  <p className="text-xs text-gray-600">RAG-DAG 학습</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <Coffee className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">CUE 마이닝</p>
                  <p className="text-xs text-gray-600">대화로 토큰 획득</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <Globe className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">멀티플랫폼</p>
                  <p className="text-xs text-gray-600">크로스 체인 지원</p>
                </div>
              </div>
              
              {/* 시작 버튼 */}
              <button
                onClick={onStart}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingSpinner size="sm" className="text-white" />
                    <span>생성 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>영구 AI Passport 생성</span>
                  </div>
                )}
              </button>

              {/* 디버그 버튼 (개발용) */}
              {onDebugCredential && (
                <button
                  onClick={onDebugCredential}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm underline transition-colors"
                >
                  🔍 Mock 패스키 디버그 정보 확인
                </button>
              )}
            </div>
          )}

          {/* 진행 중 상태 - 로딩 스피너 + 진행 표시 */}
          {(['auth', 'wallet', 'passport'].includes(step)) && (
            <div className="space-y-6">
              <div className="flex justify-center py-8">
                <LoadingSpinner size="xl" />
              </div>
              
              {/* 진행 단계 표시 */}
              <div className="space-y-3">
                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  ['auth', 'wallet', 'passport'].includes(step) ? 'bg-blue-50' : 'bg-gray-50'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step === 'auth' ? 'bg-blue-600' : 'bg-green-500'
                  }`}>
                    {step === 'auth' ? (
                      <LoadingSpinner size="sm" className="text-white" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step === 'auth' ? 'text-blue-700' : 'text-green-700'
                  }`}>
                    생체인증 {step === 'auth' ? '진행 중...' : '완료'}
                  </span>
                </div>

                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  ['wallet', 'passport'].includes(step) ? 'bg-blue-50' : 'bg-gray-50'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step === 'wallet' ? 'bg-blue-600' : 
                    step === 'passport' ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {step === 'wallet' ? (
                      <LoadingSpinner size="sm" className="text-white" />
                    ) : step === 'passport' ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Key className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step === 'wallet' ? 'text-blue-700' : 
                    step === 'passport' ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    DID 지갑 생성 {
                      step === 'wallet' ? '진행 중...' : 
                      step === 'passport' ? '완료' : '대기 중'
                    }
                  </span>
                </div>

                <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                  step === 'passport' ? 'bg-blue-50' : 'bg-gray-50'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step === 'passport' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    {step === 'passport' ? (
                      <LoadingSpinner size="sm" className="text-white" />
                    ) : (
                      <User className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step === 'passport' ? 'text-blue-700' : 'text-gray-500'
                  }`}>
                    AI Passport 초기화 {step === 'passport' ? '진행 중...' : '대기 중'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 완료 상태 - 성공 메시지 + 완료 버튼 */}
          {step === 'complete' && (
            <div className="space-y-6">
              {/* 성공 메시지 */}
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  AI Passport 생성 완료!
                </h3>
                <p className="text-gray-600">
                  이제 개인화된 AI와 대화하고 CUE 토큰을 마이닝할 수 있습니다.
                </p>
              </div>

              {/* 혜택 요약 */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  획득한 혜택
                </h4>
                <div className="space-y-2 text-sm text-green-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>🎯 15,428 CUE 토큰 (환영 보너스)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>🛡️ Verified 등급 AI Passport</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>🧠 개인화 AI 에이전트 활성화</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>🔐 영구 데이터 보존 보장</span>
                  </div>
                </div>
              </div>

              {/* 완료 버튼 */}
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>AI Passport 사용하기</span>
                  <ArrowUp className="w-5 h-5" />
                </div>
              </button>
            </div>
          )}

          {/* ============================================================================ */}
          {/* 🔄 백엔드 연결 재시도 */}
          {/* ============================================================================ */}
          
          {!backendConnected && onRetryConnection && (
            <button
              onClick={onRetryConnection}
              className="w-full mt-4 text-gray-600 hover:text-gray-900 text-sm underline transition-colors"
            >
              백엔드 연결 재시도
            </button>
          )}

          {/* 추가 정보 */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              모든 데이터는 WebAuthn 생체인증으로 보호되며 영구 보존됩니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;