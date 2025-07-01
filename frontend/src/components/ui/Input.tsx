// ============================================================================
// 📁 src/components/ui/Input.tsx
// 📝 입력 컴포넌트 - CUE Protocol 색상 팔레트 적용
// ============================================================================

'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  variant?: 'default' | 'accent' | 'minimal';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  fullWidth = false,
  variant = 'default',
  className = '',
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'accent':
        return `
          bg-[#F0F2AC] border-[#EDF25E] 
          focus:bg-white focus:border-[#3B74BF] focus:ring-[#3B74BF]
          placeholder-[#8C8C8C]
        `;
      case 'minimal':
        return `
          bg-transparent border-[#BFBFBF] 
          focus:bg-[#F2F2F2] focus:border-[#3B74BF] focus:ring-[#3B74BF]
          placeholder-[#8C8C8C]
        `;
      default:
        return `
          bg-[#F2F2F2] border-[#BFBFBF] 
          focus:bg-white focus:border-[#3B74BF] focus:ring-[#3B74BF]
          placeholder-[#8C8C8C]
        `;
    }
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-[#403F3D] mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-[#8C8C8C]">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          className={`
            block w-full px-4 py-3 border rounded-lg
            text-[#403F3D] font-medium
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            disabled:bg-[#D9D9D9] disabled:cursor-not-allowed disabled:text-[#8C8C8C]
            ${leftIcon ? 'pl-11' : ''}
            ${rightIcon ? 'pr-11' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${getVariantClasses()}
            ${className}
          `}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="text-[#8C8C8C]">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
          <span className="w-1 h-1 bg-red-600 rounded-full"></span>
          <span>{error}</span>
        </p>
      )}
      
      {hint && !error && (
        <p className="mt-2 text-sm text-[#8C8C8C]">{hint}</p>
      )}
    </div>
  );
};