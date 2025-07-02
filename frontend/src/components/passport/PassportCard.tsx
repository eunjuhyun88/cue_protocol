// ============================================================================
// 📁 src/components/passport/AIPassportCard.tsx
// 🎫 AI Passport 카드 컴포넌트 (paste-4.txt 기반 + 업그레이드)
// ============================================================================
// 이 컴포넌트는 AI Passport의 주요 정보를 카드 형태로 표시합니다.
// 사용자의 분산신원증명(DID), 지갑 주소, 신뢰 점수(Trust Score),
// CUE 토큰 잔액, 생체인증 및 패스키 등록 상태 등을
// 시각적으로 표현합니다. 카드 헤더에는 AI Passport 레벨과
// 상태 배지가 표시되며, 본문에는 DID와 지갑 주소를 복사할 수 있는
// 버튼이 포함되어 있습니다.
// ============================================================================

'use client';

import React, { useState } from 'react';
import { 
  Star, Shield, TrendingUp, Wallet, Copy, ExternalLink, 
  CheckCircle, Lock, Globe, Brain, Coins, Activity,
  Eye, EyeOff, RefreshCw, Zap, Target, Award, Hash,
  Calendar, Clock, User, Database, Settings
} from 'lucide-react';

// ============================================================================
// 🔧 타입 정의 (확장됨)
// ============================================================================

interface UnifiedAIPassport {
  did: string;
  walletAddress?: string;
  passkeyRegistered: boolean;
  trustScore: number;
  cueTokens: number;
  registrationStatus: string;
  biometricVerified: boolean;
  passportLevel: string;
  personalityProfile: {
    type: string;
    communicationStyle: string;
    learningPattern: string;
    workingStyle: string;
    responsePreference: string;
    decisionMaking: string;
  };
  dataVaults: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    dataCount: number;
    cueCount: number;
    encrypted: boolean;
    lastUpdated: Date;
    accessLevel: string;
    value: number;
    dataPoints: any[];
    usageCount: number;
    sourcePlatforms: string[];
  }>;
  connectedPlatforms: Array<{
    id: string;
    name: string;
    connected: boolean;
    lastSync: Date;
    cueCount: number;
    contextMined: number;
    status: string;
    icon: string;
    color: string;
  }>;
  contextHistory: any[];
  cueHistory: any[];
  personalizedAgents: any[];
}

interface AIPassportCardProps {
  passport: UnifiedAIPassport;
  backendConnected: boolean;
  className?: string;
  showDetails?: boolean;
  onUpdate?: (passport: UnifiedAIPassport) => void;
}

// ============================================================================
// 🎨 상태 배지 컴포넌트
// ============================================================================

const StatusBadge = ({ 
  variant, 
  size = 'md', 
  children 
}: { 
  variant: 'success' | 'warning' | 'neutral' | 'info'; 
  size?: 'sm' | 'md'; 
  children: React.ReactNode;
}) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};

// ============================================================================
// 🎨 메인 AI Passport 카드 컴포넌트
// ============================================================================

