"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DragEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import ErrorBanner from "@/components/shared/ErrorBanner";
import EmptyState from "@/components/shared/EmptyState";
import AdminClassroomOverview from "@/components/admin/AdminClassroomOverview";
import AdminStudentsSelectionBar from "@/components/admin/AdminStudentsSelectionBar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { usePrompt } from "@/components/providers/PromptProvider";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Input from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import fetcher from "@/lib/fetcher";

type TeacherOption = {
  id: string;
  fullname: string | null;
  email: string;
};

type ClassroomDetail = {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  description: string | null;
  maxStudents: number;
  isActive: boolean;
  createdAt: string;
  teacher: { id: string; fullname: string | null; email: string } | null;
  _count: { students: number };
};

type ClassroomStudentItem = {
  id: string;
  email: string;
  fullname: string | null;
  role: string;
  joinedAt: string;
};

type StudentsResponse = {
  classroom: { id: string; name: string; code: string };
  items: ClassroomStudentItem[];
  page: number;
  pageSize: number;
  total: number;
};

type BulkCreateStudentEntry = {
  email: string;
  fullname?: string | null;
};

function parseStudentLine(line: string): BulkCreateStudentEntry | null {
  const raw = line.trim();
  if (!raw) return null;

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  // Ưu tiên tìm token trông giống email ở bất kỳ cột nào (CSV có thể nhiều cột)
  const emailToken = parts.find((p) => p.includes("@")) || "";
  if (!emailToken) return null;

  // Fullname mặc định lấy từ cột đầu tiên (nếu khác email)
  const maybeFullname = parts[0] && parts[0] !== emailToken ? parts[0] : "";
  return { email: emailToken, fullname: maybeFullname || null };
}

