// ============================================================================
// 📁 src/components/ui/Badge.tsx
// 🏷️ 배지 컴포넌트 - CUE Protocol 색상 팔레트 적용
// ============================================================================

'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'warning' | 'success' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
  outline?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  dot = false,
  outline = false
}) => {
  const getVariantClasses = () => {
    const baseClasses = outline ? 'border-2 bg-transparent' : 'border-0';
    
    switch (variant) {
      case 'primary':
        return outline 
          ? `${baseClasses} border-[#3B74BF] text-[#3B74BF]`
          : `${baseClasses} bg-[#3B74BF] text-white`;
      case 'secondary':
        return outline
          ? `${baseClasses} border-[#BF8034] text-[#BF8034]`
          : `${baseClasses} bg-[#BF8034] text-white`;
      case 'accent':
        return outline
          ? `${baseClasses} border-[#EDF25E] text-[#403F3D]`
          : `${baseClasses} bg-[#EDF25E] text-[#403F3D]`;
      case 'warning':
        return outline
          ? `${baseClasses} border-[#F2B84B] text-[#F2B84B]`
          : `${baseClasses} bg-[#F2B84B] text-white`;
      case 'success':
        return outline
          ? `${baseClasses} border-green-500 text-green-700`
          : `${baseClasses} bg-green-500 text-white`;
      case 'danger':
        return outline
          ? `${baseClasses} border-red-500 text-red-700`
          : `${baseClasses} bg-red-500 text-white`;
      case 'dark':
        return outline
          ? `${baseClasses} border-[#403F3D] text-[#403F3D]`
          : `${baseClasses} bg-[#403F3D] text-white`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'md':
        return 'px-2.5 py-1 text-sm';
      case 'lg':
        return 'px-3 py-1.5 text-base';
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#3B74BF]';
      case 'secondary':
        return 'bg-[#BF8034]';
      case 'accent':
        return 'bg-[#EDF25E]';
      case 'warning':
        return 'bg-[#F2B84B]';
      case 'success':
        return 'bg-green-500';
      case 'danger':
        return 'bg-red-500';
      case 'dark':
        return 'bg-[#403F3D]';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        transition-all duration-200
        hover:shadow-sm hover:scale-105
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
      `}
    >
      {dot && (
        <span 
          className={`w-2 h-2 rounded-full mr-1.5 ${getDotColor()}`}
        />
      )}
      {children}
    </span>
  );
};