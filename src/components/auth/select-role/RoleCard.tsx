// FILE: components/auth/select-role/RoleCard.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface Feature {
  readonly icon: string;
  readonly text: string;
}

export interface RoleCardProps {
  role: 'teacher' | 'student' | 'parent';
  title: string;
  icon: string;
  description: string;
  features: readonly Feature[];
  selected?: boolean;
  onSelect: (role: 'teacher' | 'student' | 'parent') => void;
}

export default function RoleCard({ 
  role, 
  title, 
  icon, 
  description, 
  features, 
  selected, 
  onSelect 
}: RoleCardProps) {
  // Gradient colors cho từng vai trò
  const gradients: Record<RoleCardProps['role'], { bar: string; iconBg: string; title: string }> = {
    teacher: {
      bar: 'bg-gradient-to-r from-violet-500 to-indigo-600',
      iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-600',
      title: 'bg-gradient-to-r from-violet-600 to-indigo-600',
    },
    student: {
      bar: 'bg-gradient-to-r from-pink-500 to-rose-600',
      iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
      title: 'bg-gradient-to-r from-pink-600 to-rose-600',
    },
    parent: {
      bar: 'bg-gradient-to-r from-sky-500 to-cyan-500',
      iconBg: 'bg-gradient-to-br from-sky-500 to-cyan-500',
      title: 'bg-gradient-to-r from-sky-600 to-cyan-600',
    },
  };

  const g = gradients[role];
  const ringColor = {
    teacher: 'ring-violet-500',
    student: 'ring-pink-500',
    parent: 'ring-blue-500',
  }[role];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white rounded-xl p-3.5 md:p-4 text-center cursor-pointer w-full',
        'transition-all duration-300 ease-out',
        'shadow-md hover:shadow-lg',
        selected ? `ring-4 ${ringColor} ring-offset-2 scale-[1.02]` : 'hover:-translate-y-0.5',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'flex flex-col h-full min-h-[280px] max-h-[300px]'
      )}
      onClick={() => onSelect(role)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(role);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Chọn vai trò ${title}`}
      aria-pressed={selected}
    >
      {/* Top gradient bar - Mỏng hơn */}
      <div
        aria-hidden={true}
        className={cn('absolute top-0 left-0 right-0 h-0.5', g.bar)}
      />

      {/* Checkmark - Compact hơn */}
      {selected && (
        <div 
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600" 
          aria-label="Đã chọn"
        >
          ✓
        </div>
      )}

      {/* Icon - Compact hơn */}
      <div
        className={cn(
          'w-12 h-12 md:w-14 md:h-14 mx-auto mb-2 rounded-full flex items-center justify-center text-xl md:text-2xl shadow-lg shrink-0',
          selected ? 'animate-pulse' : ''
        )}
        aria-hidden={true}
      >
        <div
          className={cn('w-full h-full rounded-full flex items-center justify-center', g.iconBg)}
          aria-hidden={true}
        >
          {icon}
        </div>
      </div>

      {/* Title - Compact */}
      <h2 
        className={cn('text-base md:text-lg font-semibold mb-1.5 bg-clip-text text-transparent shrink-0 leading-tight', g.title)}
      >
        {title}
      </h2>

      {/* Description - Compact, 2 lines max */}
      <p className="text-gray-600 text-xs leading-snug mb-2.5 px-1 shrink-0 line-clamp-2">
        {description}
      </p>

      {/* Features - Compact với exactly 3 items, no overflow */}
      <div className="flex flex-col gap-1.5 w-full">
        {features.slice(0, 3).map((feature, index) => (
          <div 
            key={index} 
            className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-1.5 rounded-lg transition-transform hover:translate-x-0.5"
          >
            <span className="text-sm shrink-0 w-5 text-center" aria-hidden={true}>
              {feature.icon}
            </span>
            <span className="text-xs leading-tight text-left line-clamp-1 flex-1">
              {feature.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}