'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSession } from 'next-auth/react';

export default function TeacherDashboardPage() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
        <div className="bg-white p-10 rounded-lg shadow-xl text-center">
          <h1 className="text-4xl font-bold text-green-700 mb-4">Chào mừng Giáo viên! 👨‍🏫</h1>
          <p className="text-lg text-gray-700">Đây là trang quản lý dành cho giáo viên.</p>
          {session?.user?.fullname && (
            <p className="mt-4 text-md text-gray-600">Xin chào, {session.user.fullname}!</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}