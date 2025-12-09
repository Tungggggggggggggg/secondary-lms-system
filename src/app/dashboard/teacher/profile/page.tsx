"use client";

import ProfileForm from "@/components/teacher/profile/ProfileForm";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/shared";


export default function ProfilePage() {
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Hồ sơ", href: "/dashboard/teacher/profile" },
  ];
  return (
    <div className="px-6 py-4 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-1" />
      <PageHeader
        title="Hồ sơ giáo viên"
        subtitle="Cập nhật thông tin cá nhân và bảo mật tài khoản"
        role="teacher"
      />

      {/* Profile Form */}
      <div className="mb-8">
        <ProfileForm />
      </div>
    </div>
  );
}
