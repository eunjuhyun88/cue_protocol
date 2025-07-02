// ============================================================================
// 📁 src/components/layout/IndependentSidebar.tsx
// ⭐️ 완전 독립 스크롤 사이드바 (기존 기능 + 개선)
// ============================================================================

'use client';

import React from 'react';
import {
  Shield, Brain, Sparkles, Globe, Award, Activity, Star, Coins,
  CheckCircle, TrendingUp, Users, Database, Lock, Coffee, Eye,
  MessageCircle, Zap, Heart, Target, BarChart3, Clock, Hash
} from 'lucide-react';

// ============================================================================
// 🔧 타입 정의
// ============================================================================

interface AIPassport {
  did?: string;
  username?: string;
  trustScore?: number;
  passportLevel?: string;
  cueBalance?: number;
  totalMined?: number;
  dataVaults?: Array<{
    name: string;
    type: string;
    size: string;
    items: number;
  }>;
  connectedPlatforms?: Array<{
    name: string;
    status: string;
    lastSync: string;
  }>;
  personalityProfile?: {
    traits: string[];
    communicationStyle: string;
    expertise: string[];
  };
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
}

interface IndependentSidebarProps {
  passport?: AIPassport;
  cueBalance: number;
  todaysMining: number;
  backendConnected: boolean;
  ragDagStats?: any;
  currentView?: string;
  onViewChange?: (view: string) => void;
  isMobile?: boolean;
  showMobileSidebar?: boolean;
}

// ============================================================================
// 🎨 AI Passport 카드 컴포넌트
// ============================================================================

