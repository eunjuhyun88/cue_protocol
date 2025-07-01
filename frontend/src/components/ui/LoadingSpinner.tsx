// ============================================================================
// 📁 src/components/ui/LoadingSpinner.tsx
// ⏳ 로딩 스피너 컴포넌트 - CUE Protocol 색상 팔레트 적용
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
          <div className={`w-2 h-2 rounded-full animate-bounce ${colorClasses[color].replace('text-', 'bg-')}`}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce delay-100 ${colorClasses[color].replace('text-', 'bg-')}`}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce delay-200 ${colorClasses[color].replace('text-', 'bg-')}`}></div>
        </div>
      );
    }

    if (variant === 'pulse') {
      return (
        <div className={`${sizeClasses[size]} rounded-full animate-pulse ${colorClasses[color].replace('text-', 'bg-')}`}></div>
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
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      {renderSpinner()}
      
      {text && (
        <p className={`${textSizeClasses[size]} ${colorClasses[color === 'white' ? 'white' : 'dark']} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );
};