// ============================================================================
// 📁 src/components/ui/index.ts
// 🎨 업데이트된 UI 컴포넌트들 (기존 구조 유지하면서 기능 추가)
// ============================================================================

'use client';

import React from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

// ============================================================================
// 🔄 LoadingSpinner - 기존 컴포넌트 유지하면서 기능 추가
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'blue' | 'purple' | 'green' | 'yellow';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'blue'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    purple: 'text-purple-600', 
    green: 'text-green-600',
    yellow: 'text-yellow-600'
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  );
};

// ============================================================================
// 📡 StatusIndicator - 기존 컴포넌트에 더 많은 상태 추가
// ============================================================================

interface StatusIndicatorProps {
  connected: boolean;
  mode: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  connected, 
  mode, 
  showLabel = true,
  size = 'md',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-xs px-3 py-1', 
    lg: 'text-sm px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-1 ${connected ? 'text-green-600' : 'text-yellow-600'}`}>
        {connected ? (
          <Wifi className={iconSizes[size]} />
        ) : (
          <WifiOff className={iconSizes[size]} />
        )}
        {showLabel && <span className="text-xs">{mode}</span>}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`flex items-center space-x-2 ${sizeClasses[size]} rounded-full border ${
        connected 
          ? 'bg-green-50 text-green-700 border-green-200' 
          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
      }`}>
        {connected ? <Wifi className={iconSizes[size]} /> : <WifiOff className={iconSizes[size]} />}
        <div className="flex flex-col">
          <span className="font-medium">{connected ? 'Connected' : 'Mock Mode'}</span>
          <span className="text-xs opacity-75">{mode}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${sizeClasses[size]} rounded-full font-medium ${
      connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      {connected ? <Wifi className={iconSizes[size]} /> : <WifiOff className={iconSizes[size]} />}
      {showLabel && <span>{connected ? `Real (${mode})` : 'Mock Mode'}</span>}
    </div>
  );
};

// ============================================================================
// 🎯 Button - 기존 Button 컴포넌트 확장
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const finalClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <button
      className={finalClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

// ============================================================================
// 📝 Input - 기존 Input 컴포넌트 유지하면서 기능 추가
// ============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  variant?: 'default' | 'chat' | 'search';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerClassName = '',
  className = '',
  variant = 'default',
  ...props
}) => {
  const variantClasses = {
    default: 'border-gray-300 focus:ring-blue-500 focus:border-transparent',
    chat: 'border-gray-300 focus:ring-blue-500 focus:border-transparent rounded-xl',
    search: 'border-gray-200 focus:ring-purple-500 focus:border-transparent rounded-full'
  };

  const inputClasses = `
    w-full px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500 focus:ring-red-500' : variantClasses[variant]}
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

// ============================================================================
// 🏷️ Badge - 새로운 컴포넌트 추가
// ============================================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800', 
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};

// ============================================================================
// 📊 ProgressBar - 새로운 컴포넌트 추가
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'purple';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = false,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    purple: 'bg-purple-600'
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{percentage.toFixed(0)}%</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// 🎨 Card - 새로운 컴포넌트 추가
// ============================================================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  border = true,
  hover = false
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  return (
    <div className={`
      bg-white rounded-lg
      ${paddingClasses[padding]}
      ${shadowClasses[shadow]}
      ${border ? 'border border-gray-200' : ''}
      ${hover ? 'hover:shadow-lg transition-shadow duration-200' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};