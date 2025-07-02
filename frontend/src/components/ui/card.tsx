// ============================================================================
// 📁 src/components/ui/Card.tsx
// 🃏 기존 CUE Protocol 카드 디자인 유지 + 리팩토링 호환성
// ============================================================================

'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  border?: boolean;
  variant?: 'default' | 'accent' | 'secondary' | 'minimal' | 'dark';
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
  border = true,
  variant = 'default',
  gradient = false
}) => {
  const getPaddingClasses = () => {
    switch (padding) {
      case 'none':
        return '';
      case 'sm':
        return 'p-4';
      case 'md':
        return 'p-6';
      case 'lg':
        return 'p-8';
    }
  };

  // 🎨 기존 CUE Protocol 색상 조합 유지
  const getVariantClasses = () => {
    if (gradient) {
      switch (variant) {
        case 'accent':
          return 'bg-gradient-to-br from-[#EDF25E] to-[#F0F2AC] text-[#403F3D]';
        case 'secondary':
          return 'bg-gradient-to-br from-[#BF8034] to-[#F2B84B] text-white';
        case 'dark':
          return 'bg-gradient-to-br from-[#403F3D] to-[#0D0D0D] text-white';
        default:
          return 'bg-gradient-to-br from-[#3B74BF] to-[#2E5A9A] text-white';
      }
    }

    switch (variant) {
      case 'accent':
        return 'bg-[#F0F2AC] text-[#403F3D] border-[#EDF25E]';
      case 'secondary':
        return 'bg-[#F2F2F2] text-[#403F3D] border-[#BFBFBF]';
      case 'minimal':
        return 'bg-transparent text-[#403F3D] border-[#D9D9D9]';
      case 'dark':
        return 'bg-[#403F3D] text-white border-[#8C8C8C]';
      default:
        return 'bg-white text-[#403F3D] border-[#D9D9D9]';
    }
  };

  const getHoverClasses = () => {
    if (!hover) return '';
    
    if (gradient) {
      return 'hover:shadow-xl hover:scale-105 transform transition-all duration-300';
    }

    switch (variant) {
      case 'accent':
        return 'hover:bg-[#EDF25E] hover:shadow-lg hover:border-[#E0F252] hover:-translate-y-1';
      case 'dark':
        return 'hover:bg-[#8C8C8C] hover:shadow-lg';
      default:
        return 'hover:shadow-lg hover:border-[#3B74BF] hover:-translate-y-1';
    }
  };

  return (
    <div
      className={`
        rounded-xl shadow-sm transition-all duration-200
        ${border ? 'border' : ''}
        ${getVariantClasses()}
        ${getHoverClasses()}
        ${getPaddingClasses()}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

