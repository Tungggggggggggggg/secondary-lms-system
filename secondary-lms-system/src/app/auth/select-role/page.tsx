import React from 'react';
import { Metadata } from 'next';
import RoleSelector from '@/components/auth/select-role/RoleSelector';

export const metadata: Metadata = {
  title: 'Chọn vai trò - LMS Học Sinh',
  description: 'Chọn vai trò của bạn trong hệ thống để có trải nghiệm phù hợp nhất',
};

export default function SelectRolePage() {
  return (
    <>
      <RoleSelector />
    </>
  );
}
