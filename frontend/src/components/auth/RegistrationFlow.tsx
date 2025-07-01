// ============================================================================
// 📁 src/components/auth/RegistrationFlow.tsx
// 🔐 WebAuthn 등록 플로우 컴포넌트 (수정됨)
// ============================================================================

'use client';

import React from 'react';
import { Shield, Fingerprint, Smartphone, Wallet, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import type { RegistrationStep } from '../../types/auth.types';

interface RegistrationFlowProps {
  registrationStep: RegistrationStep;
  isRegistering: boolean;
  onStart: () => void;
  backendConnected: boolean;
  registrationError?: string;
}

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({
  registrationStep,
  isRegistering,
  onStart,
  backendConnected,
  registrationError
}) => {
  const getStepIcon = (step: RegistrationStep) => {
    switch (step) {
      case 'waiting':
        return <Shield className="w-8 h-8 text-blue-600" />;
      case 'passkey':
        return <Fingerprint className="w-8 h-8 text-yellow-600" />;
      case 'wallet':
        return <Wallet className="w-8 h-8 text-purple-600" />;
      case 'complete':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
    }
  };

  const getStepTitle = (step: RegistrationStep) => {
    switch (step) {
      case 'waiting':
        return 'AI Passport 등록 준비';
      case 'passkey':
        return '생체인증 등록 중...';
      case 'wallet':
        return 'DID 및 지갑 생성 중...';
      case 'complete':
        return '등록 완료!';
    }
  };

  const getStepDescription = (step: RegistrationStep) => {
    switch (step) {
      case 'waiting':
        return backendConnected 
          ? '실제 WebAuthn을 사용한 안전한 생체인증으로 AI Passport를 등록하세요.'
          : 'Mock 모드에서 AI Passport 시스템을 체험해보세요.';
      case 'passkey':
        return '기기의 생체인증(지문, 얼굴인식, PIN)을 사용하여 패스키를 생성합니다.';
      case 'wallet':
        return '분산신원증명(DID)과 암호화폐 지갑을 자동으로 생성하고 있습니다.';
      case 'complete':
        return 'AI Passport가 성공적으로 생성되었습니다. 이제 개인화된 AI 서비스를 이용하실 수 있습니다.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {getStepIcon(registrationStep)}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {getStepTitle(registrationStep)}
          </h1>
          <p className="text-gray-600 text-sm">
            {getStepDescription(registrationStep)}
          </p>
        </div>

        {/* 백엔드 상태 표시 */}
        <div className="mb-6">
          <StatusBadge 
            variant={backendConnected ? 'success' : 'warning'}
            size="sm"
          >
            {backendConnected ? '🌐 실제 백엔드 연결됨' : '⚠️ Mock 모드'}
          </StatusBadge>
        </div>

        {/* 에러 메시지 */}
        {registrationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 text-sm font-medium">등록 실패</p>
              <p className="text-red-700 text-sm mt-1">{registrationError}</p>
            </div>
          </div>
        )}

        {/* 진행 상태 */}
        {isRegistering && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="text-blue-800 text-sm font-medium">
                    {registrationStep === 'passkey' && '생체인증 팝업을 확인해주세요'}
                    {registrationStep === 'wallet' && 'DID 및 지갑을 생성하고 있습니다'}
                    {registrationStep === 'complete' && '등록을 완료하고 있습니다'}
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    잠시만 기다려주세요...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-4">
          {registrationStep === 'waiting' && (
            <Button
              onClick={onStart}
              disabled={isRegistering}
              className="w-full"
              size="lg"
            >
              <Fingerprint className="w-5 h-5 mr-2" />
              {backendConnected ? '생체인증으로 등록하기' : 'Mock 등록 체험하기'}
            </Button>
          )}

          {registrationStep === 'complete' && (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-green-700 font-medium">
                🎉 AI Passport 등록이 완료되었습니다!
              </p>
              <p className="text-gray-600 text-sm mt-2">
                개인화된 AI 서비스를 시작해보세요.
              </p>
            </div>
          )}
        </div>

        {/* 추가 정보 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Shield className="w-4 h-4" />
            <span>
              {backendConnected 
                ? '실제 WebAuthn 표준을 사용한 안전한 인증'
                : 'Demo 모드 - 실제 데이터는 저장되지 않습니다'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};