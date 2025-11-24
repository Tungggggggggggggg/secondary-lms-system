"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import StatsCard from "@/components/admin/stats/StatsCard";
import LineChart from "@/components/admin/charts/LineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminReports } from "@/hooks/admin/use-admin-reports";
import { Users, MessageSquare, AlertCircle, EyeOff, Lock, Trash2 } from "lucide-react";
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
  const sessionOrgId = (session as any)?.orgId as string | undefined;
  const [orgId, setOrgId] = useState("");

  // Fetch reports data
  const { overview, usage, growth, isLoading, refresh } = useAdminReports({
    orgId: orgId || undefined,
  });

  // Đồng bộ orgId mặc định từ session nếu chưa chọn
  useEffect(() => {
    if (!orgId && sessionOrgId) setOrgId(sessionOrgId);
  }, [sessionOrgId]);

  // Sync orgId with OrgSwitcher context
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/org/context");
        const data = await res.json();
        if (mounted) setOrgId(data?.orgId || "");
      } catch {}
    };
    load();
    const handler = () => load();
    window.addEventListener("org-context-changed", handler as any);
    return () => {
      mounted = false;
      window.removeEventListener("org-context-changed", handler as any);
    };
  }, []);

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
        hiddenComments: overview.hiddenComments ?? 0,
        lockedAnnouncements: overview.lockedAnnouncements ?? 0,
        deletedComments: overview.deletedComments ?? 0,
      },
    ];

    exportToCSV(data, generateFilename("reports-overview", "csv"), {
      users: "Tổng người dùng",
      announcements: "Thông báo",
      comments: "Bình luận",
      pending: "Chờ duyệt",
      hiddenComments: "Bình luận bị ẩn",
      lockedAnnouncements: "Bài đăng khóa bình luận",
      deletedComments: "Bình luận bị xóa",
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
            Lọc báo cáo theo Trường/Đơn vị (sử dụng Org Switcher ở góc phải)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Trường/Đơn vị (đặt trong Header)"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled
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
          <StatsCard
            title="Bình luận bị ẩn"
            value={overview?.hiddenComments || 0}
            icon={<EyeOff className="h-5 w-5" />}
            color="danger"
          />
          <StatsCard
            title="Bài đăng khóa bình luận"
            value={overview?.lockedAnnouncements || 0}
            icon={<Lock className="h-5 w-5" />}
            color="warning"
          />
          <StatsCard
            title="Bình luận bị xóa"
            value={overview?.deletedComments || 0}
            icon={<Trash2 className="h-5 w-5" />}
            color="danger"
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
      {usage && (() => {
        const dateSet = new Set<string>();
        usage.anns?.forEach((i) => dateSet.add(i.date));
        usage.cmts?.forEach((i) => dateSet.add(i.date));
        const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
        const labels = dates.map((d) => formatDate(d, "short"));
        const annsMap = new Map(usage.anns?.map((i) => [i.date, i.count]) || []);
        const cmtsMap = new Map(usage.cmts?.map((i) => [i.date, i.count]) || []);
        const usageChartData = {
          labels,
          datasets: [
            {
              label: "Thông báo",
              data: dates.map((d) => annsMap.get(d) || 0),
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
            },
            {
              label: "Bình luận",
              data: dates.map((d) => cmtsMap.get(d) || 0),
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
            },
          ],
        };
        const totalAnns = usage.anns?.reduce((acc, item) => acc + (item.count || 0), 0) || 0;
        const totalCmts = usage.cmts?.reduce((acc, item) => acc + (item.count || 0), 0) || 0;
        return (
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động (7 ngày qua)</CardTitle>
              <CardDescription>
                Thống kê thông báo và bình luận theo ngày
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <LineChart data={usageChartData} height={300} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>Thông báo (tổng): <span className="font-medium">{totalAnns}</span></div>
                  <div>Bình luận (tổng): <span className="font-medium">{totalCmts}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
