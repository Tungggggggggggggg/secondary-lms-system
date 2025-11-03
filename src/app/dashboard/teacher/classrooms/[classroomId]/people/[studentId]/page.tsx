"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type GradeRow = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  dueDate?: string | null;
  status: "pending" | "submitted" | "graded";
};

export default function TeacherStudentDetailPage() {
  const { classroomId, studentId } = useParams() as { classroomId: string; studentId: string };
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "grade">("newest");

  useEffect(() => {
    async function load() {
      if (!classroomId || !studentId) return;
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/teachers/classrooms/${classroomId}/students/${studentId}/grades`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải điểm");
        setRows(json.data || []);
      } catch (e: any) {
        setError(e?.message || "Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [classroomId, studentId]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    switch (sortBy) {
      case "oldest":
        copy.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        break;
      case "grade":
        copy.sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0));
        break;
      case "newest":
      default:
        copy.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        break;
    }
    return copy;
  }, [rows, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold">Bảng điểm của học sinh</div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={sortBy === "newest" ? "default" : "outline"} onClick={() => setSortBy("newest")}>Mới nhất</Button>
          <Button variant={sortBy === "oldest" ? "default" : "outline"} onClick={() => setSortBy("oldest")}>Cũ nhất</Button>
          <Button variant={sortBy === "grade" ? "default" : "outline"} onClick={() => setSortBy("grade")}>Điểm cao</Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bài tập</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Hạn nộp</TableHead>
              <TableHead>Đã nộp</TableHead>
              <TableHead>Điểm</TableHead>
              <TableHead>Nhận xét</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.assignmentTitle}</TableCell>
                <TableCell>{g.assignmentType}</TableCell>
                <TableCell>{g.dueDate ? new Date(g.dueDate).toLocaleString() : "—"}</TableCell>
                <TableCell>{new Date(g.submittedAt).toLocaleString()}</TableCell>
                <TableCell>{g.grade ?? "—"}</TableCell>
                <TableCell className="max-w-[320px] truncate" title={g.feedback || undefined}>{g.feedback || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


