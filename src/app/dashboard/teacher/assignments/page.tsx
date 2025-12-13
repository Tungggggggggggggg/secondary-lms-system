"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AssignmentList from "@/components/teacher/assignments/AssignmentList";
import AssignmentStatsGrid from "@/components/teacher/assignments/AssignmentStatsGrid";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/shared";
import { FilterBar } from "@/components/shared";
import { Plus } from "lucide-react";
import { exportToCsv } from "@/lib/csv";
import AssignmentTable from "@/components/teacher/assignments/AssignmentTable";
import AssignmentQuickPreview from "@/components/teacher/assignments/AssignmentQuickPreview";
import { useAssignmentsQuery } from "@/hooks/use-assignments-query";
import { useClassroom } from "@/hooks/use-classroom";
import type { AssignmentT } from "@/hooks/use-assignments";
import { AdvancedFiltersPopover } from "@/components/shared";
import { QuickFilterChips } from "@/components/shared";
import { ViewToggle } from "@/components/shared";
import DuplicateAssignmentDialog from "@/components/teacher/assignments/DuplicateAssignmentDialog";
import { useToast } from "@/hooks/use-toast";

export default function AssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classrooms } = useClassroom();
  const [preview, setPreview] = useState<AssignmentT | null>(null);
  const { toast } = useToast();
  const [dupTarget, setDupTarget] = useState<AssignmentT | null>(null);
  const [dupLoading, setDupLoading] = useState(false);

  const [status, setStatus] = useState<"all" | "active" | "completed" | "draft" | "needGrading">(
    (searchParams.get("status") as any) || "all"
  );
  const [search, setSearch] = useState<string>(searchParams.get("q") || "");
  const [clazz, setClazz] = useState<string>(searchParams.get("classId") || "all");
  const [view, setView] = useState<"list" | "table">(() => {
    if (typeof window === "undefined") return "list";
    return (window.localStorage.getItem("teacher:assignments:view") as any) || "list";
  });
  useEffect(() => {
    try { window.localStorage.setItem("teacher:assignments:view", view); } catch {}
  }, [view]);

  const [sortKey, setSortKey] = useState<"createdAt" | "dueDate" | "lockAt" | "title">(
    (searchParams.get("sortKey") as any) || "createdAt"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">((searchParams.get("sortDir") as any) || "desc");
  const [page, setPage] = useState<number>(Number(searchParams.get("page") || 1));
  const pageSize = 10;

  const { items, total, loading, error, refresh, counts } = useAssignmentsQuery({
    search,
    status,
    classId: clazz,
    page,
    pageSize,
    sortKey,
    sortDir,
  });

  useEffect(() => {
    const usp = new URLSearchParams();
    if (search) usp.set("q", search);
    if (status !== "all") usp.set("status", status);
    if (clazz !== "all") usp.set("classId", clazz);
    if (page > 1) usp.set("page", String(page));
    if (sortKey !== "createdAt") usp.set("sortKey", sortKey);
    if (sortDir !== "desc") usp.set("sortDir", sortDir);
    const qs = usp.toString();
    router.replace(`/dashboard/teacher/assignments${qs ? `?${qs}` : ""}`);
  }, [search, status, clazz, page, sortKey, sortDir, router]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Bài tập", href: "/dashboard/teacher/assignments" },
  ];

  const quickValue = ((["all", "active", "completed", "needGrading"].includes(status) ? status : "all") as
    | "all"
    | "active"
    | "completed"
    | "needGrading");
  type QuickKeyT = "all" | "active" | "completed" | "needGrading" | "archived";
  const handleQuickChange = (key: QuickKeyT) => {
    const mapped = key === "archived" ? "all" : key;
    setStatus(mapped as any);
    setPage(1);
  };

  return (
    <div className="px-6 py-4 max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-1" />
      <PageHeader role="teacher" title="Quản lý bài tập" subtitle="Tạo và quản lý bài tập cho học sinh của bạn." badge={
        <Button onClick={() => router.push("/dashboard/teacher/assignments/new")} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Tạo bài tập mới
        </Button>
      }/>

      {/* Stats */}
      <AssignmentStatsGrid />

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        color="blue"
        placeholder="Tìm kiếm bài tập..."
        right={
          <>
            <AdvancedFiltersPopover
              status={status as any}
              onStatusChange={(s) => { setStatus(s as any); setPage(1); }}
              classId={clazz}
              onClassChange={(id) => { setClazz(id); setPage(1); }}
              classrooms={classrooms || []}
            />
            <button
              type="button"
              onClick={() => {
                const headers = ["id","title","type","openAt","dueOrLock","submissions","createdAt"];
                const rows = items.map((a) => [
                  a.id,
                  a.title,
                  a.type,
                  a.openAt ?? "",
                  a.lockAt || a.dueDate || "",
                  a._count?.submissions ?? 0,
                  a.createdAt,
                ]);
                exportToCsv("assignments", headers, rows);
              }}
              className="inline-flex items-center gap-2 h-11 rounded-xl border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              aria-label="Xuất CSV theo bộ lọc"
            >
              Export CSV
            </button>
            <ViewToggle value={view} onChange={setView} />
          </>
        }
        bottom={
          <div className="flex flex-wrap items-center gap-2">
            <QuickFilterChips value={quickValue} onChange={handleQuickChange} counts={counts ?? undefined} />
            {status === "draft" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold">
                Trạng thái: Bản nháp
                <button aria-label="Clear status" onClick={() => setStatus("all")} className="hover:underline">x</button>
              </span>
            )}
            {clazz !== "all" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 text-xs font-semibold">
                Lớp: {(classrooms || []).find((c) => c.id === clazz)?.name || clazz}
                <button aria-label="Clear class" onClick={() => setClazz("all")} className="hover:underline">x</button>
              </span>
            )}
          </div>
        }
      />

      {/* Sort + Pagination */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Sắp xếp:</span>
          <Select value={sortKey} onChange={(e) => { setSortKey(e.target.value as any); setPage(1); }} color="blue" className="h-9 min-w-[140px]">
            <option value="createdAt">Ngày tạo</option>
            <option value="dueDate">Hạn</option>
            <option value="lockAt">Đóng bài</option>
            <option value="title">Tiêu đề</option>
          </Select>
          <Select value={sortDir} onChange={(e) => { setSortDir(e.target.value as any); setPage(1); }} color="blue" className="h-9 min-w-[110px]">
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}</span>
          <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Trước</Button>
          <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / pageSize)}>Sau</Button>
        </div>
      </div>

      {/* Content */}
      {view === "list" ? (
        <AssignmentList
          items={items}
          loading={loading}
          error={error}
          onRefresh={refresh}
          onDuplicate={(id) => {
            const found = items.find((x) => x.id === id) || null;
            setDupTarget(found);
          }}
        />
      ) : (
        <AssignmentTable
          items={items}
          onView={(id) => setPreview(items.find((x) => x.id === id) || null)}
          onEdit={(id) => router.push(`/dashboard/teacher/assignments/${id}/edit`)}
          onSubmissions={(id) => router.push(`/dashboard/teacher/assignments/${id}/submissions`)}
          onDelete={(id) => router.push(`/dashboard/teacher/assignments/${id}`)}
          onDuplicate={(id) => {
            const found = items.find((x) => x.id === id) || null;
            setDupTarget(found);
          }}
        />
      )}

      <AssignmentQuickPreview
        assignment={preview}
        open={!!preview}
        onOpenChange={(v) => !v && setPreview(null)}
        onViewDetail={(id) => router.push(`/dashboard/teacher/assignments/${id}`)}
        onEdit={(id) => router.push(`/dashboard/teacher/assignments/${id}/edit`)}
        onSubmissions={(id) => router.push(`/dashboard/teacher/assignments/${id}/submissions`)}
      />

      <DuplicateAssignmentDialog
        open={!!dupTarget}
        onOpenChange={(v) => !v && !dupLoading && setDupTarget(null)}
        defaultTitle={dupTarget?.title || ""}
        loading={dupLoading}
        onConfirm={async (title, copyClassrooms) => {
          if (!dupTarget) return;
          try {
            setDupLoading(true);
            const res = await fetch(`/api/teachers/assignments/${dupTarget.id}/duplicate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, copyClassrooms }),
            });
            const json = await res.json().catch(() => ({} as any));
            if (!res.ok || json?.success === false) {
              throw new Error(json?.message || "Nhân bản thất bại");
            }
            const newId: string | undefined = json?.data?.id;
            toast({ title: "Đã nhân bản bài tập", variant: "success" });
            setDupTarget(null);
            if (newId) {
              router.push(`/dashboard/teacher/assignments/${newId}/edit`);
            } else {
              refresh();
            }
          } catch (e: any) {
            toast({ title: e?.message || "Có lỗi xảy ra", variant: "destructive" });
          } finally {
            setDupLoading(false);
          }
        }}
      />
    </div>
  );
}
