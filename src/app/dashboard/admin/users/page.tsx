"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UserRow = { id: string; email: string; fullname: string; role: string; createdAt: string };

const ROLE_OPTIONS = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  const searchParams = useMemo(() => new URLSearchParams({ take: "20", skip: "0", q: query }), [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/system/users?${searchParams.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateRole = useCallback(
    async (userId: string, role: string) => {
      setSavingId(userId);
      try {
        await fetch(`/api/admin/system/users/${userId}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        await load();
      } finally {
        setSavingId(null);
      }
    },
    [load]
  );

  const handleResetPassword = useCallback(
    async (userId: string) => {
      const nextPassword = prompt("Nhập mật khẩu mới tối thiểu 6 ký tự");
      if (!nextPassword || nextPassword.length < 6) return;

      setResetId(userId);
      try {
        await fetch(`/api/admin/system/users/${userId}/password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: nextPassword }),
        });
      } finally {
        setResetId(null);
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-2 py-1"
            placeholder="Tìm kiếm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="px-3 py-1 bg-black text-white rounded" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Tải"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Họ tên</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Tạo lúc</th>
              <th className="py-2 pr-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td className="py-4 text-center text-gray-500" colSpan={5}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              items.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-2 pr-4">{user.email}</td>
                  <td className="py-2 pr-4">{user.fullname}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={user.role}
                        onChange={(event) => handleUpdateRole(user.id, event.target.value)}
                        disabled={savingId === user.id}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      {savingId === user.id && <span className="text-xs text-gray-500">Đang lưu...</span>}
                    </div>
                  </td>
                  <td className="py-2 pr-4">{new Date(user.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                      onClick={() => handleResetPassword(user.id)}
                      disabled={resetId === user.id}
                    >
                      {resetId === user.id ? "Đang đặt lại..." : "Reset mật khẩu"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
