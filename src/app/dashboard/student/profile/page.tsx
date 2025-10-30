// src/app/dashboard/student/profile/page.tsx
"use client";

import { useSession } from "next-auth/react";
import StudentProfileForm from "@/components/student/StudentProfileForm";

export default function StudentProfilePage() {
  const { data: session } = useSession();

  // Get user's first letter for avatar
  const getUserInitial = () => {
    if (session?.user) {
      const fullname = (session.user as any)?.fullname || session.user?.name || "";
      return fullname.charAt(0).toUpperCase() || "HS";
    }
    return "HS";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Hồ sơ học sinh</h1>
        <p className="text-gray-600 mt-1">Cập nhật thông tin cá nhân và bảo mật tài khoản</p>
      </div>

      {/* User Avatar Card */}
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-4xl text-white font-bold">
            {getUserInitial()}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {(session?.user as any)?.fullname || session?.user?.name || "Học sinh"}
            </h2>
            <p className="text-gray-600 mt-1">
              {session?.user?.email} • Học sinh
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <StudentProfileForm />
    </div>
  );
}


