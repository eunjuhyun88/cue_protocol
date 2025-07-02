// ============================================================================
// 📁 src/components/ui/BackendStatus.tsx
// 📊 기존 백엔드 상태 컴포넌트 100% 복원
// ============================================================================

'use client';

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface BackendStatusProps {
  connected: boolean;
  mode: string;
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'indicator' | 'detailed';
}

export const BackendStatus: React.FC<BackendStatusProps> = ({
  connected,
  mode,
  className = '',
  showIcon = true,
  showText = true,
  size = 'md',
  variant = 'badge'
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (variant === 'indicator') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showIcon && (
          <div className={`${connected ? 'text-green-500' : 'text-yellow-500'}`}>
            {connected ? <Wifi className={iconSizes[size]} /> : <WifiOff className={iconSizes[size]} />}
          </div>
        )}
        {showText && (
          <span className={`text-${size === 'sm' ? 'xs' : 'sm'} ${connected ? 'text-green-700' : 'text-yellow-700'}`}>
            {connected ? `Live (${mode})` : 'Mock Mode'}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`bg-white rounded-lg border p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {showIcon && (
              <div className={`${connected ? 'text-green-500' : 'text-yellow-500'}`}>
                {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </div>
            )}
            <div>
              <p className={`font-medium text-sm ${connected ? 'text-green-700' : 'text-yellow-700'}`}>
                {connected ? 'Backend Connected' : 'Mock Mode Active'}
              </p>
              <p className="text-xs text-gray-500">Mode: {mode}</p>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        </div>
      </div>
    );
  }

  // 기본 배지 스타일
  return (
    <div className={`
      flex items-center space-x-2 rounded-full font-medium
      ${sizeClasses[size]}
      ${connected 
        ? 'bg-green-100 text-green-700 border border-green-200' 
        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
      }
      ${className}
    `}>
      {showIcon && (
        <div>
          {connected ? <Wifi className={iconSizes[size]} /> : <WifiOff className={iconSizes[size]} />}
        </div>
      )}
      {showText && (
        <span>
          {connected ? `Real (${mode})` : 'Mock Mode'}
        </span>
      )}
    </div>
  );
};
