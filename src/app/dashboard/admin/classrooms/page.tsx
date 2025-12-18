"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminClassroomsToolbar from "@/components/admin/AdminClassroomsToolbar";
import ClassroomRowActionsMenu from "@/components/admin/ClassroomRowActionsMenu";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";
import { EmptyState, ErrorBanner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { usePrompt } from "@/components/providers/PromptProvider";
import { Select } from "@/components/ui/select";
import { AccordionItem } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Input from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateClassroomCode } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { passwordSchema } from "@/lib/validation/password.schema";

type ClassroomItem = {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  maxStudents: number;
  isActive: boolean;
  createdAt: string;
  teacher: { id: string; fullname: string | null; email: string } | null;
  _count: { students: number };
};

type ClassroomsResponse = {
  items: ClassroomItem[];
  page: number;
  pageSize: number;
  total: number;
};

type TeacherOption = {
  id: string;
  fullname: string | null;
  email: string;
};

const STATUS_OPTIONS: { label: string; value: "" | "active" | "archived" }[] = [
  { label: "Tất cả", value: "" },
  { label: "Đang hoạt động", value: "active" },
  { label: "Đã lưu trữ", value: "archived" },
];

export default function AdminClassroomsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ClassroomItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"" | "active" | "archived">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const prompt = usePrompt();

  const [createName, setCreateName] = useState("");
  const [createTeacherId, setCreateTeacherId] = useState("");
  const [teacherQuery, setTeacherQuery] = useState("");
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([]);
  const [createCode, setCreateCode] = useState("");
  const [createMaxStudents, setCreateMaxStudents] = useState("30");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [changeTeacherOpen, setChangeTeacherOpen] = useState(false);
  const [changeTeacherTarget, setChangeTeacherTarget] = useState<ClassroomItem | null>(null);
  const [changeTeacherId, setChangeTeacherId] = useState("");
  const [changeTeacherQuery, setChangeTeacherQuery] = useState("");
  const [changeTeacherLoading, setChangeTeacherLoading] = useState(false);
  const [changeTeacherError, setChangeTeacherError] = useState<string | null>(null);
  const [changeTeacherOptions, setChangeTeacherOptions] = useState<TeacherOption[]>([]);
  const [changeTeacherSubmitting, setChangeTeacherSubmitting] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<ClassroomItem | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkCreateMissing, setBulkCreateMissing] = useState(false);
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState("");
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; accountsCreated: number; alreadyInClassroom: number } | null>(null);
  const [bulkSkippedPreview, setBulkSkippedPreview] = useState<{ email: string; reason: string }[]>([]);

  const [studentsOpen, setStudentsOpen] = useState(false);
  const [studentsTarget, setStudentsTarget] = useState<ClassroomItem | null>(null);
  const [studentsItems, setStudentsItems] = useState<Array<{ id: string; email: string; fullname: string | null; joinedAt: string }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentsSearch, setStudentsSearch] = useState("");
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize] = useState(20);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsActionId, setStudentsActionId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassroomItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editMaxStudents, setEditMaxStudents] = useState("30");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const handleResetFilters = () => {
    setStatus("");
    setSearch("");
    fetchClassrooms(1, "", "");
  };

  const fetchClassrooms = async (nextPage = page, nextStatus = status, nextSearch = search) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));
      if (nextStatus) params.set("status", nextStatus);
      if (nextSearch.trim()) params.set("q", nextSearch.trim());

      const res = await fetch(`/api/admin/classrooms?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải danh sách lớp học");
      }

      const data = json.data as ClassroomsResponse;
      setItems(data.items || []);
      setPage(data.page);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const extractStudentEntries = (raw: string): Array<{ email: string; fullname?: string | null }> => {
    const entries: Array<{ email: string; fullname?: string | null }> = [];
    const lines = raw.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const cells = trimmed.split(",").map((c) => c.trim()).filter(Boolean);
      const emailCell = cells.find((c) => emailRegex.test(c.toLowerCase()));
      if (emailCell) {
        const email = emailCell;
        const fullname = cells.find((c) => c !== emailCell && !emailRegex.test(c.toLowerCase())) || null;
        entries.push({ email, fullname });
        continue;
      }

      // Fallback: extract plain emails from any separators
      const tokens = parseEmails(trimmed).filter((t) => emailRegex.test(t.toLowerCase()));
      for (const t of tokens) {
        entries.push({ email: t, fullname: null });
      }
    }

    return entries;
  };

  const openEditClassroom = (item: ClassroomItem) => {
    setEditTarget(item);
    setEditName(item.name || "");
    setEditCode(item.code || "");
    setEditMaxStudents(String(item.maxStudents ?? 30));
    setEditError(null);
    setEditOpen(true);
  };

  const submitEditClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setEditSubmitting(true);
      setEditError(null);

      const name = editName.trim();
      if (!name) {
        setEditError("Vui lòng nhập tên lớp");
        return;
      }
      const code = editCode.trim().toUpperCase();
      const codePattern = /^[A-Z2-9]{4,10}$/;
      if (!codePattern.test(code)) {
        setEditError("Mã lớp không hợp lệ (4-10 ký tự A-Z, 2-9)");
        return;
      }
      const maxStudentsNum = Number(editMaxStudents);
      if (!Number.isFinite(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 500) {
        setEditError("Sĩ số tối đa không hợp lệ (1-500)");
        return;
      }

      const res = await fetch(`/api/admin/classrooms/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, maxStudents: maxStudentsNum }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật lớp học");
      }

      toast({
        title: "Đã cập nhật lớp",
        description: `${code} — ${name}`,
        variant: "success",
      });

      setEditOpen(false);
      setEditTarget(null);

      await fetchClassrooms(page, status, search);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setEditError(msg);
      toast({ title: "Không thể cập nhật lớp", description: msg, variant: "destructive" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const exportStudentsExcel = async () => {
    if (!studentsTarget) return;
    try {
      const res = await fetch(`/api/admin/classrooms/${studentsTarget.id}/students/export`, { cache: "no-store" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || "Không thể xuất Excel");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `classroom-${studentsTarget.code}-students.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        title: "Không thể xuất Excel",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const fetchTeachers = async (q: string) => {
    try {
      setTeacherLoading(true);
      setTeacherError(null);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "100");
      const res = await fetch(`/api/admin/teachers?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải danh sách giáo viên");
      }
      const items = (json?.data?.items ?? []) as TeacherOption[];
      setTeacherOptions(Array.isArray(items) ? items : []);
    } catch (e) {
      setTeacherError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setTeacherOptions([]);
    } finally {
      setTeacherLoading(false);
    }
  };

  const genCode = () => {
    setCreateCode(generateClassroomCode());
  };

  const fetchChangeTeacherOptions = async (q: string) => {
    try {
      setChangeTeacherLoading(true);
      setChangeTeacherError(null);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "100");
      const res = await fetch(`/api/admin/teachers?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải danh sách giáo viên");
      }
      const items = (json?.data?.items ?? []) as TeacherOption[];
      setChangeTeacherOptions(Array.isArray(items) ? items : []);
    } catch (e) {
      setChangeTeacherError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setChangeTeacherOptions([]);
    } finally {
      setChangeTeacherLoading(false);
    }
  };

  const createClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      setCreateError(null);

      if (!createTeacherId) {
        setCreateError("Vui lòng chọn giáo viên phụ trách.");
        return;
      }

      const maxStudentsNum = Number(createMaxStudents);
      if (!Number.isFinite(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 500) {
        setCreateError("Sĩ số tối đa không hợp lệ (1-500)");
        return;
      }

      const res = await fetch("/api/admin/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          teacherId: createTeacherId,
          code: createCode || undefined,
          maxStudents: maxStudentsNum,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo lớp học");
      }

      setCreateName("");
      setCreateTeacherId("");
      setTeacherQuery("");
      setCreateCode("");
      setCreateMaxStudents("30");

      setCreateOpen(false);

      toast({
        title: "Tạo lớp thành công",
        description: "Lớp học đã được tạo và gán giáo viên phụ trách.",
        variant: "success",
      });

      await fetchClassrooms(1, status, search);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo lớp");
    } finally {
      setCreateLoading(false);
    }
  };

  const openChangeTeacherDialog = (item: ClassroomItem) => {
    setChangeTeacherTarget(item);
    setChangeTeacherError(null);
    setChangeTeacherQuery("");
    setChangeTeacherOptions([]);
    setChangeTeacherId(item.teacher?.id ?? "");
    fetchChangeTeacherOptions("");
    setChangeTeacherOpen(true);
  };

  const submitChangeTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeTeacherTarget) return;
    try {
      setChangeTeacherSubmitting(true);
      setChangeTeacherError(null);
      if (!changeTeacherId) {
        setChangeTeacherError("Vui lòng chọn giáo viên phụ trách.");
        return;
      }

      setActionLoadingId(changeTeacherTarget.id);

      const res = await fetch(`/api/admin/classrooms/${changeTeacherTarget.id}/teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: changeTeacherId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể đổi giáo viên");
      }

      setChangeTeacherOpen(false);
      setChangeTeacherTarget(null);
      setChangeTeacherQuery("");
      setChangeTeacherOptions([]);
      setChangeTeacherId("");

      toast({
        title: "Đã cập nhật giáo viên",
        description: "Giáo viên phụ trách đã được thay đổi.",
        variant: "success",
      });

      await fetchClassrooms(page, status, search);
    } catch (e) {
      console.error("[AdminClassroomsPage] submitChangeTeacher error", e);
      setChangeTeacherError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setActionLoadingId(null);
      setChangeTeacherSubmitting(false);
    }
  };

  const parseEmails = (raw: string): string[] => {
    return raw
      .split(/\r?\n|,|;|\t|\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const parseEmailsFromCsvText = (raw: string): string[] => {
    const emails: string[] = [];
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const cells = line.split(",");
      for (const cell of cells) {
        const v = cell.trim();
        if (!v) continue;
        if (emailRegex.test(v.toLowerCase())) {
          emails.push(v);
          break;
        }
      }
    }
    return emails;
  };

  const extractEmails = (raw: string): string[] => {
    const tokens = parseEmails(raw);
    const direct = tokens.filter((t) => emailRegex.test(t.toLowerCase()));
    if (direct.length > 0) return direct;
    return parseEmailsFromCsvText(raw).filter((t) => emailRegex.test(t.toLowerCase()));
  };

  const openBulkAddStudents = (item: ClassroomItem) => {
    setBulkTarget(item);
    setBulkText("");
    setBulkReason("");
    setBulkCreateMissing(false);
    setBulkDefaultPassword("");
    setBulkFileName(null);
    setBulkDragOver(false);
    setBulkError(null);
    setBulkResult(null);
    setBulkSkippedPreview([]);
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
    setBulkSkippedPreview([]);
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

  const handleBulkDrop = async (e: React.DragEvent<HTMLDivElement>) => {
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

  const handleBulkDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!bulkDragOver) setBulkDragOver(true);
  };

  const handleBulkDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (bulkDragOver) setBulkDragOver(false);
  };

  const submitBulkAddStudents = async () => {
    if (!bulkTarget) return;

    const rawEntries = extractStudentEntries(bulkText);
    const byEmail = new Map<string, { email: string; fullname?: string | null }>();
    for (const it of rawEntries) {
      const email = String(it.email || "").trim().toLowerCase();
      if (!email || !emailRegex.test(email)) continue;
      const fullname = (it.fullname ?? "").toString().trim();
      if (!byEmail.has(email)) {
        byEmail.set(email, { email, fullname: fullname || null });
      } else if (fullname && !byEmail.get(email)?.fullname) {
        byEmail.set(email, { email, fullname });
      }
    }
    const entries = Array.from(byEmail.values());
    const emails = entries.map((e) => e.email);

    if (emails.length === 0) {
      setBulkError("Vui lòng nhập ít nhất 1 email hợp lệ.");
      return;
    }
    if (emails.length > 500) {
      setBulkError("Tối đa 500 email mỗi lần.");
      return;
    }

    if (bulkCreateMissing) {
      const pwd = bulkDefaultPassword.toString();
      const passwordParsed = passwordSchema.safeParse(pwd);
      if (!passwordParsed.success) {
        setBulkError(
          passwordParsed.error.issues.map((i) => i.message).join("; ") ||
            "Mật khẩu mặc định không hợp lệ."
        );
        return;
      }
    }

    try {
      setBulkSubmitting(true);
      setBulkError(null);
      setBulkResult(null);
      setBulkSkippedPreview([]);

      const res = await fetch(`/api/admin/classrooms/${bulkTarget.id}/students/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          reason: bulkReason.trim() || undefined,
          createMissing: bulkCreateMissing,
          defaultPassword: bulkCreateMissing ? bulkDefaultPassword : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể thêm học sinh");
      }

      const data = json.data as { created: unknown[]; skipped: unknown[]; accountsCreated?: unknown[]; alreadyInClassroom?: unknown };
      const createdCount = Array.isArray(data?.created) ? data.created.length : 0;
      const skippedArr = Array.isArray(data?.skipped) ? (data.skipped as any[]) : [];
      const skippedCount = skippedArr.length;
      const accountsCreatedCount = Array.isArray(data?.accountsCreated) ? data.accountsCreated.length : 0;
      const alreadyInClassroomCount = typeof data?.alreadyInClassroom === "number" ? data.alreadyInClassroom : 0;
      setBulkResult({
        created: createdCount,
        skipped: skippedCount,
        accountsCreated: accountsCreatedCount,
        alreadyInClassroom: alreadyInClassroomCount,
      });
      setBulkSkippedPreview(
        skippedArr
          .filter((x) => x && typeof x.email === "string")
          .slice(0, 10)
          .map((x) => ({ email: String(x.email), reason: String(x.reason || "Skipped") }))
      );

      toast({
        title: "Đã xử lý danh sách học sinh",
        description: `Thêm: ${createdCount}. Tạo mới: ${accountsCreatedCount}. Đã có trong lớp: ${alreadyInClassroomCount}. Bỏ qua: ${skippedCount}.`,
        variant: "success",
      });

      await fetchClassrooms(page, status, search);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setBulkSubmitting(false);
    }
  };

  useEffect(() => {
    fetchClassrooms(1, status, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClassrooms(1, status, search);
  };

  const handleStatusChange = (value: "" | "active" | "archived") => {
    setStatus(value);
    fetchClassrooms(1, value, search);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchClassrooms(nextPage, status, search);
  };

  const fetchClassroomStudents = async (params?: { classroomId?: string; page?: number; q?: string }) => {
    const classroomId = params?.classroomId || studentsTarget?.id;
    if (!classroomId) return;
    try {
      setStudentsLoading(true);
      setStudentsError(null);

      const nextPage = params?.page ?? studentsPage;
      const q = (params?.q ?? studentsSearch).trim();

      const sp = new URLSearchParams();
      sp.set("page", String(nextPage));
      sp.set("pageSize", String(studentsPageSize));
      if (q) sp.set("q", q);

      const res = await fetch(`/api/admin/classrooms/${classroomId}/students?${sp.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải danh sách học sinh");
      }

      const data = json.data as {
        items: Array<{ id: string; email: string; fullname: string | null; joinedAt: string }>;
        page: number;
        pageSize: number;
        total: number;
      };

      setStudentsItems(Array.isArray(data?.items) ? data.items : []);
      setStudentsPage(data?.page || nextPage);
      setStudentsTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e) {
      setStudentsError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setStudentsItems([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const openStudentsDialog = async (item: ClassroomItem) => {
    setStudentsTarget(item);
    setStudentsOpen(true);
    setStudentsItems([]);
    setStudentsError(null);
    setStudentsSearch("");
    setStudentsPage(1);
    setStudentsTotal(0);
    await fetchClassroomStudents({ classroomId: item.id, page: 1, q: "" });
  };

  const removeStudentFromClassroom = async (student: { id: string; email: string; fullname: string | null }) => {
    if (!studentsTarget) return;
    if (!studentsTarget.isActive) {
      toast({
        title: "Không thể thao tác",
        description: "Lớp đã được lưu trữ. Vui lòng khôi phục để thao tác.",
        variant: "destructive",
      });
      return;
    }
    const ok = await prompt({
      title: "Xoá học sinh khỏi lớp",
      description: `Xác nhận xoá ${student.fullname || "(Chưa cập nhật)"} (${student.email}) khỏi lớp ${studentsTarget.code}?`,
      type: "text",
      placeholder: "Nhập XOA để xác nhận",
      confirmText: "Xoá",
      cancelText: "Hủy",
      validate: (v) => (v.trim().toUpperCase() === "XOA" ? null : "Vui lòng nhập XOA để xác nhận"),
    });
    if (ok === null) return;

    try {
      setStudentsActionId(student.id);
      const res = await fetch(`/api/admin/classrooms/${studentsTarget.id}/students/${student.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể xoá học sinh khỏi lớp");
      }

      toast({
        title: "Đã xoá học sinh",
        description: `${student.email} đã được xoá khỏi lớp ${studentsTarget.code}.`,
        variant: "success",
      });

      await fetchClassroomStudents({ page: 1, q: studentsSearch });
      await fetchClassrooms(page, status, search);
    } catch (e) {
      toast({
        title: "Không thể xoá học sinh",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setStudentsActionId(null);
    }
  };

  const toggleArchive = async (item: ClassroomItem) => {
    const action = item.isActive ? "ARCHIVE" : "UNARCHIVE";

    let reason: string | undefined = undefined;
    if (action === "ARCHIVE") {
      const input = await prompt({
        title: "Lưu trữ lớp học",
        description: `Nhập lý do lưu trữ lớp ${item.code} (tùy chọn)` ,
        placeholder: "Ví dụ: Lớp đã kết thúc học kỳ…",
        type: "textarea",
        confirmText: "Lưu trữ",
        cancelText: "Hủy",
        validate: (v) => (v.length > 500 ? "Vui lòng nhập tối đa 500 ký tự" : null),
      });
      if (input === null) return;
      reason = input.trim() || undefined;
    }

    try {
      setActionLoadingId(item.id);
      const res = await fetch(`/api/admin/classrooms/${item.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật trạng thái lớp học");
      }

      const updated = json.data as { id: string; isActive: boolean };
      setItems((prev) => prev.map((c) => (c.id === updated.id ? { ...c, isActive: updated.isActive } : c)));

      toast({
        title: updated.isActive ? "Đã khôi phục lớp" : "Đã lưu trữ lớp",
        description: `${item.code} — ${item.name}`,
        variant: "success",
      });
    } catch (e) {
      console.error("[AdminClassroomsPage] toggleArchive error", e);
      toast({
        title: "Không thể cập nhật trạng thái",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <AdminPageHeader
          title="Quản lý lớp học"
          subtitle="Danh sách lớp học toàn hệ thống và thao tác lưu trữ"
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCreateError(null);
                  setTeacherError(null);
                  setTeacherQuery("");
                  setTeacherOptions([]);
                  setCreateTeacherId("");
                  fetchTeachers("");
                  setCreateOpen(true);
                }}
              >
                Tạo lớp học
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchClassrooms(page, status, search)}
                disabled={loading}
              >
                Tải lại
              </Button>
            </div>
          }
        />

        {error ? <ErrorBanner message={error} onRetry={() => fetchClassrooms(page, status, search)} /> : null}

        <Card className="p-6 space-y-4">
          <AdminClassroomsToolbar
            statusOptions={STATUS_OPTIONS}
            statusValue={status}
            onStatusChange={handleStatusChange}
            search={search}
            onSearchChange={setSearch}
            onSubmit={() => fetchClassrooms(1, status, search)}
            onReset={handleResetFilters}
          />

          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Lớp</TableHead>
                  <TableHead className="font-semibold">Giáo viên</TableHead>
                  <TableHead className="font-semibold">Học sinh</TableHead>
                  <TableHead className="font-semibold">Trạng thái</TableHead>
                  <TableHead className="text-right font-semibold">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && items.length === 0 ? (
                  <AdminTableSkeleton rows={8} cols={5} />
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
                      <EmptyState
                        title="Không có lớp học phù hợp"
                        description="Thử thay đổi bộ lọc hoặc đặt lại tìm kiếm để xem thêm kết quả."
                        action={
                          <div className="flex items-center justify-center gap-2">
                            <Button type="button" variant="outline" onClick={handleResetFilters}>
                              Reset bộ lọc
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                setCreateError(null);
                                setTeacherError(null);
                                setTeacherQuery("");
                                setTeacherOptions([]);
                                setCreateTeacherId("");
                                fetchTeachers("");
                                setCreateOpen(true);
                              }}
                            >
                              Tạo lớp học
                            </Button>
                          </div>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((c) => {
                    const isProcessing = actionLoadingId === c.id;
                    const isArchived = !c.isActive;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="py-3">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate" title={c.name}>
                              {c.icon ? `${c.icon} ` : ""}
                              {c.name}
                            </span>
                            <span className="text-xs text-muted-foreground">Mã: {c.code}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col min-w-0">
                            <span className="text-foreground truncate" title={c.teacher?.fullname || ""}>
                              {c.teacher?.fullname || "(Chưa cập nhật)"}
                            </span>
                            <span className="text-xs text-muted-foreground truncate" title={c.teacher?.email || ""}>
                              {c.teacher?.email || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-foreground/80">
                          {c._count?.students ?? 0} / {c.maxStudents}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant={c.isActive ? "success" : "outline"}>
                            {c.isActive ? "Hoạt động" : "Đã lưu trữ"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/admin/classrooms/${c.id}`}>Chi tiết</Link>
                            </Button>

                            <ClassroomRowActionsMenu
                              disabled={isProcessing}
                              isArchived={isArchived}
                              onOpenStudents={() => openStudentsDialog(c)}
                              onOpenBulkAddStudents={() => openBulkAddStudents(c)}
                              onOpenEdit={() => openEditClassroom(c)}
                              onOpenChangeTeacher={() => openChangeTeacherDialog(c)}
                              onToggleArchive={() => toggleArchive(c)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

        <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={handlePageChange} />
        </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open: boolean) => {
          setCreateOpen(open);
          if (!open) {
            setCreateError(null);
            setTeacherError(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setCreateOpen(false)}
          className="w-[min(760px,calc(100vw-2rem))] max-w-none max-h-[85vh]"
        >
          <DialogHeader>
            <DialogTitle>Tạo lớp học</DialogTitle>
            <DialogDescription>
              Tạo nhanh lớp học và gán giáo viên phụ trách.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createClassroom} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
              {createError ? (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Tên lớp</label>
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="VD: Lớp 8A1"
                    required
                    disabled={createLoading}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Sĩ số tối đa</label>
                  <Input
                    type="number"
                    value={createMaxStudents}
                    onChange={(e) => setCreateMaxStudents(e.target.value)}
                    min={1}
                    max={500}
                    disabled={createLoading}
                  />
                </div>
              </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground">Giáo viên phụ trách</label>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={teacherQuery}
                  onChange={(e) => setTeacherQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchTeachers(teacherQuery);
                    }
                  }}
                  placeholder="Tìm theo tên hoặc email..."
                  disabled={createLoading || teacherLoading}
                />
                <Select
                  value={createTeacherId}
                  onChange={(e) => setCreateTeacherId(e.target.value)}
                  className="rounded-2xl px-4 py-3 text-sm"
                  disabled={createLoading || teacherLoading}
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.fullname || "(Chưa cập nhật)") + " - " + t.email}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  Gõ để tìm rồi chọn trong danh sách.
                </div>
                <button
                  type="button"
                  onClick={() => fetchTeachers(teacherQuery)}
                  disabled={createLoading || teacherLoading}
                  className="text-[11px] font-semibold text-foreground hover:text-foreground/80 disabled:opacity-60"
                >
                  {teacherLoading ? "Đang tải..." : "Tải danh sách"}
                </button>
              </div>
              {teacherError && (
                <div className="text-[12px] text-destructive">{teacherError}</div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Mã lớp</label>
              <div className="flex items-center gap-2">
                <Input
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value)}
                  placeholder="Để trống để hệ thống tự tạo"
                  disabled={createLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={genCode}
                  disabled={createLoading}
                  className="rounded-2xl whitespace-nowrap"
                >
                  Ngẫu nhiên
                </Button>
              </div>
            </div>

            </div>

            <DialogFooter className="px-0 shrink-0">
              <Button variant="outline" type="button" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Đóng
              </Button>
              <Button type="submit" disabled={createLoading || !createName.trim() || !createTeacherId}>
                {createLoading ? "Đang tạo..." : "Tạo lớp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open: boolean) => {
          setEditOpen(open);
          if (!open) {
            setEditTarget(null);
            setEditError(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setEditOpen(false)}
          className="w-[min(720px,calc(100vw-2rem))] max-w-none max-h-[80vh]"
        >
          <DialogHeader>
            <DialogTitle>Chỉnh sửa lớp</DialogTitle>
            <DialogDescription>
              {editTarget ? `Lớp: ${editTarget.code} — ${editTarget.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitEditClassroom} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
              {editError ? (
                <Alert variant="destructive">
                  <AlertDescription className="text-[11px]">{editError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Tên lớp</div>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="VD: Lớp 12A2"
                    disabled={editSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Sĩ số tối đa</div>
                  <Input
                    type="number"
                    value={editMaxStudents}
                    onChange={(e) => setEditMaxStudents(e.target.value)}
                    placeholder="30"
                    min={1}
                    max={500}
                    disabled={editSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Mã lớp</div>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="VD: 6QEH8D"
                  disabled={editSubmitting}
                />
                <div className="text-[11px] text-muted-foreground">4-10 ký tự, chỉ gồm A-Z và 2-9.</div>
              </div>
            </div>

            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
                Đóng
              </Button>
              <Button type="submit" disabled={editSubmitting || !editTarget}>
                {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={studentsOpen}
        onOpenChange={(open: boolean) => {
          setStudentsOpen(open);
          if (!open) {
            setStudentsTarget(null);
            setStudentsItems([]);
            setStudentsError(null);
            setStudentsSearch("");
            setStudentsPage(1);
            setStudentsTotal(0);
          }
        }}
      >
        <DialogContent
          onClose={() => setStudentsOpen(false)}
          className="w-[min(980px,calc(100vw-2rem))] max-w-none max-h-[85vh]"
        >
          <DialogHeader>
            <DialogTitle>Danh sách học sinh</DialogTitle>
            <DialogDescription>
              {studentsTarget ? `Lớp: ${studentsTarget.code} — ${studentsTarget.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-4 px-6 pb-6">
              {studentsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{studentsError}</AlertDescription>
                </Alert>
              ) : null}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setStudentsPage(1);
                  fetchClassroomStudents({ page: 1, q: studentsSearch });
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={studentsSearch}
                  onChange={(e) => setStudentsSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc email..."
                  disabled={studentsLoading}
                />
                <Button type="submit" variant="outline" disabled={studentsLoading} className="rounded-2xl">
                  {studentsLoading ? "Đang tải..." : "Tìm"}
                </Button>
              </form>

              <div className="rounded-2xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Học sinh</TableHead>
                      <TableHead className="text-xs font-semibold">Email</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsLoading && studentsItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          Đang tải danh sách học sinh...
                        </TableCell>
                      </TableRow>
                    ) : studentsItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          Không có học sinh nào.
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentsItems.map((s) => {
                        const isRemoving = studentsActionId === s.id;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="py-2 align-middle">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{s.fullname || "(Chưa cập nhật)"}</span>
                                <span className="text-[11px] text-muted-foreground">Vào lớp: {new Date(s.joinedAt).toLocaleString()}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 align-middle text-foreground/80">{s.email}</TableCell>
                            <TableCell className="py-2 align-middle text-right">
                              <Button
                                variant="outline"
                                className="rounded-2xl"
                                disabled={isRemoving || studentsLoading || !studentsTarget?.isActive}
                                onClick={() => removeStudentFromClassroom({ id: s.id, email: s.email, fullname: s.fullname })}
                              >
                                {isRemoving ? "Đang xoá..." : "Xoá"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Trang {studentsPage} / {Math.max(1, Math.ceil(studentsTotal / studentsPageSize))} • Tổng {studentsTotal}
                </div>
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, studentsPage - 1);
                      setStudentsPage(next);
                      fetchClassroomStudents({ page: next, q: studentsSearch });
                    }}
                    disabled={studentsLoading || studentsPage <= 1}
                    className="rounded-full border border-border px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50 text-foreground/80"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const totalPages = Math.max(1, Math.ceil(studentsTotal / studentsPageSize));
                      const next = Math.min(totalPages, studentsPage + 1);
                      setStudentsPage(next);
                      fetchClassroomStudents({ page: next, q: studentsSearch });
                    }}
                    disabled={studentsLoading || studentsPage >= Math.max(1, Math.ceil(studentsTotal / studentsPageSize))}
                    className="rounded-full border border-border px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50 text-foreground/80"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setStudentsOpen(false)} disabled={studentsLoading}>
              Đóng
            </Button>
            <Button variant="outline" onClick={exportStudentsExcel} disabled={studentsLoading || !studentsTarget}>
              Xuất Excel
            </Button>
            <Button onClick={() => fetchClassroomStudents({ page: 1, q: studentsSearch })} disabled={studentsLoading || !studentsTarget}>
              {studentsLoading ? "Đang tải..." : "Tải lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={changeTeacherOpen}
        onOpenChange={(open: boolean) => {
          setChangeTeacherOpen(open);
          if (!open) {
            setChangeTeacherError(null);
            setChangeTeacherTarget(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setChangeTeacherOpen(false)}
          className="w-[min(720px,calc(100vw-2rem))] max-w-none max-h-[75vh]"
        >
          <DialogHeader>
            <DialogTitle>Đổi giáo viên phụ trách</DialogTitle>
            <DialogDescription>
              {changeTeacherTarget ? `Lớp: ${changeTeacherTarget.code} — ${changeTeacherTarget.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitChangeTeacher} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
              {changeTeacherError ? (
                <Alert variant="destructive">
                  <AlertDescription>{changeTeacherError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold text-muted-foreground">Giáo viên mới</label>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={changeTeacherQuery}
                    onChange={(e) => setChangeTeacherQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        fetchChangeTeacherOptions(changeTeacherQuery);
                      }
                    }}
                    placeholder="Tìm theo tên hoặc email..."
                    disabled={changeTeacherSubmitting || changeTeacherLoading}
                  />
                  <Select
                    value={changeTeacherId}
                    onChange={(e) => setChangeTeacherId(e.target.value)}
                    className="rounded-2xl px-4 py-3 text-sm"
                    disabled={changeTeacherSubmitting || changeTeacherLoading}
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {changeTeacherOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {(t.fullname || "(Chưa cập nhật)") + " - " + t.email}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">Gõ để tìm rồi chọn trong danh sách.</div>
                  <button
                    type="button"
                    onClick={() => fetchChangeTeacherOptions(changeTeacherQuery)}
                    disabled={changeTeacherSubmitting || changeTeacherLoading}
                    className="text-[11px] font-semibold text-foreground hover:text-foreground/80 disabled:opacity-60"
                  >
                    {changeTeacherLoading ? "Đang tải..." : "Tải danh sách"}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="px-0 shrink-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => setChangeTeacherOpen(false)}
                disabled={changeTeacherSubmitting}
              >
                Đóng
              </Button>
              <Button type="submit" disabled={changeTeacherSubmitting || !changeTeacherId || !changeTeacherTarget}>
                {changeTeacherSubmitting ? "Đang cập nhật..." : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkOpen}
        onOpenChange={(open: boolean) => {
          setBulkOpen(open);
          if (!open) {
            setBulkTarget(null);
          }
        }}
      >
        <DialogContent
          onClose={() => setBulkOpen(false)}
          className="w-[min(980px,calc(100vw-2rem))] max-w-none max-h-[85vh]"
        >
          <DialogHeader>
            <DialogTitle>Thêm học sinh hàng loạt</DialogTitle>
            <DialogDescription>
              {bulkTarget ? `Lớp: ${bulkTarget.code} — ${bulkTarget.name}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-4 px-6 pb-6">
              {bulkError ? (
                <Alert variant="destructive">
                  <AlertDescription>{bulkError}</AlertDescription>
                </Alert>
              ) : null}

              {bulkResult ? (
                <Alert className="border-primary/20 bg-primary/10 text-primary">
                  <AlertDescription>
                    Đã thêm {bulkResult.created} học sinh.
                    {bulkResult.accountsCreated > 0 ? ` Đã tạo mới ${bulkResult.accountsCreated} tài khoản.` : ""}
                    {bulkResult.alreadyInClassroom > 0 ? ` Đã có trong lớp ${bulkResult.alreadyInClassroom}.` : ""}
                    {` Bỏ qua ${bulkResult.skipped} email.`}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Danh sách email học sinh</div>
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={10}
                    placeholder={"VD:\nstudent1@example.com\nNguyễn Văn A, student2@example.com"}
                    className="resize-y"
                    disabled={bulkSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Tải lên CSV</div>
                  <div
                    className={`flex flex-col gap-2 rounded-2xl border-2 border-dashed px-4 py-4 transition-colors ${
                      bulkDragOver
                        ? "border-foreground bg-muted/30"
                        : "border-border hover:border-foreground/40 hover:bg-muted/30"
                    }`}
                    onDragOver={handleBulkDragOver}
                    onDragLeave={handleBulkDragLeave}
                    onDrop={handleBulkDrop}
                  >
                    <div className="text-sm font-semibold text-foreground">Kéo & thả file CSV</div>
                    <div className="text-xs text-muted-foreground">
                      CSV có thể chứa nhiều cột, hệ thống sẽ tự tìm email trong từng dòng.
                    </div>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleBulkFileChange}
                      className="text-[11px] text-foreground"
                      disabled={bulkSubmitting}
                    />
                    {bulkFileName && (
                      <span className="text-[11px] text-muted-foreground">File: {bulkFileName}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Lý do (tuỳ chọn)</div>
                <Textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  rows={2}
                  placeholder="VD: Bổ sung học sinh mới nhập học..."
                  className="resize-y"
                  disabled={bulkSubmitting}
                />
              </div>

              <AccordionItem
                title="Tùy chọn tài khoản"
                defaultOpen={false}
                className="rounded-2xl border border-border bg-card"
                headerClassName="text-foreground hover:bg-muted/50 rounded-2xl px-4 py-3"
                contentClassName="px-4 pb-3"
              >
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground/80">
                  <input
                    type="checkbox"
                    checked={bulkCreateMissing}
                    onChange={(e) => setBulkCreateMissing(e.target.checked)}
                    disabled={bulkSubmitting}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Tự tạo tài khoản cho email chưa tồn tại</div>
                    <div className="text-[12px] text-muted-foreground">Tài khoản mới sẽ có role STUDENT và được thêm vào lớp.</div>
                  </div>
                </label>

                {bulkCreateMissing && (
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-semibold text-muted-foreground">Mật khẩu mặc định</div>
                      <Input
                        type="password"
                        value={bulkDefaultPassword}
                        onChange={(e) => setBulkDefaultPassword(e.target.value)}
                        placeholder="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"
                        disabled={bulkSubmitting}
                      />
                      <div className="text-[11px] text-muted-foreground">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số. Không lưu/hiển thị lại trong kết quả.</div>
                    </div>
                    <div className="hidden md:block" />
                  </div>
                )}
              </AccordionItem>

              {bulkSkippedPreview.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Một số email bị bỏ qua</div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground/80">
                    {bulkSkippedPreview.map((it) => (
                      <div key={it.email} className="flex items-start justify-between gap-3">
                        <span className="font-medium">{it.email}</span>
                        <span className="text-muted-foreground">{it.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>
              Đóng
            </Button>
            <Button onClick={submitBulkAddStudents} disabled={bulkSubmitting || !bulkTarget}>
              {bulkSubmitting ? "Đang thêm..." : "Thêm vào lớp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
