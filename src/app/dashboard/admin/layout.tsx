import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMainContainer from "@/components/admin/AdminMainContainer";
import { prisma } from "@/lib/prisma";
import { isStaffRole, isSuperAdminRole } from "@/lib/rbac";

/**
 * Layout component cho Admin Dashboard
 * Bao gồm sidebar navigation, header, và main content area
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  
  // Kiểm tra quyền truy cập
  if (!role || (!isStaffRole(role) && !isSuperAdminRole(role))) {
    redirect("/auth/login");
  }

  // Gate: tài khoản bị khoá (SystemSetting: disabled_users)
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "disabled_users" } });
    const ids = Array.isArray(row?.value) ? (row!.value as any) : [];
    if (userId && Array.isArray(ids) && ids.includes(userId)) {
      return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
          <AdminSidebar userRole={role || ''} userEmail={session?.user?.email || ''} userFullname={(session?.user as any)?.fullname || session?.user?.name || ''} />
          <AdminMainContainer>
            <div className="max-w-2xl mx-auto bg-white border rounded-xl p-6">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Tài khoản đã bị khoá</h1>
              <p className="text-sm text-gray-600 mb-4">Vui lòng liên hệ quản trị viên để được hỗ trợ mở khoá.</p>
            </div>
          </AdminMainContainer>
        </div>
      );
    }
  } catch (e) {
    console.error("[AdminLayout] disabled gate error", e);
  }

  // Lấy thông tin user đầy đủ từ database
  let userEmail = session?.user?.email || "";
  let userFullname = (session?.user as any)?.fullname || session?.user?.name || "";

  if (userEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
          email: true,
          fullname: true,
        },
      });
      if (user) {
        userEmail = user.email;
        userFullname = user.fullname;
      }
    } catch (error) {
      console.error("[AdminLayout] Error fetching user:", error);
    }
  }

  // Gate: ADMIN phải thuộc ít nhất 1 tổ chức
  if (isStaffRole(role)) {
    try {
      const membershipCount = await prisma.organizationMember.count({ where: { userId: (session?.user as any)?.id } });
      if (membershipCount === 0) {
        return (
          <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
            <AdminSidebar userRole={role} userEmail={userEmail} userFullname={userFullname} />
            <AdminMainContainer>
              <div className="max-w-2xl mx-auto bg-white border rounded-xl p-6">
                <h1 className="text-xl font-semibold text-gray-900 mb-2">Bạn chưa thuộc tổ chức nào</h1>
                <p className="text-sm text-gray-600 mb-4">Liên hệ SUPER_ADMIN để được thêm vào một tổ chức hoặc chấp nhận lời mời.</p>
                <p className="text-xs text-gray-400">Mẹo: Khi đã được thêm, hãy dùng bộ chọn Tổ chức ở góc phải trên để chuyển ngữ cảnh làm việc.</p>
              </div>
            </AdminMainContainer>
          </div>
        );
      }
    } catch (e) {
      console.error("[AdminLayout] membership gate error", e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      <AdminSidebar userRole={role} userEmail={userEmail} userFullname={userFullname} />
      <AdminMainContainer>
        {children}
      </AdminMainContainer>
    </div>
  );
}


