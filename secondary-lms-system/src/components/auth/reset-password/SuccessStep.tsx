'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SuccessStep() {
  return (
    <>
      <div className="success-animation text-center py-8">
        <div className="text-7xl mb-4 animate-bounce">✅</div>
        <div className="text-lg font-semibold text-green-600 mb-2">
          Mật khẩu đã được đặt lại!
        </div>
      </div>

      <div className="text-center mb-8">
        <p className="text-gray-600">
          Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ
        </p>
      </div>

      <Button
        asChild
        className="w-full h-12 bg-gradient-to-r from-violet-400 to-violet-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
      >
        <Link href="/auth/login">
          Đăng nhập ngay 🚀
        </Link>
      </Button>

      <div className="text-center mt-6">
        <Link
          href="/"
          className="text-violet-400 hover:text-violet-600 font-semibold text-sm"
        >
          ← Về trang chủ
        </Link>
      </div>
    </>
  );
}