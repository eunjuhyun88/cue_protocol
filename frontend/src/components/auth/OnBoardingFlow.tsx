// ============================================================================
// 📁 src/components/auth/OnboardingFlow.tsx
// 🎨 온보딩 플로우 컴포넌트 (기존 디자인 완전 유지)
// ============================================================================
// 기존 paste.txt의 OnboardingFlow 컴포넌트를 분리하면서
// 디자인과 기능을 완전히 유지하고 Final0626에 맞게 조정
// ============================================================================

'use client';

import React from 'react';
import { 
  Shield, Fingerprint, CheckCircle, AlertCircle, Key, User, 
  Zap, ArrowUp, Sparkles 
} from 'lucide-react';
import { LoadingSpinner, StatusIndicator, Button } from '../ui';

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
        return 'Final0626 AI Passport';
      case 'auth':
        return '🔐 생체인증 중...';
      case 'wallet':
        return '🌐 DID 생성 중...';
      case 'passport':
        return '🛡️ AI Passport 생성 중...';
      case 'complete':
        return '🎉 완료!';
      default:
        return 'Final0626 AI Passport';
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 border border-gray-100">
        
        {/* ============================================================================ */}
        {/* 🎯 헤더 섹션 */}
        {/* ============================================================================ */}
        
        <div className="text-center mb-8">
          {/* 아이콘 */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
            {getStepIcon()}
          </div>
          
          {/* 제목 */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getStepTitle()}
          </h1>
          
          {/* 설명 */}
          <p className="text-gray-600">
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
        
        <div className={`mb-6 p-4 rounded-xl ${
          webauthnSupport.supported 
            ? 'bg-blue-50 border border-blue-200' 
            : 'bg-yellow-50 border border-yellow-200'
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
          <div className="space-y-4">
            {/* 핵심 기능 강조 카드 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                영구 데이터 보존 기능
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
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
            
            {/* 시작 버튼 */}
            <Button
              onClick={onStart}
              disabled={isLoading}
              loading={isLoading}
              variant="primary"
              size="xl"
              fullWidth
              leftIcon={!isLoading ? <Zap className="w-5 h-5" /> : undefined}
            >
              {isLoading ? '생성 중...' : '영구 AI Passport 생성'}
            </Button>

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

        {/* 진행 중 상태 - 로딩 스피너 */}
        {(['auth', 'wallet', 'passport'].includes(step)) && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="xl" color="purple" />
          </div>
        )}

        {/* 완료 상태 - 완료 버튼 */}
        {step === 'complete' && (
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
            size="xl"
            fullWidth
            leftIcon={<ArrowUp className="w-5 h-5" />}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            AI Passport 사용하기
          </Button>
        )}

        {/* ============================================================================ */}
        {/* 🔄 백엔드 연결 재시도 */}
        {/* ============================================================================ */}
        
        {!backendConnected && onRetryConnection && (
          <button
            onClick={onRetryConnection}
            className="w-full mt-3 text-gray-600 hover:text-gray-900 text-sm underline transition-colors"
          >
            백엔드 연결 재시도
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 🎨 기능 아이템 컴포넌트 (내부 사용)
// ============================================================================

interface FeatureItemProps {
  color: 'green' | 'blue' | 'purple' | 'orange';
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ color, text }) => {
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

export default OnboardingFlow;