'use client';

import React from 'react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EmailStepProps {
  onSubmit: (email: string) => Promise<void>;
  isLoading: boolean;
}

export default function EmailStep({ onSubmit, isLoading }: EmailStepProps) {
  const [email, setEmail] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email);
  };

  return (
    <>
      <div className="logo-section text-center mb-8">
        <div 
          className="text-6xl mb-4 inline-block animate-float" 
          role="img" 
          aria-label="Biểu tượng quên mật khẩu"
        >
          🤔
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent mb-3">
          Quên mật khẩu?
        </h1>
        <p className="text-sm text-gray-600 max-w-[360px] mx-auto">
          Đừng lo! Chúng tôi sẽ giúp bạn lấy lại quyền truy cập vào tài khoản
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
            Địa chỉ Email
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl" aria-hidden>
              📧
            </span>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email đã đăng ký"
              className="pl-12 h-12"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gradient-to-r from-violet-400 to-violet-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              Đang gửi mã...
            </span>
          ) : (
            'Gửi mã xác nhận 📨'
          )}
        </Button>
      </form>

      <div className="text-center mt-6">
        <Link
          href="/auth/login"
          className="text-violet-400 hover:text-violet-600 font-semibold text-sm"
        >
          ← Quay lại đăng nhập
        </Link>
      </div>
    </>
  );
}