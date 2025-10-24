'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSession } from 'next-auth/react';

export default function ParentDashboardPage() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute allowedRoles={['parent']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
        <div className="bg-white p-10 rounded-lg shadow-xl text-center">
          <h1 className="text-4xl font-bold text-purple-700 mb-4">Chào mừng Phụ huynh! 👨‍👩‍👧</h1>
          <p className="text-lg text-gray-700">Đây là trang theo dõi dành cho phụ huynh.</p>
          {session?.user?.fullname && (
            <p className="mt-4 text-md text-gray-600">Xin chào, {session.user.fullname}!</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}