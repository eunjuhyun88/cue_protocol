// ============================================================================
// 📁 src/components/ui/Button.tsx
// 🎯 버튼 컴포넌트 - CUE Protocol 색상 팔레트 적용
// ============================================================================

'use client';

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'warning' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#3B74BF] hover:bg-[#2E5A9A] text-white border-transparent shadow-sm';
      case 'secondary':
        return 'bg-[#BF8034] hover:bg-[#A66D28] text-white border-transparent shadow-sm';
      case 'accent':
        return 'bg-[#EDF25E] hover:bg-[#E0F252] text-[#403F3D] border-transparent shadow-sm font-semibold';
      case 'warning':
        return 'bg-[#F2B84B] hover:bg-[#E8A432] text-white border-transparent shadow-sm';
      case 'ghost':
        return 'bg-transparent hover:bg-[#F2F2F2] text-[#403F3D] border-transparent';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white border-transparent shadow-sm';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center space-x-2 
        border rounded-lg font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[#3B74BF] focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:transform hover:-translate-y-0.5 hover:shadow-lg
        active:transform active:translate-y-0
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <LoadingSpinner 
          size={size === 'lg' ? 'md' : 'sm'} 
          color={variant === 'accent' ? 'dark' : 'white'} 
        />
      ) : leftIcon}
      
      {children && <span>{children}</span>}
      
      {!loading && rightIcon}
    </button>
  );
};