// src/app/dashboard/student/profile/page.tsx
"use client";

import { useSession } from "next-auth/react";
import StudentProfileForm from "@/components/student/StudentProfileForm";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/shared";

export default function StudentProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as unknown as { fullname?: string; name?: string; email?: string } | undefined;
  const displayName = user?.fullname || user?.name || "Học sinh";

  // Get user's first letter for avatar
  const getUserInitial = () => {
    const fullname = user?.fullname || user?.name || "";
    return fullname.charAt(0).toUpperCase() || "HS";
  };

  return (
    <div className="space-y-6">
      {(() => {
        const breadcrumbItems: BreadcrumbItem[] = [
          { label: "Dashboard", href: "/dashboard/student/dashboard" },
          { label: "Hồ sơ", href: "/dashboard/student/profile" },
        ];
        return (
          <>
            <Breadcrumb items={breadcrumbItems} color="green" />
            <PageHeader
              role="student"
              title="Hồ sơ học sinh"
              subtitle="Cập nhật thông tin cá nhân và bảo mật tài khoản"
            />
          </>
        );
      })()}

      {/* User Avatar Card */}
      <div className="bg-card/90 rounded-3xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-6">
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-4xl text-white font-bold"
            role="img"
            aria-label={`Avatar của ${displayName}`}
          >
            {getUserInitial()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {displayName}
            </h2>
            <p className="text-muted-foreground mt-1">
              {user?.email} • Học sinh
            </p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <StudentProfileForm />
    </div>
  );
}


