"use client";
import { useEffect, useState } from "react";

type MemberRow = { id: string; roleInOrg: string | null; user: { id: string; email: string; fullname: string; role: string } };

export default function OrgMembersPage() {
  const [orgId, setOrgId] = useState("");
  const [items, setItems] = useState<MemberRow[]>([]);

  async function load() {
    if (!orgId) return;
    const res = await fetch(`/api/admin/org/members?orgId=${encodeURIComponent(orgId)}`);
    const data = await res.json();
    setItems(data.items ?? []);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Members</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="Organization ID" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
        <button className="px-3 py-1 bg-black text-white rounded" onClick={load}>Tải</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Họ tên</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Role trong Org</th>
            </tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id} className="border-b">
                <td className="py-2 pr-4">{m.user.email}</td>
                <td className="py-2 pr-4">{m.user.fullname}</td>
                <td className="py-2 pr-4">{m.user.role}</td>
                <td className="py-2 pr-4">{m.roleInOrg ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


