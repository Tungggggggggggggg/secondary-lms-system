"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import DataTable from "@/components/admin/data-table/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuditLogs } from "@/hooks/admin/use-admin-audit-logs";
import { formatDate, formatDateToISO, getDateRangeOptions } from "@/lib/admin/format-date";
import { AuditLog, TableColumn, TableSort } from "@/types/admin";
import { Download, Filter, X, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/**
 * Component AdminAuditPage - Trang xem audit logs
 * Hỗ trợ advanced filters, data table, export CSV, detail view
 */
export default function AdminAuditPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const [orgId, setOrgId] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [sort, setSort] = useState<TableSort<AuditLog> | null>(null);

  // Hook
  const {
    logs,
    total,
    isLoading,
    filters,
    setFilters,
    resetFilters,
    refresh,
  } = useAdminAuditLogs({
    orgId: orgId || undefined,
    actorId: actorId || undefined,
    action: action || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: 50,
  });

  // Apply filters automatically when they change
  useEffect(() => {
    setFilters({
      orgId: orgId || undefined,
      actorId: actorId || undefined,
      action: action || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [orgId, actorId, action, startDate, endDate, setFilters]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setOrgId("");
    setActorId("");
    setAction("");
    setStartDate("");
    setEndDate("");
    resetFilters();
  }, [resetFilters]);

  // Date range options
  const dateRangeOptions = getDateRangeOptions();

  // Handle date range selection
  const handleDateRangeSelect = (value: string) => {
    const option = dateRangeOptions.find((opt) => opt.value === value);
    if (option) {
      setStartDate(formatDateToISO(option.startDate) || "");
      setEndDate(formatDateToISO(option.endDate) || "");
    }
  };

  // Table columns
  const columns: TableColumn<AuditLog>[] = [
    {
      key: "createdAt",
      label: "Thời gian",
      sortable: true,
      render: (value) => formatDate(value as string, "medium"),
    },
    {
      key: "action",
      label: "Hành động",
      sortable: true,
    },
    {
      key: "actorId",
      label: "Actor ID",
      sortable: true,
    },
    {
      key: "entityType",
      label: "Loại Entity",
      sortable: true,
    },
    {
      key: "entityId",
      label: "Entity ID",
      sortable: true,
      render: (value, row) => (
        <span className="font-mono text-xs">{String(value || "-")}</span>
      ),
    },
    {
      key: "organizationId",
      label: "Organization ID",
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs">{String(value || "-")}</span>
      ),
    },
  ];

  // Export CSV
  const handleExportCSV = () => {
    const csvData = logs.map((log) => ({
      "Thời gian": formatDate(log.createdAt, "full"),
      "Hành động": log.action,
      "Actor ID": log.actorId,
      "Actor Role": log.actorRole || "-",
      "Entity Type": log.entityType,
      "Entity ID": log.entityId,
      "Organization ID": log.organizationId || "-",
      "IP": log.ip || "-",
      "User Agent": log.userAgent || "-",
    }));

    import("@/lib/admin/export-csv").then(({ exportToCSV, generateFilename }) => {
      exportToCSV(csvData, generateFilename("audit-logs", "csv"));
    });
  };

  // Render actions
  const renderActions = (log: AuditLog) => {
    return (
      <Button
        variant="ghost"
        size="default"
        onClick={() => {
          setSelectedLog(log);
          setIsDetailOpen(true);
        }}
        className="h-8 w-8 p-0"
        title="Xem chi tiết"
      >
        <Eye className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Audit Logs" />

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bộ lọc</CardTitle>
              <CardDescription>
                Lọc audit logs theo các tiêu chí
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Xóa bộ lọc
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Organization ID
              </label>
              <Input
                type="text"
                placeholder="Organization ID"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Actor ID
              </label>
              <Input
                type="text"
                placeholder="Actor ID"
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Action
              </label>
              <Input
                type="text"
                placeholder="Action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Từ ngày
              </label>
              <Input
                type="date"
                value={startDate.split("T")[0]}
                onChange={(e) => {
                  const date = e.target.value;
                  setStartDate(date ? `${date}T00:00:00.000Z` : "");
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Đến ngày
              </label>
              <Input
                type="date"
                value={endDate.split("T")[0]}
                onChange={(e) => {
                  const date = e.target.value;
                  setEndDate(date ? `${date}T23:59:59.999Z` : "");
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Khoảng thời gian nhanh
              </label>
              <select
                className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                onChange={(e) => handleDateRangeSelect(e.target.value)}
                defaultValue=""
              >
                <option value="">Chọn khoảng thời gian</option>
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={refresh} variant="outline">
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable<AuditLog>
        data={logs}
        columns={columns}
        sort={sort || undefined}
        onSortChange={setSort}
        currentPage={1}
        onPageChange={() => {}}
        pageSize={50}
        total={total}
        loading={isLoading}
        actions={renderActions}
        getRowId={(row) => row.id}
        exportable={false}
        emptyMessage="Không có audit logs"
      />

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết Audit Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Thời gian:</p>
                <p className="text-sm text-gray-900">
                  {formatDate(selectedLog.createdAt, "full")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Hành động:</p>
                <p className="text-sm text-gray-900 font-mono">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Actor ID:</p>
                <p className="text-sm text-gray-900 font-mono">{selectedLog.actorId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Actor Role:</p>
                <p className="text-sm text-gray-900">{selectedLog.actorRole || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Entity Type:</p>
                <p className="text-sm text-gray-900">{selectedLog.entityType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Entity ID:</p>
                <p className="text-sm text-gray-900 font-mono">{selectedLog.entityId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Organization ID:
                </p>
                <p className="text-sm text-gray-900 font-mono">
                  {selectedLog.organizationId || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">IP:</p>
                <p className="text-sm text-gray-900 font-mono">
                  {selectedLog.ip || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">User Agent:</p>
                <p className="text-sm text-gray-900 break-all">
                  {selectedLog.userAgent || "-"}
                </p>
              </div>
              {selectedLog.metadata && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Metadata:</p>
                  <pre className="text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AnimatedSection>
  );
}
