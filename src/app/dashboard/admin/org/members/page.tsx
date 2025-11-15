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
import { OrganizationMember, TableColumn } from "@/types/admin";
import { formatDate } from "@/lib/admin/format-date";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/admin/admin-constants";
import { Users, Plus, Trash2 } from "lucide-react";
import StatsCard from "@/components/admin/stats/StatsCard";
import { UserRole as PrismaUserRole } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Component OrgMembersPage - Trang quản lý thành viên tổ chức
 */
export default function OrgMembersPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const searchParams = useSearchParams();
  const [orgId, setOrgId] = useState(searchParams.get("orgId") || "");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const { toast } = useToast();

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

  const members = data?.items || [];
  const total = data?.total || 0;

  // Handle add member
  const handleAddMember = useCallback(async () => {
    const userId = prompt("Nhập User ID để thêm vào tổ chức:");
    if (!userId || !orgId) return;

    try {
      const response = await fetch("/api/admin/org/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId,
          userId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Không thể thêm thành viên");
      }

      toast({
        title: "Thành công",
        description: "Đã thêm thành viên vào tổ chức",
        variant: "success",
      });

      mutate();
    } catch (error: any) {
      console.error("[OrgMembersPage] Add member error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm thành viên",
        variant: "destructive",
      });
    }
  }, [orgId, mutate, toast]);

  // Handle remove member
  const handleRemoveMember = useCallback(
    async (memberId: string, userName: string) => {
      if (
        !confirm(
          `Bạn có chắc chắn muốn xóa "${userName}" khỏi tổ chức?`
        )
      ) {
        return;
      }

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
      render: (value) => <span>{String(value ?? "-")}</span>,
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
            Nhập Organization ID để xem danh sách thành viên
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
            title="Tổng số thành viên"
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
              Danh sách thành viên
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
            Thêm thành viên
          </Button>
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
          emptyMessage="Không có thành viên nào"
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Vui lòng nhập Organization ID để xem danh sách thành viên
          </CardContent>
        </Card>
      )}
    </AnimatedSection>
  );
}
