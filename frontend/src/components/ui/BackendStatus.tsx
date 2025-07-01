// ============================================================================
// 📁 src/components/ui/BackendStatus.tsx
// 🔗 백엔드 상태 컴포넌트 - CUE Protocol 색상 팔레트 적용
// ============================================================================

'use client';

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface BackendStatusProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  onRetry?: () => void;
  connectionDetails?: {
    latency?: number;
    lastSync?: string;
    mode?: string;
  };
  className?: string;
  showDetails?: boolean;
}

export const BackendStatus: React.FC<BackendStatusProps> = ({
  status,
  onRetry,
  connectionDetails,
  className = '',
  showDetails = false
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          text: 'Connected',
          bgColor: 'bg-[#E0F252]',
          textColor: 'text-[#403F3D]',
          iconColor: 'text-[#3B74BF]',
          borderColor: 'border-[#EDF25E]'
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          text: 'Connecting...',
          bgColor: 'bg-[#F0F2AC]',
          textColor: 'text-[#BF8034]',
          iconColor: 'text-[#F2B84B]',
          borderColor: 'border-[#F2B84B]'
        };
      case 'error':
        return {
          icon: XCircle,
          text: 'Error',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          iconColor: 'text-red-600',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Mock Mode',
          bgColor: 'bg-[#F2F2F2]',
          textColor: 'text-[#8C8C8C]',
          iconColor: 'text-[#BF8034]',
          borderColor: 'border-[#BFBFBF]'
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div className={`
        flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border
        transition-all duration-200 hover:shadow-sm
        ${config.bgColor} ${config.textColor} ${config.borderColor}
      `}>
        <IconComponent 
          className={`w-3 h-3 ${config.iconColor} ${status === 'connecting' ? 'animate-spin' : ''}`} 
        />
        <span className="font-semibold">{config.text}</span>
        
        {connectionDetails?.mode && (
          <span className="text-xs opacity-75 font-normal">
            ({connectionDetails.mode})
          </span>
        )}
        
        {status === 'disconnected' && onRetry && (
          <button 
            onClick={onRetry} 
            className="ml-1 text-[#3B74BF] hover:text-[#2E5A9A] underline font-medium transition-colors"
          >
            재시도
          </button>
        )}
      </div>

      {/* 상세 정보 표시 */}
      {showDetails && connectionDetails && (
        <div className={`
          text-xs space-x-2 px-2 py-1 rounded border
          bg-[#F2F2F2] text-[#8C8C8C] border-[#D9D9D9]
        `}>
          {connectionDetails.latency && (
            <span>⚡ {connectionDetails.latency}ms</span>
          )}
          {connectionDetails.lastSync && (
            <span>🔄 {new Date(connectionDetails.lastSync).toLocaleTimeString()}</span>
          )}
        </div>
      )}
    </div>
  );
};