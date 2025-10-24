'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Đảm bảo đường dẫn đúng

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Các vai trò được phép truy cập
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Đang tải session, chờ đợi

    if (!session) {
      // Chưa đăng nhập, chuyển hướng đến trang đăng nhập
      router.push('/auth/login');
    } else if (allowedRoles && session.user?.role && !allowedRoles.includes(session.user.role)) {
      // Đã đăng nhập nhưng không có vai trò được phép, chuyển hướng về trang chủ hoặc trang lỗi
      router.push('/'); // Hoặc một trang lỗi truy cập
    }
  }, [session, status, router, allowedRoles]);

  if (status === 'loading' || !session || (allowedRoles && session.user?.role && !allowedRoles.includes(session.user.role))) {
    // Hiển thị spinner trong khi tải hoặc nếu không có quyền truy cập
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <LoadingSpinner />
        <p className="ml-3 text-gray-600">Đang tải...</p>
      </div>
    );
  }

  return <>{children}</>;
}
