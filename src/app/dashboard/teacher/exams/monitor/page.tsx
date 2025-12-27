"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RateLimitDialog, { getRetryAfterSecondsFromResponse } from "@/components/shared/RateLimitDialog";
import { z } from "zod";
import { 
  Monitor, 
  Users, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Settings,
  Eye,
  Shield,
  Play,
  Pause,
  StopCircle,
  Plus,
  CheckCircle,
  WifiOff,
  BarChart3
} from "lucide-react";
import { PageHeader } from "@/components/shared";
import ExamStatsOverview from "@/components/teacher/exam/ExamStatsOverview";
import ExamMonitoringList from "@/components/teacher/exam/ExamMonitoringList";
import ExamLogsFilters from "@/components/teacher/exam/ExamLogsFilters";
import ExamLogsTables from "@/components/teacher/exam/ExamLogsTables";

type TeacherAssignmentListItem = {
  id: string;
  title: string;
  type: string;
  updatedAt: string;
};

type TeacherAssignmentsApiResponse = {
  success?: boolean;
  data?: {
    items?: TeacherAssignmentListItem[];
  };
  message?: string;
};

const TEACHER_ASSIGNMENTS_KEY =
  "/api/teachers/assignments?take=100&skip=0&status=all&sortKey=createdAt&sortDir=desc";

const teacherAssignmentsFetcher = async (url: string): Promise<TeacherAssignmentsApiResponse> => {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as TeacherAssignmentsApiResponse;
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "Không thể tải danh sách bài tập");
  }
  return json;
};

// Mock data đơn giản cho UI (để trống, chỉ dùng cho demo nếu cần)
const mockStudentSessions: Array<{
  //   {
  //   id: "1",
  //   studentName: "Nguyễn Văn A",
  //   assignmentTitle: "Kiểm tra Toán học",
  //   status: "IN_PROGRESS",
  //   startTime: "14:30",
  //   timeRemaining: "25:30",
  //   progress: 60,
  //   currentQuestion: 8,
  //   totalQuestions: 15,
  //   suspiciousActivities: 2,
  //   isOnline: true
  // },
  // {
  //   id: "2", 
  //   studentName: "Trần Thị B",
  //   assignmentTitle: "Kiểm tra Toán học",
  //   status: "PAUSED",
  //   startTime: "14:15",
  //   timeRemaining: "10:45",
  //   progress: 40,
  //   currentQuestion: 6,
  //   totalQuestions: 15,
  //   suspiciousActivities: 0,
  //   isOnline: false
  // },
  // {
  //   id: "3",
  //   studentName: "Lê Văn C", 
  //   assignmentTitle: "Kiểm tra Toán học",
  //   status: "COMPLETED",
  //   startTime: "14:00",
  //   timeRemaining: "00:00",
  //   progress: 100,
  //   currentQuestion: 15,
  //   totalQuestions: 15,
  //   suspiciousActivities: 1,
  //   isOnline: true
  // }
  id: string;
  studentName: string;
  assignmentTitle: string;
  status: string;
  startTime: string;
  timeRemaining: string;
  progress: number;
  currentQuestion: number;
  totalQuestions: number;
  suspiciousActivities: number;
  isOnline: boolean;
}> = [];

/**
 * Trang giám sát thi trực tuyến cho giáo viên
 * URL: /dashboard/teacher/exams/monitor
 */
