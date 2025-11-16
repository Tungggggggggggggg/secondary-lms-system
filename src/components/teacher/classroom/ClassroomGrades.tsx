"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  student: { id: string; fullname: string; email: string };
  assignment: { id: string; title: string; type: string; dueDate: string | null };
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  status: "submitted" | "graded";
};

export default function ClassroomGrades() {
  const cardRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const classroomId = params.classroomId as string;

  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | "graded" | "ungraded">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
  }, [rows]);

  useEffect(() => {
    async function load() {
      if (!classroomId) return;
      try {
        setIsLoading(true);
        setError(null);
        const usp = new URLSearchParams();
        if (status !== "all") usp.set("status", status);
        if (search.trim()) usp.set("search", search.trim());
        const res = await fetch(`/api/teachers/classrooms/${classroomId}/grades?${usp.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải bảng điểm");
        setRows(json.data || []);
      } catch (e: any) {
        setError(e?.message || "Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [classroomId, status, search]);

  // Debounce 300ms for search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const aTime = a.submittedAt
        ? new Date(a.submittedAt).getTime()
        : a.assignment.dueDate
        ? new Date(a.assignment.dueDate).getTime()
        : 0;
      const bTime = b.submittedAt
        ? new Date(b.submittedAt).getTime()
        : b.assignment.dueDate
        ? new Date(b.assignment.dueDate).getTime()
        : 0;
      return bTime - aTime;
    });
    return copy;
  }, [rows]);

  return (
    <div ref={cardRef} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Bảng điểm</h2>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 border rounded-md"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="all">Tất cả</option>
            <option value="graded">Đã chấm</option>
            <option value="ungraded">Chưa chấm</option>
          </select>
          <Input
            placeholder="Tìm theo HS hoặc bài tập..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Học sinh</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Bài tập</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Hạn nộp</TableHead>
                <TableHead>Đã nộp</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.student.fullname}</TableCell>
                  <TableCell className="text-gray-500">{r.student.email}</TableCell>
                  <TableCell>{r.assignment.title}</TableCell>
                  <TableCell>{r.assignment.type}</TableCell>
                  <TableCell>{r.assignment.dueDate ? new Date(r.assignment.dueDate).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    {r.submittedAt
                      ? new Date(r.submittedAt).toLocaleString()
                      : "Chưa nộp"}
                  </TableCell>
                  <TableCell>{r.grade ?? "—"}</TableCell>
                  <TableCell>{r.status === "graded" ? "Đã chấm" : "Chưa chấm"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


