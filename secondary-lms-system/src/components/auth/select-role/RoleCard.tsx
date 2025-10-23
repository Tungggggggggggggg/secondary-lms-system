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
  onSelect: (role: string) => void;
}

export default function RoleCard({
  role,
  title,
  icon,
  description,
  features,
  selected,
  onSelect,
}: RoleCardProps) {
  // Gradient colors cho từng vai trò
  const gradients = {
    teacher: {
      start: '#667eea',
      end: '#764ba2',
    },
    student: {
      start: '#f093fb',
      end: '#f5576c',
    },
    parent: {
      start: '#4facfe',
      end: '#00f2fe',
    },
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white rounded-3xl p-8 text-center cursor-pointer",
        "transition-all duration-400 ease-out",
        "hover:transform hover:-translate-y-3 hover:scale-102",
        "shadow-lg hover:shadow-2xl",
        "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1.5",
        "before:bg-gradient-to-r",
        selected ? [
          "transform -translate-y-3 scale-102",
          "border-3 border-transparent",
          "bg-gradient-to-r bg-white bg-origin-border",
        ] : "before:scale-x-0 hover:before:scale-x-100 before:transition-transform"
      )}
      style={{
        '--gradient-start': gradients[role].start,
        '--gradient-end': gradients[role].end,
      } as React.CSSProperties}
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
      {/* Checkmark */}
      {selected && (
        <div className="absolute top-2 right-2 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white text-lg shadow-lg animate-scale-in">
          ✓
        </div>
      )}

      {/* Icon */}
      <div 
        className={cn(
          "w-28 h-28 mx-auto mb-6",
          "rounded-full flex items-center justify-center text-5xl",
          "bg-gradient-to-r shadow-lg",
          "transition-all duration-400",
          "hover:transform hover:rotate-y-360 hover:scale-110",
          selected ? "animate-pulse" : ""
        )}
        style={{
          backgroundImage: `linear-gradient(135deg, ${gradients[role].start}, ${gradients[role].end})`,
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <h2 
        className="text-2xl font-bold mb-3 bg-gradient-to-r bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(135deg, ${gradients[role].start}, ${gradients[role].end})`,
        }}
      >
        {title}
      </h2>

      {/* Description */}
      <p className="text-gray-600 text-sm leading-relaxed mb-5">
        {description}
      </p>

      {/* Features */}
      <div className="flex flex-col gap-2.5">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-center gap-2.5 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg transition-all hover:bg-gray-100 hover:translate-x-1"
          >
            <span className="text-lg min-w-[24px]">{feature.icon}</span>
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}