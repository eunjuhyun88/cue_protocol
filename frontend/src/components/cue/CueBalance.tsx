// ============================================================================
// 📁 src/components/cue/CueBalance.tsx
// 💎 CUE 토큰 잔액 표시 컴포넌트
// ============================================================================

'use client';

import React from 'react';
import { Zap, TrendingUp, TrendingDown, Clock, Eye, EyeOff } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import type { CueBalance as CueBalanceType } from '../../types/cue.types';

interface CueBalanceProps {
  balance: CueBalanceType;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  backendConnected: boolean;
  className?: string;
}

export const CueBalance: React.FC<CueBalanceProps> = ({
  balance,
  showDetails = false,
  onToggleDetails,
  backendConnected,
  className = ''
}) => {
  const formatCueAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  const getBalanceGradient = (total: number) => {
    if (total >= 100000) return 'from-purple-500 to-pink-500';
    if (total >= 50000) return 'from-blue-500 to-purple-500';
    if (total >= 10000) return 'from-green-500 to-blue-500';
    if (total >= 1000) return 'from-yellow-500 to-green-500';
    return 'from-gray-400 to-gray-500';
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* 메인 잔액 표시 */}
      <div className={`bg-gradient-to-r ${getBalanceGradient(balance.total)} p-6 text-white relative overflow-hidden`}>
        {/* 배경 패턴 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">CUE Balance</h3>
                <p className="text-sm opacity-90">
                  {backendConnected ? '실시간 잔액' : 'Mock 잔액'}
                </p>
              </div>
            </div>
            
            <StatusBadge variant={backendConnected ? 'success' : 'warning'} size="sm">
              {backendConnected ? 'Live' : 'Mock'}
            </StatusBadge>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold">
              {formatCueAmount(balance.total)}
            </span>
            <span className="text-lg opacity-75">CUE</span>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm opacity-90">
              사용 가능: {formatCueAmount(balance.available)} CUE
            </div>
            {onToggleDetails && (
              <button
                onClick={onToggleDetails}
                className="flex items-center space-x-1 text-sm opacity-90 hover:opacity-100 transition-opacity"
              >
                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showDetails ? '숨기기' : '상세보기'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 상세 정보 */}
      {showDetails && (
        <div className="p-6 space-y-4">
          {/* 잔액 분석 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">총 잔액</span>
                <span className="font-semibold text-gray-900">
                  {balance.total.toLocaleString()} CUE
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">사용 가능</span>
                <span className="font-semibold text-green-600">
                  {balance.available.toLocaleString()} CUE
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">잠금됨</span>
                <span className="font-semibold text-yellow-600">
                  {balance.locked.toLocaleString()} CUE
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">대기 중</span>
                <span className="font-semibold text-blue-600">
                  {balance.pending.toLocaleString()} CUE
                </span>
              </div>
            </div>

            {/* 비율 차트 */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-2">잔액 구성</div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-xs text-gray-600">
                    사용가능 {((balance.available / balance.total) * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-xs text-gray-600">
                    잠금 {((balance.locked / balance.total) * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-xs text-gray-600">
                    대기 {((balance.pending / balance.total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* 비율 바 */}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500"
                    style={{ width: `${(balance.available / balance.total) * 100}%` }}
                  />
                  <div 
                    className="bg-yellow-500"
                    style={{ width: `${(balance.locked / balance.total) * 100}%` }}
                  />
                  <div 
                    className="bg-blue-500"
                    style={{ width: `${(balance.pending / balance.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 최근 업데이트 시간 */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                최근 업데이트: {new Date(balance.lastUpdated).toLocaleString('ko-KR')}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-3">빠른 정보</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-900">💡 CUE 획득 방법</div>
                <div className="text-blue-700 mt-1">AI와 대화, 데이터 제공, 플랫폼 연결</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="font-medium text-purple-900">⚡ CUE 사용처</div>
                <div className="text-purple-700 mt-1">프리미엄 AI 기능, 고급 분석, 맞춤형 서비스</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};