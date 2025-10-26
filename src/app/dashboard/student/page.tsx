'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSession } from 'next-auth/react';

export default function StudentDashboardPage() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
        <div className="bg-white p-10 rounded-lg shadow-xl text-center">
          <h1 className="text-4xl font-bold text-blue-700 mb-4">Chào mừng Học sinh! 👨‍🎓</h1>
          <p className="text-lg text-gray-700">Đây là trang học tập dành cho học sinh.</p>
          {session?.user?.fullname && (
            <p className="mt-4 text-md text-gray-600">Xin chào, {session.user.fullname}!</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}