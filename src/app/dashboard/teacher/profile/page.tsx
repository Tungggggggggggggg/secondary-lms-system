"use client";

import ProfileForm from "@/components/teacher/profile/ProfileForm";
import ProfileStats from "@/components/teacher/profile/ProfileStats";

export default function ProfilePage() {
  return (
    <div className="p-6 space-y-6">
    {/* Header */}
    <div>
      <h1 className="text-3xl font-bold">Hồ sơ giáo viên</h1>
      <p className="text-gray-600 mt-1">Cập nhật thông tin cá nhân và bảo mật tài khoản</p>
    </div>
    
      {/* Profile Form */}
      <div className="mb-8">
        <ProfileForm />
      </div>

      {/* Statistics & Achievements */}
      <ProfileStats />

      
    </div>
  );
}
