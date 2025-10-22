'use client';
import { useEffect } from 'react';
// TODO: Replace the below utility with a working implementation or fix module resolution if this import fails
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

interface NotificationProps {
  type: 'success' | 'info' | 'error';
  message: string;
  onClose: () => void;
}

export default function Notification({ type, message, onClose }: NotificationProps) {
  const colors = {
    success: 'bg-green-600',
    info: 'bg-blue-600',
    error: 'bg-red-600',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed top-6 right-6 text-white px-5 py-3 rounded-xl shadow-lg font-semibold animate-slideIn z-[10050]',
        colors[type]
      )}
    >
      {message}
    </div>
  );
}
