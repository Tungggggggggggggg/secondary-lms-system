"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminAuditFilterBar from "@/components/admin/AdminAuditFilterBar";
import AuditMetadataPreview from "@/components/admin/AuditMetadataPreview";
import Button from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
            <TableHeader>
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
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="py-2 whitespace-nowrap">{formatTime(log.createdAt)}</TableCell>
                    <TableCell className="py-2 font-semibold text-foreground">{log.action}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{log.entityType}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                          ID: {log.entityId || "(none)"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="text-foreground">{log.actorId}</span>
                        <span className="text-[10px] text-muted-foreground">Role: {log.actorRole || "(n/a)"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-[10px] text-muted-foreground">{log.organizationId || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-[10px] text-muted-foreground">{log.ip || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2 max-w-[260px]">
                      <AuditMetadataPreview metadata={log.metadata} />
                    </TableCell>
                  </TableRow>
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
