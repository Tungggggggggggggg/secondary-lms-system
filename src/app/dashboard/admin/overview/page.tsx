"use client";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminOverviewPage() {
  const sp = useSearchParams();
  const orgId = sp.get("orgId");
  const { data: users } = useSWR(orgId ? `/api/admin/users?orgId=${encodeURIComponent(orgId)}&limit=5` : null, fetcher);
  const { data: orgs } = useSWR(`/api/admin/org?limit=5`, fetcher);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Tổng quan quản trị</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-md border p-4">
          <div className="text-sm text-gray-500">Tổ chức gần đây</div>
          <div className="mt-2 space-y-1">
            {orgs?.data?.items?.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between">
                <span>{o.name}</span>
              </div>
            )) || <div className="text-gray-400">Không có dữ liệu</div>}
          </div>
        </div>
        <div className="rounded-md border p-4 md:col-span-2">
          <div className="text-sm text-gray-500">Người dùng mới (org)</div>
          <div className="mt-2 space-y-1">
            {users?.data?.items?.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between">
                <span>{u.fullname}</span>
                <span className="text-xs text-gray-500">{u.email}</span>
              </div>
            )) || <div className="text-gray-400">Chọn orgId để xem</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tổng quan tổ chức</h1>
      <p className="text-sm text-gray-600">Trang dành cho ADMIN trong phạm vi tổ chức.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded border">Users</div>
        <div className="p-4 bg-white rounded border">Classes</div>
        <div className="p-4 bg-white rounded border">Assignments</div>
      </div>
    </div>
  );
}


