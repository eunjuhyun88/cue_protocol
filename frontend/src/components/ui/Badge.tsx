
// ============================================================================
// 📁 src/components/ui/Badge.tsx
// 🏷️ 기존에 있던 일반 배지 컴포넌트 복원
// ============================================================================

'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variantClasses = {
    default: 'bg-[#F2F2F2] text-[#403F3D] border-[#BFBFBF]',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full border
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};