"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import StatsCard from "@/components/admin/stats/StatsCard";
import LineChart from "@/components/admin/charts/LineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminReports } from "@/hooks/admin/use-admin-reports";
import { Users, MessageSquare, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/admin/format-date";
import { exportToCSV, generateFilename } from "@/lib/admin/export-csv";
import { Download } from "lucide-react";

/**
 * Component ReportsPage - Trang báo cáo cho admin
 * Hiển thị overview stats, charts, và export reports
 */
export default function ReportsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [orgId, setOrgId] = useState("");

  // Fetch reports data
  const { overview, usage, growth, isLoading, refresh } = useAdminReports({
    orgId: orgId || undefined,
  });

  // Prepare chart data
  const growthChartData = {
    labels: growth.map((item) => formatDate(item.date, "short")),
    datasets: [
      {
        label: "Người dùng mới",
        data: growth.map((item) => item.count),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
      },
    ],
  };

  // Handle export
  const handleExportOverview = () => {
    if (!overview) return;

    const data = [
      {
        users: overview.users,
        announcements: overview.announcements,
        comments: overview.comments,
        pending: overview.pending,
      },
    ];

    exportToCSV(data, generateFilename("reports-overview", "csv"), {
      users: "Tổng người dùng",
      announcements: "Thông báo",
      comments: "Bình luận",
      pending: "Chờ duyệt",
    });
  };

  const handleExportGrowth = () => {
    if (!growth || growth.length === 0) return;

    const data = growth.map((item) => ({
      "Ngày": item.date,
      "Số lượng": item.count,
    }));

    exportToCSV(data, generateFilename("reports-growth", "csv"));
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Báo cáo" />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Lọc báo cáo theo tổ chức (tùy chọn)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Organization ID (tùy chọn)"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
            </div>
            <Button onClick={refresh} variant="outline">
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tổng quan</h2>
          <Button
            variant="outline"
            onClick={handleExportOverview}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Người dùng"
            value={overview?.users || 0}
            icon={<Users className="h-5 w-5" />}
            color="primary"
          />
          <StatsCard
            title="Thông báo"
            value={overview?.announcements || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            color="info"
          />
          <StatsCard
            title="Bình luận"
            value={overview?.comments || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            color="success"
          />
          <StatsCard
            title="Chờ duyệt"
            value={overview?.pending || 0}
            icon={<AlertCircle className="h-5 w-5" />}
            color="warning"
          />
        </div>
      </div>

      {/* Growth Chart */}
      {growth && growth.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tăng trưởng (30 ngày qua)</CardTitle>
                <CardDescription>
                  Số lượng người dùng mới theo ngày
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleExportGrowth}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart data={growthChartData} height={300} />
          </CardContent>
        </Card>
      )}

      {/* Usage Stats */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động (7 ngày qua)</CardTitle>
            <CardDescription>
              Thống kê thông báo và bình luận
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Thông báo: {usage.anns?.length || 0} nhóm
                </p>
                {usage.anns && usage.anns.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Tổng: {usage.anns.reduce((acc, item) => acc + (item._count?.createdAt || 0), 0)} thông báo
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Bình luận: {usage.cmts?.length || 0} nhóm
                </p>
                {usage.cmts && usage.cmts.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Tổng: {usage.cmts.reduce((acc, item) => acc + (item._count?.createdAt || 0), 0)} bình luận
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          Đang tải dữ liệu...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !overview && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Không có dữ liệu để hiển thị
          </CardContent>
        </Card>
      )}
    </AnimatedSection>
  );
}
