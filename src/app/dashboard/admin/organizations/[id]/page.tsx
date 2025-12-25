"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const orgDisabled = (globalThis as unknown as { __lms_disable_org__?: boolean }).__lms_disable_org__ !== false;
  if (orgDisabled) {
    return (
      <div className="p-6 sm:p-8 space-y-6">
        <AdminPageHeader
          title="Organizations"
          subtitle="Tính năng Organizations đã được gỡ bỏ (phase 1)."
          label="Organizations"
        />
        <Card className="space-y-3 p-6">
          <div className="text-sm font-semibold text-foreground">Không khả dụng</div>
          <div className="text-sm text-muted-foreground">
            Trang chi tiết organization đã được ẩn khỏi hệ thống.
          </div>
          <div>
            <Button asChild variant="outline" size="sm" color="slate">
              <Link href="/dashboard/admin/dashboard">Quay về Overview</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }
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
    <div className="p-6 sm:p-8 space-y-6">
      <AdminPageHeader
        title="Organization detail"
        subtitle="Xem thông tin và quản lý members"
        label="Organizations"
      />

      <div className="flex items-center justify-between">
        <Button asChild variant="outline" size="sm" color="slate">
          <Link href="/dashboard/admin/organizations">Quay lại</Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            color="slate"
            onClick={() => setAddMemberOpen(true)}
          >
            Thêm member
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!org || loading}
            onClick={() => setEditOpen(true)}
          >
            Chỉnh sửa
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading && !org ? (
        <Card className="p-6 text-sm text-muted-foreground">Đang tải...</Card>
      ) : org ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <Card className="space-y-3 p-6">
              <div className="text-sm font-semibold text-foreground">Thông tin</div>
              <div className="space-y-2 text-[12px] text-foreground/80">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tên</span>
                  <span className="font-semibold text-foreground truncate" title={org.name}>
                    {org.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-semibold text-foreground truncate" title={org.slug || ""}>
                    {org.slug || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={org.status === "ACTIVE" ? "success" : "destructive"}>{org.status}</Badge>
                </div>
              </div>
            </Card>

            <Card className="space-y-3 p-6">
              <div className="text-sm font-semibold text-foreground">Tổng quan</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-muted p-3 text-center">
                  <div className="text-lg font-extrabold text-foreground">{org._count.members}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground">Members</div>
                </div>
                <div className="rounded-xl border border-border bg-muted p-3 text-center">
                  <div className="text-lg font-extrabold text-foreground">{org._count.classrooms}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground">Classes</div>
                </div>
                <div className="rounded-xl border border-border bg-muted p-3 text-center">
                  <div className="text-lg font-extrabold text-foreground">{org._count.courses}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground">Courses</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Members</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Tìm theo email/họ tên và quản lý danh sách thành viên.
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleMembersSearchSubmit}
                className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
              >
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Input
                    value={membersSearch}
                    onChange={(e) => setMembersSearch(e.target.value)}
                    placeholder="Tìm theo email hoặc họ tên..."
                    className="flex-1 md:w-72 text-xs"
                  />
                  <Button type="submit" size="sm">
                    Lọc
                  </Button>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    color="slate"
                    disabled={membersLoading}
                    onClick={() => {
                      setMembersSearch("");
                      void fetchMembers({ reset: true, cursor: null });
                    }}
                  >
                    Làm mới
                  </Button>
                </div>
              </form>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table className="text-[11px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left text-xs font-semibold">User</TableHead>
                      <TableHead className="text-left text-xs font-semibold">Global role</TableHead>
                      <TableHead className="text-left text-xs font-semibold">Role in Org</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membersLoading && members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-[11px] text-muted-foreground">
                          Đang tải members...
                        </TableCell>
                      </TableRow>
                    ) : members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-6 text-center text-[11px] text-muted-foreground">
                          Chưa có member nào.
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="py-2">
                            <div className="flex flex-col">
                              <Link
                                href={`/dashboard/admin/users/${m.user.id}`}
                                className="font-semibold text-foreground hover:underline"
                              >
                                {m.user.email}
                              </Link>
                              <span className="text-[10px] text-muted-foreground">
                                {m.user.fullname || "(Chưa cập nhật)"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-[10px] text-foreground/80">
                            {String(m.user.role)}
                          </TableCell>
                          <TableCell className="py-2 text-[10px] text-foreground/80">{m.roleInOrg || "—"}</TableCell>
                          <TableCell className="py-2 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => void removeMember(m.user.id)}
                            >
                              Gỡ
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {canLoadMoreMembers && (
                <div className="flex justify-center pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    color="slate"
                    disabled={membersLoading}
                    onClick={() => void fetchMembers({ reset: false, cursor: membersNextCursor })}
                    className="rounded-full px-4"
                  >
                    {membersLoading ? "Đang tải thêm..." : "Tải thêm"}
                  </Button>
                </div>
              )}
            </Card>
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
              <label className="text-[11px] font-semibold text-muted-foreground">Tên</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Slug</label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
              />
              <div className="text-[10px] text-muted-foreground">Để trống nếu không dùng slug.</div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Status</label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as OrgStatus)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={() => setEditOpen(false)}
            >
              Hủy
            </Button>
            <Button type="button" size="sm" disabled={editLoading} onClick={() => void updateOrg()}>
              {editLoading ? "Đang lưu..." : "Lưu"}
            </Button>
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
              <label className="text-[11px] font-semibold text-muted-foreground">User ID</label>
              <Input
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                placeholder="VD: cuid..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Role in Org (tuỳ chọn)</label>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={() => setAddMemberOpen(false)}
            >
              Hủy
            </Button>
            <Button type="button" size="sm" disabled={addMemberLoading} onClick={() => void addMember()}>
              {addMemberLoading ? "Đang thêm..." : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
