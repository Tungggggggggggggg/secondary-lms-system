import React from 'react';
import Image from 'next/image';
import ResetPassword from '@/components/auth/reset-password/ResetPassword';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative bg-gradient-to-b from-violet-50 via-pink-50 to-violet-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/background-pattern.png')] opacity-5" />
      </div>

      {/* Logo */}
      <Image
        src="/logo.svg"
        alt="Logo"
        width={48}
        height={48}
        className="w-auto mb-8 relative z-10"
      />

      {/* Reset Password Form */}
      <ResetPassword />
    </div>
  );
}
