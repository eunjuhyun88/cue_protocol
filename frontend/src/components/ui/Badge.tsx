// ============================================================================
// 📁 frontend/src/components/ui/Badge.tsx
// 🏷️ 일반 배지 컴포넌트 - StatusBadge와 구분됨
// ============================================================================

'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void; // 클릭 가능한 배지
  disabled?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
  disabled = false
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

  // 클릭 가능한 배지인 경우 추가 스타일
  const interactiveClasses = onClick && !disabled 
    ? 'cursor-pointer hover:opacity-80 transition-opacity' 
    : '';

  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : '';

  const Component = onClick ? 'button' : 'span';

  return (
    <Component 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${interactiveClasses}
        ${disabledClasses}
        ${className}
      `.trim()}
      onClick={onClick && !disabled ? onClick : undefined}
      disabled={disabled}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Component>
  );
};