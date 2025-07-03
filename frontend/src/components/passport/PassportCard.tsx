'use client';

// ============================================================================
// 📁 src/components/passport/PassportCard.tsx
// 🎫 DID 표시 문제 수정된 AI Passport 카드 컴포넌트
// ============================================================================

import React, { useState, useCallback } from 'react';
import { 
  Star, Shield, TrendingUp, Wallet, Copy, ExternalLink, 
  CheckCircle, Lock, Globe, Brain, Coins, Activity,
  Eye, EyeOff, RefreshCw, Zap, Target, Award, Hash,
  Calendar, Clock, User, Database, Settings, AlertCircle
} from 'lucide-react';

// ============================================================================
// 🔧 타입 정의 (확장됨)
// ============================================================================

interface AIPassport {
  did: string;
  username: string;
  walletAddress?: string;
  passkeyRegistered?: boolean;
  trustScore: number;
  cueTokens?: number;
  cueBalance: number;
  registrationStatus?: string;
  biometricVerified?: boolean;
  passportLevel: string;
  personalityProfile?: {
    traits: string[];
    communicationStyle: string;
    expertise: string[];
  };
  dataVaults: Array<{
    name: string;
    type: string;
    size: string;
    items: number;
    cueCount?: number;
  }>;
  connectedPlatforms: string[];
  achievements?: Array<{
    name: string;
    icon: string;
    earned: boolean;
    description: string;
  }>;
  ragDagStats?: {
    learnedConcepts: number;
    connectionStrength: number;
    lastLearningActivity: string;
    knowledgeNodes: number;
    personalityAccuracy: number;
  };
  recentActivity?: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  totalMined?: number;
}

interface PassportCardProps {
  passport: AIPassport;
  backendConnected: boolean;
  className?: string;
  showDetails?: boolean;
  onUpdate?: (passport: AIPassport) => void;
  onRefresh?: () => void;
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
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    neutral: 'bg-gray-100 text-gray-800',
    info: 'bg-blue-100 text-blue-800'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};

// ============================================================================
// 🎫 메인 PassportCard 컴포넌트
// ============================================================================

