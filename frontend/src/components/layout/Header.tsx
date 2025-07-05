// ============================================================================
// 📁 src/components/layout/Header.tsx
// 🎯 메인 헤더 컴포넌트 (영어 버전)
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

  return (
    <header className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽: 로고 및 메뉴 */}
          <div className="flex items-center space-x-4">
            {isMobile && (
              <button
                onClick={onMobileMenuToggle}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">CUE Protocol</h1>
                <p className="text-sm text-gray-500">AI Personalization Platform</p>
              </div>
            </div>
          </div>

          {/* 중앙: 검색 바 (데스크톱) */}
          {!isMobile && (
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* 오른쪽: 상태, 알림, 사용자 메뉴 */}
          <div className="flex items-center space-x-3">
            {/* 백엔드 연결 상태 */}
            <BackendStatus 
              status={connectionStatus} 
              onRetry={onRetryConnection}
              connectionDetails={connectionDetails}
            />

            {/* CUE 잔액 (데스크톱) */}
            {!isMobile && passport && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {passport.cueBalance?.toLocaleString() || 0} CUE
                </span>
              </div>
            )}

            {/* 알림 */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* 알림 드롭다운 */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Notifications</h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">New CUE tokens earned from chat!</p>
                        <span className="text-xs text-blue-600">2 minutes ago</span>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">AI Passport level upgraded!</p>
                        <span className="text-xs text-green-600">1 hour ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 사용자 메뉴 */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                {!isMobile && passport && (
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{passport.username}</p>
                    <p className="text-xs text-gray-500">Level {passport.passportLevel}</p>
                  </div>
                )}
              </button>

              {/* 사용자 메뉴 드롭다운 */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Profile Management</span>
                    </button>
                    
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <HelpCircle className="w-4 h-4" />
                      <span>Help</span>
                    </button>
                  </div>
                  
                  <div className="py-2 border-t border-gray-200">
                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
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
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* 배경 클릭 시 메뉴 닫기 */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};