// ============================================================================
// 📁 src/components/ui/ConnectionStatus.tsx
// 📡 백엔드 연결 상태 표시 (CUE Protocol 디자인으로 새로 추가)
// ============================================================================

'use client';

import React from 'react';
import { Wifi, WifiOff, Server, Globe } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
  mode: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  connected, 
  mode, 
  showLabel = true,
  size = 'md',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-xs px-3 py-1', 
    lg: 'text-sm px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-1 ${connected ? 'text-green-600' : 'text-yellow-600'}`}>
        {connected ? (
          <Wifi className={iconSizes[size]} />
        ) : (
          <WifiOff className={iconSizes[size]} />
        )}
        {showLabel && <span className="text-xs">{mode}</span>}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`flex items-center space-x-2 ${sizeClasses[size]} rounded-full border ${
        connected 
          ? 'bg-green-50 text-green-700 border-green-200' 
          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
      }`}>
        {connected ? <Server className={iconSizes[size]} /> : <Globe className={iconSizes[size]} />}
        <div className="flex flex-col">
          <span className="font-medium">{connected ? 'Connected' : 'Mock Mode'}</span>
          <span className="text-xs opacity-75">{mode}</span>
        </div>
      </div>
    );
  }

  // 기존 StatusIndicator 스타일 유지
  return (
    <div className={`flex items-center space-x-2 ${sizeClasses[size]} rounded-full font-medium ${
      connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {connected ? <Wifi className={iconSizes[size]} /> : <WifiOff className={iconSizes[size]} />}
      {showLabel && <span>{connected ? `Real (${mode})` : 'Mock Mode'}</span>}
    </div>
  );
};

