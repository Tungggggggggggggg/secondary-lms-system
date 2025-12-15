"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { usePrompt } from "@/components/providers/PromptProvider";

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

type OrganizationItem = {
  id: string;
  name: string;
  slug: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

type MembershipItem = {
  id: string;
  roleInOrg: string | null;
  createdAt: string;
  organization: OrganizationItem;
};

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
    memberships: MembershipItem[];
    auditLogs: AuditLogItem[];
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
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

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
      setMemberships(Array.isArray(data.memberships) ? data.memberships : []);
      setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setUser(null);
      setMemberships([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const resetPassword = async () => {
    if (!user) return;
    if (String(user.role) === "ADMIN") return;

    const input = await prompt({
      title: "Reset mật khẩu",
      description: `Gửi mã đặt lại mật khẩu tới email ${user.email}. Bạn có muốn ghi lý do không? (tùy chọn)`,
      placeholder: "Ví dụ: Người dùng quên mật khẩu…",
      type: "textarea",
      confirmText: "Gửi mã reset",
      cancelText: "Hủy",
      validate: (v) => (v.length > 500 ? "Vui lòng nhập tối đa 500 ký tự" : null),
    });

    if (input === null) return;

    const reason = input.trim() || undefined;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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
            : "Không thể gửi mã reset password";
        throw new Error(msg);
      }

      toast({
        title: "Đã gửi mã reset",
        description: `Đã gửi mã reset password tới ${user.email}`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Không thể gửi mã reset",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

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
            <button
              type="button"
              disabled={loading || String(user.role) === "ADMIN"}
              onClick={() => void resetPassword()}
              className="inline-flex items-center rounded-xl px-4 py-2 text-[12px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Reset mật khẩu
            </button>
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
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Tổ chức tham gia</div>
                  <div className="text-xs text-slate-500 mt-1">Danh sách organization memberships của user</div>
                </div>
                <span className="text-[11px] font-semibold text-slate-600">{memberships.length} mục</span>
              </div>

              {memberships.length === 0 ? (
                <div className="text-sm text-slate-500">Người dùng chưa thuộc organization nào.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Org</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Role in Org</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {memberships.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{m.organization.name}</span>
                              <span className="text-[10px] text-slate-500">{m.organization.id}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] font-semibold text-slate-700">{m.organization.status}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] text-slate-700">{m.roleInOrg || "—"}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-[10px] text-slate-600">
                            {formatTime(m.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Audit logs liên quan</div>
                  <div className="text-xs text-slate-500 mt-1">Gồm logs khi user là actor hoặc entity USER</div>
                </div>
                <Link
                  href={`/dashboard/admin/audit-logs?actorId=${encodeURIComponent(user.id)}`}
                  className="text-[11px] font-semibold text-slate-700 hover:underline"
                >
                  Xem trong Audit Logs
                </Link>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-sm text-slate-500">Chưa có audit logs liên quan.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Thời gian</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Action</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Entity</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Actor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 whitespace-nowrap text-[10px] text-slate-600">
                            {formatTime(log.createdAt)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{log.action}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="text-slate-800">{log.entityType}</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[240px]">{log.entityId}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="text-slate-800">{log.actorId}</span>
                              <span className="text-[10px] text-slate-500">{log.actorRole || "—"}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