const PassportCard: React.FC<PassportCardProps> = ({
  passport,
  backendConnected,
  className = '',
  showDetails = true,
  onUpdate,
  onRefresh
}) => {
  // ============================================================================
  // 🔧 상태 관리
  // ============================================================================
  
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string>('');

  // ============================================================================
  // 🔧 유틸리티 함수들
  // ============================================================================
  
  const handleCopy = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(''), 2000);
      console.log(`${type} 복사됨:`, text);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      console.log('패스포트 새로고침 완료');
    } catch (error) {
      console.error('새로고침 실패:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return '알 수 없음';
    }
  }, []);

  const getLevelColor = useCallback((level: string) => {
    const levelColors = {
      'Bronze': 'from-amber-500 to-amber-600',
      'Silver': 'from-gray-400 to-gray-500',
      'Gold': 'from-yellow-400 to-yellow-500',
      'Platinum': 'from-blue-400 to-blue-500',
      'Diamond': 'from-purple-400 to-purple-500',
      'Basic': 'from-green-400 to-green-500',
      'Verified Agent': 'from-indigo-500 to-purple-600'
    };
    return levelColors[level as keyof typeof levelColors] || 'from-gray-400 to-gray-500';
  }, []);

  // ============================================================================
  // 🎨 렌더링
  // ============================================================================

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* ============================================================================ */}
      {/* 🎨 카드 헤더 (그라데이션 배경) */}
      {/* ============================================================================ */}
      
      <div className={`bg-gradient-to-r ${getLevelColor(passport.passportLevel)} p-6 text-white relative overflow-hidden`}>
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
        </div>
        
        <div className="relative z-10">
          {/* 상단 메타 정보 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6" />
              <h2 className="text-xl font-bold">AI Passport</h2>
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

          {/* 사용자 정보 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">{passport.username}</h3>
              <p className="text-sm opacity-90 flex items-center mt-1">
                <Star className="w-4 h-4 mr-1" />
                {passport.passportLevel}
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center justify-end space-x-1 mb-1">
                <Shield className="w-4 h-4" />
                <span className="text-sm opacity-90">신뢰도</span>
              </div>
              <div className="text-2xl font-bold">{passport.trustScore}%</div>
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
                <p className="text-xl font-bold">
                  {(passport.cueTokens || passport.cueBalance || 0).toLocaleString()}
                </p>
              </div>
              <p className="text-xs opacity-75 mt-1">
                {passport.dataVaults?.reduce((sum, vault) => sum + (vault.cueCount || 0), 0) || 0} in vaults
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* 📝 카드 본문 */}
      {/* ============================================================================ */}
      
      <div className="p-6 space-y-5">
        {/* 🔧 DID 정보 (수정됨) */}
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
          
          {/* 🔧 DID 표시 개선 */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="flex items-center justify-between">
              <code className="text-sm text-gray-800 font-mono flex-1 mr-2 break-all">
                {showSensitiveData 
                  ? (passport?.did || 'DID 생성 중...')
                  : `${(passport?.did || 'did:final0626:').substring(0, 20)}...****`
                }
              </code>
              
              {passport?.did && (
                <button
                  onClick={() => handleCopy(passport.did, 'DID')}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
                  title="DID 복사"
                >
                  {copySuccess === 'DID' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            
            {/* 🔧 DID 상태 표시 개선 */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${passport?.did ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-xs text-gray-600">
                  {passport?.did ? 'DID 활성화됨' : 'DID 생성 중...'}
                </span>
                {passport?.did && passport.ragDagStats?.lastLearningActivity && (
                  <span className="text-xs text-gray-500">
                    • 생성일: {formatDate(passport.ragDagStats.lastLearningActivity)}
                  </span>
                )}
              </div>
              
              {/* DID 검증 상태 */}
              {passport?.did && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">검증됨</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 🔧 디버깅 정보 (개발 환경에서만) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              <strong>Debug Info:</strong><br/>
              • Passport Object: {passport ? 'Present' : 'Missing'}<br/>
              • DID Value: {passport?.did || 'undefined'}<br/>
              • Username: {passport?.username || 'undefined'}<br/>
              • CUE Tokens: {passport?.cueTokens || passport?.cueBalance || 'undefined'}<br/>
              • Trust Score: {passport?.trustScore || 'undefined'}
            </div>
          )}
        </div>

        {/* 지갑 주소 */}
        {passport.walletAddress && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Wallet className="w-4 h-4 mr-1" />
                지갑 주소
              </label>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-center justify-between">
                <code className="text-sm text-gray-800 font-mono flex-1 mr-2">
                  {showSensitiveData 
                    ? passport.walletAddress
                    : `${passport.walletAddress.substring(0, 10)}...${passport.walletAddress.substring(-8)}`
                  }
                </code>
                
                <button
                  onClick={() => handleCopy(passport.walletAddress!, '지갑 주소')}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  title="지갑 주소 복사"
                >
                  {copySuccess === '지갑 주소' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 성능 지표 */}
        {showDetails && passport.ragDagStats && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Brain className="w-4 h-4 mr-1" />
                AI 학습 성능
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">학습된 개념</span>
                  <Target className="w-3 h-3 text-blue-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {passport.ragDagStats.learnedConcepts.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">지식 노드</span>
                  <Database className="w-3 h-3 text-green-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {passport.ragDagStats.knowledgeNodes.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">연결 강도</span>
                  <Activity className="w-3 h-3 text-purple-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {Math.round(passport.ragDagStats.connectionStrength * 100)}%
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">개인화 정확도</span>
                  <Zap className="w-3 h-3 text-yellow-500" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {Math.round(passport.ragDagStats.personalityAccuracy * 100)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 데이터 볼트 요약 */}
        {showDetails && passport.dataVaults && passport.dataVaults.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Database className="w-4 h-4 mr-1" />
                데이터 볼트 ({passport.dataVaults.length})
              </h4>
              <span className="text-xs text-gray-500">
                총 {passport.dataVaults.reduce((sum, vault) => sum + vault.items, 0)} 항목
              </span>
            </div>
            
            <div className="space-y-2">
              {passport.dataVaults.slice(0, 3).map((vault, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{vault.name}</p>
                      <p className="text-xs text-gray-600">{vault.items} 항목 • {vault.size}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Coins className="w-3 h-3 text-yellow-500" />
                        <span className="text-sm font-medium">
                          {(vault.cueCount || 0).toLocaleString()}
                        </span>
                      </div>
                      <StatusBadge variant="info" size="sm">
                        {vault.type}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              ))}
              
              {passport.dataVaults.length > 3 && (
                <div className="text-center py-2">
                  <span className="text-xs text-gray-500">
                    +{passport.dataVaults.length - 3}개 더 보기
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 연결된 플랫폼 */}
        {showDetails && passport.connectedPlatforms && passport.connectedPlatforms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                연결된 플랫폼 ({passport.connectedPlatforms.length})
              </h4>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {passport.connectedPlatforms.map((platform, index) => (
                <StatusBadge key={index} variant="success" size="sm">
                  {platform}
                </StatusBadge>
              ))}
            </div>
          </div>
        )}

        {/* 최근 업적 */}
        {showDetails && passport.achievements && passport.achievements.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center">
                <Award className="w-4 h-4 mr-1" />
                최근 업적
              </h4>
            </div>
            
            <div className="space-y-2">
              {passport.achievements
                .filter(achievement => achievement.earned)
                .slice(0, 3)
                .map((achievement, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <span className="text-lg">{achievement.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{achievement.name}</p>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 마지막 활동 */}
        {passport.ragDagStats?.lastLearningActivity && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>마지막 활동</span>
              </div>
              <span>{formatDate(passport.ragDagStats.lastLearningActivity)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PassportCard;