export default function AdminClassroomDetailPage() {
  const { toast } = useToast();
  const prompt = usePrompt();
  const router = useRouter();
  const params = useParams();
  const rawId = (params as unknown as { id?: string | string[] })?.id;
  const classroomId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);

  const [forceDeleting, setForceDeleting] = useState(false);

  const isArchived = !!classroom && !classroom.isActive;

  // Teachers (for Change Teacher dialog)
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [teacherQuery, setTeacherQuery] = useState("");

  // Edit classroom dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editMaxStudents, setEditMaxStudents] = useState("30");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Change teacher dialog
  const [changeTeacherOpen, setChangeTeacherOpen] = useState(false);
  const [changeTeacherId, setChangeTeacherId] = useState("");
  const [changeTeacherReason, setChangeTeacherReason] = useState("");
  const [changeTeacherSubmitting, setChangeTeacherSubmitting] = useState(false);
  const [changeTeacherError, setChangeTeacherError] = useState<string | null>(null);

  // Bulk add students dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkCreateMissing, setBulkCreateMissing] = useState(false);
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<
    | {
        added: number;
        createdAccounts: number;
        skippedAlreadyInClass: number;
        failed: number;
      }
    | null
  >(null);
  const [bulkIssuesOpen, setBulkIssuesOpen] = useState(false);
  const [bulkIssues, setBulkIssues] = useState<Array<{ email: string; reason: string }>>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkDragOver, setBulkDragOver] = useState(false);

  // Students list
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [students, setStudents] = useState<ClassroomStudentItem[]>([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize] = useState(20);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [studentsActionId, setStudentsActionId] = useState<string | null>(null);

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set());
  const [bulkRemoving, setBulkRemoving] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const totalStudentPages = useMemo(
    () => Math.max(1, Math.ceil(studentsTotal / studentsPageSize)),
    [studentsTotal, studentsPageSize]
  );

  const pageStudentIds = useMemo(() => students.map((s) => s.id), [students]);
  const selectedCount = useMemo(() => selectedStudentIds.size, [selectedStudentIds]);
  const selectedOnPageCount = useMemo(() => {
    let count = 0;
    for (const id of pageStudentIds) {
      if (selectedStudentIds.has(id)) count++;
    }
    return count;
  }, [pageStudentIds, selectedStudentIds]);
  const allSelectedOnPage = useMemo(() => {
    return pageStudentIds.length > 0 && selectedOnPageCount === pageStudentIds.length;
  }, [pageStudentIds.length, selectedOnPageCount]);
  const someSelectedOnPage = useMemo(() => {
    return selectedOnPageCount > 0 && selectedOnPageCount < pageStudentIds.length;
  }, [pageStudentIds.length, selectedOnPageCount]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someSelectedOnPage;
  }, [someSelectedOnPage, allSelectedOnPage]);

  const fetchClassroom = async () => {
    if (!classroomId) return;
    try {
      setLoading(true);
      setError(null);

      const json = await fetcher<{ success: true; data: ClassroomDetail }>(
        `/api/admin/classrooms/${classroomId}`
      );
      setClassroom(json.data as ClassroomDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setClassroom(null);
    } finally {
      setLoading(false);
    }
  };

  const forceDeleteClassroom = async () => {
    if (!classroomId || !classroom) return;
    if (classroom.isActive) {
      toast({
        title: "Chưa thể xóa vĩnh viễn",
        description: "Vui lòng lưu trữ lớp trước khi force delete.",
        variant: "destructive",
      });
      return;
    }

    const reasonInput = await prompt({
      title: "Xóa vĩnh viễn lớp (Force delete)",
      description: "Hành động này sẽ xóa vĩnh viễn lớp và dữ liệu liên quan. Vui lòng nhập lý do bắt buộc.",
      placeholder: "VD: Lớp vi phạm quy định / tạo nhầm / dữ liệu rác…",
      type: "textarea",
      confirmText: "Tiếp tục",
      cancelText: "Hủy",
      validate: (v) => {
        const trimmed = v.trim();
        if (!trimmed) return "Vui lòng nhập lý do";
        if (trimmed.length > 500) return "Vui lòng nhập tối đa 500 ký tự";
        return null;
      },
    });
    if (reasonInput === null) return;

    const confirmInput = await prompt({
      title: "Xác nhận mã lớp",
      description: `Nhập chính xác mã lớp để xác nhận xóa vĩnh viễn: ${classroom.code}`,
      placeholder: classroom.code,
      type: "text",
      confirmText: "Xóa vĩnh viễn",
      cancelText: "Hủy",
      validate: (v) => {
        const typed = v.trim().toUpperCase();
        const expected = classroom.code.trim().toUpperCase();
        if (!typed) return "Vui lòng nhập mã lớp";
        if (typed !== expected) return "Mã lớp không khớp";
        return null;
      },
    });
    if (confirmInput === null) return;

    try {
      setForceDeleting(true);
      const res = await fetch(`/api/admin/classrooms/${classroomId}/force-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonInput.trim(), confirm: confirmInput.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể xóa vĩnh viễn lớp");
      }

      toast({
        title: "Đã xóa lớp vĩnh viễn",
        description: `${classroom.code} — ${classroom.name}`,
        variant: "success",
      });

      router.push("/dashboard/admin/classrooms");
    } catch (err) {
      toast({
        title: "Không thể xóa vĩnh viễn",
        description: err instanceof Error ? err.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setForceDeleting(false);
    }
  };

  const fetchTeachers = async (q: string) => {
    try {
      setTeachersLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (q.trim()) params.set("q", q.trim());

      const json = await fetcher<{ success: true; data?: { items?: unknown } }>(
        `/api/admin/teachers?${params.toString()}`
      );
      const data = json.data as { items?: TeacherOption[] };
      setTeacherOptions(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setTeacherOptions([]);
    } finally {
      setTeachersLoading(false);
    }
  };

  const fetchStudents = async (nextPage = studentsPage, nextSearch = studentsSearch) => {
    if (!classroomId) return;
    try {
      setStudentsLoading(true);
      setStudentsError(null);

      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", String(studentsPageSize));
      if (nextSearch.trim()) params.set("q", nextSearch.trim());

      const json = await fetcher<{ success: true; data: StudentsResponse }>(
        `/api/admin/classrooms/${classroomId}/students?${params.toString()}`
      );

      const data = json.data as StudentsResponse;
      setStudents(Array.isArray(data?.items) ? data.items : []);
      setStudentsPage(data.page || nextPage);
      setStudentsTotal(data.total || 0);
    } catch (e) {
      setStudentsError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  useEffect(() => {
    if (!classroomId) return;
    fetchStudents(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  const openEdit = () => {
    if (!classroom) return;
    setEditError(null);
    setEditName(classroom.name);
    setEditCode(classroom.code);
    setEditMaxStudents(String(classroom.maxStudents ?? 30));
    setEditOpen(true);
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!classroomId) return;

    const maxStudents = parseInt(editMaxStudents || "0", 10);
    if (!editName.trim()) {
      setEditError("Vui lòng nhập tên lớp.");
      return;
    }
    if (!editCode.trim()) {
      setEditError("Vui lòng nhập mã lớp.");
      return;
    }
    if (!Number.isFinite(maxStudents) || maxStudents <= 0) {
      setEditError("Sĩ số tối đa không hợp lệ.");
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      const res = await fetch(`/api/admin/classrooms/${classroomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          maxStudents,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật lớp học");
      }

      toast({
        title: "Đã cập nhật lớp",
        description: `${editCode.trim().toUpperCase()} — ${editName.trim()}`,
        variant: "success",
      });
      setEditOpen(false);
      await fetchClassroom();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setEditError(message);
      toast({ title: "Không thể cập nhật", description: message, variant: "destructive" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const openChangeTeacher = () => {
    if (!classroom) return;
    setChangeTeacherError(null);
    setChangeTeacherReason("");
    setTeacherQuery("");
    setChangeTeacherId(classroom.teacher?.id || "");
    setChangeTeacherOpen(true);
    fetchTeachers("");
  };

  const submitChangeTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!classroomId) return;
    if (!changeTeacherId) {
      setChangeTeacherError("Vui lòng chọn giáo viên.");
      return;
    }

    try {
      setChangeTeacherSubmitting(true);
      setChangeTeacherError(null);

      const res = await fetch(`/api/admin/classrooms/${classroomId}/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: changeTeacherId, reason: changeTeacherReason.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể đổi giáo viên");
      }

      toast({ title: "Đã đổi giáo viên", description: "Thông tin lớp đã được cập nhật.", variant: "success" });
      setChangeTeacherOpen(false);
      await fetchClassroom();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setChangeTeacherError(message);
      toast({ title: "Không thể đổi giáo viên", description: message, variant: "destructive" });
    } finally {
      setChangeTeacherSubmitting(false);
    }
  };

  const openBulkAdd = () => {
    setBulkError(null);
    setBulkResult(null);
    setBulkText("");
    setBulkCreateMissing(false);
    setBulkDefaultPassword("");
    setBulkFileName(null);
    setBulkOpen(true);
  };

  const readBulkFile = async (file: File) => {
    const name = file.name || "";
    const lower = name.toLowerCase();
    if (!lower.endsWith(".csv") && !file.type.includes("csv")) {
      setBulkError("Chỉ hỗ trợ file CSV (có thể xuất từ Excel).");
      setBulkFileName(null);
      return;
    }

    const text = await file.text();
    setBulkText(text);
    setBulkFileName(name);
    setBulkError(null);
    setBulkResult(null);
  };

  const handleBulkFileChange = async (e: any) => {
    try {
      const file = e.target?.files?.[0] as File | undefined;
      if (!file) return;
      await readBulkFile(file);
    } catch {
      setBulkError("Không thể đọc file CSV. Vui lòng thử lại hoặc kiểm tra định dạng.");
      setBulkFileName(null);
    }
  };

  const handleBulkDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setBulkDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    try {
      await readBulkFile(file);
    } catch {
      setBulkError("Không thể đọc file CSV. Vui lòng thử lại hoặc kiểm tra định dạng.");
      setBulkFileName(null);
    }
  };

  const handleBulkDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!bulkDragOver) setBulkDragOver(true);
  };

  const handleBulkDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (bulkDragOver) setBulkDragOver(false);
  };

  const submitBulkAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!classroomId) return;

    try {
      setBulkSubmitting(true);
      setBulkError(null);
      setBulkResult(null);

      const lines = bulkText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setBulkError("Vui lòng nhập danh sách học sinh, mỗi dòng một email hoặc fullname,email");
        return;
      }

      const entries = lines
        .map((l) => parseStudentLine(l))
        .filter(Boolean) as BulkCreateStudentEntry[];

      if (entries.length === 0) {
        setBulkError("Không có dòng hợp lệ.");
        return;
      }

      const res = await fetch(`/api/admin/classrooms/${classroomId}/students/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          createMissing: bulkCreateMissing,
          defaultPassword: bulkDefaultPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể thêm học sinh");
      }

      const data = json.data as {
        created?: Array<{ email: string; studentId: string }>;
        accountsCreated?: Array<{ email: string; studentId: string }>;
        alreadyInClassroom?: number;
        skipped?: Array<{ email: string; reason: string }>;
      };

      const created = Array.isArray(data?.created) ? data.created : [];
      const accountsCreated = Array.isArray(data?.accountsCreated) ? data.accountsCreated : [];
      const skipped = Array.isArray(data?.skipped) ? data.skipped : [];

      const addedCount = created.length;
      const createdCount = accountsCreated.length;
      const skippedAlreadyInClass = skipped.filter((s) => (s?.reason || "").toLowerCase().includes("đã có trong lớp")).length;
      const failedCount = Math.max(0, skipped.length - skippedAlreadyInClass);

      const normalizedIssues = skipped
        .map((s) => {
          const email = (s?.email || "").toString().trim();
          const rawReason = (s?.reason || "").toString().trim();
          const reason =
            rawReason === "User not found"
              ? "Không tìm thấy tài khoản"
              : rawReason === "User is not a STUDENT"
              ? "Tài khoản không phải học sinh"
              : rawReason === "Failed to add"
              ? "Không thể thêm vào lớp"
              : rawReason || "Không xác định";
          return { email, reason };
        })
        .filter((x) => !!x.email);

      setBulkResult({
        added: addedCount,
        createdAccounts: createdCount,
        skippedAlreadyInClass,
        failed: failedCount,
      });

      toast({
        title: "Đã xử lý danh sách học sinh",
        description: `Thêm ${addedCount} học sinh. Tạo mới ${createdCount} tài khoản. Không thêm được ${normalizedIssues.length}.`,
        variant: "success",
      });

      setBulkOpen(false);
      await Promise.all([fetchClassroom(), fetchStudents(1, studentsSearch)]);

      if (normalizedIssues.length > 0) {
        setBulkIssues(normalizedIssues);
        setBulkIssuesOpen(true);
      } else {
        setBulkIssues([]);
        setBulkIssuesOpen(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setBulkError(message);
      toast({ title: "Không thể thêm học sinh", description: message, variant: "destructive" });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const removeStudent = async (studentId: string) => {
    if (!classroomId) return;
    if (isArchived) {
      toast({ title: "Lớp đã lưu trữ", description: "Vui lòng khôi phục để thao tác.", variant: "destructive" });
      return;
    }

    const confirm = await prompt({
      title: "Xóa học sinh khỏi lớp",
      description: "Học sinh sẽ bị gỡ khỏi lớp này. Bạn có chắc chắn?",
      confirmText: "Xóa",
      cancelText: "Hủy",
      type: "text",
      placeholder: "Nhập bất kỳ để xác nhận (tùy chọn)",
    });

    if (confirm === null) return;

    try {
      setStudentsActionId(studentId);
      const res = await fetch(`/api/admin/classrooms/${classroomId}/students/${studentId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể xóa học sinh");
      }
      toast({ title: "Đã xóa học sinh", variant: "success" });
      await Promise.all([fetchClassroom(), fetchStudents(studentsPage, studentsSearch)]);
    } catch (err) {
      toast({
        title: "Không thể xóa học sinh",
        description: err instanceof Error ? err.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setStudentsActionId(null);
    }
  };

  const toggleStudentSelected = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(studentId);
      else next.delete(studentId);
      return next;
    });
  };

  const toggleSelectAllOnPage = (checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      for (const id of pageStudentIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const bulkRemoveSelected = async () => {
    if (!classroomId) return;
    if (isArchived) {
      toast({ title: "Lớp đã lưu trữ", description: "Vui lòng khôi phục để thao tác.", variant: "destructive" });
      return;
    }

    const ids = Array.from(selectedStudentIds);
    if (ids.length === 0) return;

    const confirm = await prompt({
      title: "Xóa học sinh đã chọn",
      description: `Bạn sắp xóa ${ids.length} học sinh khỏi lớp. Thao tác này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      type: "text",
      placeholder: "Nhập bất kỳ để xác nhận (tùy chọn)",
    });
    if (confirm === null) return;

    try {
      setBulkRemoving(true);
      const results = await Promise.allSettled(
        ids.map(async (studentId) => {
          const res = await fetch(`/api/admin/classrooms/${classroomId}/students/${studentId}`, {
            method: "DELETE",
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || json?.success === false) {
            throw new Error(json?.message || "Không thể xóa học sinh");
          }
          return true;
        })
      );

      const removed = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - removed;

      toast({
        title: "Đã xử lý xoá học sinh",
        description: `Xóa thành công ${removed} học sinh. ${failed > 0 ? `Lỗi ${failed}.` : ""}`,
        variant: failed > 0 ? "destructive" : "success",
      });

      clearSelection();
      setStudentsPage(1);
      await Promise.all([fetchClassroom(), fetchStudents(1, studentsSearch)]);
    } catch (err) {
      toast({
        title: "Không thể xoá học sinh",
        description: err instanceof Error ? err.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setBulkRemoving(false);
    }
  };

  const exportStudentsExcel = async () => {
    if (!classroomId) return;
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}/students/export`, { cache: "no-store" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || "Không thể export Excel");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `classroom_students_${classroom?.code || classroomId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Không thể export Excel",
        description: err instanceof Error ? err.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const toggleArchive = async () => {
    if (!classroomId || !classroom) return;

    const nextAction = classroom.isActive ? "ARCHIVE" : "UNARCHIVE";

    let reason: string | undefined = undefined;
    if (nextAction === "ARCHIVE") {
      const input = await prompt({
        title: "Lưu trữ lớp",
        description: "Nhập lý do lưu trữ (tùy chọn)",
        placeholder: "VD: Kết thúc học kỳ…",
        type: "textarea",
        confirmText: "Lưu trữ",
        cancelText: "Hủy",
        validate: (v) => (v.length > 500 ? "Vui lòng nhập tối đa 500 ký tự" : null),
      });
      if (input === null) return;
      reason = input.trim() || undefined;
    }

    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextAction, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật trạng thái");
      }

      toast({
        title: nextAction === "UNARCHIVE" ? "Đã khôi phục lớp" : "Đã lưu trữ lớp",
        description: `${classroom.code} — ${classroom.name}`,
        variant: "success",
      });

      await fetchClassroom();
    } catch (err) {
      toast({
        title: "Không thể cập nhật trạng thái",
        description: err instanceof Error ? err.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AdminPageHeader
          title={classroom ? `${classroom.icon ? `${classroom.icon} ` : ""}${classroom.name}` : "Chi tiết lớp"}
          subtitle={classroom ? `Mã lớp: ${classroom.code}` : "Xem thông tin và quản lý lớp học"}
          label="Quản trị lớp học"
          actions={
            <Button asChild variant="outline" size="sm" color="slate">
              <Link href="/dashboard/admin/classrooms">Quay lại</Link>
            </Button>
          }
        />

        {loading ? (
          <Card className="p-6 text-sm text-muted-foreground">Đang tải thông tin lớp...</Card>
        ) : error ? (
          <ErrorBanner message={error} onRetry={fetchClassroom} />
        ) : classroom ? (
          <AdminClassroomOverview
            name={classroom.name}
            code={classroom.code}
            maxStudents={classroom.maxStudents}
            studentCount={classroom._count?.students ?? 0}
            isActive={classroom.isActive}
            teacherName={classroom.teacher?.fullname}
            teacherEmail={classroom.teacher?.email}
            onExportStudents={exportStudentsExcel}
            onToggleArchive={toggleArchive}
            onEdit={openEdit}
            onChangeTeacher={openChangeTeacher}
            onBulkAddStudents={openBulkAdd}
            onForceDelete={forceDeleteClassroom}
            isArchived={isArchived}
            forceDeleting={forceDeleting}
          />
        ) : (
          <EmptyState
            title="Không tìm thấy lớp"
            description="Lớp có thể đã bị xóa hoặc bạn không có quyền truy cập."
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard/admin/classrooms">Quay lại danh sách lớp</Link>
              </Button>
            }
          />
        )}

        <Card className="p-6 sm:p-7 space-y-5 rounded-2xl border border-border/80 bg-background shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">Danh sách học sinh</div>
              <p className="text-xs text-muted-foreground">Quản lý học sinh trong lớp</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchStudents(1, studentsSearch);
              }}
              className="flex items-center gap-2 w-full md:w-auto md:justify-end"
            >
              <div className="relative w-full md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentsSearch}
                  onChange={(e) => setStudentsSearch(e.target.value)}
                  placeholder="Tìm theo email hoặc họ tên..."
                  className="h-10 pl-9 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="outline" color="slate">
                Tìm
              </Button>
            </form>
          </div>

          <AdminStudentsSelectionBar
            selectedCount={selectedCount}
            isProcessing={bulkRemoving}
            isArchived={isArchived}
            onClear={clearSelection}
            onBulkRemove={bulkRemoveSelected}
          />

          {studentsError ? <ErrorBanner message={studentsError} onRetry={() => fetchStudents(studentsPage, studentsSearch)} /> : null}

          {studentsLoading && students.length === 0 ? (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[52px]" />
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Họ tên</TableHead>
                    <TableHead className="text-xs font-semibold">Ngày vào lớp</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AdminTableSkeleton rows={8} cols={5} />
                </TableBody>
              </Table>
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              title="Chưa có học sinh"
              description={
                studentsSearch.trim()
                  ? "Không tìm thấy học sinh phù hợp với từ khóa hiện tại."
                  : "Lớp hiện chưa có học sinh. Bạn có thể thêm học sinh ngay từ nút “Thêm HS”."
              }
              action={
                studentsSearch.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStudentsSearch("");
                      setStudentsPage(1);
                      fetchStudents(1, "");
                    }}
                  >
                    Xóa tìm kiếm
                  </Button>
                ) : null
              }
              className="border-border"
            />
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[52px]">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelectedOnPage}
                        onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                        disabled={isArchived || pageStudentIds.length === 0}
                        className="h-4 w-4 rounded border-input"
                        aria-label="Chọn tất cả học sinh trong trang"
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Họ tên</TableHead>
                    <TableHead className="text-xs font-semibold">Ngày vào lớp</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const isRemoving = studentsActionId === s.id;
                    const isChecked = selectedStudentIds.has(s.id);
                    const displayName = s.fullname || "(Chưa cập nhật)";
                    const initial = (displayName || s.email || "?")
                      .toString()
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "?";
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/60 transition-colors">
                        <TableCell className="py-2 align-middle">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => toggleStudentSelected(s.id, e.target.checked)}
                            disabled={isArchived}
                            className="h-4 w-4 rounded border-input"
                            aria-label={`Chọn học sinh ${s.email}`}
                          />
                        </TableCell>
                        <TableCell className="py-2 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-semibold text-indigo-700">
                              <span>{initial}</span>
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate">{displayName}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{s.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 align-middle text-xs text-foreground/80">
                          <span className="font-mono text-[11px] text-muted-foreground">ID: {s.id.slice(0, 8)}…</span>
                        </TableCell>
                        <TableCell className="py-2 align-middle text-[11px] text-muted-foreground">
                          {s.joinedAt ? new Date(s.joinedAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="py-2 align-middle text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            color="slate"
                            disabled={isRemoving || isArchived}
                            onClick={() => removeStudent(s.id)}
                            className="border-destructive/15 text-destructive/80 hover:bg-destructive/5 flex items-center gap-1.5 text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{isRemoving ? "Đang xóa..." : "Xóa"}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <AdminPagination
            page={studentsPage}
            totalPages={totalStudentPages}
            total={studentsTotal}
            onPageChange={(next) => {
              const safe = Math.min(Math.max(1, next), totalStudentPages);
              setStudentsPage(safe);
              fetchStudents(safe, studentsSearch);
            }}
            className="text-xs"
          />
        </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditError(null);
        }}
      >
        <DialogContent className="w-[min(92vw,48rem)] max-w-2xl max-h-[90vh]" onClose={() => setEditOpen(false)}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Chỉnh sửa lớp</DialogTitle>
            <DialogDescription>Cập nhật tên lớp, mã lớp và sĩ số tối đa.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {editError ? (
              <Alert variant="destructive">
                <AlertDescription className="text-[11px]">{editError}</AlertDescription>
              </Alert>
            ) : null}
            <form id="edit-classroom-form" onSubmit={submitEdit} className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground">Tên lớp</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="VD: Lớp 10A1"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Mã lớp</label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="VD: A2B3"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Sĩ số tối đa</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={editMaxStudents}
                  onChange={(e) => setEditMaxStudents(e.target.value)}
                  required
                />
              </div>
            </form>
          </div>
          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={() => setEditOpen(false)}
            >
              Hủy
            </Button>
            <Button form="edit-classroom-form" type="submit" size="sm" disabled={editSubmitting}>
              {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={changeTeacherOpen}
        onOpenChange={(open) => {
          setChangeTeacherOpen(open);
          if (!open) {
            setChangeTeacherError(null);
            setChangeTeacherReason("");
          }
        }}
      >
        <DialogContent className="w-[min(92vw,56rem)] max-w-3xl max-h-[90vh]" onClose={() => setChangeTeacherOpen(false)}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Đổi giáo viên phụ trách</DialogTitle>
            <DialogDescription>Chọn giáo viên mới cho lớp học.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {changeTeacherError ? (
              <Alert variant="destructive">
                <AlertDescription className="text-[11px]">{changeTeacherError}</AlertDescription>
              </Alert>
            ) : null}

            <form id="change-teacher-form" onSubmit={submitChangeTeacher} className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground">Tìm giáo viên</label>
                <Input
                  value={teacherQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTeacherQuery(v);
                    fetchTeachers(v);
                  }}
                  placeholder="Nhập tên hoặc email..."
                />
                {teachersLoading && <div className="text-[11px] text-muted-foreground">Đang tải...</div>}
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground">Giáo viên</label>
                <Select
                  value={changeTeacherId}
                  onChange={(e) => setChangeTeacherId(e.target.value)}
                  className="rounded-xl"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.fullname || "(Chưa cập nhật)") + " — " + t.email}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground">Lý do (tùy chọn)</label>
                <Textarea
                  value={changeTeacherReason}
                  onChange={(e) => setChangeTeacherReason(e.target.value)}
                  rows={3}
                  placeholder="VD: Điều chỉnh phân công giảng dạy..."
                  className="resize-y"
                />
              </div>
            </form>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={() => setChangeTeacherOpen(false)}
            >
              Hủy
            </Button>
            <Button
              form="change-teacher-form"
              type="submit"
              size="sm"
              disabled={changeTeacherSubmitting}
            >
              {changeTeacherSubmitting ? "Đang đổi..." : "Đổi giáo viên"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          setBulkOpen(open);
          if (!open) {
            setBulkDragOver(false);
            setBulkError(null);
            setBulkResult(null);
            setBulkIssues([]);
            setBulkIssuesOpen(false);
            setBulkFileName(null);
            setBulkText("");
            setBulkCreateMissing(false);
            setBulkDefaultPassword("");
          }
        }}
      >
        <DialogContent className="w-[min(92vw,64rem)] max-w-4xl max-h-[90vh]" onClose={() => setBulkOpen(false)}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Thêm học sinh hàng loạt</DialogTitle>
            <DialogDescription>
              Nhập mỗi dòng một email hoặc định dạng <span className="font-semibold">Họ tên, email</span>. Có thể kéo thả
              CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {bulkError ? (
              <Alert variant="destructive">
                <AlertDescription className="text-[11px]">{bulkError}</AlertDescription>
              </Alert>
            ) : null}
            {bulkResult ? (
              <Alert className="border-primary/20 bg-primary/10 text-primary">
                <AlertDescription className="text-[11px]">
                  Thêm {bulkResult.added} học sinh. Tạo mới {bulkResult.createdAccounts} tài khoản. Bỏ qua {bulkResult.skippedAlreadyInClass}. Lỗi {bulkResult.failed}.
                </AlertDescription>
              </Alert>
            ) : null}

            <form id="bulk-add-students-form" onSubmit={submitBulkAdd} className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Danh sách học sinh</label>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={12}
                  placeholder={"VD:\nNguyễn Văn A, a@student.com\nstudent2@student.com"}
                  className="resize-y"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div
                  className={`flex flex-col gap-2 rounded-xl border-2 border-dashed px-3 py-3 transition-colors cursor-pointer ${
                    bulkDragOver ? "border-foreground bg-muted/30" : "border-border hover:border-foreground/40 hover:bg-muted/30"
                  }`}
                  onDragOver={handleBulkDragOver}
                  onDragLeave={handleBulkDragLeave}
                  onDrop={handleBulkDrop}
                >
                  <div className="text-[11px] font-semibold text-foreground">Kéo & thả file CSV vào đây (hoặc chọn tệp)</div>
                  <input type="file" accept=".csv,text/csv" onChange={handleBulkFileChange} className="text-[11px] text-foreground" />
                  {bulkFileName && <span className="text-[10px] text-muted-foreground">Đã chọn file: {bulkFileName}</span>}
                  <div className="text-[10px] text-muted-foreground">CSV có thể theo định dạng: fullname,email</div>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-foreground/80">
                  <input type="checkbox" checked={bulkCreateMissing} onChange={(e) => setBulkCreateMissing(e.target.checked)} />
                  Tự tạo tài khoản nếu email chưa tồn tại
                </label>

                {bulkCreateMissing && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Mật khẩu mặc định</label>
                    <Input
                      type="password"
                      value={bulkDefaultPassword}
                      onChange={(e) => setBulkDefaultPassword(e.target.value)}
                      placeholder="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"
                    />
                  </div>
                )}
              </div>
            </form>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={() => setBulkOpen(false)}
            >
              Đóng
            </Button>
            <Button
              form="bulk-add-students-form"
              type="submit"
              size="sm"
              disabled={bulkSubmitting}
            >
              {bulkSubmitting ? "Đang xử lý..." : "Thêm học sinh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkIssuesOpen}
        onOpenChange={(open) => {
          setBulkIssuesOpen(open);
          if (!open) setBulkIssues([]);
        }}
      >
        <DialogContent
          className="w-[min(92vw,56rem)] max-w-3xl max-h-[90vh]"
          onClose={() => setBulkIssuesOpen(false)}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Không thể thêm một số học sinh</DialogTitle>
            <DialogDescription>
              Có <span className="font-semibold">{bulkIssues.length}</span> dòng không thêm được. Kiểm tra email và lý do bên dưới.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Email</TableHead>
                    <TableHead className="text-xs font-semibold">Lý do</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkIssues.map((x, idx) => (
                    <TableRow key={`${x.email}-${idx}`}>
                      <TableCell className="py-2 align-middle">
                        <span className="font-medium text-foreground text-xs">{x.email}</span>
                      </TableCell>
                      <TableCell className="py-2 align-middle text-xs text-foreground/80">{x.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={() => setBulkIssuesOpen(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}
