// ============================================================================
// 📁 src/components/ui/BackendStatus.tsx
// 🌐 백엔드 연결 상태 표시 컴포넌트
// ============================================================================

'use client';

import React from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../../types/auth.types';

interface BackendStatusProps {
  status: ConnectionStatus;
  onRetry: () => void;
  connectionDetails?: any;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({ 
  status, 
  onRetry,
  connectionDetails
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          icon: <Cloud className="w-4 h-4" />,
          title: '백엔드 연결됨',
          subtitle: `서비스: ${connectionDetails?.service || 'Unknown'}`,
        };
      case 'checking':
        return {
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          title: '연결 확인 중...',
          subtitle: '잠시만 기다려주세요',
        };
      case 'disconnected':
      default:
        return {
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          icon: <CloudOff className="w-4 h-4" />,
          title: '백엔드 연결 실패',
          subtitle: 'localhost:3001 확인 필요',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${config.bgColor} ${config.textColor}`}>
      {config.icon}
      
      <div className="flex-1">
        <span className="font-medium">{config.title}</span>
        <div className="text-xs opacity-75 mt-1">
          {config.subtitle}
        </div>
      </div>
      
      {status === 'disconnected' && (
        <button 
          onClick={onRetry}
          className="ml-2 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-xs font-medium transition-colors"
        >
          재시도
        </button>
      )}
    </div>
  );
};