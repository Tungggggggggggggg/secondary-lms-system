'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard/teacher/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="text-6xl mb-4">🎓</div>
        <p className="text-gray-600">Đang chuyển đến Dashboard...</p>
      </div>
    </div>
  );
}