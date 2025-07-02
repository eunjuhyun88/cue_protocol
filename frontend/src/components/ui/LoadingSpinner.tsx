// ============================================================================
// 📁 src/components/ui/LoadingSpinner.tsx
// ⏳ 기존 코드 100% 유지 + 리팩토링 호환성만 추가
// ============================================================================

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'accent' | 'secondary' | 'white' | 'dark';
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'primary',
  text,
  variant = 'spinner'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    primary: 'text-[#3B74BF]',
    accent: 'text-[#EDF25E]',
    secondary: 'text-[#BF8034]',
    white: 'text-white',
    dark: 'text-[#403F3D]'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // 스피너 변형
  const renderSpinner = () => {
    if (variant === 'dots') {
      return (
        <div className="flex space-x-1">
          <div className={`w-2 h-2 rounded-full animate-bounce bg-[#3B74BF]`}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce delay-100 bg-[#3B74BF]`}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce delay-200 bg-[#3B74BF]`}></div>
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div className={`${sizeClasses[size]} rounded-full animate-pulse bg-[#3B74BF]`}></div>
      );
    }

    // 기본 스피너
    return (
      <Loader2 
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} 
      />
    );
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderSpinner()}
      
      {text && (
        <p className={`${textSizeClasses[size]} ${colorClasses[color === 'white' ? 'dark' : color]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );
};
