"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
            Trang này đã được ẩn khỏi hệ thống. Nếu bạn cần quản lý tổ chức, vui lòng liên hệ đội phát triển.
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
    <div className="p-6 sm:p-8 space-y-6">
      <AdminPageHeader
        title="Organizations"
        subtitle="Quản lý tổ chức (tạo mới, tìm kiếm, xem chi tiết)"
        label="Organizations"
      />

      <Card className="p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên organization..."
              className="flex-1 md:w-72 text-xs"
            />
            <Button type="submit" size="sm">
              Tìm kiếm
            </Button>
          </form>

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo organization
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold">Tên</TableHead>
                <TableHead className="text-xs font-semibold">Slug</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-[11px] text-muted-foreground">
                    Đang tải organizations...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-[11px] text-muted-foreground">
                    Chưa có organization nào.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="py-2 align-middle">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/admin/organizations/${org.id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {org.name}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">ID: {org.id.slice(0, 8)}…</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 align-middle text-[11px] text-foreground/80">
                      {org.slug || "—"}
                    </TableCell>
                    <TableCell className="py-2 align-middle">
                      <Badge variant={org.status === "ACTIVE" ? "success" : "destructive"}>{org.status}</Badge>
                    </TableCell>
                    <TableCell className="py-2 align-middle text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(org.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {canLoadMore && (
          <div className="flex justify-center pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              disabled={loading}
              onClick={() => void fetchList({ reset: false, cursor: nextCursor })}
              className="rounded-full px-4"
            >
              {loading ? "Đang tải thêm..." : "Tải thêm"}
            </Button>
          </div>
        )}
      </Card>

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
              <label className="text-[11px] font-semibold text-muted-foreground">Tên organization</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="VD: Trường THPT ABC"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Slug (tuỳ chọn)</label>
              <Input
                value={createSlug}
                onChange={(e) => setCreateSlug(e.target.value)}
                placeholder="VD: thpt-abc"
              />
              <div className="text-[10px] text-muted-foreground">
                Nếu nhập slug, hệ thống sẽ kiểm tra trùng (unique).
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={() => setCreateOpen(false)}
            >
              Hủy
            </Button>
            <Button type="button" size="sm" disabled={createLoading} onClick={() => void createOrganization()}>
              {createLoading ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
