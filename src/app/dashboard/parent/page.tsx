'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ParentDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/parent/dashboard');
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={['parent']}>
      <div className="min-h-screen bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
        <div className="bg-white p-10 rounded-lg shadow-xl text-center">
          <p className="text-lg text-gray-700">Đang chuyển hướng...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
