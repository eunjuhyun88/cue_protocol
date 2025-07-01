// ============================================================================
// 📁 src/components/passport/PassportCard.tsx
// 🎫 AI Passport 카드 컴포넌트
// ============================================================================

'use client';

import React from 'react';
import { Star, Shield, TrendingUp, Wallet, Copy, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import type { UnifiedAIPassport } from '../../types/passport.types';

interface PassportCardProps {
  passport: UnifiedAIPassport;
  backendConnected: boolean;
  className?: string;
}

export const PassportCard: React.FC<PassportCardProps> = ({
  passport,
  backendConnected,
  className = ''
}) => {
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    // 실제로는 toast 알림을 띄우는 것이 좋습니다
    console.log(`${type} copied to clipboard: ${text}`);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Basic': return 'from-gray-400 to-gray-600';
      case 'Verified': return 'from-blue-500 to-blue-700';
      case 'Premium': return 'from-purple-500 to-purple-700';
      case 'Enterprise': return 'from-gold-500 to-gold-700';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* 카드 헤더 */}
      <div className={`
        bg-gradient-to-r ${getLevelColor(passport.passportLevel)} 
        p-6 text-white relative overflow-hidden
      `}>
        {/* 배경 패턴 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Passport</h3>
                <p className="text-sm opacity-90">{passport.passportLevel} Level</p>
              </div>
            </div>
            
            <StatusBadge 
              variant={backendConnected ? 'success' : 'warning'}
              size="sm"
            >
              {backendConnected ? 'Live' : 'Mock'}
            </StatusBadge>
          </div>

          {/* Trust Score */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">Trust Score</p>
              <p className="text-2xl font-bold">{passport.trustScore}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-75">CUE Tokens</p>
              <p className="text-xl font-bold">{passport.cueTokens.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-6 space-y-4">
        {/* DID 정보 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            분산신원증명 (DID)
          </label>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3">
            <code className="flex-1 text-sm font-mono text-gray-700 break-all">
              {passport.did}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(passport.did, 'DID')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 지갑 주소 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wallet Address
          </label>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3">
            <code className="flex-1 text-sm font-mono text-gray-700">
              {passport.walletAddress.slice(0, 6)}...{passport.walletAddress.slice(-4)}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(passport.walletAddress, 'Wallet Address')}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 상태 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Shield className={`w-4 h-4 ${passport.biometricVerified ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-700">생체인증</span>
            <StatusBadge variant={passport.biometricVerified ? 'success' : 'neutral'} size="sm">
              {passport.biometricVerified ? '완료' : '미완료'}
            </StatusBadge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Wallet className={`w-4 h-4 ${passport.passkeyRegistered ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-700">패스키</span>
            <StatusBadge variant={passport.passkeyRegistered ? 'success' : 'neutral'} size="sm">
              {passport.passkeyRegistered ? '등록' : '미등록'}
            </StatusBadge>
          </div>
        </div>

        {/* 개성 프로필 미리보기 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">성격 프로필</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div>
              <span className="font-medium">유형:</span> {passport.personalityProfile.type}
            </div>
            <div>
              <span className="font-medium">소통:</span> {passport.personalityProfile.communicationStyle}
            </div>
            <div>
              <span className="font-medium">학습:</span> {passport.personalityProfile.learningPattern}
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{passport.dataVaults.length}</p>
            <p className="text-xs text-gray-500">Data Vaults</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{passport.connectedPlatforms.length}</p>
            <p className="text-xs text-gray-500">Connected</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{passport.personalizedAgents.length}</p>
            <p className="text-xs text-gray-500">AI Agents</p>
          </div>
        </div>
      </div>
    </div>
  );
};