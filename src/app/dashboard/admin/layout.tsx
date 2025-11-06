import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!role || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    redirect("/auth/login");
  }

  const isSuperAdmin = role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-white p-4 space-y-2">
        <div className="font-semibold text-gray-700 mb-2">Admin</div>
        {isSuperAdmin ? (
          <nav className="flex flex-col gap-2">
            <Link className="text-sm hover:underline" href="/dashboard/admin/system">System</Link>
            <Link className="text-sm hover:underline" href="/dashboard/admin/users">Users</Link>
            <Link className="text-sm hover:underline" href="/dashboard/admin/audit">Audit</Link>
          </nav>
        ) : (
          <nav className="flex flex-col gap-2">
            <Link className="text-sm hover:underline" href="/dashboard/admin/overview">Overview</Link>
            <Link className="text-sm hover:underline" href="/dashboard/admin/org/members">Members</Link>
          </nav>
        )}
      </aside>
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}


