"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DragEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { usePrompt } from "@/components/providers/PromptProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
  const params = useParams();
  const rawId = (params as unknown as { id?: string | string[] })?.id;
  const classroomId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);

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
      const res = await fetch(`/api/admin/classrooms/${classroomId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải thông tin lớp");
      }
      setClassroom(json.data as ClassroomDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setClassroom(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async (q: string) => {
    try {
      setTeachersLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/teachers?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải danh sách giáo viên");
      }
      const data = json.data as { items: TeacherOption[] };
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

      const res = await fetch(`/api/admin/classrooms/${classroomId}/students?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải danh sách học sinh");
      }

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

  const exportStudents = async () => {
    if (!classroomId) return;
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}/students/export`, { cache: "no-store" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || "Không thể export CSV");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `classroom_students_${classroom?.code || classroomId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Không thể export CSV",
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
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <PageHeader
            title={classroom ? `${classroom.icon ? `${classroom.icon} ` : ""}${classroom.name}` : "Chi tiết lớp"}
            subtitle={classroom ? `Mã lớp: ${classroom.code}` : "Xem thông tin và quản lý lớp học"}
          />
          <Button asChild variant="outline" className="rounded-full px-5">
            <Link href="/dashboard/admin/classrooms">Quay lại</Link>
          </Button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 text-sm text-slate-600">
            Đang tải thông tin lớp...
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        ) : classroom ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Giáo viên</div>
                <div className="text-sm font-semibold text-slate-900">
                  {classroom.teacher?.fullname || "(Chưa cập nhật)"}
                </div>
                <div className="text-xs text-slate-600">{classroom.teacher?.email || "—"}</div>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                    classroom.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {classroom.isActive ? "Hoạt động" : "Đã lưu trữ"}
                </span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border border-slate-200 text-slate-700">
                  {classroom._count?.students ?? 0} / {classroom.maxStudents} học sinh
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="text-[11px] text-slate-500">Tên lớp</div>
                <div className="text-sm font-semibold text-slate-900">{classroom.name}</div>
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="text-[11px] text-slate-500">Mã lớp</div>
                <div className="text-sm font-semibold text-slate-900">{classroom.code}</div>
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <div className="text-[11px] text-slate-500">Sĩ số tối đa</div>
                <div className="text-sm font-semibold text-slate-900">{classroom.maxStudents}</div>
              </div>
            </div>

            {isArchived && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                Lớp đã lưu trữ: chỉ cho phép xem, export và khôi phục.
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
              <Button
                variant="outline"
                className="rounded-full px-5"
                onClick={exportStudents}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-5"
                onClick={toggleArchive}
              >
                {classroom.isActive ? "Lưu trữ" : "Khôi phục"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-5"
                onClick={openEdit}
                disabled={isArchived}
              >
                Sửa lớp
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-5"
                onClick={openChangeTeacher}
                disabled={isArchived}
              >
                Đổi GV
              </Button>
              <Button
                className="rounded-full px-5"
                onClick={openBulkAdd}
                disabled={isArchived}
              >
                Thêm HS
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-slate-800">Danh sách học sinh</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchStudents(1, studentsSearch);
            }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <input
              type="text"
              value={studentsSearch}
              onChange={(e) => setStudentsSearch(e.target.value)}
              placeholder="Tìm theo email hoặc họ tên..."
              className="flex-1 md:w-72 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            />
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Tìm
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-slate-600">
            Đã chọn <span className="font-semibold text-slate-900">{selectedCount}</span> học sinh
            {selectedCount > 0 && (
              <span className="text-slate-500"> (chỉ chọn trong trang hiện tại hoặc chọn nhiều trang)</span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedCount === 0 || bulkRemoving}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              onClick={bulkRemoveSelected}
              disabled={selectedCount === 0 || bulkRemoving || isArchived}
              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {bulkRemoving ? "Đang xóa..." : "Xóa đã chọn"}
            </button>
          </div>
        </div>

        {studentsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {studentsError}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 w-[52px]">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                    disabled={isArchived || pageStudentIds.length === 0}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label="Chọn tất cả học sinh trong trang"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Họ tên</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Ngày vào lớp</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {studentsLoading && students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[11px] text-slate-500">
                    Đang tải danh sách học sinh...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[11px] text-slate-500">
                    Chưa có học sinh nào trong lớp.
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const isRemoving = studentsActionId === s.id;
                  const isChecked = selectedStudentIds.has(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleStudentSelected(s.id, e.target.checked)}
                          disabled={isArchived}
                          className="h-4 w-4 rounded border-slate-300"
                          aria-label={`Chọn học sinh ${s.email}`}
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 text-xs">{s.email}</span>
                          <span className="text-[10px] text-slate-500">ID: {s.id.slice(0, 8)}…</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-700">{s.fullname || "(Chưa cập nhật)"}</td>
                      <td className="px-3 py-2 align-middle text-[11px] text-slate-700">
                        {s.joinedAt ? new Date(s.joinedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <button
                          type="button"
                          disabled={isRemoving || isArchived}
                          onClick={() => removeStudent(s.id)}
                          className="inline-flex items-center rounded-xl px-3 py-1.5 text-[11px] font-semibold border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isRemoving ? "Đang xóa..." : "Xóa"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <div>
            Trang {studentsPage} / {totalStudentPages}  Total {studentsTotal} học sinh
          </div>
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={() => {
                const next = Math.max(1, studentsPage - 1);
                setStudentsPage(next);
                fetchStudents(next, studentsSearch);
              }}
              disabled={studentsPage <= 1}
              className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => {
                const next = Math.min(totalStudentPages, studentsPage + 1);
                setStudentsPage(next);
                fetchStudents(next, studentsSearch);
              }}
              disabled={studentsPage >= totalStudentPages}
              className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

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
            {editError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{editError}</div>
            )}
            <form id="edit-classroom-form" onSubmit={submitEdit} className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Tên lớp</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="VD: Lớp 10A1"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Mã lớp</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="VD: A2B3"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Sĩ số tối đa</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={editMaxStudents}
                  onChange={(e) => setEditMaxStudents(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  required
                />
              </div>
            </form>
          </div>
          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              form="edit-classroom-form"
              type="submit"
              disabled={editSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
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
            {changeTeacherError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{changeTeacherError}</div>
            )}

            <form id="change-teacher-form" onSubmit={submitChangeTeacher} className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Tìm giáo viên</label>
                <input
                  type="text"
                  value={teacherQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTeacherQuery(v);
                    fetchTeachers(v);
                  }}
                  placeholder="Nhập tên hoặc email..."
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                />
                {teachersLoading && <div className="text-[11px] text-slate-500">Đang tải...</div>}
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Giáo viên</label>
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
                <label className="text-[11px] font-semibold text-slate-600">Lý do (tùy chọn)</label>
                <textarea
                  value={changeTeacherReason}
                  onChange={(e) => setChangeTeacherReason(e.target.value)}
                  rows={3}
                  placeholder="VD: Điều chỉnh phân công giảng dạy..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 resize-y"
                />
              </div>
            </form>
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setChangeTeacherOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              form="change-teacher-form"
              type="submit"
              disabled={changeTeacherSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {changeTeacherSubmitting ? "Đang đổi..." : "Đổi giáo viên"}
            </button>
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
            {bulkError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{bulkError}</div>
            )}
            {bulkResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                Thêm {bulkResult.added} học sinh. Tạo mới {bulkResult.createdAccounts} tài khoản. Bỏ qua {bulkResult.skippedAlreadyInClass}. Lỗi {bulkResult.failed}.
              </div>
            )}

            <form id="bulk-add-students-form" onSubmit={submitBulkAdd} className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Danh sách học sinh</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={12}
                  placeholder={"VD:\nNguyễn Văn A, a@student.com\nstudent2@student.com"}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 resize-y"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div
                  className={`flex flex-col gap-2 rounded-xl border-2 border-dashed px-3 py-3 transition-colors cursor-pointer ${
                    bulkDragOver ? "border-slate-900 bg-slate-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                  onDragOver={handleBulkDragOver}
                  onDragLeave={handleBulkDragLeave}
                  onDrop={handleBulkDrop}
                >
                  <div className="text-[11px] font-semibold text-slate-700">Kéo & thả file CSV vào đây (hoặc chọn tệp)</div>
                  <input type="file" accept=".csv,text/csv" onChange={handleBulkFileChange} className="text-[11px] text-slate-700" />
                  {bulkFileName && <span className="text-[10px] text-slate-500">Đã chọn file: {bulkFileName}</span>}
                  <div className="text-[10px] text-slate-500">CSV có thể theo định dạng: fullname,email</div>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-slate-700">
                  <input type="checkbox" checked={bulkCreateMissing} onChange={(e) => setBulkCreateMissing(e.target.checked)} />
                  Tự tạo tài khoản nếu email chưa tồn tại
                </label>

                {bulkCreateMissing && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600">Mật khẩu mặc định</label>
                    <input
                      type="password"
                      value={bulkDefaultPassword}
                      onChange={(e) => setBulkDefaultPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    />
                  </div>
                )}
              </div>
            </form>
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              form="bulk-add-students-form"
              type="submit"
              disabled={bulkSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {bulkSubmitting ? "Đang xử lý..." : "Thêm học sinh"}
            </button>
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
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {bulkIssues.map((x, idx) => (
                    <tr key={`${x.email}-${idx}`} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 align-middle">
                        <span className="font-medium text-slate-900 text-xs">{x.email}</span>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-700">{x.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <button
              type="button"
              onClick={() => setBulkIssuesOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-slate-800 hover:bg-slate-50"
            >
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
