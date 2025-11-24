"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import DataTable from "@/components/admin/data-table/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrganizationMember, TableColumn } from "@/types/admin";
import { formatDate } from "@/lib/admin/format-date";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/admin/admin-constants";
import { Users, Plus, Trash2 } from "lucide-react";
import StatsCard from "@/components/admin/stats/StatsCard";
import type { UserRole as PrismaUserRole } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";
import { useConfirm } from "@/components/providers/ConfirmProvider";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Component OrgMembersPage - Trang quản lý thành viên tổ chức
 */
export default function OrgMembersPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const sessionOrgId = (session as any)?.orgId as string | undefined;
  const searchParams = useSearchParams();
  const [orgId, setOrgId] = useState(searchParams.get("orgId") || "");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { toast } = useToast();

  // Dialog & search state for adding members by autocomplete
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; fullname: string | null; role: PrismaUserRole }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "TEACHER" | "STUDENT" | "PARENT">("STUDENT");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  // Đồng bộ orgId mặc định từ session nếu URL không có
  useEffect(() => {
    if (!searchParams.get("orgId") && !orgId && sessionOrgId) {
      setOrgId(sessionOrgId);
    }
  }, [sessionOrgId]);

  // Fetch members
  const { data, error, isLoading, mutate } = useSWR<{
    success?: boolean;
    items?: OrganizationMember[];
    total?: number;
  }>(
    orgId ? `/api/admin/org/members?orgId=${encodeURIComponent(orgId)}&page=${page}&take=${limit}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const { data: invitesData, isLoading: invitesLoading, mutate: mutateInvites } = useSWR<{
    success?: boolean;
    items?: Array<{ id: string; createdAt: string; email: string | null; role: string | null; revoked: boolean }>;
    total?: number;
  }>(
    orgId ? `/api/admin/org/invites?orgId=${encodeURIComponent(orgId)}&page=1&take=20` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const members = data?.items || [];
  const total = data?.total || 0;
  const confirm = useConfirm();
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  

  // Handle add member (open dialog)
  const handleAddMember = useCallback(() => {
    if (!orgId) {
      toast({
        title: "Thiếu Organization ID",
        description: "Vui lòng nhập Organization ID trước khi thêm thành viên.",
        variant: "destructive",
      });
      return;
    }
    setIsAddOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
  }, [orgId, toast]);

  const openInviteDialog = useCallback(() => {
    if (!orgId) {
      toast({ title: "Thiếu Organization ID", description: "Vui lòng nhập Organization ID trước khi tạo lời mời.", variant: "destructive" });
      return;
    }
    setIsInviteOpen(true);
    setInviteEmail("");
    setInviteRole("STUDENT");
    setInviteToken(null);
  }, [orgId, toast]);

  // Handle remove member
  const handleRemoveMember = useCallback(
    async (memberId: string, userName: string) => {
      const ok = await confirm({
        title: "Xóa khỏi tổ chức",
        description: `Bạn có chắc chắn muốn xóa "${userName}" khỏi tổ chức?`,
        variant: "danger",
        confirmText: "Xóa",
        cancelText: "Hủy",
      });
      if (!ok) return;

      try {
        const response = await fetch(`/api/admin/org/members/${memberId}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Không thể xóa thành viên");
        }

        toast({
          title: "Thành công",
          description: "Đã xóa thành viên khỏi tổ chức",
          variant: "success",
        });

        mutate();
      } catch (error: any) {
        console.error("[OrgMembersPage] Remove member error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể xóa thành viên",
          variant: "destructive",
        });
      }
    },
    [mutate, toast]
  );

  // Debounced search users not in organization
  useEffect(() => {
    if (!isAddOpen) return;
    if (!orgId) return;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const url = `/api/admin/org/members/search-users?orgId=${encodeURIComponent(orgId)}&q=${encodeURIComponent(searchQuery)}&take=10`;
        const res = await fetch(url, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Không thể tìm kiếm người dùng");
        setSearchResults(json.items || []);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("[OrgMembersPage] Search users error:", e);
          setSearchError(e?.message || "Lỗi tìm kiếm");
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [isAddOpen, searchQuery, orgId]);

  // Confirm add selected user to organization
  const addUserToOrg = useCallback(
    async (userId: string) => {
      if (!orgId) return;
      try {
        const response = await fetch("/api/admin/org/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, userId }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Không thể thêm thành viên");
        toast({ title: "Thành công", description: "Đã thêm thành viên vào tổ chức", variant: "success" });
        setIsAddOpen(false);
        mutate();
      } catch (error: any) {
        console.error("[OrgMembersPage] Add member error:", error);
        toast({ title: "Lỗi", description: error.message || "Không thể thêm thành viên", variant: "destructive" });
      }
    },
    [orgId, mutate, toast]
  );

  const submitInvite = useCallback(async () => {
    if (!orgId || !inviteEmail.trim()) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập email hợp lệ.", variant: "destructive" });
      return;
    }
    try {
      setInviteSubmitting(true);
      const res = await fetch("/api/admin/org/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Không thể tạo lời mời");
      setInviteToken(json.token || null);
      toast({ title: "Đã tạo lời mời", description: "Hãy sao chép token và gửi cho người dùng.", variant: "success" });
      mutateInvites();
    } catch (e: any) {
      console.error("[OrgMembersPage] Create invite error:", e);
      toast({ title: "Lỗi", description: e?.message || "Không thể tạo lời mời", variant: "destructive" });
    } finally {
      setInviteSubmitting(false);
    }
  }, [orgId, inviteEmail, inviteRole, mutateInvites, toast]);

  const revokeInvite = useCallback(async (inviteId: string) => {
    try {
      const res = await fetch(`/api/admin/org/invites/${inviteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Không thể huỷ lời mời");
      toast({ title: "Đã huỷ", description: "Lời mời đã được huỷ", variant: "success" });
      mutateInvites();
    } catch (e: any) {
      console.error("[OrgMembersPage] Revoke invite error:", e);
      toast({ title: "Lỗi", description: e?.message || "Không thể huỷ lời mời", variant: "destructive" });
    }
  }, [mutateInvites, toast]);

  // Table columns
  const columns: TableColumn<OrganizationMember>[] = [
    {
      key: "user",
      label: "Email",
      sortable: false,
      render: (value) => {
        const user = (value as any)?.user;
        return user?.email || "-";
      },
    },
    {
      key: "user",
      label: "Họ tên",
      sortable: false,
      render: (value) => {
        const user = (value as any)?.user;
        return user?.fullname || "-";
      },
    },
    {
      key: "user",
      label: "Vai trò hệ thống",
      sortable: false,
      render: (value) => {
        const user = (value as any)?.user;
        const roleValue = user?.role as PrismaUserRole;
        if (!roleValue) return "-";
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              ROLE_COLORS[roleValue] || "bg-gray-100 text-gray-700"
            }`}
          >
            {ROLE_LABELS[roleValue] || roleValue}
          </span>
        );
      },
    },
    {
      key: "roleInOrg",
      label: "Vai trò trong tổ chức",
      sortable: true,
      render: (value, row) => {
        const v = (value as any) as string | null;
        const member = row as OrganizationMember;
        if (v === "OWNER") return <span className="font-medium">OWNER</span>;

        const current = v ?? "";
        const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
          const next = e.target.value || null;
          try {
            setUpdatingRoleId(member.id);
            const res = await fetch(`/api/admin/org/members/${member.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roleInOrg: next }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Cập nhật vai trò thất bại");
            toast({ title: "Đã cập nhật", description: "Vai trò trong tổ chức đã được cập nhật", variant: "success" });
            mutate();
          } catch (e: any) {
            console.error("[OrgMembersPage] Update role error:", e);
            toast({ title: "Lỗi", description: e?.message || "Không thể cập nhật vai trò", variant: "destructive" });
          } finally {
            setUpdatingRoleId(null);
          }
        };

        return (
          <select
            className="h-9 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={current}
            onChange={onChange}
            disabled={updatingRoleId === member.id}
          >
            <option value="">- Không đặt -</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
            <option value="PARENT">PARENT</option>
          </select>
        );
      },
    },
  ];

  // Render actions
  const renderActions = (member: OrganizationMember) => {
    return (
      <Button
        variant="ghost"
        size="default"
        onClick={() =>
          handleRemoveMember(member.id, member.user.fullname || member.user.email)
        }
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
        title="Xóa khỏi tổ chức"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Thành viên tổ chức" />

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Nhập Organization ID để xem danh sách thành viên tổ chức
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Organization ID"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
            </div>
            <Button onClick={() => mutate()} variant="outline">
              Tải lại
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {orgId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Tổng số thành viên tổ chức"
            value={total}
            icon={<Users className="h-5 w-5" />}
            color="primary"
          />
        </div>
      )}

      {/* Header Actions */}
      {orgId && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Danh sách thành viên tổ chức
            </h2>
            <p className="text-sm text-gray-500">
              Quản lý thành viên của tổ chức
            </p>
          </div>
          <Button
            onClick={handleAddMember}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Thêm thành viên tổ chức
          </Button>
        </div>
      )}

      {orgId && (
        <div className="flex items-center justify-end">
          <Button onClick={openInviteDialog} variant="outline" className="mt-2">Tạo lời mời</Button>
        </div>
      )}

      {/* Data Table */}
      {orgId ? (
        <DataTable<OrganizationMember>
          data={members}
          columns={columns}
          currentPage={page}
          onPageChange={setPage}
          pageSize={limit}
          total={total}
          loading={isLoading}
          actions={renderActions}
          getRowId={(row) => row.id}
          exportable
          exportFilename="org-members-export.csv"
          emptyMessage="Không có thành viên tổ chức nào"
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Vui lòng nhập Organization ID để xem danh sách thành viên tổ chức
          </CardContent>
        </Card>
      )}

      {orgId && (
        <Card>
          <CardHeader>
            <CardTitle>Lời mời gần đây</CardTitle>
            <CardDescription>Danh sách lời mời đã tạo cho tổ chức này</CardDescription>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : !invitesData?.items || invitesData.items.length === 0 ? (
              <div className="text-sm text-gray-500">Chưa có lời mời nào</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Vai trò</th>
                      <th className="py-2 pr-4">Tạo lúc</th>
                      <th className="py-2 pr-4">Trạng thái</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitesData.items.map((inv) => (
                      <tr key={inv.id} className="border-t">
                        <td className="py-2 pr-4">{inv.email || '-'}</td>
                        <td className="py-2 pr-4">{inv.role || '-'}</td>
                        <td className="py-2 pr-4">{formatDate(inv.createdAt, "medium")}</td>
                        <td className="py-2 pr-4">
                          {inv.revoked ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">Đã huỷ</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Đang hiệu lực</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          {!inv.revoked && (
                            <Button variant="ghost" onClick={() => revokeInvite(inv.id)} className="text-red-600 hover:text-red-700">Huỷ</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm thành viên tổ chức</DialogTitle>
            <DialogDescription>Tìm và thêm người dùng chưa thuộc tổ chức bằng email hoặc họ tên</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!orgId ? (
              <div className="text-sm text-red-600">Vui lòng nhập Organization ID trước.</div>
            ) : (
              <>
                <Input
                  placeholder="Nhập tối thiểu 2 ký tự để tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="max-h-64 overflow-auto border rounded-md">
                  {isSearching ? (
                    <div className="p-3 text-sm text-gray-500">Đang tìm...</div>
                  ) : searchQuery.trim().length < 2 ? (
                    <div className="p-3 text-sm text-gray-500">Nhập tối thiểu 2 ký tự để tìm kiếm</div>
                  ) : searchError ? (
                    <div className="p-3 text-sm text-red-600">{searchError}</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">Không tìm thấy người dùng phù hợp</div>
                  ) : (
                    <ul className="divide-y">
                      {searchResults.map((u) => (
                        <li key={u.id} className="flex items-center justify-between p-3">
                          <div>
                            <div className="font-medium">{u.fullname || u.email}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ROLE_COLORS[u.role] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                            <Button onClick={() => addUserToOrg(u.id)}>Thêm</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo lời mời</DialogTitle>
            <DialogDescription>Nhập email người nhận và chọn vai trò trong tổ chức</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="email" placeholder="Email người nhận" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <select
              className="h-10 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="TEACHER">TEACHER</option>
              <option value="STUDENT">STUDENT</option>
              <option value="PARENT">PARENT</option>
            </select>
            <div className="flex items-center gap-2">
              <Button onClick={submitInvite} disabled={inviteSubmitting}>Tạo lời mời</Button>
            </div>
            {inviteToken && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Token lời mời (chia sẻ cho người dùng để đăng ký/nhập):</div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={inviteToken} />
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard && navigator.clipboard.writeText(inviteToken)}
                  >Sao chép</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AnimatedSection>
  );
}
