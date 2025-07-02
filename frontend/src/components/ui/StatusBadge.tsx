// ============================================================================
// 📁 src/components/ui/StatusBadge.tsx
// 🏷️ 기존 상태 배지 디자인 유지 + 기능 확장
// ============================================================================

'use client';

import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean; // 새로 추가된 기능
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  size = 'md',
  children,
  className = '',
  pulse = false
}) => {
  // 기존 색상 조합 그대로 유지
  const variantClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span
      className={`
        inline-flex items-center
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        border rounded-full font-medium
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {children}
    </span>
  );
};
