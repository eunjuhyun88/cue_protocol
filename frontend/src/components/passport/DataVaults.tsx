// ============================================================================
// 📁 src/components/passport/DataVaults.tsx
// 🗄️ 데이터 볼트 관리 컴포넌트
// ============================================================================
// 이 컴포넌트는 사용자가 개인 데이터를 안전하게 저장하고 관리할 수
// 있는 데이터 볼트 목록을 표시합니다. 각 볼트는 카테고리,
// 접근 레벨, 데이터 포인트 수, CUE 토큰 수, 예상 가치 등을   
// 보여주며, 사용자는 볼트를 클릭하여 상세 정보를 확인하거나
// 새 볼트를 생성할 수 있습니다. 볼트는 암호화되어 있으며,
// 연결된 플랫폼과의 통합 상태를 표시합니다. 이 컴포넌트
// 는 AI Passport 시스템의 핵심 기능 중 하나로, 사용자가
// 개인화된 AI 경험을 위해 데이터를 안전하게 관리할 수 있도록
// 돕습니다. 또한, 백엔드 연결 상태에 따라 실시간 동기화

// ============================================================================

'use client';

import React, { useState } from 'react';
import { 
  Database, Lock, Unlock, Eye, EyeOff, Plus, 
  Trash2, Edit, Calendar, Users, BarChart3 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import type { UnifiedDataVault } from '../../types/passport.types';

interface DataVaultsProps {
  vaults: UnifiedDataVault[];
  onCreateVault?: (vault: Partial<UnifiedDataVault>) => Promise<void>;
  onUpdateVault?: (vaultId: string, updates: Partial<UnifiedDataVault>) => Promise<void>;
  onDeleteVault?: (vaultId: string) => Promise<void>;
  backendConnected: boolean;
}

export const DataVaults: React.FC<DataVaultsProps> = ({
  vaults,
  onCreateVault,
  onUpdateVault,
  onDeleteVault,
  backendConnected
}) => {
  const [selectedVault, setSelectedVault] = useState<UnifiedDataVault | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'identity': return '👤';
      case 'behavioral': return '🧠';
      case 'professional': return '💼';
      case 'social': return '👥';
      case 'preferences': return '❤️';
      case 'expertise': return '🎯';
      default: return '📁';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'identity': return 'bg-blue-100 text-blue-800';
      case 'behavioral': return 'bg-purple-100 text-purple-800';
      case 'professional': return 'bg-green-100 text-green-800';
      case 'social': return 'bg-pink-100 text-pink-800';
      case 'preferences': return 'bg-red-100 text-red-800';
      case 'expertise': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'public': return 'success';
      case 'selective': return 'warning';
      case 'private': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Vaults</h2>
          <p className="text-gray-600 mt-1">개인 데이터를 안전하게 저장하고 관리하세요</p>
        </div>
        <div className="flex items-center space-x-3">
          <StatusBadge variant={backendConnected ? 'success' : 'warning'}>
            {backendConnected ? '실시간 동기화' : 'Mock 데이터'}
          </StatusBadge>
          <Button
            onClick={() => setShowCreateForm(true)}
            disabled={!backendConnected}
          >
            <Plus className="w-4 h-4 mr-2" />
            새 볼트 생성
          </Button>
        </div>
      </div>

      {/* 통계 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 볼트</p>
              <p className="text-2xl font-bold text-gray-900">{vaults.length}</p>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 데이터 포인트</p>
              <p className="text-2xl font-bold text-gray-900">
                {vaults.reduce((sum, v) => sum + v.dataCount, 0).toLocaleString()}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">획득 CUE</p>
              <p className="text-2xl font-bold text-gray-900">
                {vaults.reduce((sum, v) => sum + v.cueCount, 0).toLocaleString()}
              </p>
            </div>
            <span className="text-2xl">💎</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 가치</p>
              <p className="text-2xl font-bold text-gray-900">
                ${vaults.reduce((sum, v) => sum + v.value, 0).toLocaleString()}
              </p>
            </div>
            <span className="text-2xl">💰</span>
          </div>
        </div>
      </div>

      {/* 볼트 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vaults.map((vault) => (
          <div 
            key={vault.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedVault(vault)}
          >
            {/* 볼트 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getCategoryIcon(vault.category)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{vault.name}</h3>
                  <p className="text-sm text-gray-500">{vault.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {vault.encrypted ? (
                  <Lock className="w-4 h-4 text-green-500" />
                ) : (
                  <Unlock className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </div>

            {/* 카테고리 및 접근 레벨 */}
            <div className="flex items-center space-x-2 mb-4">
              <StatusBadge variant="info" size="sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(vault.category)}`}>
                  {vault.category}
                </span>
              </StatusBadge>
              <StatusBadge variant={getAccessLevelColor(vault.accessLevel)} size="sm">
                {vault.accessLevel}
              </StatusBadge>
            </div>

            {/* 통계 */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">데이터 포인트</span>
                <span className="font-medium">{vault.dataCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">CUE 토큰</span>
                <span className="font-medium text-blue-600">{vault.cueCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">사용 횟수</span>
                <span className="font-medium">{vault.usageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">예상 가치</span>
                <span className="font-medium text-green-600">${vault.value}</span>
              </div>
            </div>

            {/* 연결된 플랫폼 */}
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-2">연결된 플랫폼</p>
              <div className="flex flex-wrap gap-1">
                {vault.sourcePlatforms.slice(0, 3).map((platform) => (
                  <span 
                    key={platform}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {platform}
                  </span>
                ))}
                {vault.sourcePlatforms.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    +{vault.sourcePlatforms.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* 최근 업데이트 */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(vault.lastUpdated).toLocaleDateString('ko-KR')} 업데이트
              </div>
            </div>
          </div>
        ))}

        {/* 새 볼트 생성 카드 */}
        <div 
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center hover:border-gray-400 transition-colors cursor-pointer min-h-[300px]"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="font-medium text-gray-700 mb-2">새 데이터 볼트</h3>
          <p className="text-sm text-gray-500 text-center">
            새로운 데이터 카테고리를 추가하여<br />
            개인화를 더욱 정교하게 만드세요
          </p>
        </div>
      </div>

      {/* 볼트가 없는 경우 */}
      {vaults.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 데이터 볼트가 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            첫 번째 데이터 볼트를 생성하여 개인화된 AI 경험을 시작하세요
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            첫 볼트 생성하기
          </Button>
        </div>
      )}
    </div>
  );
};