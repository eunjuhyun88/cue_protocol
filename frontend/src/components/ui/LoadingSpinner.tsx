// ============================================================================
// 📁 src/components/ui/LoadingSpinner.tsx
// ⏳ 로딩 스피너 컴포넌트
// ============================================================================
// 이 컴포넌트는 로딩 상태를 시각적으로 표시하는 스피너를
// 제공합니다. 다양한 크기와 색상을 지원하며, 텍스트를
// 추가하여 로딩 중임을 사용자에게 알릴 수 있습니다.
// Tailwind CSS를 사용하여 스타일링되며, 클라이언트 측에서
// 사용됩니다. 이 컴포넌트는 로딩 상태를 나타내는 데
// 유용하며, 사용자 경험을 향상시키는 데 기여합니다.
// 사용자는 크기(size), 색상(color), 텍스트(text), 클래스(className)
// 등의 속성을 통해 스피너의 스타일을 조정할 수 있습니다.
// 이 컴포넌트는 React Functional Component로 작성되었으며,
// TypeScript를 사용하여 타입 안전성을 보장합니다.  
// ============================================================================

'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'gray' | 'white';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    gray: 'border-gray-600',
    white: 'border-white'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div
          className={`
            ${sizeClasses[size]}
            ${colorClasses[color]}
            border-2 border-t-transparent
            rounded-full animate-spin
          `}
        />
        {text && (
          <p className="text-sm text-gray-600">{text}</p>
        )}
      </div>
    </div>
  );
};