'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/student/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12 text-slate-600">
      <p>Đang chuyển hướng...</p>
    </div>
  );
}