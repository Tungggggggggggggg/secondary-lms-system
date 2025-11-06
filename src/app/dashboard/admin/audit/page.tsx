"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminAuditPage() {
  const [orgId, setOrgId] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const url = useMemo(() => `/api/admin/audit?limit=50${orgId ? `&orgId=${encodeURIComponent(orgId)}` : ""}${actorId ? `&actorId=${encodeURIComponent(actorId)}` : ""}${action ? `&action=${encodeURIComponent(action)}` : ""}`, [orgId, actorId, action]);
  const { data, isLoading } = useSWR(url, fetcher);

  const csvUrl = `${url}&format=csv`;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Audit logs</h1>
      <div className="flex flex-wrap gap-2">
        <input value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="orgId" className="border rounded px-2 py-1" />
        <input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="actorId" className="border rounded px-2 py-1" />
        <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="action" className="border rounded px-2 py-1" />
        <a href={csvUrl} className="px-3 py-1 rounded bg-gray-800 text-white">Export CSV</a>
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
            {isLoading && <tr><td className="px-3 py-3" colSpan={4}>Đang tải...</td></tr>}
            {data?.data?.items?.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.actorId}</td>
                <td className="px-3 py-2">{r.entityType}#{r.entityId}</td>
              </tr>
            ))}
            {!isLoading && (!data?.data?.items || data.data.items.length === 0) && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type LogRow = { id: string; action: string; entityType: string; entityId: string; createdAt: string };

export default function AdminAuditPage() {
  const [items, setItems] = useState<LogRow[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/system/audit?take=20&skip=0`);
      const data = await res.json();
      setItems(data.items ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit Logs</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Thời gian</th>
              <th className="py-2 pr-4">Hành động</th>
              <th className="py-2 pr-4">Entity</th>
              <th className="py-2 pr-4">ID</th>
            </tr>
          </thead>
          <tbody>
            {items.map(l => (
              <tr key={l.id} className="border-b">
                <td className="py-2 pr-4">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4">{l.action}</td>
                <td className="py-2 pr-4">{l.entityType}</td>
                <td className="py-2 pr-4">{l.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


