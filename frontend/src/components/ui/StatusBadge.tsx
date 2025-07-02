// ============================================================================
// 📁 frontend/src/components/ui/StatusBadge.tsx
// 🏷️ 상태 배지 - 실시간 시스템 상태 표시용
// ============================================================================

'use client';

import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
  icon?: React.ReactNode; // 아이콘 추가 옵션
  dot?: boolean; // 상태 점 표시 옵션
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  size = 'md',
  children,
  className = '',
  pulse = false,
  icon,
  dot = false
}) => {
  // 상태별 색상 시스템
  const variantClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  // 상태 점 색상
  const dotClasses = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    neutral: 'bg-gray-500'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        border rounded-full font-medium
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `.trim()}
    >
      {/* 상태 점 표시 */}
      {dot && (
        <span 
          className={`
            w-2 h-2 rounded-full 
            ${dotClasses[variant]}
            ${pulse ? 'animate-pulse' : ''}
          `} 
        />
      )}
      
      {/* 아이콘 표시 */}
      {icon && (
        <span className={iconSizeClasses[size]}>
          {icon}
        </span>
      )}
      
      {children}
    </span>
  );
};