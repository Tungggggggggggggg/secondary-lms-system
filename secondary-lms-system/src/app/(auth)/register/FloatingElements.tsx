'use client';

import { useEffect, useState } from 'react';

interface FloatingElement {
  id: number;
  emoji: string;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}

export default function FloatingElements() {
  const [elements, setElements] = useState<FloatingElement[]>([]);

  useEffect(() => {
    const signupEmojis = ['📚', '✏️', '🎒', '🌟', '🎯', '💡', '🏆', '📖', '🎨', '🔬'];
    
    const newElements = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: signupEmojis[Math.floor(Math.random() * signupEmojis.length)],
      size: Math.random() * 20 + 15,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }));

    setElements(newElements);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((element) => (
        <div
          key={element.id}
          className="absolute animate-float"
          style={{
            fontSize: `${element.size}px`,
            left: `${element.x}%`,
            top: `${element.y}%`,
            animationDuration: `${element.duration}s`,
            animationDelay: `${element.delay}s`,
          }}
        >
          {element.emoji}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float infinite ease-in-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
