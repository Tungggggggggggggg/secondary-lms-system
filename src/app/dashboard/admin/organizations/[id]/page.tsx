"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

type OrgStatus = "ACTIVE" | "INACTIVE";

type OrgDetail = {
  id: string;
  name: string;
  slug: string | null;
  status: OrgStatus;
  createdAt: string;
  updatedAt: string;
  _count: {
    members: number;
    classrooms: number;
    courses: number;
  };
};

type OrgMember = {
  id: string;
  roleInOrg: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullname: string;
    role: string;
    createdAt: string;
  };
};

type MembersResponse = {
  items: OrgMember[];
  nextCursor: string | null;
};

/**
 * Admin Organization detail page.
 *
 * Side effects:
 * - Fetch org detail
 * - Update org
 * - Manage org members
 */
export default function AdminOrganizationDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();

  const orgId = params.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [org, setOrg] = useState<OrgDetail | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editStatus, setEditStatus] = useState<OrgStatus>("ACTIVE");
  const [editLoading, setEditLoading] = useState(false);

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersNextCursor, setMembersNextCursor] = useState<string | null>(null);
  const [membersSearch, setMembersSearch] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRoleInOrg, setAddRoleInOrg] = useState<string>("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  const canLoadMoreMembers = useMemo(() => Boolean(membersNextCursor), [membersNextCursor]);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/organizations/${orgId}`, { cache: "no-store" });
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
            : "Không thể tải organization";
        throw new Error(msg);
      }

      const data = (json as { data?: unknown }).data as OrgDetail;
      setOrg(data);
      setEditName(data.name);
      setEditSlug(data.slug || "");
      setEditStatus(data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setOrg(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (opts?: { reset?: boolean; cursor?: string | null }) => {
    const reset = opts?.reset ?? false;
    const cursorParam = opts?.cursor ?? null;

    try {
      setMembersLoading(true);

      const params = new URLSearchParams();
      params.set("limit", "50");
      if (membersSearch.trim()) params.set("search", membersSearch.trim());
      if (cursorParam) params.set("cursor", cursorParam);

      const res = await fetch(`/api/admin/organizations/${orgId}/members?${params.toString()}`, { cache: "no-store" });
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
            : "Không thể tải members";
        throw new Error(msg);
      }

      const data = (json as { data?: unknown }).data as MembersResponse;
      const list = Array.isArray(data?.items) ? data.items : [];
      setMembers((prev) => (reset ? list : [...prev, ...list]));
      setMembersNextCursor(typeof data?.nextCursor === "string" ? data.nextCursor : null);
    } catch (e) {
      toast({
        title: "Không thể tải members",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
      if (reset) {
        setMembers([]);
        setMembersNextCursor(null);
      }
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrg();
    void fetchMembers({ reset: true, cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const updateOrg = async () => {
    if (!org) return;

    const name = editName.trim();
    const slug = editSlug.trim();

    if (!name) {
      toast({
        title: "Thiếu tên",
        description: "Vui lòng nhập tên organization.",
        variant: "destructive",
      });
      return;
    }

    try {
      setEditLoading(true);

      const res = await fetch(`/api/admin/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || null,
          status: editStatus,
        }),
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
            : "Không thể cập nhật organization";
        throw new Error(msg);
      }

      toast({
        title: "Đã cập nhật",
        description: "Thông tin organization đã được lưu.",
        variant: "success",
      });

      setEditOpen(false);
      await fetchOrg();
    } catch (e) {
      toast({
        title: "Không thể cập nhật",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const addMember = async () => {
    const userId = addUserId.trim();
    const roleInOrg = addRoleInOrg.trim() || null;

    if (!userId) {
      toast({
        title: "Thiếu userId",
        description: "Vui lòng nhập userId để thêm vào organization.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddMemberLoading(true);

      const res = await fetch(`/api/admin/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleInOrg }),
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
            : "Không thể thêm member";
        throw new Error(msg);
      }

      toast({
        title: "Đã thêm member",
        description: "Member đã được thêm/cập nhật role.",
        variant: "success",
      });

      setAddMemberOpen(false);
      setAddUserId("");
      setAddRoleInOrg("");

      await fetchMembers({ reset: true, cursor: null });
      await fetchOrg();
    } catch (e) {
      toast({
        title: "Không thể thêm member",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setAddMemberLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
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
            : "Không thể xóa member";
        throw new Error(msg);
      }

      toast({
        title: "Đã xóa member",
        description: "Member đã được gỡ khỏi organization.",
        variant: "success",
      });

      await fetchMembers({ reset: true, cursor: null });
      await fetchOrg();
    } catch (e) {
      toast({
        title: "Không thể xóa member",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const handleMembersSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchMembers({ reset: true, cursor: null });
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Organization detail"
        subtitle="Xem thông tin và quản lý members"
      />

      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/admin/organizations"
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          Quay lại
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddMemberOpen(true)}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            Thêm member
          </button>
          <button
            type="button"
            disabled={!org || loading}
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Chỉnh sửa
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !org ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
          Đang tải...
        </div>
      ) : org ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Thông tin</div>
              <div className="space-y-2 text-[12px] text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Tên</span>
                  <span className="font-semibold text-slate-900 truncate" title={org.name}>
                    {org.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Slug</span>
                  <span className="font-semibold text-slate-900 truncate" title={org.slug || ""}>
                    {org.slug || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      org.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {org.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-3">
              <div className="text-sm font-semibold text-slate-900">Tổng quan</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-extrabold text-slate-900">{org._count.members}</div>
                  <div className="text-[10px] font-semibold text-slate-600">Members</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-extrabold text-slate-900">{org._count.classrooms}</div>
                  <div className="text-[10px] font-semibold text-slate-600">Classes</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-extrabold text-slate-900">{org._count.courses}</div>
                  <div className="text-[10px] font-semibold text-slate-600">Courses</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Members</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Tìm theo email/họ tên và quản lý danh sách thành viên.
                  </div>
                </div>
              </div>

              <form onSubmit={handleMembersSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={membersSearch}
                    onChange={(e) => setMembersSearch(e.target.value)}
                    placeholder="Tìm theo email hoặc họ tên..."
                    className="flex-1 md:w-72 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    Lọc
                  </button>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    disabled={membersLoading}
                    onClick={() => {
                      setMembersSearch("");
                      void fetchMembers({ reset: true, cursor: null });
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Làm mới
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">User</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Global role</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Role in Org</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-600">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {membersLoading && members.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-[11px] text-slate-500">
                          Đang tải members...
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-[11px] text-slate-500">
                          Chưa có member nào.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <Link
                                href={`/dashboard/admin/users/${m.user.id}`}
                                className="font-semibold text-slate-800 hover:underline"
                              >
                                {m.user.email}
                              </Link>
                              <span className="text-[10px] text-slate-500">
                                {m.user.fullname || "(Chưa cập nhật)"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-slate-700">{String(m.user.role)}</td>
                          <td className="px-3 py-2 text-[10px] text-slate-700">{m.roleInOrg || "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => void removeMember(m.user.id)}
                              className="inline-flex items-center rounded-xl border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                            >
                              Gỡ
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {canLoadMoreMembers && (
                <div className="flex justify-center pt-3">
                  <button
                    type="button"
                    disabled={membersLoading}
                    onClick={() => void fetchMembers({ reset: false, cursor: membersNextCursor })}
                    className="inline-flex items-center rounded-full border border-slate-200 px-4 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {membersLoading ? "Đang tải thêm..." : "Tải thêm"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open && org) {
            setEditName(org.name);
            setEditSlug(org.slug || "");
            setEditStatus(org.status);
          }
        }}
      >
        <DialogContent className="w-[min(92vw,48rem)] max-w-2xl max-h-[90vh]" onClose={() => setEditOpen(false)}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Chỉnh sửa organization</DialogTitle>
            <DialogDescription>Cập nhật tên, slug và trạng thái hoạt động.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Tên</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Slug</label>
              <input
                type="text"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
              <div className="text-[10px] text-slate-500">Để trống nếu không dùng slug.</div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Status</label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OrgStatus)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={editLoading}
              onClick={() => void updateOrg()}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {editLoading ? "Đang lưu..." : "Lưu"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addMemberOpen}
        onOpenChange={(open) => {
          setAddMemberOpen(open);
          if (!open) {
            setAddUserId("");
            setAddRoleInOrg("");
          }
        }}
      >
        <DialogContent className="w-[min(92vw,48rem)] max-w-2xl max-h-[90vh]" onClose={() => setAddMemberOpen(false)}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Thêm member</DialogTitle>
            <DialogDescription>
              Nhập userId để thêm vào organization. (MVP: nhập trực tiếp ID)
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">User ID</label>
              <input
                type="text"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                placeholder="VD: cuid..."
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Role in Org (tuỳ chọn)</label>
              <Select value={addRoleInOrg} onChange={(e) => setAddRoleInOrg(e.target.value)}>
                <option value="">(Không set)</option>
                <option value="OWNER">OWNER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="TEACHER">TEACHER</option>
                <option value="STUDENT">STUDENT</option>
                <option value="PARENT">PARENT</option>
              </Select>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setAddMemberOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={addMemberLoading}
              onClick={() => void addMember()}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {addMemberLoading ? "Đang thêm..." : "Thêm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
