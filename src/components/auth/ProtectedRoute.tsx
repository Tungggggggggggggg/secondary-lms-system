'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from "@/components/shared"; // Đảm bảo đường dẫn đúng

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Các vai trò được phép truy cập
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const normalizedAllowedRoles = (allowedRoles || []).map((r) => r.toString().toUpperCase());
  const sessionRole = session?.user?.role ? session.user.role.toString().toUpperCase() : null;
  const isAuthenticated = status === 'authenticated';
  const isUnauthorized =
    isAuthenticated &&
    normalizedAllowedRoles.length > 0 &&
    !!sessionRole &&
    !normalizedAllowedRoles.includes(sessionRole);

  useEffect(() => {
    if (status === 'loading') return; // Đang tải session, chờ đợi

    if (!session) {
      // Chưa đăng nhập, chuyển hướng đến trang đăng nhập
      router.replace('/auth/login');
      return;
    }

    if (isUnauthorized) {
      const fallback = '/dashboard';
      const map: Record<string, string> = {
        ADMIN: '/dashboard/admin/dashboard',
        TEACHER: '/dashboard/teacher/dashboard',
        STUDENT: '/dashboard/student/dashboard',
        PARENT: '/dashboard/parent/dashboard',
      };
      const target = (sessionRole && map[sessionRole]) ? map[sessionRole] : fallback;
      router.replace(target);
    }
  }, [session, status, router, isUnauthorized, sessionRole]);

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <LoadingSpinner />
        <p className="ml-3 text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-700 font-medium">Bạn không có quyền truy cập trang này.</p>
          <p className="text-gray-600 text-sm">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
