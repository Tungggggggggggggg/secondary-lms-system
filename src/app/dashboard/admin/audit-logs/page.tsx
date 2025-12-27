"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminAuditFilterBar from "@/components/admin/AdminAuditFilterBar";
import AuditMetadataPreview from "@/components/admin/AuditMetadataPreview";
import Button from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import fetcher from "@/lib/fetcher";

type AuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorRole: string | null;
  organizationId: string | null;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
};

type AuditResponse = {
  items: AuditLogItem[];
  nextCursor: string | null;
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const fetchLogs = async (opts?: { reset?: boolean; cursor?: string | null }) => {
    const reset = opts?.reset ?? false;
    const cursorParam = opts?.cursor ?? null;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("limit", "50");
      if (actorFilter.trim()) params.set("actorId", actorFilter.trim());
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      if (entityTypeFilter.trim()) params.set("entityType", entityTypeFilter.trim());
      if (fromFilter) params.set("from", fromFilter);
      if (toFilter) params.set("to", toFilter);
      if (cursorParam) params.set("cursor", cursorParam);

      const json = await fetcher<{ success: true; data: AuditResponse }>(
        `/api/admin/audit-logs?${params.toString()}`
      );
      const data = json.data as AuditResponse;
      setLogs((prev) => (reset ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      if (opts?.reset) {
        setLogs([]);
        setCursor(null);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateLabel = (iso: string) => {
    try {
      const d = new Date(iso);
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayKey = yesterday.toISOString().slice(0, 10);
      const key = d.toISOString().slice(0, 10);
      if (key === todayKey) return "Hôm nay";
      if (key === yesterdayKey) return "Hôm qua";
      return d.toLocaleDateString("vi-VN");
    } catch {
      return iso.slice(0, 10);
    }
  };

  const groupedLogs = useMemo(() => {
    const groups: Record<string, AuditLogItem[]> = {};
    for (const log of logs) {
      const key = (log.createdAt || "").slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    const entries = Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return entries;
  }, [logs]);

  const renderEntityLink = (log: AuditLogItem) => {
    const id = log.entityId;
    if (!id) return <span className="text-[10px] text-muted-foreground">ID: (none)</span>;
    if (log.entityType === "USER") {
      return (
        <Link
          href={`/dashboard/admin/users/${id}`}
          className="text-[10px] text-blue-600 hover:underline"
        >
          ID: {id}
        </Link>
      );
    }
    if (log.entityType === "CLASSROOM") {
      return (
        <Link
          href={`/dashboard/admin/classrooms/${id}`}
          className="text-[10px] text-blue-600 hover:underline"
        >
          ID: {id}
        </Link>
      );
    }
    if (log.entityType === "ORGANIZATION") {
      return (
        <Link
          href={`/dashboard/admin/organizations/${id}`}
          className="text-[10px] text-blue-600 hover:underline"
        >
          ID: {id}
        </Link>
      );
    }
    return <span className="text-[10px] text-muted-foreground">ID: {id}</span>;
  };

  useEffect(() => {
    fetchLogs({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <AdminPageHeader
        title="Nhật ký hệ thống"
        subtitle="Nhật ký các hành động quan trọng và nhạy cảm trong toàn hệ thống."
        label="Audit & giám sát"
      />

      <Card className="p-6 space-y-4">
        <AdminAuditFilterBar
          actor={actorFilter}
          action={actionFilter}
          onActorChange={setActorFilter}
          onActionChange={setActionFilter}
          entityType={entityTypeFilter}
          onEntityTypeChange={setEntityTypeFilter}
          from={fromFilter}
          to={toFilter}
          onFromChange={setFromFilter}
          onToChange={setToFilter}
          loading={loading}
          onSubmit={() => fetchLogs({ reset: true, cursor: null })}
          onReset={() => {
            setActorFilter("");
            setActionFilter("");
            setFromFilter("");
            setToFilter("");
            fetchLogs({ reset: true, cursor: null });
          }}
        />

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
              <TableRow>
                <TableHead className="text-xs font-semibold">Thời gian</TableHead>
                <TableHead className="text-xs font-semibold">Action</TableHead>
                <TableHead className="text-xs font-semibold">Entity</TableHead>
                <TableHead className="text-xs font-semibold">Actor</TableHead>
                <TableHead className="text-xs font-semibold">Org</TableHead>
                <TableHead className="text-xs font-semibold">IP</TableHead>
                <TableHead className="text-xs font-semibold">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-[11px] text-muted-foreground">
                    Đang tải audit logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-[11px] text-muted-foreground">
                    Chưa có bản ghi nào phù hợp với bộ lọc.
                  </TableCell>
                </TableRow>
              ) : (
                groupedLogs.map(([dayKey, dayLogs]) => (
                  <>
                    <TableRow key={dayKey + "-header"} className="bg-muted/40">
                      <TableCell colSpan={7} className="py-1.5 text-[11px] font-semibold text-slate-700">
                        {formatDateLabel(dayLogs[0]?.createdAt || dayKey)}
                      </TableCell>
                    </TableRow>
                    {dayLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="py-2 whitespace-nowrap text-[11px]">
                          {formatTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={
                              log.action.startsWith("USER_") || log.action.startsWith("CLASSROOM_")
                                ? "warning"
                                : "outline"
                            }
                            className="text-[10px] font-mono tracking-tight"
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-[11px] text-foreground">
                              {log.entityType}
                            </span>
                            <div className="truncate max-w-[220px]">
                              {renderEntityLink(log)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-foreground break-all">
                              {log.actorId}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="px-1 py-0 text-[9px] font-semibold border-slate-300 text-slate-700"
                              >
                                {log.actorRole || "(n/a)"}
                              </Badge>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-[10px] text-muted-foreground">
                            {log.organizationId || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-[10px] text-muted-foreground">
                            {log.ip || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-2 max-w-[260px]">
                          <AuditMetadataPreview metadata={log.metadata} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {hasMore && (
          <div className="flex justify-center pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              disabled={loading || !cursor}
              onClick={() => cursor && fetchLogs({ reset: false, cursor })}
              className="rounded-full px-4"
            >
              {loading ? "Đang tải thêm..." : "Tải thêm"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
