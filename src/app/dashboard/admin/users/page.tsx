"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminUsersToolbar, { type AdminRoleValue } from "@/components/admin/AdminUsersToolbar";
import AdminPagination from "@/components/admin/AdminPagination";
import UserRowActionsMenu from "@/components/admin/UserRowActionsMenu";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { EmptyState, ErrorBanner } from "@/components/shared";
import Button from "@/components/ui/button";
import { usePrompt } from "@/components/providers/PromptProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState<AdminRoleValue>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createFullname, setCreateFullname] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"TEACHER" | "STUDENT" | "PARENT">("TEACHER");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState("");
  const [bulkRole, setBulkRole] = useState<"TEACHER" | "STUDENT" | "PARENT">("TEACHER");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<
    | {
        created: number;
        failed: number;
        failedDetails: { index: number; email: string; reason: string }[];
      }
    | null
  >(null);
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

  const requestDeleteUser = (user: AdminUserItem) => {
    if (user.role === "ADMIN") return;
    setDeleteTarget(user);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    const user = deleteTarget;
    if (!user) return;
    if (user.role === "ADMIN") return;

    try {
      setDeleteLoadingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể xóa người dùng");
      }

      setItems((prev) => prev.filter((u) => u.id !== user.id));
      setTotal((t) => Math.max(0, t - 1));

      toast({
        title: "Đã xóa người dùng",
        description: user.email,
        variant: "success",
      });

      setDeleteConfirmOpen(false);
      setDeleteTarget(null);

      if (items.length === 1 && page > 1) {
        fetchUsers(page - 1, roleFilter, search);
      }
    } catch (e) {
      console.error("[AdminUsersPage] deleteUser error", e);
      toast({
        title: "Không thể xóa người dùng",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra khi xóa người dùng",
        variant: "destructive",
      });
    } finally {
      setDeleteLoadingId(null);
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

  const handleResetFilters = () => {
    setRoleFilter("");
    setSearch("");
    fetchUsers(1, "", "");
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
      toast({
        title: "Không thể cập nhật trạng thái",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra khi cập nhật trạng thái",
        variant: "destructive",
      });
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
          role: createRole,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo người dùng mới");
      }

      setCreateFullname("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("TEACHER");

      setRoleFilter(createRole);
      await fetchUsers(1, createRole, search);

      setCreateOpen(false);
      toast({
        title: "Tạo người dùng thành công",
        description: createEmail.trim() ? `Đã tạo tài khoản: ${createEmail.trim()}` : "Đã tạo tài khoản người dùng.",
        variant: "success",
      });
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo người dùng mới"
      );
      toast({
        title: "Không thể tạo người dùng",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo người dùng mới",
        variant: "destructive",
      });
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
        setBulkError("Vui lòng nhập danh sách người dùng, mỗi dòng một người.");
        return;
      }

      const entries = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const fullname = parts[0] || "";
        const email = parts[1] || "";
        const password = parts[2] || undefined;
        const role = parts[3] || undefined;
        return { fullname, email, password, role };
      });

      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          defaultPassword: bulkDefaultPassword,
          defaultRole: bulkRole,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo người dùng hàng loạt");
      }

      const data = json.data as { created: unknown[]; failed: unknown[] };
      const failedDetailsRaw = Array.isArray(data?.failed) ? data.failed : [];
      const failedDetails = failedDetailsRaw
        .filter((item) => typeof item === "object" && item !== null)
        .map((item) => {
          const record = item as Record<string, unknown>;
          return {
            index: typeof record.index === "number" ? record.index : Number(record.index ?? 0),
            email: typeof record.email === "string" ? record.email : String(record.email ?? ""),
            reason: typeof record.reason === "string" ? record.reason : String(record.reason ?? "Lỗi không xác định"),
          };
        });
      setBulkResult({
        created: Array.isArray(data?.created) ? data.created.length : 0,
        failed: failedDetails.length,
        failedDetails,
      });

      setRoleFilter(bulkRole);
      await fetchUsers(1, bulkRole, search);

      if (failedDetails.length === 0) {
        setBulkOpen(false);
      }

      toast({
        title: "Đã xử lý danh sách người dùng",
        description: `Tạo thành công ${Array.isArray(data?.created) ? data.created.length : 0} người dùng, ${
          Array.isArray(data?.failed) ? data.failed.length : 0
        } dòng lỗi.`,
        variant: "success",
      });
    } catch (e) {
      setBulkError(
        e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo người dùng hàng loạt"
      );
      toast({
        title: "Không thể tạo người dùng hàng loạt",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo người dùng hàng loạt",
        variant: "destructive",
      });
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
    <div className="p-6 sm:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AdminPageHeader
          title="Quản lý người dùng"
          subtitle="Tìm kiếm, lọc và thao tác trên tài khoản trong toàn hệ thống"
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  setCreateError(null);
                  setCreateOpen(true);
                }}
              >
                Tạo người dùng
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkError(null);
                  setBulkResult(null);
                  setBulkOpen(true);
                }}
              >
                Tạo hàng loạt
              </Button>
            </div>
          }
        />

        {error ? <ErrorBanner message={error} onRetry={() => fetchUsers(page, roleFilter, search)} /> : null}

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <AdminUsersToolbar
            roleOptions={ROLE_OPTIONS}
            roleValue={roleFilter}
            onRoleChange={handleRoleChange}
            search={search}
            onSearchChange={setSearch}
            onSubmit={() => fetchUsers(1, roleFilter, search)}
            onReset={handleResetFilters}
          />

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Họ tên</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Vai trò</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Lý do khoá</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && items.length === 0 ? (
                  <AdminTableSkeleton rows={8} cols={6} />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8">
                      <EmptyState
                        title="Không có người dùng phù hợp"
                        description="Thử thay đổi bộ lọc hoặc đặt lại tìm kiếm để xem thêm kết quả."
                        action={
                          <div className="flex items-center justify-center gap-2">
                            <Button type="button" variant="outline" onClick={handleResetFilters}>
                              Reset bộ lọc
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setCreateError(null);
                                setCreateOpen(true);
                              }}
                            >
                              Tạo người dùng
                            </Button>
                          </div>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  items.map((user) => {
                    const isProcessing = banLoadingId === user.id;
                    const isDeleting = deleteLoadingId === user.id;
                    const isAdminRole = user.role === "ADMIN";
                    const disabledReason = user.isDisabled
                      ? user.disabledReason || "(Không có lý do)"
                      : "";
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col min-w-0">
                            <Link
                              href={`/dashboard/admin/users/${user.id}`}
                              className="font-semibold text-slate-900 hover:underline truncate"
                              title={user.email}
                            >
                              {user.email}
                            </Link>
                            <span className="text-xs text-slate-500">Tạo lúc: {new Date(user.createdAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-slate-700">
                          {user.fullname || <span className="text-slate-400">(Chưa cập nhật)</span>}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
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
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              user.isDisabled ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {user.isDisabled ? "Đã khoá" : "Hoạt động"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-slate-600 max-w-[360px] truncate" title={disabledReason}>
                          {disabledReason}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          <UserRowActionsMenu
                            detailHref={`/dashboard/admin/users/${user.id}`}
                            disabled={isProcessing || isDeleting}
                            disableToggle={isAdminRole}
                            disableDelete={isAdminRole}
                            onToggleBan={() => toggleBan(user)}
                            onDeleteUser={() => requestDeleteUser(user)}
                            toggleLabel={
                              isProcessing
                                ? "Đang xử lý..."
                                : user.isDisabled
                                ? "Mở khoá"
                                : "Khoá tài khoản"
                            }
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateError(null);
            setCreateFullname("");
            setCreateEmail("");
            setCreatePassword("");
            setCreateRole("TEACHER");
          }
        }}
      >
        <DialogContent
          className="w-[min(92vw,48rem)] max-w-2xl max-h-[90vh]"
          onClose={() => setCreateOpen(false)}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Tạo người dùng mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin cơ bản để tạo tài khoản. Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {createError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {createError}
              </div>
            )}
            <form id="create-teacher-form" onSubmit={handleCreateTeacher} className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Vai trò</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as "TEACHER" | "STUDENT" | "PARENT")}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <option value="TEACHER">TEACHER</option>
                  <option value="STUDENT">STUDENT</option>
                  <option value="PARENT">PARENT</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Họ và tên</label>
                <input
                  type="text"
                  value={createFullname}
                  onChange={(e) => setCreateFullname(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
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
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  required
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Mật khẩu</label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  required
                />
              </div>
            </form>
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button form="create-teacher-form" type="submit" disabled={createLoading}>
              {createLoading ? "Đang tạo..." : "Tạo người dùng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (!open) {
            setBulkDragOver(false);
            setBulkError(null);
            setBulkResult(null);
            setBulkFileName(null);
            setBulkText("");
            setBulkDefaultPassword("");
            setBulkRole("TEACHER");
          }
        }}
      >
        <DialogContent
          className="w-[min(92vw,64rem)] max-w-4xl max-h-[90vh]"
          onClose={() => setBulkOpen(false)}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Tạo người dùng hàng loạt</DialogTitle>
            <DialogDescription>
              Mỗi dòng một người dùng theo định dạng: Họ tên, email[, mật khẩu][, role]. Nếu không có mật khẩu riêng,
              hệ thống dùng mật khẩu mặc định.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {bulkError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {bulkError}
              </div>
            )}
            {bulkResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                Đã tạo {bulkResult.created} người dùng, {bulkResult.failed} dòng lỗi.
              </div>
            )}

            {bulkResult && bulkResult.failedDetails.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-900">Danh sách dòng không tạo được</div>
                  <div className="text-xs text-slate-600">Sửa lại các dòng này rồi chạy lại bulk import.</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">#</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {bulkResult.failedDetails.map((row) => (
                        <tr key={`${row.index}-${row.email}`} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 text-slate-700">{Number.isFinite(row.index) ? row.index + 1 : ""}</td>
                          <td className="px-4 py-2 text-slate-700 max-w-[240px] truncate" title={row.email}>
                            {row.email || <span className="text-slate-400">(Trống)</span>}
                          </td>
                          <td className="px-4 py-2 text-slate-700 max-w-[520px] truncate" title={row.reason}>
                            {row.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <form id="bulk-create-teachers-form" onSubmit={handleBulkCreateTeachers} className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-3 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Vai trò mặc định</label>
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value as "TEACHER" | "STUDENT" | "PARENT")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <option value="TEACHER">TEACHER</option>
                  <option value="STUDENT">STUDENT</option>
                  <option value="PARENT">PARENT</option>
                </select>
                <div className="text-[10px] text-slate-500">Nếu mỗi dòng có cột role thứ 4, hệ thống sẽ ưu tiên theo dòng.</div>
              </div>
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Danh sách người dùng</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={12}
                  placeholder={"VD:\nNguyễn Văn A, a@example.com\nTrần Thị B, b@example.com, MatKhau123, STUDENT"}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 resize-y"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div
                  className={`flex flex-col gap-2 rounded-xl border-2 border-dashed px-3 py-3 transition-colors cursor-pointer ${
                    bulkDragOver
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                  onDragOver={handleBulkDragOver}
                  onDragLeave={handleBulkDragLeave}
                  onDrop={handleBulkDrop}
                >
                  <div className="text-[11px] font-semibold text-slate-700">
                    Kéo & thả file CSV vào đây (hoặc chọn tệp)
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleBulkFileChange}
                    className="text-[11px] text-slate-700"
                  />
                  {bulkFileName && (
                    <span className="text-[10px] text-slate-500">Đã chọn file: {bulkFileName}</span>
                  )}
                  <div className="text-[10px] text-slate-500">
                    Gợi ý: xuất từ Excel dạng CSV với cột Họ tên, Email, (Mật khẩu).
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600">Mật khẩu mặc định (tùy chọn)</label>
                  <input
                    type="password"
                    value={bulkDefaultPassword}
                    onChange={(e) => setBulkDefaultPassword(e.target.value)}
                    placeholder="Dùng cho các dòng không có mật khẩu riêng"
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  />
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              Đóng
            </Button>
            <Button form="bulk-create-teachers-form" type="submit" disabled={bulkLoading}>
              {bulkLoading ? "Đang xử lý..." : "Tạo hàng loạt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (deleteLoadingId) return;
          setDeleteConfirmOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="w-[min(92vw,40rem)] max-w-lg" onClose={() => setDeleteConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle>Xóa người dùng</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa người dùng{deleteTarget?.email ? `: ${deleteTarget.email}` : ""}? Hành động này có thể không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={!!deleteLoadingId}>
              Hủy
            </Button>
            <Button type="button" onClick={confirmDeleteUser} disabled={!!deleteLoadingId} className="bg-red-600 hover:bg-red-700">
              {deleteLoadingId ? "Đang xóa..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
