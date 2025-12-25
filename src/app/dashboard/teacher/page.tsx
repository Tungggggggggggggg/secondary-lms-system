'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/teacher/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <p>Đang chuyển hướng...</p>
    </div>
  );
}