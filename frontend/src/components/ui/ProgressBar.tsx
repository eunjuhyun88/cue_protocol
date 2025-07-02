
// ============================================================================
// 📁 src/components/ui/Progress.tsx
// 📊 진행률 표시 컴포넌트 (새로 추가)
// ============================================================================

'use client';

import React from 'react';

export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  showLabel?: boolean;
  showValue?: boolean;
  label?: string;
  className?: string;
  variant?: 'default' | 'gradient' | 'striped';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = false,
  showValue = false,
  label,
  className = '',
  variant = 'default'
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
    purple: 'bg-purple-600',
    red: 'bg-red-600'
  };

  const gradientClasses = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600',
    green: 'bg-gradient-to-r from-green-500 to-green-600',
    yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600',
    red: 'bg-gradient-to-r from-red-500 to-red-600'
  };

  const getBarClasses = () => {
    const baseClasses = `${sizeClasses[size]} rounded-full transition-all duration-300`;
    
    if (variant === 'gradient') {
      return `${baseClasses} ${gradientClasses[color]}`;
    }
    
    if (variant === 'striped') {
      return `${baseClasses} ${colorClasses[color]} bg-stripes`;
    }
    
    return `${baseClasses} ${colorClasses[color]}`;
  };

  return (
    <div className={className}>
      {(showLabel || showValue) && (
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          {showLabel && <span>{label}</span>}
          {showValue && <span>{percentage.toFixed(0)}%</span>}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={getBarClasses()}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
