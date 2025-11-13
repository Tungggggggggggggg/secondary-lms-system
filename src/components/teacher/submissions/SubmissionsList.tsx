"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTeacherSubmissions,
  TeacherSubmission,
} from "@/hooks/use-teacher-submissions";
import SubmissionCard from "./SubmissionCard";
import GradeSubmissionDialog from "./GradeSubmissionDialog";
import { SubmissionDetail } from "@/hooks/use-teacher-submissions";

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

  // Handle search
  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  // Handle grade button click
  const handleGrade = async (submission: TeacherSubmission) => {
    // If file-based submission, fetch file list and create a minimal detail object
    if (submission.isFileSubmission) {
      try {
        const resp = await fetch(`/api/submissions/${submission.id}/files`);
        const j = await resp.json();
        if (j.success) {
          setFileList(j.data.files || []);
        } else {
          setFileList(undefined);
        }
      } catch {
        setFileList(undefined);
      }
      const mock: SubmissionDetail = {
        ...submission,
        assignment: { id: assignmentId, title: "", type: "ESSAY", dueDate: null },
      } as any;
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
      if ((selectedSubmission as any).isFileSubmission) {
        // Grade file-based submission via file-grade endpoint
        const res = await fetch(`/api/assignments/${assignmentId}/file-grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: (selectedSubmission as any).student.id, grade, feedback }),
        });
        const j = await res.json();
        if (!res.ok || !j.success) throw new Error(j?.message || "Chấm điểm thất bại");
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600">Tổng số bài nộp</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600">Đã chấm</p>
          <p className="text-2xl font-bold text-green-600">{stats.graded}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600">Chưa chấm</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.ungraded}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600">Điểm trung bình</p>
          <p className="text-2xl font-bold text-indigo-600">
            {stats.averageGrade?.toFixed(1) || "-"}
          </p>
        </div>
      </div>

      {/* Filters và Search */}
      <div className="bg-white rounded-lg p-4 shadow flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm theo tên học sinh..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </div>
        <Button onClick={handleSearch} variant="outline">
          Tìm kiếm
        </Button>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả
          </Button>
          <Button
            variant={statusFilter === "graded" ? "default" : "outline"}
            onClick={() => setStatusFilter("graded")}
          >
            Đã chấm
          </Button>
          <Button
            variant={statusFilter === "ungraded" ? "default" : "outline"}
            onClick={() => setStatusFilter("ungraded")}
          >
            Chưa chấm
          </Button>
        </div>
      </div>

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

