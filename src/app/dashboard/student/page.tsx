'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function StudentDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/student/dashboard');
  }, [router]);

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
        <div className="bg-white p-10 rounded-lg shadow-xl text-center">
          <p className="text-lg text-gray-700">Đang chuyển hướng...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}