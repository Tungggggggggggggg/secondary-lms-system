"use client";

import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import StatsCard from "@/components/admin/stats/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, Users, BookOpen, FileText, Database, HardDrive, Settings } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Component AdminSystemPage - Trang system overview cho SUPER_ADMIN
 */
export default function AdminSystemPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  // Fetch system stats
  const { data: statsData, error, isLoading } = useSWR("/api/admin/system/stats", fetcher);

  // Extract stats from API response
  const stats = statsData?.success ? (statsData?.data || {}) : {};

  // Loading state
  if (isLoading) {
    return (
      <AnimatedSection className="space-y-6">
        <AdminHeader userRole={role || ""} title="Hệ thống" />
        <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
      </AnimatedSection>
    );
  }

  // Error state
  if (error) {
    return (
      <AnimatedSection className="space-y-6">
        <AdminHeader userRole={role || ""} title="Hệ thống" />
        <div className="text-center py-8 text-red-600">
          Lỗi tải dữ liệu: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Hệ thống" />

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tổng người dùng"
          value={stats.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
          color="primary"
        />
        <StatsCard
          title="Lớp học"
          value={stats.totalClassrooms || 0}
          icon={<BookOpen className="h-5 w-5" />}
          color="success"
        />
        <StatsCard
          title="Khóa học"
          value={stats.totalCourses || 0}
          icon={<BookOpen className="h-5 w-5" />}
          color="warning"
        />
        <StatsCard
          title="Tổ chức"
          value={stats.totalOrganizations || 0}
          icon={<Server className="h-5 w-5" />}
          color="info"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Bài tập"
          value={stats.totalAssignments || 0}
          icon={<FileText className="h-5 w-5" />}
          color="default"
        />
        <StatsCard
          title="Bài nộp"
          value={stats.totalSubmissions || 0}
          icon={<FileText className="h-5 w-5" />}
          color="success"
        />
        <StatsCard
          title="Thông báo"
          value={stats.totalAnnouncements || 0}
          icon={<FileText className="h-5 w-5" />}
          color="info"
        />
        <StatsCard
          title="Bình luận"
          value={stats.totalComments || 0}
          icon={<FileText className="h-5 w-5" />}
          color="default"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/dashboard/admin/system/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cài đặt hệ thống
              </CardTitle>
              <CardDescription>
                Quản lý cài đặt và cấu hình hệ thống
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quản lý người dùng
              </CardTitle>
              <CardDescription>
                Xem và quản lý tất cả người dùng trong hệ thống
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/audit">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <CardDescription>
                Xem nhật ký hoạt động và audit logs
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái hệ thống</CardTitle>
          <CardDescription>
            Thông tin về trạng thái và sức khỏe hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Database</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Storage</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Normal
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">API Status</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Healthy
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}
