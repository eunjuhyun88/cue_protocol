// ============================================================================
// 📁 src/components/passport/PassportDetails.tsx
// 🎫 AI Passport 상세 정보 컴포넌트
// ============================================================================

'use client';

import React, { useState } from 'react';
import { 
  User, Brain, Shield, TrendingUp, Edit3, Save, X, 
  Calendar, MapPin, Briefcase, Heart, Settings 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatusBadge } from '../ui/StatusBadge';
import type { UnifiedAIPassport } from '../../types/passport.types';

interface PassportDetailsProps {
  passport: UnifiedAIPassport;
  onUpdate?: (updates: Partial<UnifiedAIPassport>) => Promise<void>;
  backendConnected: boolean;
}

export const PassportDetails: React.FC<PassportDetailsProps> = ({
  passport,
  onUpdate,
  backendConnected
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(passport.personalityProfile);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!onUpdate) return;
    
    setIsLoading(true);
    try {
      await onUpdate({
        personalityProfile: editedProfile
      });
      setIsEditing(false);
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(passport.personalityProfile);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">AI Passport Details</h2>
        <StatusBadge variant={backendConnected ? 'success' : 'warning'}>
          {backendConnected ? '실시간 데이터' : 'Mock 데이터'}
        </StatusBadge>
      </div>

      {/* 기본 정보 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            기본 정보
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              분산신원증명 (DID)
            </label>
            <div className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm font-mono text-gray-700 break-all">
                {passport.did}
              </code>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              지갑 주소
            </label>
            <div className="bg-gray-50 rounded-lg p-3">
              <code className="text-sm font-mono text-gray-700">
                {passport.walletAddress}
              </code>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              패스포트 레벨
            </label>
            <StatusBadge variant="info" size="md">
              {passport.passportLevel}
            </StatusBadge>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              등록 상태
            </label>
            <StatusBadge 
              variant={passport.registrationStatus === 'complete' ? 'success' : 'warning'}
              size="md"
            >
              {passport.registrationStatus === 'complete' ? '완료' : '진행중'}
            </StatusBadge>
          </div>
        </div>
      </div>

      {/* 성격 프로필 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            성격 프로필 (AI 개인화 기반)
          </h3>
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={!backendConnected}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                편집
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-1" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  loading={isLoading}
                >
                  <Save className="w-4 h-4 mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              성격 유형
            </label>
            {isEditing ? (
              <Input
                value={editedProfile.type}
                onChange={(e) => setEditedProfile({
                  ...editedProfile,
                  type: e.target.value
                })}
                placeholder="예: INTJ-A (Architect)"
              />
            ) : (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-blue-900 font-medium">{passport.personalityProfile.type}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소통 스타일
            </label>
            {isEditing ? (
              <Input
                value={editedProfile.communicationStyle}
                onChange={(e) => setEditedProfile({
                  ...editedProfile,
                  communicationStyle: e.target.value
                })}
                placeholder="예: Direct & Technical"
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-700">{passport.personalityProfile.communicationStyle}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              학습 패턴
            </label>
            {isEditing ? (
              <Input
                value={editedProfile.learningPattern}
                onChange={(e) => setEditedProfile({
                  ...editedProfile,
                  learningPattern: e.target.value
                })}
                placeholder="예: Visual + Hands-on"
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-700">{passport.personalityProfile.learningPattern}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              작업 스타일
            </label>
            {isEditing ? (
              <Input
                value={editedProfile.workingStyle}
                onChange={(e) => setEditedProfile({
                  ...editedProfile,
                  workingStyle: e.target.value
                })}
                placeholder="예: Morning Focus"
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-700">{passport.personalityProfile.workingStyle}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              응답 선호도
            </label>
            {isEditing ? (
              <Input
                value={editedProfile.responsePreference}
                onChange={(e) => setEditedProfile({
                  ...editedProfile,
                  responsePreference: e.target.value
                })}
                placeholder="예: Concise with examples"
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-700">{passport.personalityProfile.responsePreference}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              의사결정 방식
            </label>
            {isEditing ? (
              <Input
                value={editedProfile.decisionMaking}
                onChange={(e) => setEditedProfile({
                  ...editedProfile,
                  decisionMaking: e.target.value
                })}
                placeholder="예: Data-driven analysis"
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-700">{passport.personalityProfile.decisionMaking}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 보안 및 인증 상태 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
          <Shield className="w-5 h-5 mr-2" />
          보안 및 인증 상태
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                passport.biometricVerified ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className="font-medium">생체인증</span>
            </div>
            <StatusBadge variant={passport.biometricVerified ? 'success' : 'neutral'}>
              {passport.biometricVerified ? '활성화' : '비활성화'}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                passport.passkeyRegistered ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className="font-medium">패스키 등록</span>
            </div>
            <StatusBadge variant={passport.passkeyRegistered ? 'success' : 'neutral'}>
              {passport.passkeyRegistered ? '등록됨' : '미등록'}
            </StatusBadge>
          </div>
        </div>
      </div>

      {/* Trust Score 상세 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
          <TrendingUp className="w-5 h-5 mr-2" />
          Trust Score 분석
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">전체 Trust Score</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${passport.trustScore}%` }}
                />
              </div>
              <span className="font-bold text-lg">{passport.trustScore}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">95%</p>
              <p className="text-sm text-gray-500">생체인증 신뢰도</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{passport.dataVaults.length}</p>
              <p className="text-sm text-gray-500">검증된 데이터</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{passport.connectedPlatforms.length}</p>
              <p className="text-sm text-gray-500">연결된 플랫폼</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};