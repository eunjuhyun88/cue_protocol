// ============================================================================
// 📁 src/components/passport/ConnectedPlatforms.tsx
// 🔗 연결된 플랫폼 관리 컴포넌트
// ============================================================================
// 이 컴포넌트는 사용자가 연결된 외부 플랫폼을 관리할 수 있는 UI를
// 제공합니다. 사용자는 플랫폼을 연결하거나 해제하고, 동기화 상태를
// 확인할 수 있습니다. 각 플랫폼의 상태에 따라 적절한 아이콘과
// 상태 배지를 표시하며, 연결되지 않은 플랫폼을 연결할 수 있는
// 옵션도 제공합니다. 이 컴포넌트는 AI Passport 시스템의 핵심 기능
// 중 하나로, 사용자가 다양한 외부 플랫폼과 통합하여 개인화된 AI    
// ============================================================================

'use client';

import React, { useState } from 'react';
import { 
  Link, Unlink, RefreshCw, Settings, Calendar, 
  TrendingUp, AlertCircle, CheckCircle, Clock, Plus 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import type { ConnectedPlatform } from '../../types/passport.types';

interface ConnectedPlatformsProps {
  platforms: ConnectedPlatform[];
  onConnect?: (platformId: string) => Promise<void>;
  onDisconnect?: (platformId: string) => Promise<void>;
  onSync?: (platformId: string) => Promise<void>;
  backendConnected: boolean;
}

export const ConnectedPlatforms: React.FC<ConnectedPlatformsProps> = ({
  platforms,
  onConnect,
  onDisconnect,
  onSync,
  backendConnected
}) => {
  const [syncingPlatforms, setSyncingPlatforms] = useState<Set<string>>(new Set());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'syncing': return 'warning';
      case 'error': return 'error';
      case 'connecting': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'connecting': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleSync = async (platformId: string) => {
    if (!onSync) return;

    setSyncingPlatforms(prev => new Set(prev).add(platformId));
    try {
      await onSync(platformId);
    } catch (error) {
      console.error('동기화 실패:', error);
    } finally {
      setSyncingPlatforms(prev => {
        const newSet = new Set(prev);
        newSet.delete(platformId);
        return newSet;
      });
    }
  };

  // 사용 가능한 플랫폼 목록 (연결되지 않은 것들)
  const availablePlatforms = [
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'blue' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'black' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'pink' },
    { id: 'youtube', name: 'YouTube', icon: '📺', color: 'red' },
    { id: 'spotify', name: 'Spotify', icon: '🎵', color: 'green' },
    { id: 'notion', name: 'Notion', icon: '📝', color: 'gray' },
  ].filter(platform => !platforms.find(p => p.id === platform.id));

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">연결된 플랫폼</h2>
          <p className="text-gray-600 mt-1">외부 플랫폼과 연결하여 개인화 데이터를 수집하세요</p>
        </div>
        <StatusBadge variant={backendConnected ? 'success' : 'warning'}>
          {backendConnected ? '실시간 동기화' : 'Mock 데이터'}
        </StatusBadge>
      </div>

      {/* 통계 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">연결된 플랫폼</p>
              <p className="text-2xl font-bold text-gray-900">{platforms.length}</p>
            </div>
            <Link className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">활성 상태</p>
              <p className="text-2xl font-bold text-green-600">
                {platforms.filter(p => p.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 CUE</p>
              <p className="text-2xl font-bold text-purple-600">
                {platforms.reduce((sum, p) => sum + p.cueCount, 0).toLocaleString()}
              </p>
            </div>
            <span className="text-2xl">💎</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">마이닝된 컨텍스트</p>
              <p className="text-2xl font-bold text-yellow-600">
                {platforms.reduce((sum, p) => sum + p.contextMined, 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* 연결된 플랫폼 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">연결된 플랫폼</h3>
        
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}
                  style={{ backgroundColor: `${platform.color}15` }}
                >
                  {platform.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{platform.name}</h4>
                    <StatusBadge variant={getStatusColor(platform.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(platform.status)}
                        <span className="capitalize">{platform.status}</span>
                      </div>
                    </StatusBadge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">마지막 동기화</span>
                      <p>{new Date(platform.lastSync).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div>
                      <span className="font-medium">CUE 토큰</span>
                      <p className="text-purple-600 font-semibold">{platform.cueCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">컨텍스트</span>
                      <p className="text-blue-600 font-semibold">{platform.contextMined}</p>
                    </div>
                    <div>
                      <span className="font-medium">연결 상태</span>
                      <p className={platform.connected ? 'text-green-600' : 'text-red-600'}>
                        {platform.connected ? '활성' : '비활성'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(platform.id)}
                  loading={syncingPlatforms.has(platform.id)}
                  disabled={!backendConnected || platform.status === 'error'}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  동기화
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!backendConnected}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  설정
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDisconnect?.(platform.id)}
                  disabled={!backendConnected}
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  연결 해제
                </Button>
              </div>
            </div>

            {/* 연결 단계 표시 (연결 중인 경우) */}
            {platform.connectionSteps && platform.status === 'connecting' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">연결 진행 상황</h5>
                <div className="space-y-2">
                  {platform.connectionSteps.map((step, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-blue-800">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {platform.status === 'error' && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-800 font-medium">연결 오류가 발생했습니다</p>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  API 키를 확인하거나 플랫폼 설정을 다시 확인해주세요.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 사용 가능한 플랫폼 */}
      {availablePlatforms.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">연결 가능한 플랫폼</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePlatforms.map((platform) => (
              <div
                key={platform.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="font-medium text-gray-900">{platform.name}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConnect?.(platform.id)}
                    disabled={!backendConnected}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    연결
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 플랫폼이 없는 경우 */}
      {platforms.length === 0 && (
        <div className="text-center py-12">
          <Link className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            연결된 플랫폼이 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            외부 플랫폼을 연결하여 개인화된 AI 경험을 시작하세요
          </p>
          <p className="text-sm text-gray-500">
            💡 플랫폼 연결 시 자동으로 CUE 토큰을 획득할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
};