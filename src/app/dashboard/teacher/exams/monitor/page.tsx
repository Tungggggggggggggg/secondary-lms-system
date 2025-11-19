"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Mock data đơn giản cho UI
const mockStudentSessions = [
  {
    id: "1",
    studentName: "Nguyễn Văn A",
    assignmentTitle: "Kiểm tra Toán học",
    status: "IN_PROGRESS",
    startTime: "14:30",
    timeRemaining: "25:30",
    progress: 60,
    currentQuestion: 8,
    totalQuestions: 15,
    suspiciousActivities: 2,
    isOnline: true
  },
  {
    id: "2", 
    studentName: "Trần Thị B",
    assignmentTitle: "Kiểm tra Toán học",
    status: "PAUSED",
    startTime: "14:15",
    timeRemaining: "10:45",
    progress: 40,
    currentQuestion: 6,
    totalQuestions: 15,
    suspiciousActivities: 0,
    isOnline: false
  },
  {
    id: "3",
    studentName: "Lê Văn C", 
    assignmentTitle: "Kiểm tra Toán học",
    status: "COMPLETED",
    startTime: "14:00",
    timeRemaining: "00:00",
    progress: 100,
    currentQuestion: 15,
    totalQuestions: 15,
    suspiciousActivities: 1,
    isOnline: true
  }
];

/**
 * Trang giám sát thi trực tuyến cho giáo viên
 * URL: /dashboard/teacher/exams/monitor
 */
