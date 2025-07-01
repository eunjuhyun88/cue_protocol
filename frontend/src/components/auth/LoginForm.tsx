// ============================================================================
// 📁 src/components/auth/LoginForm.tsx
// 🔐 WebAuthn 로그인 폼 컴포넌트
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