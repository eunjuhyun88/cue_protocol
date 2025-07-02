// ============================================================================
// 📁 src/components/ui/ProgressBar.tsx
// 📊 기존에 있던 프로그레스 바 컴포넌트 복원
// ============================================================================

'use client';

import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'purple';
  showLabel?: boolean;
  className?: string;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = false,
  className = '',
  label
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-[#3B74BF]',
    green: 'bg-green-600',
    yellow: 'bg-[#EDF25E]',
    purple: 'bg-purple-600'
  };

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-[#403F3D] mb-1">
          <span>{label || 'Progress'}</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className={`w-full bg-[#F2F2F2] rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
