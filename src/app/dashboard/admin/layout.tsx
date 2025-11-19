import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMainContainer from "@/components/admin/AdminMainContainer";
import { prisma } from "@/lib/prisma";

/**
 * Layout component cho Admin Dashboard
 * Bao gồm sidebar navigation, header, và main content area
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  
  // Kiểm tra quyền truy cập
  if (!role || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    redirect("/auth/login");
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      {/* Sidebar Navigation */}
      <AdminSidebar
        userRole={role}
        userEmail={userEmail}
        userFullname={userFullname}
      />

      {/* Main Content */}
      <AdminMainContainer>
        {children}
      </AdminMainContainer>
    </div>
  );
}


