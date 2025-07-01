// ============================================================================
// 📁 src/components/layout/Header.tsx
// 🎯 메인 헤더 컴포넌트
// ============================================================================
// 이 컴포넌트는 AI Passport 시스템의 상단 헤더를 구성하며,
// 사용자 인증 상태에 따라 다양한 기능을 제공합니다.
// 헤더는 로고, 백엔드 연결 상태, 사용자 메뉴, 알림 등을
// 포함하고 있으며, 데스크톱과 모바일 환경에 따라   
// 레이아웃이 다르게 표시됩니다.
// 헤더는 반응형 디자인을 지원하며, Lucide 아이콘을 사용하여
// 시각적으로 풍부한 UI를 제공합니다.
// 이 컴포넌트는 클라이언트 측에서만 렌더링
// (use client)되며, Tailwind CSS를 사용하여 스타일링됩니다.
// 사용자는 헤더를 통해 AI Passport의 주요 기능에 쉽게 접근할 수 있으며,
// 사용자 경험을 향상시키기 위해 다양한 상태 표시와
// ============================================================================

'use client';

import React, { useState } from 'react';
import { 
  Menu, X, Settings, LogOut, User, Bell, 
  Shield, Zap, HelpCircle, Search
} from 'lucide-react';
import { Button } from '../ui/Button';
import { BackendStatus } from '../ui/BackendStatus';
import { StatusBadge } from '../ui/StatusBadge';
import type { UnifiedAIPassport } from '../../types/passport.types';
import type { ConnectionStatus } from '../../types/auth.types';

interface HeaderProps {
  passport?: UnifiedAIPassport;
  backendConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectionDetails?: any;
  onMobileMenuToggle: () => void;
  onLogout: () => void;
  onRetryConnection: () => void;
  isMobile: boolean;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  passport,
  backendConnected,
  connectionStatus,
  connectionDetails,
  onMobileMenuToggle,
  onLogout,
  onRetryConnection,
  isMobile,
  className = ''
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: '1',
      type: 'success',
      title: 'CUE 마이닝 완료',
      message: '15.3 CUE를 획득했습니다',
      time: '5분 전',
      unread: true
    },
    {
      id: '2',
      type: 'info',
      title: '새로운 플랫폼 연결',
      message: 'GitHub 동기화가 완료되었습니다',
      time: '1시간 전',
      unread: true
    },
    {
      id: '3',
      type: 'warning',
      title: '패스포트 업데이트',
      message: '성격 프로필을 업데이트해주세요',
      time: '2시간 전',
      unread: false
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 좌측: 로고 및 모바일 메뉴 */}
          <div className="flex items-center space-x-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMobileMenuToggle}
                className="p-2"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">AI Passport</h1>
                <p className="text-xs text-gray-500">
                  {backendConnected ? '실제 백엔드 연결됨' : 'Mock 모드'}
                </p>
              </div>
            </div>
          </div>

          {/* 중앙: 검색 (데스크톱만) */}
          {!isMobile && (
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="AI Passport 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* 우측: 상태 및 사용자 메뉴 */}
          <div className="flex items-center space-x-3">
            {/* CUE 잔액 (데스크톱) */}
            {!isMobile && passport && (
              <div className="hidden md:flex items-center space-x-2 bg-purple-50 px-3 py-2 rounded-lg">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  {passport.cueTokens.toLocaleString()} CUE
                </span>
              </div>
            )}

            {/* 백엔드 상태 */}
            <BackendStatus
              status={connectionStatus}
              onRetry={onRetryConnection}
              connectionDetails={connectionDetails}
            />

            {/* 알림 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* 알림 드롭다운 */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">알림</h3>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                          notification.unread ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'warning' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 border-t border-gray-200">
                    <Button variant="outline" size="sm" className="w-full">
                      모든 알림 보기
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 사용자 메뉴 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                {!isMobile && passport && (
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {passport.passportLevel} User
                    </p>
                    <p className="text-xs text-gray-500">
                      Trust Score: {passport.trustScore}%
                    </p>
                  </div>
                )}
              </Button>

              {/* 사용자 드롭다운 */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {passport && (
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {passport.passportLevel} User
                          </p>
                          <p className="text-sm text-gray-500">
                            DID: {passport.did.slice(0, 12)}...
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <StatusBadge variant="success" size="sm">
                          Trust: {passport.trustScore}%
                        </StatusBadge>
                        <StatusBadge variant="info" size="sm">
                          {passport.cueTokens.toLocaleString()} CUE
                        </StatusBadge>
                      </div>
                    </div>
                  )}
                  
                  <div className="py-2">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>프로필 관리</span>
                    </button>
                    
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>설정</span>
                    </button>
                    
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <HelpCircle className="w-4 h-4" />
                      <span>도움말</span>
                    </button>
                  </div>
                  
                  <div className="py-2 border-t border-gray-200">
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>로그아웃</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 검색 바 */}
      {isMobile && (
        <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </header>
  );
};