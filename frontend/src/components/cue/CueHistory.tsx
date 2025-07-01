// ============================================================================
// 📁 src/components/cue/CueHistory.tsx
// 📊 CUE 토큰 거래 내역 컴포넌트
// ============================================================================

'use client';

import React, { useState } from 'react';
import { 
  History, TrendingUp, TrendingDown, Filter, 
  Calendar, Download, Search, ArrowUpRight, ArrowDownLeft,
  Zap, Gift, Users, Settings, Bot
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatusBadge } from '../ui/StatusBadge';
import type { CueHistory as CueHistoryType, CueTransaction } from '../../types/cue.types';

interface CueHistoryProps {
  history: CueHistoryType;
  onExport?: () => void;
  backendConnected: boolean;
  className?: string;
}

export const CueHistory: React.FC<CueHistoryProps> = ({
  history,
  onExport,
  backendConnected,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'earned' | 'spent'>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'chat': return <Bot className="w-4 h-4" />;
      case 'mining': return <Zap className="w-4 h-4" />;
      case 'verification': return <Settings className="w-4 h-4" />;
      case 'bonus': return <Gift className="w-4 h-4" />;
      case 'referral': return <Users className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'chat': return 'text-blue-600';
      case 'mining': return 'text-yellow-600';
      case 'verification': return 'text-green-600';
      case 'bonus': return 'text-purple-600';
      case 'referral': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  const getSourceName = (source: string) => {
    switch (source) {
      case 'chat': return 'AI 대화';
      case 'mining': return '마이닝';
      case 'verification': return '인증';
      case 'bonus': return '보너스';
      case 'referral': return '추천';
      default: return source;
    }
  };

  const filteredTransactions = history.transactions.filter((tx) => {
    const matchesSearch = tx.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getSourceName(tx.source).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesSource = filterSource === 'all' || tx.source === filterSource;
    
    return matchesSearch && matchesType && matchesSource;
  });

  const uniqueSources = [...new Set(history.transactions.map(tx => tx.source))];

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <History className="w-6 h-6 mr-2" />
              CUE 거래 내역
            </h2>
            <p className="text-gray-600 mt-1">모든 CUE 토큰 획득 및 사용 내역</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <StatusBadge variant={backendConnected ? 'success' : 'warning'}>
              {backendConnected ? '실시간 데이터' : 'Mock 데이터'}
            </StatusBadge>
            {onExport && (
              <Button variant="outline" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                내보내기
              </Button>
            )}
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">총 획득</p>
                <p className="text-xl font-bold text-green-900">
                  {history.totalEarned.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">총 사용</p>
                <p className="text-xl font-bold text-red-900">
                  {history.totalSpent.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">일평균</p>
                <p className="text-xl font-bold text-blue-900">
                  {history.averagePerDay.toFixed(1)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">순 증가</p>
                <p className="text-xl font-bold text-purple-900">
                  {(history.totalEarned - history.totalSpent).toLocaleString()}
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="거래 내역 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 타입</option>
              <option value="earned">획득</option>
              <option value="spent">사용</option>
            </select>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 소스</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>
                  {getSourceName(source)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 거래 내역 목록 */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTransactions.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${transaction.type === 'earned' ? 'bg-green-100' : 'bg-red-100'}
                    `}>
                      {transaction.type === 'earned' ? (
                        <ArrowDownLeft className={`w-5 h-5 ${getSourceColor(transaction.source)}`} />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getSourceIcon(transaction.source)}
                        <span className="font-medium text-gray-900">
                          {transaction.purpose || getSourceName(transaction.source)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(transaction.timestamp).toLocaleString('ko-KR')}
                        {transaction.metadata?.model && (
                          <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                            {transaction.metadata.model}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'earned' ? '+' : '-'}{transaction.amount.toLocaleString()} CUE
                    </div>
                    <StatusBadge 
                      variant={transaction.type === 'earned' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {getSourceName(transaction.source)}
                    </StatusBadge>
                  </div>
                </div>

                {/* 추가 메타데이터 */}
                {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                      {transaction.metadata.tokensUsed && (
                        <div>토큰 사용: {transaction.metadata.tokensUsed}</div>
                      )}
                      {transaction.metadata.qualityScore && (
                        <div>품질 점수: {transaction.metadata.qualityScore}/10</div>
                      )}
                      {transaction.metadata.personalityBonus && (
                        <div>개인화 보너스: +{transaction.metadata.personalityBonus}</div>
                      )}
                      {transaction.blockNumber && (
                        <div>블록: #{transaction.blockNumber}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-600">
              다른 검색어나 필터를 시도해보세요
            </p>
          </div>
        )}
      </div>

      {/* 하단 정보 */}
      {history.transactions.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              총 {history.transactions.length}개 거래 중 {filteredTransactions.length}개 표시
            </span>
            {history.lastTransaction && (
              <span>
                마지막 거래: {new Date(history.lastTransaction).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};