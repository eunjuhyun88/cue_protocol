// ============================================================================
// 📁 src/components/ui/Button.tsx
// 🎯 버튼 컴포넌트 - Tailwind 클래스 버전
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
        return 'bg-cue-primary hover:bg-cue-primary-dark text-white border-transparent shadow-cue';
      case 'secondary':
        return 'bg-cue-secondary hover:bg-cue-secondary-dark text-white border-transparent shadow-sm';
      case 'accent':
        return 'bg-cue-accent hover:bg-cue-accent-light text-cue-dark border-transparent shadow-accent font-semibold';
      case 'warning':
        return 'bg-cue-warning hover:bg-cue-warning-dark text-white border-transparent shadow-sm';
      case 'ghost':
        return 'bg-transparent hover:bg-cue-gray-100 text-cue-dark border-transparent';
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
        focus:outline-none focus:ring-2 focus:ring-cue-primary focus:ring-offset-2
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

// ============================================================================
// 📁 src/components/ui/Card.tsx
// 🃏 카드 컴포넌트 - Tailwind 클래스 버전
// ============================================================================

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
      case 'none': return '';
      case 'sm': return 'p-4';
      case 'md': return 'p-6';
      case 'lg': return 'p-8';
    }
  };

  const getVariantClasses = () => {
    if (gradient) {
      switch (variant) {
        case 'accent':
          return 'bg-gradient-accent text-cue-dark';
        case 'secondary':
          return 'bg-gradient-secondary text-white';
        case 'dark':
          return 'bg-gradient-dark text-white';
        default:
          return 'bg-gradient-cue text-white';
      }
    }

    switch (variant) {
      case 'accent':
        return 'bg-cue-accent-pale text-cue-dark border-cue-accent';
      case 'secondary':
        return 'bg-cue-gray-100 text-cue-dark border-cue-gray-400';
      case 'minimal':
        return 'bg-transparent text-cue-dark border-cue-gray-200';
      case 'dark':
        return 'bg-cue-dark text-white border-cue-gray-600';
      default:
        return 'bg-white text-cue-dark border-cue-gray-200';
    }
  };

  const getHoverClasses = () => {
    if (!hover) return '';
    
    if (gradient) {
      return 'hover:shadow-cue-lg hover:scale-105 transform transition-all duration-300';
    }

    switch (variant) {
      case 'accent':
        return 'hover:bg-cue-accent hover:shadow-lg hover:border-cue-accent-light hover:-translate-y-1';
      case 'dark':
        return 'hover:bg-cue-gray-600 hover:shadow-lg';
      default:
        return 'hover:shadow-cue hover:border-cue-primary hover:-translate-y-1';
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

// ============================================================================
// 📁 src/components/ui/Input.tsx
// 📝 입력 컴포넌트 - Tailwind 클래스 버전
// ============================================================================

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
          bg-cue-accent-pale border-cue-accent 
          focus:bg-white focus:border-cue-primary focus:ring-cue-primary
          placeholder-cue-gray-600
        `;
      case 'minimal':
        return `
          bg-transparent border-cue-gray-400 
          focus:bg-cue-gray-100 focus:border-cue-primary focus:ring-cue-primary
          placeholder-cue-gray-600
        `;
      default:
        return `
          bg-cue-gray-100 border-cue-gray-400 
          focus:bg-white focus:border-cue-primary focus:ring-cue-primary
          placeholder-cue-gray-600
        `;
    }
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-cue-dark mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-cue-gray-600">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          className={`
            block w-full px-4 py-3 border rounded-lg
            text-cue-dark font-medium
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            disabled:bg-cue-gray-200 disabled:cursor-not-allowed disabled:text-cue-gray-600
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
            <div className="text-cue-gray-600">
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
        <p className="mt-2 text-sm text-cue-gray-600">{hint}</p>
      )}
    </div>
  );
};