const AIPassportCard = ({ 
  passport, 
  cueBalance, 
  todaysMining, 
  backendConnected 
}: {
  passport?: AIPassport;
  cueBalance: number;
  todaysMining: number;
  backendConnected: boolean;
}) => {
  return (
    <div className={`rounded-xl p-4 md:p-6 text-white relative overflow-hidden shadow-lg ${
      backendConnected 
        ? 'bg-gradient-to-br from-blue-600 to-indigo-700' 
        : 'bg-gradient-to-br from-gray-500 to-gray-700'
    }`}>
      {/* 배경 장식 */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-12 -mt-12"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-5 rounded-full -ml-8 -mb-8"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-lg">AI Passport</h3>
              <p className={`text-xs md:text-sm ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
                {passport?.passportLevel || 'Verified Agent'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg md:text-xl font-bold">{passport?.trustScore || 95}%</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              Trust Score
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-2 md:p-4">
            <Coins className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-yellow-300" />
            <div className="text-sm md:text-lg font-bold">{Math.floor(cueBalance / 1000)}K</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              CUE
            </div>
          </div>
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-2 md:p-4">
            <Star className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-orange-300" />
            <div className="text-sm md:text-lg font-bold">+{todaysMining}</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              Today
            </div>
          </div>
          <div className="text-center bg-white bg-opacity-15 rounded-lg p-2 md:p-4">
            <Globe className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1 md:mb-2 text-green-300" />
            <div className="text-sm md:text-lg font-bold">{passport?.connectedPlatforms?.length || 3}</div>
            <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'}`}>
              Links
            </div>
          </div>
        </div>

        <div className="pt-3 md:pt-4 border-t border-white border-opacity-20">
          <div className={`text-xs ${backendConnected ? 'text-blue-200' : 'text-gray-300'} mb-2`}>
            Digital Identity
          </div>
          <div className="font-mono text-xs bg-black bg-opacity-20 rounded p-2 truncate">
            {passport?.did?.slice(0, 35) || 'did:ai:loading'}...
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🧠 RAG-DAG 학습 현황 컴포넌트
// ============================================================================

const RAGDAGStatusCard = ({ ragDagStats, backendConnected }: {
  ragDagStats?: any;
  backendConnected: boolean;
}) => {
  const stats = ragDagStats || {
    learnedConcepts: 247,
    connectionStrength: 0.87,
    lastLearningActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    knowledgeNodes: 1456,
    personalityAccuracy: 0.94
  };

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
        <Brain className="w-4 h-4 mr-2 text-purple-600" />
        RAG-DAG 학습 현황
      </h4>
      
      <div className="space-y-3 md:space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs md:text-sm font-medium text-gray-700">학습 진행률</span>
            <span className="text-xs md:text-sm font-bold text-purple-600">
              {Math.round(stats.connectionStrength * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${stats.connectionStrength * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
          <div>
            <span className="text-gray-600">학습된 개념</span>
            <p className="font-bold text-gray-900">{stats.learnedConcepts}</p>
          </div>
          <div>
            <span className="text-gray-600">정확도</span>
            <p className="font-bold text-gray-900">{Math.round(stats.personalityAccuracy * 100)}%</p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <span>마지막 학습: {new Date(stats.lastLearningActivity).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🎨 성격 프로필 컴포넌트
// ============================================================================

const PersonalityProfileCard = ({ passport }: { passport?: AIPassport }) => {
  const profile = passport?.personalityProfile || {
    traits: ['혁신적', '분석적', '창의적'],
    communicationStyle: 'friendly',
    expertise: ['Web3', 'AI', 'Protocol']
  };

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
        <Sparkles className="w-4 h-4 mr-2 text-orange-600" />
        Personality Profile
      </h4>
      
      <div className="space-y-3">
        <div>
          <span className="text-xs text-gray-600 uppercase tracking-wide">특성</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.traits.map((trait, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <span className="text-xs text-gray-600 uppercase tracking-wide">전문 분야</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.expertise.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-600 uppercase tracking-wide">소통 스타일</span>
          <p className="text-sm text-gray-900 mt-1 capitalize">{profile.communicationStyle}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 🌐 연결된 플랫폼 컴포넌트
// ============================================================================

const ConnectedPlatformsCard = ({ passport, backendConnected }: {
  passport?: AIPassport;
  backendConnected: boolean;
}) => {
  const platforms = passport?.connectedPlatforms || [
    { name: 'ChatGPT', status: 'active', lastSync: new Date().toISOString() },
    { name: 'Claude', status: 'active', lastSync: new Date().toISOString() },
    { name: 'Discord', status: 'inactive', lastSync: '' }
  ];

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
        <Globe className="w-4 h-4 mr-2 text-green-600" />
        Connected Platforms
      </h4>
      
      <div className="space-y-2">
        {platforms.slice(0, 4).map((platform, index) => (
          <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
            <span className="text-xs md:text-sm text-gray-700 font-medium">{platform.name}</span>
            <div className={`w-2 h-2 rounded-full ${
              platform.status === 'active' 
                ? (backendConnected ? 'bg-green-500' : 'bg-yellow-500')
                : 'bg-gray-300'
            }`}></div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <button className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium">
          + 새 플랫폼 연결
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// 🏆 업적 컴포넌트
// ============================================================================

const AchievementsCard = ({ passport }: { passport?: AIPassport }) => {
  const achievements = passport?.achievements || [
    { name: 'Pioneer', icon: '🚀', earned: true, description: '첫 가입' },
    { name: 'Trusted Agent', icon: '🛡️', earned: true, description: '신뢰도 90%' },
    { name: 'Expert', icon: '🧠', earned: false, description: '100회 대화' },
    { name: 'Collector', icon: '💎', earned: false, description: '10K CUE' }
  ];

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
        <Award className="w-4 h-4 mr-2 text-yellow-600" />
        Achievements
      </h4>
      
      <div className="space-y-3">
        {achievements.map((achievement, index) => (
          <div key={index} className={`flex items-center space-x-3 p-2 md:p-3 rounded-lg ${
            achievement.earned ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
          }`}>
            <span className="text-base md:text-lg">{achievement.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs md:text-sm font-medium truncate ${
                achievement.earned ? 'text-green-800' : 'text-gray-600'
              }`}>
                {achievement.name}
              </p>
              {achievement.description && (
                <p className="text-xs text-gray-500 truncate">{achievement.description}</p>
              )}
            </div>
            {achievement.earned && (
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 📊 최근 활동 컴포넌트
// ============================================================================

const RecentActivityCard = ({ passport }: { passport?: AIPassport }) => {
  const activities = passport?.recentActivity || [
    { type: 'chat', description: 'AI와 대화', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
    { type: 'mining', description: 'CUE 토큰 마이닝', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    { type: 'learning', description: '새로운 개념 학습', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
    { type: 'platform', description: '플랫폼 동기화', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chat': return <MessageCircle className="w-3 h-3" />;
      case 'mining': return <Coins className="w-3 h-3" />;
      case 'learning': return <Brain className="w-3 h-3" />;
      case 'platform': return <Globe className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'chat': return 'bg-blue-500';
      case 'mining': return 'bg-yellow-500';
      case 'learning': return 'bg-purple-500';
      case 'platform': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
        <Activity className="w-4 h-4 mr-2 text-indigo-600" />
        Recent Activity
      </h4>
      
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity, index) => (
          <div key={index} className="flex items-center space-x-3 p-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getActivityColor(activity.type)}`}></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs md:text-sm text-gray-700 truncate">{activity.description}</p>
              <p className="text-xs text-gray-500">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="text-gray-400">
              {getActivityIcon(activity.type)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 📈 빠른 통계 컴포넌트
// ============================================================================

const QuickStatsCard = ({ passport, cueBalance }: {
  passport?: AIPassport;
  cueBalance: number;
}) => {
  return (
    <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
        <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
        Quick Stats
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{Math.floor(cueBalance / 1000)}K</div>
          <div className="text-xs text-gray-500">Total CUE</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{passport?.dataVaults?.length || 3}</div>
          <div className="text-xs text-gray-500">Data Vaults</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{passport?.ragDagStats?.learnedConcepts || 247}</div>
          <div className="text-xs text-gray-500">Concepts</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{passport?.trustScore || 95}%</div>
          <div className="text-xs text-gray-500">Trust</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ⭐️ 메인 사이드바 컴포넌트
// ============================================================================

export const IndependentSidebar: React.FC<IndependentSidebarProps> = ({ 
  passport, 
  cueBalance, 
  todaysMining, 
  backendConnected, 
  ragDagStats,
  currentView,
  onViewChange,
  isMobile,
  showMobileSidebar
}) => {
  return (
    <div 
      className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6" 
      style={{ 
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E0 #F7FAFC',
        height: '100%'
      }}
    >
      {/* CSS 스크롤바 스타일링 */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: #F7FAFC;
        }
        div::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
      `}</style>

      {/* AI Passport 카드 */}
      <AIPassportCard 
        passport={passport}
        cueBalance={cueBalance}
        todaysMining={todaysMining}
        backendConnected={backendConnected}
      />

      {/* RAG-DAG 학습 현황 */}
      <RAGDAGStatusCard 
        ragDagStats={ragDagStats || passport?.ragDagStats}
        backendConnected={backendConnected}
      />

      {/* 성격 프로필 */}
      <PersonalityProfileCard passport={passport} />

      {/* 연결된 플랫폼 */}
      <ConnectedPlatformsCard 
        passport={passport}
        backendConnected={backendConnected}
      />

      {/* 업적 */}
      <AchievementsCard passport={passport} />

      {/* 최근 활동 */}
      <RecentActivityCard passport={passport} />

      {/* 빠른 통계 */}
      <QuickStatsCard 
        passport={passport}
        cueBalance={cueBalance}
      />

      {/* 하단 여백 */}
      <div className="h-4"></div>
    </div>
  );
};

export default IndependentSidebar;