export default function ExamMonitorPage() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [assignmentIdInput, setAssignmentIdInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [attemptInput, setAttemptInput] = useState<string>("");
  const [events, setEvents] = useState<Array<{ id: string; assignmentId: string; studentId: string; attempt: number | null; eventType: string; createdAt: string; metadata: any; student?: { id: string; fullname: string; email: string } }>>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [limitInput, setLimitInput] = useState("200");
  const [extendMinutesInput, setExtendMinutesInput] = useState("15");
  const [extendReasonInput, setExtendReasonInput] = useState("");
  const [controlsLoading, setControlsLoading] = useState(false);

  const searchParams = useSearchParams();
  const assignmentIdFromQuery = searchParams.get("assignmentId");

  const [assignmentTitle, setAssignmentTitle] = useState<string | null>(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  // Nếu có assignmentId trên URL (truy cập thực tế từ bài Quiz), không dùng mock demo
  const useDemoSessions = !assignmentIdFromQuery;

  // Auto refresh: tự động tải lại logs & phiên thi theo assignment hiện tại
  useEffect(() => {
    if (!isAutoRefresh) return;

    // Ưu tiên assignmentId trên URL, fallback sang input thủ công
    const effectiveAssignmentId = assignmentIdFromQuery || assignmentIdInput.trim();
    if (!effectiveAssignmentId) return;

    const tick = () => {
      fetchEvents(effectiveAssignmentId);
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
      const j = await res.json();
      if (!res.ok || !j?.success) throw new Error(j?.message || res.statusText);
      setEvents((j.data || []).map((e: any) => ({ ...e, createdAt: e.createdAt })));
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
  }, [assignmentIdFromQuery]);

  useEffect(() => {
    if (!assignmentIdFromQuery) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingAssignment(true);
        const res = await fetch(`/api/assignments/${assignmentIdFromQuery}`);
        const j = await res.json();
        if (!res.ok || !j?.success) throw new Error(j?.message || res.statusText);
        if (!cancelled) {
          setAssignmentTitle(j.data?.title ?? null);
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
  }, [assignmentIdFromQuery]);

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
    }>();

    for (const ev of events) {
      const key = `${ev.studentId}|${ev.attempt ?? 'null'}`;
      const createdAt = ev.createdAt;
      const sev = severityOf(ev.eventType);
      const existing = map.get(key);

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
          hasPaused: ev.eventType === 'SESSION_PAUSED',
          hasResumed: ev.eventType === 'SESSION_RESUMED',
          hasCompleted: ev.eventType === 'SESSION_COMPLETED',
          hasTerminated: ev.eventType === 'SESSION_TERMINATED',
        });
      } else {
        if (createdAt < existing.firstEventAt) existing.firstEventAt = createdAt;
        if (createdAt > existing.lastEventAt) existing.lastEventAt = createdAt;
        existing.eventCount += 1;

        if (sev === 'high') existing.highCount += 1;
        else if (sev === 'medium') existing.mediumCount += 1;

        if (ev.eventType === 'SESSION_PAUSED') existing.hasPaused = true;
        if (ev.eventType === 'SESSION_RESUMED') existing.hasResumed = true;
        if (ev.eventType === 'SESSION_COMPLETED') existing.hasCompleted = true;
        if (ev.eventType === 'SESSION_TERMINATED') existing.hasTerminated = true;
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
        status,
        isOnline,
      };
    }).sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt));
  }, [events]);

  const monitorSessions = useMemo(() => {
    if (useDemoSessions) return mockStudentSessions;
    const title = assignmentTitle || 'Bài thi';
    return derivedSessions.map((s) => ({
      id: s.id,
      studentName: s.fullname,
      assignmentTitle: title,
      status: s.status,
      startTime: new Date(s.firstEventAt).toLocaleTimeString(),
      timeRemaining: '-',
      progress: 0,
      currentQuestion: 0,
      totalQuestions: 0,
      // Đếm theo SỐ LẦN cảnh báo (event high + medium)
      suspiciousActivities: (s.highCount ?? 0) + (s.mediumCount ?? 0),
      isOnline: s.isOnline as boolean,
    }));
  }, [useDemoSessions, derivedSessions, assignmentTitle]);

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
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Hoàn thành</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const parseSessionKey = (sessionKey: string): { studentId: string; attemptNumber: number | null } => {
    const [studentId, attemptRaw] = sessionKey.split("|");
    const attemptNumber = attemptRaw && attemptRaw !== "null" ? Number(attemptRaw) : null;
    return { studentId, attemptNumber: Number.isNaN(attemptNumber as number) ? null : attemptNumber };
  };

  const callTeacherOverride = async (
    sessionKey: string,
    action: "EXTEND_TIME" | "PAUSE" | "RESUME" | "TERMINATE",
    extra?: { minutes?: number; reason?: string }
  ) => {
    if (!assignmentIdFromQuery) {
      window.alert("Chức năng điều khiển chỉ dùng được khi mở từ bài Quiz (có assignmentId trên URL).");
      return;
    }
    const { studentId, attemptNumber } = parseSessionKey(sessionKey);
    if (!studentId) return;

    setControlsLoading(true);
    try {
      const body: any = {
        studentId,
        attemptNumber,
        action,
      };
      if (extra?.minutes != null) body.minutes = extra.minutes;
      if (extra?.reason != null) body.reason = extra.reason;

      const res = await fetch(`/api/teachers/assignments/${assignmentIdFromQuery}/attempts/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => null as any);
      if (!res.ok || !j?.success) {
        console.error("[TeacherOverride] error", j);
        window.alert(j?.message || res.statusText || "Không thể thực hiện hành động");
        return;
      }
      if (action === "EXTEND_TIME") {
        setExtendReasonInput("");
      }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Monitor className="w-8 h-8 text-blue-600" />
                Giám Sát Thi Trực Tuyến
              </h1>
              <p className="text-gray-600 mt-1">
                Theo dõi và quản lý các phiên thi đang diễn ra
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </Button>
              
              <Button className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Cài đặt
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang thi</p>
                  <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tạm dừng</p>
                  <p className="text-2xl font-bold text-yellow-600">{pausedCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoạt động đáng ngờ</p>
                  <p className="text-2xl font-bold text-red-600">{totalSuspicious}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng phiên</p>
                  <p className="text-2xl font-bold text-blue-600">{monitorSessions.length}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

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
                {monitorSessions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    Chưa có dữ liệu phiên thi real-time để hiển thị.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {monitorSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedStudent(session.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {session.isOnline ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <WifiOff className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                              <h3 className="font-medium">{session.studentName}</h3>
                              <p className="text-sm text-gray-600">{session.assignmentTitle}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Tiến độ</p>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${session.progress}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{session.progress}%</span>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-sm text-gray-600">Thời gian còn lại</p>
                            <p className="font-medium">{session.timeRemaining}</p>
                          </div>

                          <div className="text-center">
                            <p className="text-sm text-gray-600">Câu hỏi</p>
                            <p className="font-medium">{session.currentQuestion}/{session.totalQuestions}</p>
                          </div>

                          <div className="text-center">
                            <p className="text-sm text-gray-600">Cảnh báo</p>
                            <Badge variant={session.suspiciousActivities > 0 ? "destructive" : "outline"}>
                              {session.suspiciousActivities}
                            </Badge>
                          </div>

                          <div>
                            {getStatusBadge(session.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-3">
                    <Label htmlFor="assignmentId">Assignment ID</Label>
                    <Input id="assignmentId" placeholder="assignment id" value={assignmentIdInput} onChange={(e) => setAssignmentIdInput(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="studentId">Student ID (tuỳ chọn)</Label>
                    <Input id="studentId" placeholder="student id" value={studentIdInput} onChange={(e) => setStudentIdInput(e.target.value)} />
                  </div>
                  <div className="md:col-span-1">
                    <Label htmlFor="attempt">Attempt (tuỳ chọn)</Label>
                    <Input id="attempt" placeholder="VD: 1" value={attemptInput} onChange={(e) => setAttemptInput(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="from">Từ thời điểm (tuỳ chọn)</Label>
                    <Input id="from" type="datetime-local" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="to">Đến thời điểm (tuỳ chọn)</Label>
                    <Input id="to" type="datetime-local" value={toInput} onChange={(e) => setToInput(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="limit">Số dòng tối đa</Label>
                    <Input id="limit" type="number" min={1} max={500} value={limitInput} onChange={(e) => setLimitInput(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchEvents()}
                    disabled={!assignmentIdInput.trim() || loadingEvents}
                  >
                    {loadingEvents ? "Đang tải..." : "Tải logs"}
                  </Button>
                  <Button variant="outline" onClick={() => { setEvents([]); }}>Xoá kết quả</Button>
                </div>

                {events.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Tổng hợp theo loại sự kiện</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2 pr-4">Loại</th>
                              <th className="py-2 pr-4">Mức độ</th>
                              <th className="py-2 pr-4">Số sự kiện</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryByType.map((row) => (
                              <tr key={row.type} className="border-b">
                                <td className="py-2 pr-4">{row.type}</td>
                                <td className="py-2 pr-4">
                                  {row.severity === 'high' ? (
                                    <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Cao</Badge>
                                  ) : row.severity === 'medium' ? (
                                    <Badge variant="warning">Trung bình</Badge>
                                  ) : row.severity === 'info' ? (
                                    <Badge>Thông tin</Badge>
                                  ) : (
                                    <Badge variant="outline">Thấp</Badge>
                                  )}
                                </td>
                                <td className="py-2 pr-4">{row.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Tổng hợp theo học sinh/attempt</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2 pr-4">Học sinh</th>
                              <th className="py-2 pr-4">Attempt</th>
                              <th className="py-2 pr-4">Số sự kiện</th>
                              <th className="py-2 pr-4">Cảnh báo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryByStudentAttempt.map((row) => {
                              const flagged = row.high >= 1 || (row.high + row.medium) >= 3;
                              return (
                                <tr
                                  key={`${row.studentId}|${row.attempt}`}
                                  className={`border-b ${flagged ? 'bg-red-50' : ''}`}
                                >
                                  <td className="py-2 pr-4">{row.fullname} <span className="text-gray-500 text-xs">({row.studentId})</span></td>
                                  <td className="py-2 pr-4">{row.attempt ?? '-'}</td>
                                  <td className="py-2 pr-4">{row.count}</td>
                                  <td className="py-2 pr-4">
                                    {flagged ? (
                                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Nghi ngờ cao</Badge>
                                    ) : (
                                      <Badge variant="outline">-</Badge>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Chi tiết sự kiện</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2 pr-4">Thời gian</th>
                              <th className="py-2 pr-4">Học sinh</th>
                              <th className="py-2 pr-4">Attempt</th>
                              <th className="py-2 pr-4">Sự kiện</th>
                              <th className="py-2 pr-4">Metadata</th>
                            </tr>
                          </thead>
                          <tbody>
                            {events.map((ev) => (
                              <tr key={ev.id} className="border-b align-top">
                                <td className="py-2 pr-4 whitespace-nowrap">{new Date(ev.createdAt).toLocaleString()}</td>
                                <td className="py-2 pr-4">{ev.student?.fullname || ev.studentId} <span className="text-gray-500 text-xs">({ev.studentId})</span></td>
                                <td className="py-2 pr-4">{ev.attempt ?? '-'}</td>
                                <td className="py-2 pr-4">{ev.eventType}</td>
                                <td className="py-2 pr-4 max-w-[360px] whitespace-pre-wrap break-words text-xs">{ev.metadata ? JSON.stringify(ev.metadata) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
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
                              <Button 
                                onClick={() => handleExtendTime(student.id)}
                                className="w-full"
                                disabled={controlsLoading}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Gia hạn thời gian
                              </Button>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Hành động khẩn cấp</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <Button variant="outline" className="w-full">
                                <Pause className="w-4 h-4 mr-2" />
                                Tạm dừng phiên thi
                              </Button>
                              <Button variant="outline" className="w-full">
                                <Play className="w-4 h-4 mr-2" />
                                Tiếp tục phiên thi
                              </Button>
                              <Button 
                                variant="outline" 
                                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleTerminateSession(student.id)}
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
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Chọn học sinh để điều khiển
                  </h3>
                  <p className="text-gray-600">
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
                {events.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">
                      Chưa có dữ liệu logs để phân tích. Vào tab <span className="font-medium">Logs chống gian lận</span> để tải logs cho bài thi này.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600">Tổng số sự kiện</p>
                          <p className="text-2xl font-bold">{events.length}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600">Sự kiện nghiêm trọng</p>
                          <p className="text-2xl font-bold text-red-600">
                            {events.filter((ev) => severityOf(ev.eventType) === 'high').length}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600">Học sinh bị gắn cờ</p>
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
                                    <span className="text-gray-500 text-xs">({row.studentId})</span>
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
