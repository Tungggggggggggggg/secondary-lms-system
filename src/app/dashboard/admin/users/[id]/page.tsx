"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { usePrompt } from "@/components/providers/PromptProvider";
import Button from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type UserStats = {
  teacherClassrooms: number;
  studentEnrollments: number;
  parentRelations: number;
};

type UserDetail = {
  id: string;
  email: string;
  fullname: string;
  role: "TEACHER" | "STUDENT" | "PARENT" | "ADMIN" | string;
  roleSelectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDisabled: boolean;
  disabledReason: string | null;
  stats: UserStats;
};

type ApiSuccess = {
  success: true;
  data: {
    user: UserDetail;
    related: {
      teacherClassrooms: { id: string; name: string; code: string; isActive: boolean; createdAt: string }[];
      studentClassrooms: {
        id: string;
        joinedAt: string;
        classroom: {
          id: string;
          name: string;
          code: string;
          isActive: boolean;
          createdAt: string;
          teacher: { id: string; fullname: string; email: string };
        };
      }[];
      parentChildren: {
        id: string;
        createdAt: string;
        status: string;
        student: { id: string; fullname: string; email: string };
      }[];
      studentParents: {
        id: string;
        createdAt: string;
        status: string;
        parent: { id: string; fullname: string; email: string };
      }[];
    };
  };
};

/**
 * Admin User Detail page.
 *
 * Side effects:
 * - Fetch user detail
 * - Ban/unban user
 * - Reset password user
 */
