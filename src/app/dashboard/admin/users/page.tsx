"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { usePrompt } from "@/components/providers/PromptProvider";

type AdminUserItem = {
  id: string;
  email: string;
  fullname: string | null;
  role: "TEACHER" | "STUDENT" | "PARENT" | "ADMIN";
  createdAt: string;
  isDisabled: boolean;
  disabledReason?: string | null;
};

type UsersResponse = {
  items: AdminUserItem[];
  page: number;
  pageSize: number;
  total: number;
};

const ROLE_OPTIONS: { label: string; value: "" | AdminUserItem["role"]; badgeClass: string }[] = [
  { label: "Tất cả", value: "", badgeClass: "bg-slate-100 text-slate-700" },
  { label: "Teacher", value: "TEACHER", badgeClass: "bg-blue-100 text-blue-700" },
  { label: "Student", value: "STUDENT", badgeClass: "bg-green-100 text-green-700" },
  { label: "Parent", value: "PARENT", badgeClass: "bg-amber-100 text-amber-700" },
  { label: "Admin", value: "ADMIN", badgeClass: "bg-slate-900 text-emerald-300" },
];

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState<"" | AdminUserItem["role"]>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const [createFullname, setCreateFullname] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ created: number; failed: number } | null>(
    null
  );
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const prompt = usePrompt();

  const fetchUsers = async (
    nextPage = page,
    nextRole = roleFilter,
    nextSearch = search
  ) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));
      if (nextRole) params.set("role", nextRole);
      if (nextSearch.trim()) params.set("q", nextSearch.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải danh sách người dùng");
      }

      const data = json.data as UsersResponse;
      setItems(data.items || []);
      setPage(data.page);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, roleFilter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, roleFilter, search);
  };

  const handleRoleChange = (value: "" | AdminUserItem["role"]) => {
    setRoleFilter(value);
    fetchUsers(1, value, search);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchUsers(nextPage, roleFilter, search);
  };

  const toggleBan = async (user: AdminUserItem) => {
    if (user.role === "ADMIN") return;
    const action = user.isDisabled ? "UNBAN" : "BAN";

    let reason: string | undefined = undefined;
    if (action === "BAN") {
      const input = await prompt({
        title: "Khoá tài khoản",
        description: `Nhập lý do khoá tài khoản cho ${user.email} (tùy chọn)`,
        placeholder: "Ví dụ: Vi phạm quy định sử dụng hệ thống…",
        type: "textarea",
        confirmText: "Khoá tài khoản",
        cancelText: "Hủy",
        validate: (v) => (v.length > 500 ? "Vui lòng nhập tối đa 500 ký tự" : null),
      });
      if (input === null) {
        // Người dùng bấm Hủy
        return;
      }
      reason = input.trim() || undefined;
    }

    try {
      setBanLoadingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật trạng thái tài khoản");
      }

      const { isDisabled } = json.data as { id: string; isDisabled: boolean };
      setItems((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                isDisabled,
                disabledReason: isDisabled ? (reason ?? null) : null,
              }
            : u
        )
      );
    } catch (e) {
      console.error("[AdminUsersPage] toggleBan error", e);
      alert(e instanceof Error ? e.message : "Có lỗi xảy ra khi cập nhật trạng thái");
    } finally {
      setBanLoadingId(null);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: createFullname,
          email: createEmail,
          password: createPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo giáo viên mới");
      }

      setCreateFullname("");
      setCreateEmail("");
      setCreatePassword("");

      setRoleFilter("TEACHER");
      await fetchUsers(1, "TEACHER", search);
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo giáo viên mới"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleBulkCreateTeachers = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBulkLoading(true);
      setBulkError(null);
      setBulkResult(null);

      const lines = bulkText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        setBulkError("Vui lòng nhập danh sách giáo viên, mỗi dòng một người.");
        return;
      }

      const entries = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const fullname = parts[0] || "";
        const email = parts[1] || "";
        const password = parts[2] || undefined;
        return { fullname, email, password };
      });

      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          defaultPassword: bulkDefaultPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo giáo viên hàng loạt");
      }

      const data = json.data as { created: unknown[]; failed: unknown[] };
      setBulkResult({
        created: Array.isArray(data?.created) ? data.created.length : 0,
        failed: Array.isArray(data?.failed) ? data.failed.length : 0,
      });

      setRoleFilter("TEACHER");
      await fetchUsers(1, "TEACHER", search);
    } catch (e) {
      setBulkError(
        e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo giáo viên hàng loạt"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const readBulkFile = async (file: File) => {
    const name = file.name || "";
    const lower = name.toLowerCase();
    if (!lower.endsWith(".csv") && !file.type.includes("csv")) {
      setBulkError("Chỉ hỗ trợ file CSV (có thể xuất từ Excel).");
      setBulkFileName(null);
      return;
    }

    const text = await file.text();
    setBulkText(text);
    setBulkFileName(name);
    setBulkError(null);
    setBulkResult(null);
  };

  const handleBulkFileChange = async (e: any) => {
    try {
      const file = e.target?.files?.[0] as File | undefined;
      if (!file) return;
      await readBulkFile(file);
    } catch (err) {
      setBulkError("Không thể đọc file CSV. Vui lòng thử lại hoặc kiểm tra định dạng.");
      setBulkFileName(null);
    }
  };

  const handleBulkDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      await readBulkFile(file);
    } catch {
      setBulkError("Không thể đọc file CSV. Vui lòng thử lại hoặc kiểm tra định dạng.");
      setBulkFileName(null);
    }
  };

  const handleBulkDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!bulkDragOver) setBulkDragOver(true);
  };

  const handleBulkDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (bulkDragOver) setBulkDragOver(false);
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        subtitle="Tìm kiếm, lọc và thao tác trên tài khoản trong toàn hệ thống"
      />

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Tạo giáo viên mới</h2>
        {createError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {createError}
          </div>
        )}
        <form
          onSubmit={handleCreateTeacher}
          className="grid gap-3 md:grid-cols-4 items-end"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">Họ và tên</label>
            <input
              type="text"
              value={createFullname}
              onChange={(e) => setCreateFullname(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">Email</label>
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="giaovien@example.com"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">Mật khẩu mặc định</label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="submit"
              disabled={createLoading}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createLoading ? "Đang tạo..." : "Tạo giáo viên"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Tạo giáo viên hàng loạt</h2>
        <p className="text-[11px] text-slate-500">
          Mỗi dòng một giáo viên theo định dạng: <span className="font-semibold">Họ tên, email[, mật khẩu]</span>. Nếu
          không nhập mật khẩu ở từng dòng, hệ thống sẽ dùng mật khẩu mặc định bên dưới.
        </p>
        {bulkError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {bulkError}
          </div>
        )}
        {bulkResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
            Đã tạo {bulkResult.created} giáo viên, {bulkResult.failed} dòng lỗi.
          </div>
        )}
        <form
          onSubmit={handleBulkCreateTeachers}
          className="space-y-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">Danh sách giáo viên</label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={5}
              placeholder={"VD:\nNguyễn Văn A, a@example.com\nTrần Thị B, b@example.com, MatKhau123"}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 resize-y"
            />
          </div>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div
              className={`flex flex-col gap-1 rounded-xl border-2 border-dashed px-3 py-3 transition-colors cursor-pointer ${
                bulkDragOver
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
              }`}
              onDragOver={handleBulkDragOver}
              onDragLeave={handleBulkDragLeave}
              onDrop={handleBulkDrop}
            >
              <label className="text-[11px] font-semibold text-slate-700">
                Kéo & thả file CSV vào đây (hoặc chọn tệp)
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleBulkFileChange}
                className="text-[11px] text-slate-700"
              />
              {bulkFileName && (
                <span className="text-[10px] text-slate-500">Đã chọn file: {bulkFileName}</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 md:text-right mt-2 md:mt-0">
              Gợi ý: xuất danh sách giáo viên từ Excel dưới dạng CSV với cột Họ tên, Email, (Mật khẩu).
            </p>
          </div>
          <div className="flex flex-col gap-1 max-w-xs">
            <label className="text-[11px] font-semibold text-slate-600">Mật khẩu mặc định (tùy chọn)</label>
            <input
              type="password"
              value={bulkDefaultPassword}
              onChange={(e) => setBulkDefaultPassword(e.target.value)}
              placeholder="Dùng cho các dòng không có mật khẩu riêng"
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="submit"
              disabled={bulkLoading}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {bulkLoading ? "Đang xử lý..." : "Tạo hàng loạt"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleRoleChange(opt.value)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                  roleFilter === opt.value
                    ? `${opt.badgeClass} border-transparent`
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo email hoặc họ tên..."
              className="flex-1 md:w-64 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Họ tên</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Vai trò</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Trạng thái</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Lý do khoá</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[11px] text-slate-500"
                  >
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[11px] text-slate-500"
                  >
                    Không có người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((user) => {
                  const isProcessing = banLoadingId === user.id;
                  const isAdminRole = user.role === "ADMIN";
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 text-xs">
                            {user.email}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ID: {user.id.slice(0, 8)}…
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-700">
                        {user.fullname || "(Chưa cập nhật)"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            user.role === "TEACHER"
                              ? "bg-blue-100 text-blue-700"
                              : user.role === "STUDENT"
                              ? "bg-green-100 text-green-700"
                              : user.role === "PARENT"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-900 text-emerald-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle text-[10px] text-slate-600 max-w-[220px] truncate">
                        {user.isDisabled
                          ? user.disabledReason || "Không có lý do cụ thể"
                          : "—"}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            user.isDisabled
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {user.isDisabled ? "Đã khoá" : "Hoạt động"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <button
                          type="button"
                          disabled={isProcessing || isAdminRole}
                          onClick={() => toggleBan(user)}
                          className={`inline-flex items-center rounded-xl px-3 py-1.5 text-[11px] font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            user.isDisabled
                              ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              : "border-red-200 text-red-700 hover:bg-red-50"
                          }`}
                        >
                          {isProcessing
                            ? "Đang xử lý..."
                            : user.isDisabled
                            ? "Mở khoá"
                            : "Khoá tài khoản"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <div>
            Trang {page} / {totalPages}  Total {total} người dùng
          </div>
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