export default function ExamMonitorPage() {
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  const { data: teacherAssignmentsData } = useSWR<TeacherAssignmentsApiResponse>(
    TEACHER_ASSIGNMENTS_KEY,
    teacherAssignmentsFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const quizOptions = useMemo(() => {
    const items = teacherAssignmentsData?.data?.items ?? [];
    const quizzes = items
      .filter((a) => a.type === "QUIZ")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return quizzes.map((a) => ({ id: a.id, title: a.title }));
  }, [teacherAssignmentsData]);

  const antiScoreSchema = z.object({
    suspicionScore: z.number().int().min(0).max(100),
    riskLevel: z.enum(["low", "medium", "high"]),
    breakdown: z
      .array(
        z.object({
          ruleId: z.string(),
          title: z.string(),
          count: z.number().int().min(0),
          points: z.number().int().min(0).max(100),
          maxPoints: z.number().int().min(0).max(100),
          details: z.string(),
        })
      )
      .default([]),
    countsByType: z.record(z.string(), z.number().int().min(0)).default({}),
    totalEvents: z.number().int().min(0),
  });

  const aiSummarySchema = z.object({
    title: z.string(),
    summary: z.string(),
    keySignals: z.array(z.string()).default([]),
    recommendations: z.array(z.string()).default([]),
    suspicionScore: z.number().int().min(0).max(100),
    riskLevel: z.enum(["low", "medium", "high"]),
  });

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [manualRefreshKey, setManualRefreshKey] = useState(0);
  const [assignmentIdInput, setAssignmentIdInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [attemptInput, setAttemptInput] = useState<string>("");
  const [events, setEvents] = useState<
    Array<{
      id: string;
      assignmentId: string;
      studentId: string;
      attempt: number | null;
      eventType: string;
      createdAt: string;
      metadata: unknown;
      student?: { id: string; fullname: string };
    }>
  >([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [limitInput, setLimitInput] = useState("200");
  const [extendMinutesInput, setExtendMinutesInput] = useState("15");
  const [extendReasonInput, setExtendReasonInput] = useState("");
  const [controlsLoading, setControlsLoading] = useState(false);

  const [antiScoreLoading, setAntiScoreLoading] = useState(false);
  const [antiScore, setAntiScore] = useState<null | {
    suspicionScore: number;
    riskLevel: "low" | "medium" | "high";
    breakdown: Array<{ ruleId: string; title: string; count: number; points: number; maxPoints: number; details: string }>;
    countsByType: Record<string, number>;
    totalEvents: number;
  }>(null);

  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<null | {
    title: string;
    summary: string;
    keySignals: string[];
    recommendations: string[];
    suspicionScore: number;
    riskLevel: "low" | "medium" | "high";
  }>(null);
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [rateLimitRetryAfterSeconds, setRateLimitRetryAfterSeconds] = useState(0);

  const searchParams = useSearchParams();
  const assignmentIdFromQuery = searchParams.get("assignmentId");

  const [assignmentTitle, setAssignmentTitle] = useState<string | null>(null);
  const [assignmentQuestionCount, setAssignmentQuestionCount] = useState<number | null>(null);
  const [assignmentTimeLimitMinutes, setAssignmentTimeLimitMinutes] = useState<number | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  // Chỉ dùng mock demo khi KHÔNG có assignmentId trên URL và cũng không nhập thủ công
  const useDemoSessions = !assignmentIdFromQuery && !assignmentIdInput.trim();

  const effectiveAssignmentId = assignmentIdFromQuery || assignmentIdInput.trim();

  // Auto refresh: tự động tải lại logs & phiên thi theo assignment hiện tại
  useEffect(() => {
    if (!isAutoRefresh) return;

    // Ưu tiên assignmentId trên URL, fallback sang input thủ công
    const effectiveIdForLogs = assignmentIdFromQuery || assignmentIdInput.trim();
    if (!effectiveIdForLogs) return;

    const tick = () => {
      fetchEvents(effectiveIdForLogs);
    };

    // Gọi ngay 1 lần và sau đó lặp lại ~2s/lần
    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  // Phụ thuộc vào filters để khi thay đổi thì chu kỳ mới dùng filter mới
  }, [isAutoRefresh, assignmentIdFromQuery, assignmentIdInput, studentIdInput, attemptInput, fromInput, toInput, limitInput]);

  const fetchEvents = async (assignmentIdOverride?: string) => {
    const id = (assignmentIdOverride ?? assignmentIdInput).trim();
    if (!id) return;
    try {
      setLoadingEvents(true);
      const params = new URLSearchParams({ assignmentId: id });
      if (studentIdInput.trim()) params.set("studentId", studentIdInput.trim());
      if (attemptInput.trim()) params.set("attempt", attemptInput.trim());
      if (fromInput.trim()) params.set("from", new Date(fromInput).toISOString());
      if (toInput.trim()) params.set("to", new Date(toInput).toISOString());
      if (limitInput.trim()) params.set("limit", limitInput.trim());
      const res = await fetch(`/api/exam-events?${params.toString()}`);
      const j = (await res.json().catch(() => null)) as unknown;
      const ok =
        typeof j === "object" &&
        j !== null &&
        (j as { success?: unknown }).success === true;
      if (!res.ok || !ok) {
        const msg =
          typeof j === "object" &&
          j !== null &&
          typeof (j as { message?: unknown }).message === "string"
            ? (j as { message: string }).message
            : res.statusText;
        throw new Error(msg);
      }

      const raw = isRecord(j) && Array.isArray(j.data) ? j.data : [];
      const mapped = raw
        .map((item) => {
          if (!isRecord(item)) return null;
          const id = typeof item.id === "string" ? item.id : null;
          const assignmentId = typeof item.assignmentId === "string" ? item.assignmentId : null;
          const studentId = typeof item.studentId === "string" ? item.studentId : null;
          const eventType = typeof item.eventType === "string" ? item.eventType : null;
          const createdAt = typeof item.createdAt === "string" ? item.createdAt : null;
          const attemptRaw = item.attempt;
          const attempt = typeof attemptRaw === "number" && Number.isFinite(attemptRaw) ? attemptRaw : null;
          const metadata = (item as { metadata?: unknown }).metadata ?? null;
          const student = isRecord(item.student)
            ? {
                id: typeof item.student.id === "string" ? item.student.id : "",
                fullname: typeof item.student.fullname === "string" ? item.student.fullname : "",
              }
            : undefined;

          if (!id || !assignmentId || !studentId || !eventType || !createdAt) return null;
          return { id, assignmentId, studentId, attempt, eventType, createdAt, metadata, student };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
      setEvents(mapped);
    } catch (e) {
      console.error("[ExamLogs] fetch error", e);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (assignmentIdFromQuery) {
      setAssignmentIdInput(assignmentIdFromQuery);
      fetchEvents(assignmentIdFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAssignmentId]);

  useEffect(() => {
    if (!effectiveAssignmentId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingAssignment(true);
        const res = await fetch(`/api/assignments/${effectiveAssignmentId}`);
        const j = await res.json();
        if (!res.ok || !j?.success) throw new Error(j?.message || res.statusText);
        if (!cancelled) {
          setAssignmentTitle(j.data?.title ?? null);
          const qc = Array.isArray(j.data?.questions) ? j.data.questions.length : null;
          setAssignmentQuestionCount(qc);
          const tl = typeof j.data?.timeLimitMinutes === 'number' ? j.data.timeLimitMinutes : null;
          setAssignmentTimeLimitMinutes(tl);
        }
      } catch (e) {
        console.error("[ExamMonitor] load assignment title error", e);
        if (!cancelled) {
          setAssignmentTitle(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingAssignment(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [effectiveAssignmentId, manualRefreshKey]);

  const severityOf = (type: string): 'low' | 'medium' | 'high' | 'info' => {
    if (type === 'SESSION_STARTED' || type === 'AUTO_SAVED' || type === 'SESSION_RESUMED') return 'info';

    // Nhóm cảnh báo mức CAO (high)
    if (
      type === 'FULLSCREEN_EXIT' ||
      type === 'TAB_SWITCH_DETECTED' || // từ ExamInterface
      type === 'TAB_SWITCH' ||          // từ QuizAssignmentForm
      type === 'COPY_PASTE_ATTEMPT' ||  // từ ExamInterface
      type === 'CLIPBOARD' ||           // từ QuizAssignmentForm (copy/cut/paste/contextmenu)
      type === 'SHORTCUT' ||            // từ QuizAssignmentForm (phím tắt nghi ngờ)
      type === 'SUSPICIOUS_BEHAVIOR_DETECTED'
    ) return 'high';

    // Nhóm cảnh báo mức TRUNG BÌNH (medium)
    if (
      type === 'SESSION_PAUSED' ||
      type === 'GRACE_PERIOD_ADDED' ||
      type === 'WINDOW_BLUR'            // từ QuizAssignmentForm: rời cửa sổ
    ) return 'medium';

    return 'low';
  };

  const summaryByStudentAttempt = useMemo(() => {
    const map = new Map<string, { studentId: string; fullname: string; attempt: number | null; count: number; high: number; medium: number }>();
    for (const ev of events) {
      const key = `${ev.studentId}|${ev.attempt ?? 'null'}`;
      const cur = map.get(key) || { studentId: ev.studentId, fullname: ev.student?.fullname || ev.studentId, attempt: ev.attempt ?? null, count: 0, high: 0, medium: 0 };
      cur.count += 1;
      const sev = severityOf(ev.eventType);
      if (sev === 'high') cur.high += 1; else if (sev === 'medium') cur.medium += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [events]);

  const summaryByType = useMemo(() => {
    const map = new Map<string, { type: string; count: number; severity: ReturnType<typeof severityOf> }>();
    for (const ev of events) {
      const cur = map.get(ev.eventType) || { type: ev.eventType, count: 0, severity: severityOf(ev.eventType) };
      cur.count += 1;
      map.set(ev.eventType, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [events]);

  const derivedSessions = useMemo(() => {
    const map = new Map<string, {
      id: string;
      studentId: string;
      fullname: string;
      attempt: number | null;
      firstEventAt: string;
      lastEventAt: string;
      eventCount: number;
      highCount: number;
      mediumCount: number;
      hasPaused: boolean;
      hasResumed: boolean;
      hasCompleted: boolean;
      hasTerminated: boolean;
      answeredQuestionIds: Set<string>;
      lastQuestionIndex: number | null;
    }>();

    for (const ev of events) {
      const key = `${ev.studentId}|${ev.attempt ?? 'null'}`;
      const createdAt = ev.createdAt;
      const sev = severityOf(ev.eventType);
      const existing = map.get(key);

      const isPauseEvent = ev.eventType === 'SESSION_PAUSED' || ev.eventType === 'TEACHER_PAUSE_SESSION';
      const isResumeEvent = ev.eventType === 'SESSION_RESUMED' || ev.eventType === 'TEACHER_RESUME_SESSION';
      const isCompletedEvent = ev.eventType === 'SESSION_COMPLETED';
      const isTerminatedEvent = ev.eventType === 'SESSION_TERMINATED' || ev.eventType === 'TEACHER_TERMINATE_SESSION';

      const meta = isRecord(ev.metadata) ? ev.metadata : null;
      const answeredQuestionId = ev.eventType === 'QUESTION_ANSWERED' && meta && typeof meta["questionId"] === 'string'
        ? (meta["questionId"] as string)
        : null;
      const questionIndexFromAnswered = ev.eventType === 'QUESTION_ANSWERED' && meta && typeof meta["currentQuestionIndex"] === 'number'
        ? (meta["currentQuestionIndex"] as number)
        : null;
      const questionIndexFromChanged = ev.eventType === 'QUESTION_CHANGED' && meta && typeof meta["toIndex"] === 'number'
        ? (meta["toIndex"] as number)
        : null;

      if (!existing) {
        map.set(key, {
          id: key,
          studentId: ev.studentId,
          fullname: ev.student?.fullname || ev.studentId,
          attempt: ev.attempt ?? null,
          firstEventAt: createdAt,
          lastEventAt: createdAt,
          eventCount: 1,
          highCount: sev === 'high' ? 1 : 0,
          mediumCount: sev === 'medium' ? 1 : 0,
          hasPaused: isPauseEvent,
          hasResumed: isResumeEvent,
          hasCompleted: isCompletedEvent,
          hasTerminated: isTerminatedEvent,
          answeredQuestionIds: answeredQuestionId ? new Set<string>([answeredQuestionId]) : new Set<string>(),
          lastQuestionIndex: questionIndexFromAnswered ?? questionIndexFromChanged ?? null,
        });
      } else {
        if (createdAt < existing.firstEventAt) existing.firstEventAt = createdAt;
        if (createdAt > existing.lastEventAt) existing.lastEventAt = createdAt;
        existing.eventCount += 1;

        if (sev === 'high') existing.highCount += 1;
        else if (sev === 'medium') existing.mediumCount += 1;

        if (isPauseEvent) existing.hasPaused = true;
        if (isResumeEvent) existing.hasResumed = true;
        if (isCompletedEvent) existing.hasCompleted = true;
        if (isTerminatedEvent) existing.hasTerminated = true;

         if (answeredQuestionId) existing.answeredQuestionIds.add(answeredQuestionId);
         if (questionIndexFromAnswered != null) existing.lastQuestionIndex = questionIndexFromAnswered;
         if (questionIndexFromChanged != null) existing.lastQuestionIndex = questionIndexFromChanged;
      }
    }

    const now = Date.now();

    return Array.from(map.values()).map((s) => {
      let status: string = 'IN_PROGRESS';
      if (s.hasTerminated) status = 'TERMINATED';
      else if (s.hasCompleted) status = 'COMPLETED';
      else if (s.hasPaused && !s.hasResumed) status = 'PAUSED';

      const lastTs = new Date(s.lastEventAt).getTime();
      const isOnline = now - lastTs < 2 * 60 * 1000;

      return {
        id: s.id,
        studentId: s.studentId,
        fullname: s.fullname,
        attempt: s.attempt,
        firstEventAt: s.firstEventAt,
        lastEventAt: s.lastEventAt,
        eventCount: s.eventCount,
        highCount: s.highCount,
        mediumCount: s.mediumCount,
        hasPaused: s.hasPaused,
        hasResumed: s.hasResumed,
        hasCompleted: s.hasCompleted,
        hasTerminated: s.hasTerminated,
        answeredCount: s.answeredQuestionIds.size,
        lastQuestionIndex: s.lastQuestionIndex,
        status,
        isOnline,
      };
    }).sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt));
  }, [events]);

  const monitorSessions = useMemo(() => {
    if (useDemoSessions) return mockStudentSessions;
    const title = assignmentTitle || 'Bài thi';

    const byStudent = new Map<string, typeof derivedSessions[number]>();
    for (const s of derivedSessions) {
      if (!byStudent.has(s.studentId)) {
        byStudent.set(s.studentId, s);
      }
    }

    const totalQ = assignmentQuestionCount ?? 0;

    return Array.from(byStudent.values()).map((s) => {
      // Tiến độ dựa trên số câu đã trả lời
      const answeredCount = s.answeredCount;
      const safeTotalQ = totalQ > 0 ? totalQ : 0;
      const progress = safeTotalQ > 0
        ? Math.min(100, Math.max(0, Math.round((answeredCount / safeTotalQ) * 100)))
        : 0;

      // Thời gian còn lại: vẫn dùng tính toán từ timeLimit (nếu có)
      let timeRemainingLabel: string | null = null;
      const limitMinutes = assignmentTimeLimitMinutes ?? null;
      if (limitMinutes && limitMinutes > 0) {
        const now = Date.now();
        const startTs = new Date(s.firstEventAt).getTime();
        const totalSec = limitMinutes * 60;
        const elapsedSec = Math.max(0, Math.floor((now - startTs) / 1000));
        const remainingSec = Math.max(0, totalSec - elapsedSec);
        const m = Math.floor(remainingSec / 60);
        const sec = remainingSec % 60;
        timeRemainingLabel = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      }

      return {
        id: s.id,
        studentName: s.fullname,
        assignmentTitle: title,
        status: s.status,
        startTime: new Date(s.firstEventAt).toLocaleTimeString(),
        timeRemaining: timeRemainingLabel ?? '-',
        progress,
        currentQuestion: answeredCount,
        totalQuestions: safeTotalQ,
        suspiciousActivities: (s.highCount ?? 0) + (s.mediumCount ?? 0),
        isOnline: s.isOnline,
      };
    });
  }, [useDemoSessions, derivedSessions, assignmentTitle, assignmentQuestionCount, assignmentTimeLimitMinutes]);

  const activeCount = useDemoSessions
    ? mockStudentSessions.filter((s) => s.status === 'IN_PROGRESS').length
    : derivedSessions.filter((s) => s.status === 'IN_PROGRESS').length;

  const pausedCount = useDemoSessions
    ? mockStudentSessions.filter((s) => s.status === 'PAUSED').length
    : derivedSessions.filter((s) => s.status === 'PAUSED').length;

  const completedCount = useDemoSessions
    ? mockStudentSessions.filter((s) => s.status === 'COMPLETED').length
    : derivedSessions.filter((s) => s.status === 'COMPLETED').length;

  const totalSuspicious = useDemoSessions
    ? mockStudentSessions.reduce((sum, s) => sum + s.suspiciousActivities, 0)
    // Với dữ liệu thật: tổng số event high + medium
    : derivedSessions.reduce((sum, s) => sum + (s.highCount ?? 0) + (s.mediumCount ?? 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đang thi</Badge>;
      case 'PAUSED':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Tạm dừng</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Đã nộp bài</Badge>;
      case 'TERMINATED':
        return <Badge variant="destructive" className="bg-red-100 text-red-700">Đã chấm dứt</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const parseSessionKey = (sessionKey: string): { studentId: string; attemptNumber: number | null } => {
    const raw = (sessionKey || "").trim();
    if (!raw) return { studentId: "", attemptNumber: null };

    // Expected: studentId|attempt (attempt can be number or 'null')
    if (raw.includes("|")) {
      const [studentId, attemptRaw] = raw.split("|");
      const attemptNumber = attemptRaw && attemptRaw !== "null" ? Number(attemptRaw) : null;
      return {
        studentId: (studentId || "").trim(),
        attemptNumber: attemptNumber != null && Number.isFinite(attemptNumber) ? attemptNumber : null,
      };
    }

    // Fallback: treat whole key as studentId (demo sessions or other formats)
    return { studentId: raw, attemptNumber: null };
  };

  const handleSelectStudent = (sessionKey: string) => {
    setSelectedStudent(sessionKey);
    const { studentId, attemptNumber } = parseSessionKey(sessionKey);
    if (studentId) {
      setStudentIdInput(studentId);
    }
    setAttemptInput(attemptNumber != null ? String(attemptNumber) : "");
  };

  const loadAntiCheatScore = async () => {
    if (!effectiveAssignmentId) return;
    const studentId = studentIdInput.trim() || undefined;
    const attempt = attemptInput.trim() || undefined;

    try {
      setAntiScoreLoading(true);
      const params = new URLSearchParams();
      if (studentId) params.set("studentId", studentId);
      if (attempt) params.set("attempt", attempt);
      const res = await fetch(`/api/teachers/assignments/${effectiveAssignmentId}/anti-cheat/score?${params.toString()}`);
      const j = (await res.json().catch(() => null)) as unknown;
      const ok =
        typeof j === "object" &&
        j !== null &&
        (j as { success?: unknown }).success === true;
      if (!res.ok || !ok) {
        const msg =
          typeof j === "object" &&
          j !== null &&
          typeof (j as { message?: unknown }).message === "string"
            ? (j as { message: string }).message
            : res.statusText;
        throw new Error(msg);
      }
      const data = isRecord(j) ? j.data : null;
      const validated = antiScoreSchema.safeParse(data);
      if (!validated.success) {
        throw new Error("Dữ liệu anti-cheat score không hợp lệ");
      }
      setAntiScore(validated.data);
    } catch (e) {
      console.error("[AntiCheatScore] load error", e);
      setAntiScore(null);
    } finally {
      setAntiScoreLoading(false);
    }
  };

  const callAiSummary = async () => {
    if (!effectiveAssignmentId) return;
    const studentId = studentIdInput.trim();
    if (!studentId) {
      toast({
        title: "Thiếu Student ID",
        description: "Vui lòng nhập Student ID để AI tóm tắt đúng theo học sinh.",
        variant: "destructive",
      });
      return;
    }

    const attemptNumber = attemptInput.trim() ? Number(attemptInput.trim()) : null;
    const attempt = Number.isFinite(attemptNumber as number) ? (attemptNumber as number) : null;

    try {
      setAiSummaryLoading(true);
      const res = await fetch("/api/ai/anti-cheat/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: effectiveAssignmentId,
          studentId,
          attempt,
        }),
      });

      const j = (await res.json().catch(() => null)) as unknown;
      if (res.status === 429) {
        const retryAfter = getRetryAfterSecondsFromResponse(res, j) ?? 30;
        setRateLimitRetryAfterSeconds(retryAfter);
        setRateLimitOpen(true);
        return;
      }

      const ok =
        typeof j === "object" &&
        j !== null &&
        (j as { success?: unknown }).success === true;
      if (!res.ok || !ok) {
        const msg =
          typeof j === "object" &&
          j !== null &&
          typeof (j as { message?: unknown }).message === "string"
            ? (j as { message: string }).message
            : res.statusText;
        throw new Error(msg);
      }

      const data = isRecord(j) ? j.data : null;
      const validated = aiSummarySchema.safeParse(data);
      if (!validated.success) {
        throw new Error("Dữ liệu AI summary không hợp lệ");
      }
      setAiSummary(validated.data);
    } catch (e) {
      console.error("[AntiCheatAiSummary] error", e);
      toast({
        title: "Không thể AI tóm tắt",
        description: "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const callTeacherOverride = async (
    sessionKey: string,
    action: "EXTEND_TIME" | "PAUSE" | "RESUME" | "TERMINATE",
    extra?: { minutes?: number; reason?: string }
  ) => {
    const assignmentId = effectiveAssignmentId.trim();
    if (!assignmentId) {
      window.alert("Vui lòng chọn bài Quiz để thực hiện điều khiển.");
      return;
    }
    const { studentId, attemptNumber } = parseSessionKey(sessionKey);
    if (!studentId) return;

    setControlsLoading(true);
    try {
      const body: Record<string, unknown> = {
        studentId,
        attemptNumber,
        action,
      };
      if (extra?.minutes != null) body.minutes = extra.minutes;
      if (extra?.reason != null) body.reason = extra.reason;

      const res = await fetch(`/api/teachers/assignments/${assignmentId}/attempts/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => null)) as unknown;
      const ok =
        typeof j === "object" &&
        j !== null &&
        (j as { success?: unknown }).success === true;
      if (!res.ok || !ok) {
        const msg =
          typeof j === "object" &&
          j !== null &&
          typeof (j as { message?: unknown }).message === "string"
            ? (j as { message: string }).message
            : res.statusText || "Không thể thực hiện hành động";
        console.error("[TeacherOverride] error", j);
        window.alert(msg);
        return;
      }
      if (action === "EXTEND_TIME") {
        setExtendReasonInput("");
      }
      const actionLabel =
        action === "EXTEND_TIME"
          ? "Gia hạn thời gian"
          : action === "PAUSE"
          ? "Tạm dừng phiên thi"
          : action === "RESUME"
          ? "Tiếp tục phiên thi"
          : "Chấm dứt phiên thi";
      toast({
        title: "Đã gửi lệnh",
        description: `${actionLabel} cho học sinh đã được áp dụng thành công (nếu học sinh đang làm bài).`,
      });
    } catch (e) {
      console.error("[TeacherOverride] network error", e);
      window.alert("Có lỗi xảy ra khi gửi lệnh. Vui lòng thử lại.");
    } finally {
      setControlsLoading(false);
    }
  };

  const handleExtendTime = (sessionKey: string) => {
    const minutes = Number(extendMinutesInput);
    if (!minutes || minutes <= 0) {
      window.alert("Số phút gia hạn phải lớn hơn 0.");
      return;
    }
    if (!extendReasonInput.trim()) {
      window.alert("Vui lòng nhập lý do gia hạn.");
      return;
    }
    void callTeacherOverride(sessionKey, "EXTEND_TIME", { minutes, reason: extendReasonInput.trim() });
  };

  const handleExtendTimeAll = () => {
    const minutes = Number(extendMinutesInput);
    if (!minutes || minutes <= 0) {
      window.alert("Số phút gia hạn phải lớn hơn 0.");
      return;
    }
    const reason = extendReasonInput.trim();
    if (!reason) {
      window.alert("Vui lòng nhập lý do gia hạn.");
      return;
    }

    if (!effectiveAssignmentId.trim()) {
      window.alert("Vui lòng chọn bài Quiz để gia hạn cho tất cả.");
      return;
    }

    const source = useDemoSessions ? mockStudentSessions : monitorSessions;
    const targets = source.filter((s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED');
    if (targets.length === 0) {
      window.alert("Không có phiên nào đang thi hoặc tạm dừng để gia hạn.");
      return;
    }

    if (!window.confirm(`Gia hạn thêm ${minutes} phút cho ${targets.length} học sinh?`)) {
      return;
    }

    targets.forEach((s) => {
      void callTeacherOverride(s.id, "EXTEND_TIME", { minutes, reason });
    });
  };

  const handlePauseSession = (sessionKey: string) => {
    void callTeacherOverride(sessionKey, "PAUSE");
  };

  const handleResumeSession = (sessionKey: string) => {
    void callTeacherOverride(sessionKey, "RESUME");
  };

  const handleTerminateSession = (sessionKey: string) => {
    if (!window.confirm("Bạn chắc chắn muốn chấm dứt phiên thi của học sinh này?")) return;
    void callTeacherOverride(sessionKey, "TERMINATE");
  };

  const handleManualRefresh = () => {
    const effectiveIdForLogs = assignmentIdFromQuery || assignmentIdInput.trim();
    if (!effectiveIdForLogs) {
      toast({
        title: "Chưa chọn bài thi",
        description: "Vui lòng nhập mã bài thi trước khi làm mới dữ liệu.",
        variant: "destructive",
      });
      return;
    }

    void fetchEvents(effectiveIdForLogs);
    void mutate(TEACHER_ASSIGNMENTS_KEY);
    setManualRefreshKey((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <RateLimitDialog
          open={rateLimitOpen}
          onOpenChange={setRateLimitOpen}
          retryAfterSeconds={rateLimitRetryAfterSeconds}
          onRetry={async () => {
            await callAiSummary();
          }}
        />

        <PageHeader
          role="teacher"
          title="Giám sát thi trực tuyến"
          subtitle="Theo dõi và quản lý các phiên thi đang diễn ra"
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleManualRefresh}
                className="inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </Button>
              <Button className="inline-flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Cài đặt
              </Button>
            </div>
          }
        />

        <ExamStatsOverview
          active={activeCount}
          paused={pausedCount}
          suspicious={totalSuspicious}
          total={monitorSessions.length}
        />

        {/* Main Content */}
        <Tabs defaultValue="monitoring" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="monitoring">Giám sát</TabsTrigger>
            <TabsTrigger value="controls">Điều khiển</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích</TabsTrigger>
            <TabsTrigger value="logs">Logs chống gian lận</TabsTrigger>
          </TabsList>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Danh sách học sinh đang thi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExamMonitoringList
                  sessions={monitorSessions}
                  selectedId={selectedStudent}
                  onSelect={handleSelectStudent}
                  renderStatusBadge={getStatusBadge}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Logs chống gian lận theo bài</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ExamLogsFilters
                  assignmentId={assignmentIdInput}
                  assignments={quizOptions}
                  assignmentDisabled={Boolean(assignmentIdFromQuery)}
                  studentId={studentIdInput}
                  attempt={attemptInput}
                  from={fromInput}
                  to={toInput}
                  limit={limitInput}
                  loading={loadingEvents}
                  canSubmit={Boolean(assignmentIdInput.trim())}
                  onAssignmentIdChange={setAssignmentIdInput}
                  onStudentIdChange={setStudentIdInput}
                  onAttemptChange={setAttemptInput}
                  onFromChange={setFromInput}
                  onToChange={setToInput}
                  onLimitChange={setLimitInput}
                  onSubmit={() => fetchEvents()}
                  onClear={() => {
                    setEvents([]);
                  }}
                />

                <ExamLogsTables
                  events={events}
                  summaryByType={summaryByType}
                  summaryByStudentAttempt={summaryByStudentAttempt}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls">
            {selectedStudent ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Điều khiển phiên thi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(() => {
                    const source = useDemoSessions ? mockStudentSessions : monitorSessions;
                    const student = source.find(s => s.id === selectedStudent);
                    if (!student) return null;

                    return (
                      <div>
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                          <h3 className="font-medium text-blue-900">{student.studentName}</h3>
                          <p className="text-blue-700">{student.assignmentTitle}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Gia hạn thởi gian</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <Label htmlFor="extend-minutes">Số phút gia hạn</Label>
                                <Input
                                  id="extend-minutes"
                                  type="number"
                                  placeholder="15"
                                  value={extendMinutesInput}
                                  onChange={(e) => setExtendMinutesInput(e.target.value)}
                                  disabled={controlsLoading}
                                />
                              </div>
                              <div>
                                <Label htmlFor="extend-reason">Lý do</Label>
                                <Input
                                  id="extend-reason"
                                  placeholder="Sự cố kỹ thuật..."
                                  value={extendReasonInput}
                                  onChange={(e) => setExtendReasonInput(e.target.value)}
                                  disabled={controlsLoading}
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Button 
                                  onClick={() => handleExtendTime(student.id)}
                                  className="w-full"
                                  disabled={controlsLoading}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Gia hạn cho học sinh này
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={handleExtendTimeAll}
                                  className="w-full"
                                  disabled={controlsLoading}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Gia hạn cho tất cả
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Hành động khẩn cấp</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <Button
                                
                                className="w-full"
                                onClick={() => handlePauseSession(student.id)}
                                disabled={controlsLoading || student.status !== 'IN_PROGRESS'}
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Tạm dừng phiên thi
                              </Button>
                              <Button
                               
                                className="w-full"
                                onClick={() => handleResumeSession(student.id)}
                                disabled={controlsLoading}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Tiếp tục phiên thi
                              </Button>
                              <Button 
                               
                                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleTerminateSession(student.id)}
                                disabled={controlsLoading}
                              >
                                <StopCircle className="w-4 h-4 mr-2" />
                                Chấm dứt phiên thi
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Chọn học sinh để điều khiển
                  </h3>
                  <p className="text-muted-foreground">
                    Vui lòng chọn một học sinh từ tab Giám sát để sử dụng các công cụ điều khiển
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Phân tích và Báo cáo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">Tổng hợp chống gian lận (P2.5)</div>
                      <div className="text-sm text-muted-foreground">
                        Dùng filters (Student ID / Attempt) rồi bấm tải để xem breakdown.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={loadAntiCheatScore}
                        disabled={!effectiveAssignmentId || antiScoreLoading}
                      >
                        {antiScoreLoading ? "Đang tải..." : "Tải điểm nghi ngờ"}
                      </Button>
                      <Button
                        onClick={callAiSummary}
                        disabled={!effectiveAssignmentId || aiSummaryLoading}
                      >
                        {aiSummaryLoading ? "Đang tóm tắt..." : "AI tóm tắt"}
                      </Button>
                    </div>
                  </div>

                  {antiScore ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <div className="text-sm text-muted-foreground">Suspicion score</div>
                        <div className="text-2xl font-bold">{antiScore.suspicionScore}/100</div>
                        <div className="mt-1">
                          <Badge
                            variant={
                              antiScore.riskLevel === "high"
                                ? "destructive"
                                : antiScore.riskLevel === "medium"
                                ? "warning"
                                : "outline"
                            }
                          >
                            {antiScore.riskLevel === "high"
                              ? "Rủi ro cao"
                              : antiScore.riskLevel === "medium"
                              ? "Rủi ro trung bình"
                              : "Rủi ro thấp"}
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <div className="text-sm text-muted-foreground">Tổng số events</div>
                        <div className="text-2xl font-bold">{antiScore.totalEvents}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <div className="text-sm text-muted-foreground">Rule hits</div>
                        <div className="text-2xl font-bold">{antiScore.breakdown.length}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Chưa có dữ liệu điểm nghi ngờ. Hãy bấm “Tải điểm nghi ngờ”.
                    </div>
                  )}

                  {antiScore?.breakdown?.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2 pr-4">Rule</th>
                            <th className="py-2 pr-4">Số lần</th>
                            <th className="py-2 pr-4">Điểm</th>
                            <th className="py-2 pr-4">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {antiScore.breakdown.map((b) => (
                            <tr key={b.ruleId} className="border-b align-top">
                              <td className="py-2 pr-4 font-medium">{b.title}</td>
                              <td className="py-2 pr-4">{b.count}</td>
                              <td className="py-2 pr-4">{b.points}/{b.maxPoints}</td>
                              <td className="py-2 pr-4 text-muted-foreground max-w-[520px] whitespace-pre-wrap break-words">
                                {b.details}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {aiSummary ? (
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                      <div className="font-semibold">{aiSummary.title}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSummary.summary}</div>
                      {(aiSummary.keySignals?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-sm font-medium">Tín hiệu chính</div>
                          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                            {aiSummary.keySignals.map((s, idx) => (
                              <li key={`${idx}-${s}`}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(aiSummary.recommendations?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-sm font-medium">Khuyến nghị</div>
                          <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                            {aiSummary.recommendations.map((s, idx) => (
                              <li key={`${idx}-${s}`}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {events.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Chưa có dữ liệu logs để phân tích. Vào tab <span className="font-medium">Logs chống gian lận</span> để tải logs cho bài thi này.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">Tổng số sự kiện</p>
                          <p className="text-2xl font-bold">{events.length}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">Sự kiện nghiêm trọng</p>
                          <p className="text-2xl font-bold text-red-600">
                            {events.filter((ev) => severityOf(ev.eventType) === 'high').length}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">Học sinh bị gắn cờ</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {summaryByStudentAttempt.filter((row) => {
                              const flagged = row.high >= 1 || (row.high + row.medium) >= 3;
                              return flagged;
                            }).length}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Top học sinh có nhiều cảnh báo</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2 pr-4">Học sinh</th>
                              <th className="py-2 pr-4">Attempt</th>
                              <th className="py-2 pr-4">Tổng event</th>
                              <th className="py-2 pr-4">Cảnh báo cao</th>
                              <th className="py-2 pr-4">Cảnh báo TB</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryByStudentAttempt.slice(0, 10).map((row) => {
                              const flagged = row.high >= 1 || (row.high + row.medium) >= 3;
                              return (
                                <tr
                                  key={`${row.studentId}|${row.attempt}`}
                                  className={`border-b ${flagged ? 'bg-red-50' : ''}`}
                                >
                                  <td className="py-2 pr-4">
                                    {row.fullname}{' '}
                                    <span className="text-muted-foreground text-xs">({row.studentId})</span>
                                  </td>
                                  <td className="py-2 pr-4">{row.attempt ?? '-'}</td>
                                  <td className="py-2 pr-4">{row.count}</td>
                                  <td className="py-2 pr-4">{row.high}</td>
                                  <td className="py-2 pr-4">{row.medium}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
