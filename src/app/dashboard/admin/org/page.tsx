"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminOrgPage() {
  const { data, mutate, isLoading } = useSWR(`/api/admin/org?limit=50`, fetcher);
  const [name, setName] = useState("");

  async function createOrg() {
    if (!name) return;
    await fetch(`/api/admin/org`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    setName("");
    mutate();
  }

  async function renameOrg(id: string, newName: string) {
    await fetch(`/api/admin/org/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: newName }) });
    mutate();
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Tổ chức</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="Tên tổ chức mới" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={createOrg} className="px-3 py-1 rounded bg-blue-600 text-white">Tạo</button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Tên</th>
              <th className="text-right px-3 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="px-3 py-3" colSpan={2}>Đang tải...</td></tr>}
            {data?.data?.items?.map((o: any) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">
                  <input defaultValue={o.name} onBlur={(e) => renameOrg(o.id, e.target.value)} className="border rounded px-2 py-1 w-full" />
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="text-gray-400 text-xs">#{o.id.slice(0, 6)}</span>
                </td>
              </tr>
            ))}
            {!isLoading && (!data?.data?.items || data.data.items.length === 0) && (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={2}>Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


