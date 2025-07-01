// ============================================================================
// 📁 src/components/layout/Sidebar.tsx
// 📱 사이드바 컴포넌트
// ============================================================================

'use client';

import React from 'react';
import { 
  MessageSquare, User, Database, Zap, Settings, 
  Star, TrendingUp, Shield, Wallet, Calendar,
  ChevronRight, Activity, BarChart3
} from 'lucide-react';
import { PassportCard } from '../passport/PassportCard';
import { StatusBadge } from '../ui/StatusBadge';
import type { UnifiedAIPassport } from '../../types/passport.types';

interface SidebarProps {
  passport?: UnifiedAIPassport;
  currentView: string;
  onViewChange: (view: string) => void;
  backendConnected: boolean;
  isMobile: boolean;
  showMobileSidebar: boolean;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  passport,
  currentView,
  onViewChange,
  backendConnected,
  isMobile,
  showMobileSidebar,
  className = ''
}) => {
  const menuItems = [
    {
      id: 'chat',
      label: 'AI 채팅',
      icon: MessageSquare,
      description: '개인화된 AI 어시스턴트',
      badge: null
    },
    {
      id: 'passport',
      label: 'AI Passport',
      icon: User,
      description: '신원 및 프로필 관리',
      badge: passport?.trustScore ? `${passport.trustScore}%` : null
    },
    {
      id: 'vault',
      label: 'Data Vault',
      icon: Database,
      description: '개인 데이터 저장소',
      badge: passport?.dataVaults?.length?.toString() || '0'
    },
    {
      id: 'cue',
      label: 'CUE 토큰',
      icon: Zap,
      description: '토큰 마이닝 및 관리',
      badge: passport?.cueTokens ? passport.cueTokens.toLocaleString() : '0'
    },
    {
      id: 'analytics',
      label: '분석',
      icon: BarChart3,
      description: 'AI 사용 통계',
      badge: null
    },
    {
      id: 'settings',
      label: '설정',
      icon: Settings,
      description: '시스템 설정',
      badge: null
    }
  ];

  const quickStats = [
    {
      label: '오늘 대화',
      value: '12',
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    {
      label: '획득 CUE',
      value: '+45',
      icon: Zap,
      color: 'text-yellow-600'
    },
    {
      label: '신뢰 점수',
      value: passport?.trustScore?.toString() || '0',
      icon: Shield,
      color: 'text-green-600'
    }
  ];

  return (
    <aside 
      className={`
        ${isMobile ? 'fixed z-50' : 'relative'}
        ${isMobile && !showMobileSidebar ? '-translate-x-full' : 'translate-x-0'}
        w-72 sm:w-80 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out
        flex flex-col overflow-hidden h-full
        ${className}
      `}
    >
      {/* 사이드바 헤더 (모바일용) */}
      {isMobile && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">AI Passport</h2>
              <p className="text-xs text-gray-500">
                {backendConnected ? '실시간 연결' : 'Mock 모드'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* AI Passport 카드 (간소화 버전) */}
        {passport && (
          <div className={`rounded-xl p-4 text-white relative overflow-hidden ${
            backendConnected 
              ? 'bg-gradient-to-br from-blue-600 to-blue-800' 
              : 'bg-gradient-to-br from-gray-500 to-gray-700'
          }`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full -mr-10 -mt-10" />
            
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Passport</h3>
                  <p className="text-sm opacity-90">{passport.passportLevel}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold">{passport.trustScore}%</p>
                  <p className="text-xs opacity-75">Trust Score</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{passport.cueTokens.toLocaleString()}</p>
                  <p className="text-xs opacity-75">CUE</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white border-opacity-20">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-medium">{passport.dataVaults.length}</p>
                    <p className="opacity-75">Vaults</p>
                  </div>
                  <div>
                    <p className="font-medium">{passport.connectedPlatforms.length}</p>
                    <p className="opacity-75">Connected</p>
                  </div>
                  <div>
                    <p className="font-medium">{passport.personalizedAgents.length}</p>
                    <p className="opacity-75">Agents</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 빠른 통계 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">오늘의 활동</h4>
          <div className="space-y-2">
            {quickStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-sm text-gray-700">{stat.label}</span>
                </div>
                <span className="font-semibold text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">메뉴</h4>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`
                    w-full flex items-center justify-between p-3 rounded-lg text-left
                    transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 ${
                      isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                    }`} />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {item.badge && (
                      <StatusBadge 
                        variant={isActive ? 'info' : 'neutral'} 
                        size="sm"
                      >
                        {item.badge}
                      </StatusBadge>
                    )}
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      isActive ? 'rotate-90' : 'group-hover:translate-x-1'
                    }`} />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 시스템 상태 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">시스템 상태</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">백엔드</span>
              </div>
              <StatusBadge variant={backendConnected ? 'success' : 'error'} size="sm">
                {backendConnected ? '연결됨' : '오프라인'}
              </StatusBadge>
            </div>
            
            {passport && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-700">생체인증</span>
                  </div>
                  <StatusBadge variant={passport.biometricVerified ? 'success' : 'warning'} size="sm">
                    {passport.biometricVerified ? '활성' : '비활성'}
                  </StatusBadge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-700">패스키</span>
                  </div>
                  <StatusBadge variant={passport.passkeyRegistered ? 'success' : 'warning'} size="sm">
                    {passport.passkeyRegistered ? '등록됨' : '미등록'}
                  </StatusBadge>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">최근 활동</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>15분 전: 5.2 CUE 획득</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>1시간 전: GitHub 동기화</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span>2시간 전: 프로필 업데이트</span>
            </div>
          </div>
        </div>
      </div>

      {/* 사이드바 하단 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">
            {backendConnected ? '🌐 실시간 데이터' : '🔧 Mock 모드'}
          </div>
          <div className="text-xs text-gray-400">
            AI Passport System v1.0
          </div>
        </div>
      </div>
    </aside>
  );
};