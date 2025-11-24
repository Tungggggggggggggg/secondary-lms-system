"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import StatsCard from "@/components/admin/stats/StatsCard";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import { Users, BookOpen, FileText, GraduationCap, Building2, MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/admin/format-date";
import { formatNumber } from "@/lib/admin/format-number";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Component AdminOverviewPage - Trang tổng quan admin dashboard
 * Hiển thị stats cards, recent activity, và quick actions
 */
export default function AdminOverviewPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Fetch stats dựa vào role
  const statsUrl = isSuperAdmin
    ? "/api/admin/system/stats"
    : "/api/admin/reports/overview";
  
  const { data: statsData, isLoading: statsLoading } = useSWR(statsUrl, fetcher);

  // Fetch recent activity
  const { data: recentUsers } = useSWR(
    isSuperAdmin ? "/api/admin/system/users?limit=5" : null,
    fetcher
  );

  const { data: recentOrgs } = useSWR(
    isSuperAdmin ? "/api/admin/org?limit=5" : null,
    fetcher
  );

  // Stats từ API
  const stats = statsData?.data || statsData?.stats || {};

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader
        userRole={role || ""}
        title="Tổng quan"
      />

      {/* Stats Cards */}
      {isSuperAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Tổng người dùng"
            value={stats.totalUsers || 0}
            icon={<Users className="h-5 w-5" />}
            color="primary"
            description={stats.newUsersLast30Days
              ? `${stats.newUsersLast30Days} người dùng mới trong 30 ngày qua`
              : undefined}
          />
          <StatsCard
            title="Lớp học"
            value={stats.totalClassrooms || 0}
            icon={<GraduationCap className="h-5 w-5" />}
            color="success"
          />
          <StatsCard
            title="Khóa học"
            value={stats.totalCourses || 0}
            icon={<BookOpen className="h-5 w-5" />}
            color="warning"
          />
          <StatsCard
            title="Bài tập"
            value={stats.totalAssignments || 0}
            icon={<FileText className="h-5 w-5" />}
            color="default"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Thành viên tổ chức"
            value={stats.users || 0}
            icon={<Users className="h-5 w-5" />}
            color="primary"
          />
          <StatsCard
            title="Thông báo"
            value={stats.announcements || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            color="info"
          />
          <StatsCard
            title="Bình luận"
            value={stats.comments || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            color="success"
          />
          <StatsCard
            title="Chờ duyệt"
            value={stats.pending || 0}
            icon={<AlertCircle className="h-5 w-5" />}
            color="warning"
          />
        </div>
      )}

      {/* Additional Stats for SUPER_ADMIN */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Tổ chức"
            value={stats.totalOrganizations || 0}
            icon={<Building2 className="h-5 w-5" />}
            color="primary"
          />
          <StatsCard
            title="Thông báo"
            value={stats.totalAnnouncements || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            color="info"
          />
          <StatsCard
            title="Bình luận"
            value={stats.totalComments || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            color="default"
          />
          <StatsCard
            title="Bài nộp"
            value={stats.totalSubmissions || 0}
            icon={<FileText className="h-5 w-5" />}
            color="success"
          />
        </div>
      )}

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users (SUPER_ADMIN only) */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Người dùng gần đây</CardTitle>
              <CardDescription>
                Danh sách 5 người dùng mới nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-sm text-gray-500">Đang tải...</div>
              ) : recentUsers?.items?.length > 0 ? (
                <div className="space-y-3">
                  {recentUsers.items.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.fullname}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(user.createdAt, "short")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Không có người dùng nào
                </div>
              )}
              <Link
                href="/dashboard/admin/users"
                className="mt-4 inline-block text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                Xem tất cả 
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Recent Organizations (SUPER_ADMIN only) */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Tổ chức gần đây</CardTitle>
              <CardDescription>
                Danh sách 5 tổ chức mới nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-sm text-gray-500">Đang tải...</div>
              ) : recentOrgs?.data?.items?.length > 0 ? (
                <div className="space-y-3">
                  {recentOrgs.data.items.map((org: any) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {org.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {org.status || "ACTIVE"}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(org.createdAt, "short")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Không có tổ chức nào
                </div>
              )}
              <Link
                href="/dashboard/admin/org"
                className="mt-4 inline-block text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                Xem tất cả 
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>
              Các thao tác thường dùng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isSuperAdmin ? (
                <>
                  <Link
                    href="/dashboard/admin/users"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Quản lý người dùng</p>
                    <p className="text-sm text-gray-500">
                      Xem, thêm, sửa người dùng
                    </p>
                  </Link>
                  <Link
                    href="/dashboard/admin/audit"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Xem audit logs</p>
                    <p className="text-sm text-gray-500">
                      Xem nhật ký hoạt động hệ thống
                    </p>
                  </Link>
                  <Link
                    href="/dashboard/admin/system/settings"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Cài đặt hệ thống</p>
                    <p className="text-sm text-gray-500">
                      Cấu hình hệ thống
                    </p>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/admin/moderation"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Kiểm duyệt nội dung</p>
                    <p className="text-sm text-gray-500">
                      Duyệt thông báo và bình luận
                    </p>
                  </Link>
                  <Link
                    href="/dashboard/admin/reports"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Xem báo cáo</p>
                    <p className="text-sm text-gray-500">
                      Xem thống kê và báo cáo
                    </p>
                  </Link>
                  <Link
                    href="/dashboard/admin/org/settings"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">Cài đặt tổ chức</p>
                    <p className="text-sm text-gray-500">
                      Branding, policy duyệt nội dung, cấu hình tổ chức
                    </p>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AnimatedSection>
  );
}
