"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Award, CheckCircle2, Clock, ChevronDown, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useParentGrades, GradeEntry } from "@/hooks/use-parent-grades";
import type { ParentStudentRelationship } from "@/types/parent";

// types imported from shared module; SWR fetcher is provided globally

/**
 * Trang Ä‘iá»ƒm sá»‘ cá»§a con (parent view)
 */
export default function ParentChildGradesPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { data: session } = useSession();
  const router = useRouter();

  const { grades, statistics, isLoading, error, fetchChildGrades } = useParentGrades();
  const [sortBy, setSortBy] = useState<
    "newest" | "grade_desc" | "grade_asc" | "due_date" | "classroom"
  >("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<
    { assignmentTitle: string; feedback: string } | null
  >(null);

  // Láº¥y thÃ´ng tin con Ä‘á»ƒ hiá»ƒn thá»‹ tÃªn
  const { data: childrenData, error: childrenError, isLoading: childrenLoading } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
    error?: string;
  }>("/api/parent/children");

  const children = (childrenData?.success && childrenData?.items) ? childrenData.items : [];
  const selectedChild = children.find((rel) => rel.student.id === childId || rel.studentId === childId);

  // Load grades khi component mount
  useEffect(() => {
    if (childId) {
      fetchChildGrades(childId);
    }
  }, [childId, fetchChildGrades]);

  // Filter vÃ  sort grades
  const filteredAndSortedGrades = useMemo(() => {
    let filtered = [...grades];

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.assignmentTitle.toLowerCase().includes(query) ||
          g.classroom?.name.toLowerCase().includes(query) ||
          g.feedback?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "grade_desc":
        filtered.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeB - gradeA; // Äiá»ƒm cao nháº¥t trÆ°á»›c
        });
        break;
      case "grade_asc":
        filtered.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeA - gradeB; // Äiá»ƒm tháº¥p nháº¥t trÆ°á»›c
        });
        break;
      case "due_date":
        filtered.sort((a, b) => {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return timeA - timeB; // Gáº§n háº¡n ná»™p trÆ°á»›c
        });
        break;
      case "classroom":
        filtered.sort((a, b) => {
          const nameA = a.classroom?.name || "";
          const nameB = b.classroom?.name || "";
          return nameA.localeCompare(nameB);
        });
        break;
      case "newest":
      default:
        filtered.sort((a, b) => {
          const timeA = a.submittedAt
            ? new Date(a.submittedAt).getTime()
            : 0;
          const timeB = b.submittedAt
            ? new Date(b.submittedAt).getTime()
            : 0;
          return timeB - timeA;
        });
        break;
    }

    return filtered;
  }, [grades, sortBy, searchQuery]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "â€”";
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getGradeBadgeClass = (grade: number | null) => {
    if (grade === null) {
      return "bg-amber-50 text-amber-700 border border-amber-100";
    }
    if (grade >= 5) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    }
    return "bg-rose-50 text-rose-700 border border-rose-100";
  };

  const getStatusBadge = (status: GradeEntry["status"]) => {
    switch (status) {
      case "graded":
        return {
          label: "ÄÃ£ cháº¥m",
          className:
            "bg-emerald-50 text-emerald-700 border border-emerald-100",
        };
      case "submitted":
        return {
          label: "Chá» cháº¥m",
          className: "bg-amber-50 text-amber-700 border border-amber-100",
        };
      default:
        return {
          label: "ChÆ°a ná»™p",
          className: "bg-slate-50 text-slate-700 border border-slate-200",
        };
    }
  };

  const handleOpenFeedback = (grade: GradeEntry) => {
    if (!grade.feedback) return;
    setSelectedFeedback({
      assignmentTitle: grade.assignmentTitle,
      feedback: grade.feedback,
    });
    setFeedbackOpen(true);
  };

  // Export CSV helper
  function toCsvValue(v: unknown): string {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv() {
    const rows: string[] = [];
    rows.push([
      "Lá»›p há»c",
      "BÃ i táº­p",
      "Loáº¡i",
      "Äiá»ƒm",
      "Nháº­n xÃ©t",
      "NgÃ y ná»™p",
    ].map(toCsvValue).join(","));

    for (const g of filteredAndSortedGrades) {
      rows.push([
        g.classroom?.name || "",
        g.assignmentTitle,
        g.assignmentType,
        g.grade !== null && g.grade !== undefined ? g.grade.toFixed(1) : "",
        g.feedback || "",
        g.submittedAt ? new Date(g.submittedAt).toISOString() : "",
      ].map(toCsvValue).join(","));
    }

    const csv = "\ufeff" + rows.join("\n"); // BOM UTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diem-so-${selectedChild?.student.fullname || childId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (childrenLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Äang táº£i...</p>
        </div>
      </div>
    );
  }

  if (childrenError || !childrenData?.success || !selectedChild) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin há»c sinh</h3>
          <p className="text-sm mb-4">Vui lÃ²ng quay láº¡i danh sÃ¡ch con.</p>
          <Link href="/dashboard/parent/children">
            <Button>Quay láº¡i</Button>
          </Link>
        </div>
      </div>
    );
  }

  const student = selectedChild.student;

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Link href={`/dashboard/parent/children/${childId}`}>
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay láº¡i
            </Button>
          </Link>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lá»—i táº£i danh sÃ¡ch Ä‘iá»ƒm sá»‘</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={() => fetchChildGrades(childId)}>Thá»­ láº¡i</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <div>
        <Link href={`/dashboard/parent/children/${childId}`}>
          <Button variant="ghost" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay láº¡i
          </Button>
        </Link>
      </div>

      {/* Header + Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mb-1">
            Äiá»ƒm sá»‘ cá»§a {student.fullname}
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Tá»•ng há»£p káº¿t quáº£ há»c táº­p cá»§a con báº¡n á»Ÿ táº¥t cáº£ lá»›p há»c.
          </p>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <Button onClick={downloadCsv} className="rounded-full px-5">
            Xuáº¥t CSV
          </Button>
        </div>
      </div>

      {/* KPI Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(16,185,129,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white shadow-md">
            <Award className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-emerald-700/80 uppercase">
              Äiá»ƒm trung bÃ¬nh
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {statistics.averageGrade > 0
                ? statistics.averageGrade.toFixed(1)
                : "N/A"}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-sky-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(56,189,248,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-sky-700/80 uppercase">
              ÄÃ£ cháº¥m
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {statistics.totalGraded ?? 0}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(251,191,36,0.18)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-md">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-amber-700/80 uppercase">
              ChÆ°a cháº¥m
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {statistics.totalPending ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Filter vÃ  Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Sáº¯p xáº¿p theo
          </span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "newest"
                    | "grade_desc"
                    | "grade_asc"
                    | "due_date"
                    | "classroom"
                )
              }
              className="appearance-none px-4 pr-9 py-2 bg-white/90 rounded-full border border-amber-200 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            >
              <option value="newest">Má»›i nháº¥t</option>
              <option value="grade_desc">Äiá»ƒm cao nháº¥t</option>
              <option value="grade_asc">Äiá»ƒm tháº¥p nháº¥t</option>
              <option value="due_date">Háº¡n ná»™p</option>
              <option value="classroom">Theo lá»›p há»c</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500/70" />
          </div>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="TÃ¬m kiáº¿m bÃ i táº­p hoáº·c lá»›p há»c..."
          className="flex-1 px-4 py-2 bg-white/90 rounded-full border border-amber-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
        />
      </div>

      {/* Grades Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">
          Äang táº£i danh sÃ¡ch Ä‘iá»ƒm sá»‘...
        </div>
      ) : filteredAndSortedGrades.length === 0 ? (
        <div className="bg-white/90 rounded-3xl p-10 text-center border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="text-5xl mb-4">ðŸ“Š</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            ChÆ°a cÃ³ Ä‘iá»ƒm sá»‘ nÃ o
          </h3>
          <p className="text-slate-600">
            {grades.length === 0
              ? "Con báº¡n chÆ°a cÃ³ bÃ i ná»™p nÃ o Ä‘Æ°á»£c cháº¥m Ä‘iá»ƒm"
              : "KhÃ´ng tÃ¬m tháº¥y Ä‘iá»ƒm sá»‘ nÃ o phÃ¹ há»£p vá»›i bá»™ lá»c"}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white/90 rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-amber-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50/60">
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Lá»›p há»c</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">BÃ i táº­p</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Loáº¡i</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Äiá»ƒm</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Nháº­n xÃ©t</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">NgÃ y ná»™p</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Tráº¡ng thÃ¡i</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedGrades.map((grade) => {
                  const statusBadge = getStatusBadge(grade.status);
                  return (
                    <TableRow
                      key={grade.id}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      <TableCell>
                        {grade.classroom ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{grade.classroom.icon}</span>
                            <span className="font-medium text-slate-900">
                              {grade.classroom.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {grade.assignmentTitle}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                            grade.assignmentType === "ESSAY"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-orange-50 text-orange-700 border border-orange-100"
                          }`}
                        >
                          {grade.assignmentType === "ESSAY"
                            ? "ðŸ“ Tá»± luáº­n"
                            : "â“ Tráº¯c nghiá»‡m"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {grade.grade !== null ? (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getGradeBadgeClass(
                              grade.grade,
                            )}`}
                          >
                            {grade.grade.toFixed(1)}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getGradeBadgeClass(
                              null,
                            )}`}
                          >
                            ChÆ°a cháº¥m
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {grade.feedback ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(grade)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-200 transition-colors shadow-sm"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Xem</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">KhÃ´ng cÃ³</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {grade.submittedAt ? formatDate(grade.submittedAt) : "ChÆ°a ná»™p"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {selectedFeedback && (
            <Dialog
              open={feedbackOpen}
              onOpenChange={(open: boolean) => {
                setFeedbackOpen(open);
                if (!open) {
                  setSelectedFeedback(null);
                }
              }}
            >
              <DialogContent onClose={() => setFeedbackOpen(false)}>
                <DialogHeader>
                  <DialogTitle>Nháº­n xÃ©t cá»§a giÃ¡o viÃªn</DialogTitle>
                  <DialogDescription>
                    BÃ i táº­p: <span className="font-medium">{selectedFeedback.assignmentTitle}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4 text-sm text-slate-800 whitespace-pre-line max-h-[50vh] overflow-y-auto">
                  {selectedFeedback.feedback}
                </div>
                <DialogFooter>
                  <Button onClick={() => setFeedbackOpen(false)}>ÄÃ³ng</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}



