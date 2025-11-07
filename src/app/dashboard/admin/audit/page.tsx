"use client";

import { useEffect, useMemo, useState } from "react";

type AuditRow = {
  id: string;
  action: string;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [orgId, setOrgId] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: "50" });
    const trimmedOrgId = orgId.trim();
    const trimmedActorId = actorId.trim();
    const trimmedAction = action.trim();
    if (trimmedOrgId) params.set("orgId", trimmedOrgId);
    if (trimmedActorId) params.set("actorId", trimmedActorId);
    if (trimmedAction) params.set("action", trimmedAction);
    return params.toString();
  }, [orgId, actorId, action]);

  const requestUrl = useMemo(() => `/api/admin/audit?${queryString}`, [queryString]);
  const csvUrl = useMemo(() => `${requestUrl}&format=csv`, [requestUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(requestUrl, { signal: controller.signal });
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || "Không thể tải dữ liệu");
        }
        const body = await res.json();
        if (!controller.signal.aborted) {
          setRows(Array.isArray(body?.data?.items) ? body.data.items : []);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      controller.abort();
    };
  }, [requestUrl]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Audit Logs</h1>
        <a href={csvUrl} className="px-3 py-1 rounded bg-gray-800 text-white">
          Export CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={orgId}
          onChange={(event) => setOrgId(event.target.value)}
          placeholder="orgId"
          className="border rounded px-2 py-1"
        />
        <input
          value={actorId}
          onChange={(event) => setActorId(event.target.value)}
          placeholder="actorId"
          className="border rounded px-2 py-1"
        />
        <input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="action"
          className="border rounded px-2 py-1"
        />
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Thời gian</th>
              <th className="text-left px-3 py-2">Hành động</th>
              <th className="text-left px-3 py-2">Actor</th>
              <th className="text-left px-3 py-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-3" colSpan={4}>
                  Đang tải...
                </td>
              </tr>
            )}

            {error && !loading && (
              <tr>
                <td className="px-3 py-3 text-red-600" colSpan={4}>
                  Không thể tải dữ liệu: {error}
                </td>
              </tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-gray-500" colSpan={4}>
                  Không có dữ liệu
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{row.action}</td>
                <td className="px-3 py-2">{row.actorId ?? "-"}</td>
                <td className="px-3 py-2">
                  {row.entityType ?? "-"}
                  {row.entityId ? `#${row.entityId}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
