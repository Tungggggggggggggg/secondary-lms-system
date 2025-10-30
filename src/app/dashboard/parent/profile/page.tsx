"use client";

import { useSession } from "next-auth/react";
import ParentProfileForm from "@/components/parent/ParentProfileForm";

export default function ParentProfilePage() {
  const { data: session } = useSession();

  const initial = (() => {
    const fullname = (session?.user as any)?.fullname || session?.user?.name || "";
    return fullname.charAt(0).toUpperCase() || "P";
  })();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Hồ sơ phụ huynh</h1>
        <p className="text-gray-600 mt-1">Cập nhật thông tin cá nhân và bảo mật tài khoản</p>
      </div>

      {/* User Avatar Card - unified like student */}
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-4xl text-white font-bold">
            {initial}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {(session?.user as any)?.fullname || session?.user?.name || "Phụ huynh"}
            </h2>
            <p className="text-gray-600 mt-1">{session?.user?.email} • Phụ huynh</p>
          </div>
        </div>
      </div>

      <ParentProfileForm />
    </div>
  );
}


