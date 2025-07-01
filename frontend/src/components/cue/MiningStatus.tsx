// ============================================================================
// 📁 src/components/cue/MiningStatus.tsx
// ⛏️ CUE 마이닝 상태 표시 컴포넌트 (수정됨)
// ============================================================================
// 이 컴포넌트는 사용자의 CUE 마이닝 상태를 시각적으로 표시합니다.
// 마이닝 활성화 여부, 멀티플라이어, 스트릭 보너스,
// 다음 마이닝 가능 시간 등을 보여줍니다.       
// ============================================================================

'use client';

import React from 'react';
import { 
  Hammer, Clock, TrendingUp, Flame, Target, 
  Calendar, Award, Zap, Pause, Play 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import type { CueMiningState } from '../../types/cue.types';

interface MiningStatusProps {
  miningState: CueMiningState;
  onToggleMining?: () => void;
  backendConnected: boolean;
  className?: string;
}

export const MiningStatus: React.FC<MiningStatusProps> = ({
  miningState,
  onToggleMining,
  backendConnected,
  className = ''
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return '지금 가능';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 후`;
    }
    return `${minutes}분 후`;
  };

  const getMiningStatusColor = () => {
    if (!miningState.canMine) return 'from-gray-400 to-gray-500';
    if (miningState.isActive) return 'from-green-500 to-emerald-600';
    return 'from-blue-500 to-blue-600';
  };

  const getMiningStatusText = () => {
    if (!miningState.canMine && miningState.cooldownUntil) {
      return `쿨다운 - ${formatTime(miningState.cooldownUntil)}`;
    }
    if (miningState.isActive) return '마이닝 활성화';
    if (miningState.canMine) return '마이닝 준비됨';
    return '마이닝 비활성화';
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* 마이닝 상태 헤더 */}
      <div className={`bg-gradient-to-r ${getMiningStatusColor()} p-6 text-white relative overflow-hidden`}>
        {/* 배경 애니메이션 (마이닝 활성화시) */}
        {miningState.isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Hammer className={`w-6 h-6 ${miningState.isActive ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">CUE Mining</h3>
                <p className="text-sm opacity-90">{getMiningStatusText()}</p>
              </div>
            </div>
            
            <StatusBadge variant={backendConnected ? 'success' : 'warning'} size="sm">
              {backendConnected ? 'Live' : 'Mock'}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm opacity-90">현재 멀티플라이어</div>
              <div className="text-2xl font-bold flex items-center">
                {miningState.multiplier.toFixed(1)}x
                {miningState.streakDays > 0 && (
                  <Flame className="w-5 h-5 ml-2 text-orange-300" />
                )}
              </div>
            </div>
            
            {onToggleMining && (
              <Button
                variant={miningState.isActive ? "secondary" : "primary"}
                onClick={onToggleMining}
                disabled={!backendConnected || (!miningState.canMine && !miningState.isActive)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 border-white border-opacity-50"
              >
                {miningState.isActive ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    시작하기
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="p-6 space-y-6">
        {/* 마이닝 메트릭 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-900">{miningState.streakDays}</div>
            <div className="text-sm text-gray-600">연속 일수</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-900">{miningState.multiplier.toFixed(1)}x</div>
            <div className="text-sm text-gray-600">보상 배율</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Target className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-900">
              {miningState.canMine ? '준비됨' : '대기중'}
            </div>
            <div className="text-sm text-gray-600">마이닝 상태</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Clock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-900">
              {miningState.cooldownUntil ? formatTime(miningState.cooldownUntil) : '즉시'}
            </div>
            <div className="text-sm text-gray-600">다음 마이닝</div>
          </div>
        </div>

        {/* 스트릭 보너스 */}
        {miningState.streakDays > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-orange-900">연속 마이닝 스트릭!</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-orange-700">현재 스트릭</span>
                <span className="font-medium text-orange-900">{miningState.streakDays}일</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-orange-700">보너스 배율</span>
                <span className="font-medium text-orange-900">+{((miningState.multiplier - 1) * 100).toFixed(0)}%</span>
              </div>
              
              <div className="w-full bg-orange-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((miningState.streakDays / 30) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-orange-600 mt-1">
                다음 보너스까지: {Math.max(0, (Math.ceil(miningState.streakDays / 7) * 7) - miningState.streakDays)}일
              </div>
            </div>
          </div>
        )}

        {/* 마이닝 가이드 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-blue-900">CUE 마이닝 방법</span>
          </div>
          
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>AI와 의미있는 대화 나누기</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>개인화 데이터 제공 및 업데이트</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>외부 플랫폼 연결 및 동기화</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>AI Passport 프로필 완성도 향상</span>
            </div>
          </div>
        </div>

        {/* 오늘의 마이닝 목표 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-green-900">오늘의 마이닝 목표</span>
            </div>
            <span className="text-sm text-green-700">진행률: 65%</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-800">AI 대화 3회</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <div className="w-3 h-3 bg-gray-300 rounded-full" />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-800">데이터 볼트 업데이트</span>
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-800">플랫폼 동기화</span>
              <div className="w-3 h-3 bg-gray-300 rounded-full" />
            </div>
            
            <div className="w-full bg-green-200 rounded-full h-2 mt-3">
              <div className="bg-green-500 h-2 rounded-full w-2/3 transition-all duration-300" />
            </div>
          </div>
        </div>

        {/* 마이닝 히스토리 요약 */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">마이닝 성과</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">1,250</div>
              <div className="text-sm text-gray-600">이번 주 획득</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">8,430</div>
              <div className="text-sm text-gray-600">이번 달 획득</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">45,120</div>
              <div className="text-sm text-gray-600">총 획득량</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};