export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const prompt = usePrompt();

  const userId = params.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<UserDetail | null>(null);

  const [related, setRelated] = useState<ApiSuccess["data"]["related"] | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editFullname, setEditFullname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"TEACHER" | "STUDENT" | "PARENT">("TEACHER");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as unknown;

      const ok =
        typeof json === "object" &&
        json !== null &&
        (json as { success?: unknown }).success === true;

      if (!res.ok || !ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          typeof (json as { message?: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Không thể tải chi tiết người dùng";
        throw new Error(msg);
      }

      const data = (json as ApiSuccess).data;
      setUser(data.user);
      setRelated(data.related ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setUser(null);
      setRelated(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleBan = async () => {
    if (!user) return;
    if (String(user.role) === "ADMIN") return;

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
      if (input === null) return;
      reason = input.trim() || undefined;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const json = (await res.json().catch(() => ({}))) as unknown;

      const ok =
        typeof json === "object" &&
        json !== null &&
        (json as { success?: unknown }).success === true;

      if (!res.ok || !ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          typeof (json as { message?: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Không thể cập nhật trạng thái tài khoản";
        throw new Error(msg);
      }

      await fetchDetail();
    } catch (e) {
      toast({
        title: "Không thể cập nhật trạng thái",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

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

  const openEdit = () => {
    if (!user) return;
    if (String(user.role) === "ADMIN") return;
    setEditError(null);
    setEditFullname(user.fullname || "");
    setEditEmail(user.email || "");
    const normalizedRole = String(user.role).toUpperCase();
    setEditRole(
      normalizedRole === "STUDENT" ? "STUDENT" : normalizedRole === "PARENT" ? "PARENT" : "TEACHER"
    );
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (String(user.role) === "ADMIN") return;

    try {
      setEditSaving(true);
      setEditError(null);

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: editFullname,
          email: editEmail,
          role: editRole,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật người dùng");
      }

      setEditOpen(false);
      await fetchDetail();

      toast({
        title: "Đã cập nhật người dùng",
        description: editEmail.trim() ? `Đã cập nhật: ${editEmail.trim()}` : "Đã cập nhật thông tin người dùng.",
        variant: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setEditError(msg);
      toast({
        title: "Không thể cập nhật",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Chi tiết người dùng"
        subtitle="Xem thông tin tài khoản, tổ chức tham gia và audit logs liên quan"
      />

      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          Quay lại danh sách
        </Link>

        {user && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || String(user.role) === "ADMIN"}
              onClick={openEdit}
            >
              Chỉnh sửa
            </Button>
            <button
              type="button"
              disabled={loading || String(user.role) === "ADMIN"}
              onClick={() => void toggleBan()}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-[12px] font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                user.isDisabled
                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  : "border-red-200 text-red-700 hover:bg-red-50"
              }`}
            >
              {user.isDisabled ? "Mở khoá" : "Khoá tài khoản"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !user ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
          Đang tải...
        </div>
      ) : user ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Thông tin cơ bản</div>
              <div className="space-y-2 text-[12px] text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Email</span>
                  <span className="font-semibold text-slate-900 truncate" title={user.email}>
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Họ tên</span>
                  <span className="font-semibold text-slate-900 truncate" title={user.fullname}>
                    {user.fullname}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Role</span>
                  <span className="font-semibold text-slate-900">{String(user.role)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Trạng thái</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      user.isDisabled ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {user.isDisabled ? "Đã khoá" : "Hoạt động"}
                  </span>
                </div>
                {user.isDisabled && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                    {user.disabledReason || "Không có lý do cụ thể"}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Thông tin hệ thống</div>
              <div className="space-y-2 text-[12px] text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">User ID</span>
                  <span className="font-mono text-[11px] text-slate-900 truncate max-w-[220px]" title={user.id}>
                    {user.id}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Created</span>
                  <span className="text-[11px] text-slate-700">{formatTime(user.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Updated</span>
                  <span className="text-[11px] text-slate-700">{formatTime(user.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Role selected</span>
                  <span className="text-[11px] text-slate-700">
                    {user.roleSelectedAt ? formatTime(user.roleSelectedAt) : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Thống kê nhanh</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-extrabold text-slate-900">{user.stats.teacherClassrooms}</div>
                  <div className="text-[10px] font-semibold text-slate-600">Lớp (GV)</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-extrabold text-slate-900">{user.stats.studentEnrollments}</div>
                  <div className="text-[10px] font-semibold text-slate-600">Lớp (HS)</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-extrabold text-slate-900">{user.stats.parentRelations}</div>
                  <div className="text-[10px] font-semibold text-slate-600">Liên kết (PH)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {user && String(user.role) === "TEACHER" && related?.teacherClassrooms ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Lớp đang dạy</div>
                    <div className="text-xs text-slate-500 mt-1">Danh sách lớp (GV)</div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{related.teacherClassrooms.length} mục</span>
                </div>

                {related.teacherClassrooms.length === 0 ? (
                  <div className="text-sm text-slate-500">Chưa có lớp nào.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Lớp</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Code</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {related.teacherClassrooms.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2">
                              <Link href={`/dashboard/admin/classrooms/${c.id}`} className="font-semibold text-slate-800 hover:underline">
                                {c.name}
                              </Link>
                              <div className="text-[10px] text-slate-500 truncate max-w-[320px]">{c.id}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">{c.code}</td>
                            <td className="px-3 py-2 text-[10px] font-semibold text-slate-700">{c.isActive ? "ACTIVE" : "INACTIVE"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {user && String(user.role) === "STUDENT" && related?.studentClassrooms ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Lớp đang học</div>
                    <div className="text-xs text-slate-500 mt-1">Danh sách lớp (HS)</div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{related.studentClassrooms.length} mục</span>
                </div>

                {related.studentClassrooms.length === 0 ? (
                  <div className="text-sm text-slate-500">Chưa tham gia lớp nào.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Lớp</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Giáo viên</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {related.studentClassrooms.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2">
                              <Link href={`/dashboard/admin/classrooms/${m.classroom.id}`} className="font-semibold text-slate-800 hover:underline">
                                {m.classroom.name}
                              </Link>
                              <div className="text-[10px] text-slate-500">{m.classroom.code}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{m.classroom.teacher.fullname}</span>
                                <span className="text-[10px] text-slate-500">{m.classroom.teacher.email}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-[10px] text-slate-600">{formatTime(m.joinedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {user && String(user.role) === "STUDENT" && related?.studentParents ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Phụ huynh liên kết</div>
                    <div className="text-xs text-slate-500 mt-1">Danh sách PH liên kết với học sinh</div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{related.studentParents.length} mục</span>
                </div>

                {related.studentParents.length === 0 ? (
                  <div className="text-sm text-slate-500">Chưa có phụ huynh liên kết.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Phụ huynh</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Linked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {related.studentParents.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2">
                              <Link href={`/dashboard/admin/users/${r.parent.id}`} className="font-semibold text-slate-800 hover:underline">
                                {r.parent.fullname}
                              </Link>
                              <div className="text-[10px] text-slate-500">{r.parent.email}</div>
                            </td>
                            <td className="px-3 py-2 text-[10px] font-semibold text-slate-700">{r.status}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-[10px] text-slate-600">{formatTime(r.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {user && String(user.role) === "PARENT" && related?.parentChildren ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Con liên kết</div>
                    <div className="text-xs text-slate-500 mt-1">Danh sách học sinh liên kết với phụ huynh</div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{related.parentChildren.length} mục</span>
                </div>

                {related.parentChildren.length === 0 ? (
                  <div className="text-sm text-slate-500">Chưa có học sinh liên kết.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Học sinh</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Linked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {related.parentChildren.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/60">
                            <td className="px-3 py-2">
                              <Link href={`/dashboard/admin/users/${r.student.id}`} className="font-semibold text-slate-800 hover:underline">
                                {r.student.fullname}
                              </Link>
                              <div className="text-[10px] text-slate-500">{r.student.email}</div>
                            </td>
                            <td className="px-3 py-2 text-[10px] font-semibold text-slate-700">{r.status}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-[10px] text-slate-600">{formatTime(r.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <EditUserDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditError(null);
        }}
        onSubmit={saveEdit}
        disabled={editSaving}
        error={editError}
        fullname={editFullname}
        setFullname={setEditFullname}
        email={editEmail}
        setEmail={setEditEmail}
        role={editRole}
        setRole={setEditRole}
      />
    </div>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  onSubmit,
  disabled,
  error,
  fullname,
  setFullname,
  email,
  setEmail,
  role,
  setRole,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  error: string | null;
  fullname: string;
  setFullname: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  role: "TEACHER" | "STUDENT" | "PARENT";
  setRole: (v: "TEACHER" | "STUDENT" | "PARENT") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,44rem)] max-w-xl" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
          <DialogDescription>Cập nhật họ tên, email và role cho người dùng.</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {error}
            </div>
          ) : null}

          <form id="admin-edit-user-form" onSubmit={onSubmit} className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Vai trò</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "TEACHER" | "STUDENT" | "PARENT")}
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
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                required
              />
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Hủy
          </Button>
          <Button form="admin-edit-user-form" type="submit" disabled={disabled}>
            {disabled ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


