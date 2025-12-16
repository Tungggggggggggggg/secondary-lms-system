"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTeacherSubmissions,
  TeacherSubmission,
} from "@/hooks/use-teacher-submissions";
import SubmissionCard from "./SubmissionCard";
import GradeSubmissionDialog from "./GradeSubmissionDialog";
import { SubmissionDetail } from "@/hooks/use-teacher-submissions";
import { StatsGrid } from "@/components/shared";
import { FilterBar } from "@/components/shared";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, CheckCircle2, Clock, Award } from "lucide-react";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStatusFilter(value: string): "all" | "graded" | "ungraded" {
  if (value === "all" || value === "graded" || value === "ungraded") return value;
  return "all";
}

interface SubmissionsListProps {
  assignmentId: string;
  assignmentType: "ESSAY" | "QUIZ";
}

/**
 * Component hiển thị danh sách submissions với filter và search
 */
export default function SubmissionsList({
  assignmentId,
  assignmentType,
}: SubmissionsListProps) {
  const {
    submissions,
    isLoading,
    error,
    pagination,
    fetchSubmissions,
    fetchSubmissionDetail,
    gradeSubmission,
    getStatistics,
  } = useTeacherSubmissions();

  const [statusFilter, setStatusFilter] = useState<"all" | "graded" | "ungraded">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionDetail | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fileList, setFileList] = useState<Array<{ fileName: string; mimeType: string; url: string | null }> | undefined>(undefined);

  // Fetch submissions khi filter thay đổi
  useEffect(() => {
    // Validation assignmentId trước khi fetch
    if (!assignmentId || assignmentId === "undefined" || assignmentId === "null") {
      console.error(`[SubmissionsList] AssignmentId không hợp lệ: "${assignmentId}"`);
      return;
    }

    console.log(`[SubmissionsList] Fetching submissions cho assignment: ${assignmentId}`);
    console.log(`[SubmissionsList] Filters:`, { statusFilter, searchQuery });
    
    fetchSubmissions(assignmentId, {
      status: statusFilter,
      search: searchQuery || undefined,
    });
  }, [assignmentId, statusFilter, searchQuery, fetchSubmissions]);

  // Debounce tìm kiếm 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Handle grade button click
  const handleGrade = async (submission: TeacherSubmission) => {
    // If file-based submission, fetch file list and create a minimal detail object
    if (submission.isFileSubmission) {
      try {
        const resp = await fetch(`/api/submissions/${submission.id}/files`);
        const raw: unknown = await resp.json().catch(() => null);
        if (isRecord(raw) && raw.success === true && isRecord(raw.data) && Array.isArray(raw.data.files)) {
          const files = raw.data.files
            .filter((f) => isRecord(f))
            .map((f) => ({
              fileName: typeof f.fileName === "string" ? f.fileName : "file",
              mimeType: typeof f.mimeType === "string" ? f.mimeType : "application/octet-stream",
              url: typeof f.url === "string" ? f.url : null,
            }));
          setFileList(files);
        } else {
          setFileList(undefined);
        }
      } catch {
        setFileList(undefined);
      }

      const mock: SubmissionDetail = {
        ...submission,
        assignment: { id: assignmentId, title: "", type: "ESSAY", dueDate: null },
        presentation: null,
        contentSnapshot: null,
        answers: [],
      };
      setSelectedSubmission(mock);
      setIsDialogOpen(true);
      return;
    }
    const detail = await fetchSubmissionDetail(assignmentId, submission.id);
    if (detail) {
      setFileList(undefined);
      setSelectedSubmission(detail);
      setIsDialogOpen(true);
    }
  };

  // Handle grade submission
  const handleGradeSubmit = async (grade: number, feedback?: string) => {
    if (!selectedSubmission) return false;
    try {
      if (selectedSubmission.isFileSubmission) {
        // Grade file-based submission via file-grade endpoint
        const res = await fetch(`/api/assignments/${assignmentId}/file-grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: selectedSubmission.student.id, grade, feedback }),
        });
        const raw: unknown = await res.json().catch(() => null);
        const ok = isRecord(raw) && raw.success === true;
        const message = isRecord(raw) && typeof raw.message === "string" ? raw.message : undefined;
        if (!res.ok || !ok) throw new Error(message || "Chấm điểm thất bại");
      } else {
        const ok = await gradeSubmission(assignmentId, selectedSubmission.id, grade, feedback);
        if (!ok) return false;
      }
      // Refresh submissions
      fetchSubmissions(assignmentId, {
        status: statusFilter,
        search: searchQuery || undefined,
      });
      return true;
    } catch (e) {
      console.error("[handleGradeSubmit]", e);
      return false;
    }
  };

  const stats = getStatistics();

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h3 className="font-semibold mb-2">Lỗi tải danh sách bài nộp</h3>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={() => fetchSubmissions(assignmentId)}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <StatsGrid
        items={[
          { icon: <Inbox className="h-5 w-5" />, color: "from-blue-200 to-sky-200", label: "Bài nộp", value: String(stats.total) },
          { icon: <CheckCircle2 className="h-5 w-5" />, color: "from-green-200 to-emerald-200", label: "Đã chấm", value: String(stats.graded) },
          { icon: <Clock className="h-5 w-5" />, color: "from-amber-200 to-orange-200", label: "Chưa chấm", value: String(stats.ungraded) },
          { icon: <Award className="h-5 w-5" />, color: "from-blue-200 to-sky-200", label: "Điểm TB", value: stats.averageGrade != null ? stats.averageGrade.toFixed(1) : "-" },
        ]}
      />

      {/* Filters và Search */}
      <FilterBar
        search={searchInput}
        onSearchChange={setSearchInput}
        color="blue"
        placeholder="Tìm kiếm theo tên học sinh..."
        bottom={
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(parseStatusFilter(v))}>
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-blue-100/60 text-blue-700">
              <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-blue-900">Tất cả</TabsTrigger>
              <TabsTrigger value="graded" className="data-[state=active]:bg-white data-[state=active]:text-blue-900">Đã chấm</TabsTrigger>
              <TabsTrigger value="ungraded" className="data-[state=active]:bg-white data-[state=active]:text-blue-900">Chưa chấm</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Submissions List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center">
          <p className="text-gray-500 text-lg">
            {searchQuery || statusFilter !== "all"
              ? "Không tìm thấy bài nộp nào"
              : "Chưa có học sinh nào nộp bài"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((submission) => (
              <SubmissionCard
              key={submission.id}
              submission={submission}
              assignmentType={assignmentType}
                onGrade={handleGrade}
                assignmentId={assignmentId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() =>
              fetchSubmissions(assignmentId, {
                status: statusFilter,
                search: searchQuery || undefined,
                page: pagination.page + 1,
              })
            }
            disabled={isLoading}
          >
            Tải thêm
          </Button>
        </div>
      )}

      {/* Grade Dialog */}
      <GradeSubmissionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        submission={selectedSubmission}
        assignmentId={assignmentId}
        onGrade={handleGradeSubmit}
        fileList={fileList}
      />
    </div>
  );
}

