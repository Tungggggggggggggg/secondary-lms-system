"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminAuditFilterBar from "@/components/admin/AdminAuditFilterBar";
import AuditMetadataPreview from "@/components/admin/AuditMetadataPreview";
import Button from "@/components/ui/button";

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

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải audit logs");
      }

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
    <div className="p-8 space-y-6">
      <AdminPageHeader
        title="Nhật ký hệ thống"
        subtitle="Nhật ký các hành động quan trọng và nhạy cảm trong toàn hệ thống."
        label="Audit & giám sát"
      />

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
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

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-[11px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Thời gian</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Action</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Entity</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Actor</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Org</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">IP</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-[11px] text-slate-500"
                  >
                    Đang tải audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-[11px] text-slate-500"
                  >
                    Chưa có bản ghi nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-middle font-semibold text-slate-800">
                      {log.action}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {log.entityType}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[220px]">
                          ID: {log.entityId || "(none)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <span className="text-slate-800">{log.actorId}</span>
                        <span className="text-[10px] text-slate-500">
                          Role: {log.actorRole || "(n/a)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-[10px] text-slate-600">
                        {log.organizationId || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-[10px] text-slate-600">
                        {log.ip || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle max-w-[260px]">
                      <AuditMetadataPreview metadata={log.metadata} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
      </div>
    </div>
  );
}
