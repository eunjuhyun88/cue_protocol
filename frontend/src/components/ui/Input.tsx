// ============================================================================
// 📁 src/components/ui/Input.tsx
// 📝 공통 입력 컴포넌트
// ============================================================================
// 이 컴포넌트는 다양한 입력 필드를 지원하는 공통 입력 UI를
// 제공합니다. 레이블, 오류 메시지, 헬퍼 텍스트, 아이콘 등을
// 포함할 수 있으며, Tailwind CSS를 사용하여 스타일링됩니다.
// 사용자는 이 컴포넌트를 통해 일관된 입력 경험을 제공받을
// 수 있습니다. 입력 필드는 React의 기본 HTMLInputElement 속성을
// 확장하여 다양한 속성을 지원합니다. 이 컴포넌트는 클라이언트
// 측에서 사용되며, 상태 관리와 함께 사용할 수 있습니다.  
// ============================================================================

'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName = '',
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    ${className}
  `;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          className={inputClasses}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="text-gray-400">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};