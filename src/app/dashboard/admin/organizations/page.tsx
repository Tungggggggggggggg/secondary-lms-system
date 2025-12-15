"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type OrgStatus = "ACTIVE" | "INACTIVE";

type OrgItem = {
  id: string;
  name: string;
  slug: string | null;
  status: OrgStatus;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  items: OrgItem[];
  nextCursor: string | null;
};

/**
 * Admin Organizations page.
 *
 * Side effects:
 * - Fetch organizations list
 * - Create organization
 */
export default function AdminOrganizationsPage() {
  const { toast } = useToast();

  const [items, setItems] = useState<OrgItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const canLoadMore = useMemo(() => Boolean(nextCursor), [nextCursor]);

  const fetchList = async (opts?: { reset?: boolean; cursor?: string | null }) => {
    const reset = opts?.reset ?? false;
    const cursorParam = opts?.cursor ?? null;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (cursorParam) params.set("cursor", cursorParam);
      params.set("limit", "20");

      const res = await fetch(`/api/admin/organizations?${params.toString()}`, { cache: "no-store" });
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
            : "Không thể tải danh sách organizations";
        throw new Error(msg);
      }

      const data = (json as { data?: unknown }).data as ListResponse;
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems((prev) => (reset ? list : [...prev, ...list]));
      setNextCursor(typeof data?.nextCursor === "string" ? data.nextCursor : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      if (reset) {
        setItems([]);
        setNextCursor(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList({ reset: true, cursor: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchList({ reset: true, cursor: null });
  };

  const createOrganization = async () => {
    const name = createName.trim();
    const slug = createSlug.trim();

    if (!name) {
      toast({
        title: "Thiếu tên tổ chức",
        description: "Vui lòng nhập tên organization.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreateLoading(true);

      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || null }),
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
            : "Không thể tạo organization";
        throw new Error(msg);
      }

      toast({
        title: "Đã tạo organization",
        description: `Tạo thành công: ${name}`,
        variant: "success",
      });

      setCreateOpen(false);
      setCreateName("");
      setCreateSlug("");

      await fetchList({ reset: true, cursor: null });
    } catch (e) {
      toast({
        title: "Không thể tạo organization",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Quản lý tổ chức (tạo mới, tìm kiếm, xem chi tiết)"
      />

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên organization..."
              className="flex-1 md:w-72 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Tìm kiếm
            </button>
          </form>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Tạo organization
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Tên</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Slug</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-[11px] text-slate-500">
                    Đang tải organizations...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-[11px] text-slate-500">
                    Chưa có organization nào.
                  </td>
                </tr>
              ) : (
                items.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/admin/organizations/${org.id}`}
                          className="font-semibold text-slate-900 hover:underline"
                        >
                          {org.name}
                        </Link>
                        <span className="text-[10px] text-slate-500">ID: {org.id.slice(0, 8)}…</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle text-[11px] text-slate-700">
                      {org.slug || "—"}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          org.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-[10px] text-slate-600 whitespace-nowrap">
                      {new Date(org.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {canLoadMore && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchList({ reset: false, cursor: nextCursor })}
              className="inline-flex items-center rounded-full border border-slate-200 px-4 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Đang tải thêm..." : "Tải thêm"}
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateName("");
            setCreateSlug("");
          }
        }}
      >
        <DialogContent className="w-[min(92vw,48rem)] max-w-2xl max-h-[90vh]" onClose={() => setCreateOpen(false)}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Tạo organization</DialogTitle>
            <DialogDescription>
              Tạo một tổ chức mới để quản lý classrooms, courses và members theo organization.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Tên organization</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="VD: Trường THPT ABC"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Slug (tuỳ chọn)</label>
              <input
                type="text"
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="VD: thpt-abc"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              />
              <div className="text-[10px] text-slate-500">
                Nếu nhập slug, hệ thống sẽ kiểm tra trùng (unique).
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void createOrganization()}
              disabled={createLoading}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createLoading ? "Đang tạo..." : "Tạo"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
