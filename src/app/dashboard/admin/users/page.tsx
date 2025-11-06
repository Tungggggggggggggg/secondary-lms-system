"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const roles = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;

export default function AdminUsersPage() {
  const sp = useSearchParams();
  const orgId = sp.get("orgId");
  const [search, setSearch] = useState("");
  const url = useMemo(() => (orgId ? `/api/admin/users?orgId=${encodeURIComponent(orgId)}&limit=20&search=${encodeURIComponent(search)}` : null), [orgId, search]);
  const { data, mutate, isLoading } = useSWR(url, fetcher);

  async function updateRole(userId: string, role: string) {
    await fetch(`/api/admin/users/${userId}?orgId=${encodeURIComponent(orgId || "")}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    mutate();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Người dùng</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên/email" className="border rounded px-2 py-1" />
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Họ tên</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Vai trò</th>
              <th className="text-right px-3 py-2">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="px-3 py-3" colSpan={4}>Đang tải...</td></tr>
            )}
            {data?.data?.items?.map((u: any) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.fullname}</td>
                <td className="px-3 py-2 text-gray-600">{u.email}</td>
                <td className="px-3 py-2">
                  <select className="border rounded px-2 py-1" defaultValue={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <button className="text-red-600 hover:underline" onClick={async () => { await fetch(`/api/admin/users/${u.id}?orgId=${encodeURIComponent(orgId || "")}`, { method: "DELETE" }); mutate(); }}>Xóa khỏi tổ chức</button>
                </td>
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

type UserRow = { id: string; email: string; fullname: string; role: string; createdAt: string };

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/system/users?take=20&skip=0&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="Tìm kiếm" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="px-3 py-1 bg-black text-white rounded" onClick={load} disabled={loading}>Tải</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Họ tên</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Tạo lúc</th>
              <th className="py-2 pr-4">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id} className="border-b">
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.fullname}</td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={u.role}
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        setSavingId(u.id);
                        try {
                          await fetch(`/api/admin/system/users/${u.id}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) });
                          await load();
                        } finally { setSavingId(null); }
                      }}
                      disabled={savingId === u.id}
                    >
                      {['SUPER_ADMIN','ADMIN','TEACHER','STUDENT','PARENT'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="py-2 pr-4">{new Date(u.createdAt).toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <button
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                    onClick={async () => {
                      const np = prompt('Nhập mật khẩu mới tối thiểu 6 ký tự');
                      if (!np || np.length < 6) return;
                      setResetId(u.id);
                      try {
                        await fetch(`/api/admin/system/users/${u.id}/password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: np }) });
                      } finally { setResetId(null); }
                    }}
                    disabled={resetId === u.id}
                  >Reset mật khẩu</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


