// ============================================================================
// 📁 src/components/auth/LoginForm.tsx
// 🔐 WebAuthn 로그인 폼 컴포넌트
// ============================================================================
// 이 컴포넌트는 사용자가 생체인증 또는 계정 등록을
// 통해 AI Passport 시스템에 로그인할 수 있는 폼을 제공합니다.
// 사용자는 생체인증을 통해 안전하게 로그인하거나,
// 새 계정을 등록할 수 있습니다.
// 또한, 백엔드 연결 상태를 표시하고, 로그인 실패 시
// 에러 메시지를 보여줍니다.
// 이 컴포넌트는 클라이언트 측에서만 렌더링되며,
// Lucide 아이콘을 사용하여 시각적으로 풍부한 UI를 제공합니다.
// 버튼 컴포넌트와 상태 배지를 사용하여 사용자 경험을 향상시킵니다.
// 이 컴포넌트는 Tailwind CSS를 사용하여 스타일링되며,
// 반응형 디자인을 지원합니다.
// 이 컴포넌트는 로그인 및 등록 버튼을 클릭할 때
// 각각의 핸들러를 호출합니다.
// 또한, 백엔드 연결 상태에 따라 다른 메시지를 표시합니다.
// 에러 메시지가 있을 경우, 이를 사용자에게 알립니다.
// 이 컴포넌트는 로그인 폼의 헤더, 백엔드 상태,
// 에러 메시지, 로그인 및 등록 버튼, 안전성 정보,
// 지원 기기 정보를 포함합니다.
// 이 컴포넌트는 전체 페이지를 감싸는 배경과
// 중앙 정렬된 카드 레이아웃을 사용하여
// ============================================================================

'use client';

import React from 'react';
import { Shield, Fingerprint, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';

interface LoginFormProps {
  onLogin: () => void;
  onRegister: () => void;
  isLoading: boolean;
  backendConnected: boolean;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onRegister,
  isLoading,
  backendConnected,
  error
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI Passport</h1>
          <p className="text-gray-600 mt-2">안전한 생체인증으로 로그인하세요</p>
        </div>

        {/* 백엔드 상태 */}
        <div className="mb-6">
          <StatusBadge 
            variant={backendConnected ? 'success' : 'warning'}
            size="sm"
          >
            {backendConnected ? '🌐 실제 백엔드 연결됨' : '⚠️ Mock 모드'}
          </StatusBadge>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 text-sm font-medium">로그인 실패</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 로그인 버튼들 */}
        <div className="space-y-4">
          <Button
            onClick={onLogin}
            disabled={isLoading}
            loading={isLoading}
            className="w-full"
            size="lg"
          >
            <Fingerprint className="w-5 h-5 mr-2" />
            생체인증으로 로그인
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={onRegister}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            <LogIn className="w-5 h-5 mr-2" />
            새 계정 등록하기
          </Button>
        </div>

        {/* 안전성 정보 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-500" />
              <span>FIDO2/WebAuthn 표준 인증</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Fingerprint className="w-4 h-4 text-blue-500" />
              <span>생체정보는 기기에만 저장</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <LogIn className="w-4 h-4 text-purple-500" />
              <span>비밀번호 없는 안전한 로그인</span>
            </div>
          </div>
        </div>

        {/* 지원 기기 정보 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            {backendConnected 
              ? '지원: 지문인식, 얼굴인식, PIN, 하드웨어 키'
              : 'Demo 모드 - 실제 생체인증 없이 체험 가능'
            }
          </p>
        </div>
      </div>
    </div>
  );
};