export const AIPassportCard: React.FC<AIPassportCardProps> = ({
  passport,
  backendConnected,
  className = '',
  showDetails = true,
  onUpdate
}) => {
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 복사 기능
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    // TODO: 토스트 알림 추가
    console.log(`${type} copied to clipboard: ${text}`);
  };

  // 패스포트 레벨에 따른 색상 그라디언트
  const getLevelGradient = (level: string) => {
    switch (level.toLowerCase()) {
      case 'basic': return 'from-gray-400 to-gray-600';
      case 'verified': return 'from-blue-500 to-blue-700';
      case 'premium': return 'from-purple-500 to-purple-700';
      case 'enterprise': return 'from-yellow-500 to-orange-600';
      default: return 'from-blue-500 to-purple-600';
    }
  };

  // Trust Score 색상
  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // TODO: 실제 새로고침 로직
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (onUpdate) {
        onUpdate(passport);
      }
    } catch (error) {
      console.error('패스포트 새로고침 실패:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg ${className}`}>
      {/* ============================================================================ */}
      {/* 🎨 카드 헤더 (그라디언트 배경) */}
      {/* ============================================================================ */}
      
      <div className={`
        bg-gradient-to-r ${getLevelGradient(passport.passportLevel)} 
        p-6 text-white relative overflow-hidden
      `}>
        {/* 배경 패턴 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12" />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white opacity-5 rounded-full transform -translate-y-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Passport</h3>
                <p className="text-sm opacity-90">{passport.passportLevel} Level</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <StatusBadge 
                variant={backendConnected ? 'success' : 'warning'}
                size="sm"
              >
                {backendConnected ? 'Live' : 'Mock'}
              </StatusBadge>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-50"
                title="패스포트 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Trust Score & CUE Tokens */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-75 mb-1">Trust Score</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold">{passport.trustScore}%</p>
                <TrendingUp className="w-4 h-4 opacity-75" />
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-white h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${passport.trustScore}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm opacity-75 mb-1">CUE Tokens</p>
              <div className="flex items-center justify-end space-x-2">
                <Coins className="w-4 h-4 text-yellow-300" />
                <p className="text-xl font-bold">{passport.cueTokens.toLocaleString()}</p>
              </div>
              <p className="text-xs opacity-75 mt-1">
                {passport.dataVaults.reduce((sum, vault) => sum + vault.cueCount, 0)} in vaults
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* 📝 카드 본문 */}
      {/* ============================================================================ */}
      
      <div className="p-6 space-y-5">
        {/* DID 정보 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <Hash className="w-4 h-4 mr-1" />
              분산신원증명 (DID)
            </label>
            <button
              onClick={() => setShowSensitiveData(!showSensitiveData)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title={showSensitiveData ? '민감 데이터 숨기기' : '민감 데이터 보기'}
            >
              {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 group">
            <code className="flex-1 text-sm font-mono text-gray-700 break-all">
              {showSensitiveData ? passport.did : `${passport.did.slice(0, 16)}...${passport.did.slice(-8)}`}
            </code>
            <button
              onClick={() => copyToClipboard(passport.did, 'DID')}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
              title="DID 복사"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 지갑 주소 */}
        {passport.walletAddress && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Wallet className="w-4 h-4 mr-1" />
              Wallet Address
            </label>
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-3 group">
              <code className="flex-1 text-sm font-mono text-gray-700">
                {showSensitiveData 
                  ? passport.walletAddress 
                  : `${passport.walletAddress.slice(0, 6)}...${passport.walletAddress.slice(-4)}`
                }
              </code>
              <button
                onClick={() => copyToClipboard(passport.walletAddress!, 'Wallet Address')}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                title="지갑 주소 복사"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
              <a
                href={`https://etherscan.io/address/${passport.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                title="Etherscan에서 보기"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>
          </div>
        )}

        {/* 인증 상태 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <Shield className={`w-4 h-4 ${passport.biometricVerified ? 'text-green-500' : 'text-gray-400'}`} />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">생체인증</span>
              <StatusBadge variant={passport.biometricVerified ? 'success' : 'neutral'} size="sm">
                {passport.biometricVerified ? '완료' : '미완료'}
              </StatusBadge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <Lock className={`w-4 h-4 ${passport.passkeyRegistered ? 'text-green-500' : 'text-gray-400'}`} />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">패스키</span>
              <StatusBadge variant={passport.passkeyRegistered ? 'success' : 'neutral'} size="sm">
                {passport.passkeyRegistered ? '등록' : '미등록'}
              </StatusBadge>
            </div>
          </div>
        </div>

        {showDetails && (
          <>
            {/* 개성 프로필 미리보기 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Brain className="w-4 h-4 mr-2 text-purple-600" />
                성격 프로필
              </h4>
              <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="font-medium">유형:</span> 
                  <span className="text-gray-800">{passport.personalityProfile.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">소통:</span> 
                  <span className="text-gray-800">{passport.personalityProfile.communicationStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">학습:</span> 
                  <span className="text-gray-800">{passport.personalityProfile.learningPattern}</span>
                </div>
              </div>
            </div>

            {/* 데이터 볼트 요약 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-100">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Database className="w-4 h-4 mr-2 text-green-600" />
                Data Vaults
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {passport.dataVaults.slice(0, 3).map((vault, index) => (
                  <div key={vault.id} className="text-center">
                    <div className="text-lg font-bold text-gray-900">{vault.dataCount}</div>
                    <div className="text-xs text-gray-500 capitalize">{vault.category}</div>
                    <div className="text-xs text-green-600">{vault.cueCount} CUE</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 연결된 플랫폼 요약 */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-100">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Globe className="w-4 h-4 mr-2 text-orange-600" />
                Connected Platforms
              </h4>
              <div className="flex flex-wrap gap-2">
                {passport.connectedPlatforms.slice(0, 4).map((platform, index) => (
                  <div 
                    key={platform.id} 
                    className="flex items-center space-x-1 px-2 py-1 bg-white rounded-full border"
                  >
                    <span className="text-sm">{platform.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{platform.name}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      platform.connected ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                ))}
                {passport.connectedPlatforms.length > 4 && (
                  <div className="flex items-center px-2 py-1 bg-gray-100 rounded-full">
                    <span className="text-xs text-gray-600">
                      +{passport.connectedPlatforms.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 통계 요약 */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
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
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {passport.dataVaults.reduce((sum, vault) => sum + vault.value, 0)}
                </p>
                <p className="text-xs text-gray-500">Total Value</p>
              </div>
            </div>
          </>
        )}

        {/* 액션 버튼들 */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">설정</span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">상세보기</span>
          </button>
        </div>
      </div>

      {/* 하단 메타 정보 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>등록: {new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>업데이트: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span className={backendConnected ? 'text-green-600' : 'text-yellow-600'}>
              {backendConnected ? 'Live' : 'Mock'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPassportCard;