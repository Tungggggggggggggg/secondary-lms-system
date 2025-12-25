"use client";

import { useSession } from "next-auth/react";
import HeaderParent from "@/components/parent/ParentHeader";
import ParentProfileForm from "@/components/parent/ParentProfileForm";

export default function ParentProfilePage() {
  const { data: session } = useSession();

  const initial = (() => {
    const fullname = (session?.user as any)?.fullname || session?.user?.name || "";
    return fullname.charAt(0).toUpperCase() || "P";
  })();

  return (
    <>
      <HeaderParent
        title="Hồ sơ phụ huynh"
        subtitle="Cập nhật thông tin cá nhân và bảo mật tài khoản"
      />

      {/* User Avatar Card */}
      <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-100 rounded-2xl p-6 hover:border-amber-200 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl text-white font-bold group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
            {initial}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 group-hover:text-amber-800 transition-colors duration-300">
              {(session?.user as any)?.fullname || session?.user?.name || "Phụ huynh"}
            </h2>
            <p className="text-amber-700 mt-1 font-medium">{session?.user?.email} • Phụ huynh</p>
          </div>
        </div>
      </div>

      <ParentProfileForm />
    </>
  );
}




