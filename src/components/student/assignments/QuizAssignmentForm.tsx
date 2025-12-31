"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { StudentAssignmentDetail } from "@/hooks/use-student-assignments";
import QuestionComments from "./QuestionComments";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import AttemptTimer from "./AttemptTimer";
import AttemptProgressBar from "./AttemptProgressBar";
import AttemptStatusBanner from "./AttemptStatusBanner";

interface QuizAssignmentFormProps {
  assignment: StudentAssignmentDetail;
  onSubmit: (
    answers: Array<{ questionId: string; optionIds: string[] }>,
    presentation?: { questionOrder: string[]; optionOrder: Record<string, string[]>; seed?: number | string; versionHash?: string }
  ) => Promise<void>;
  initialAnswers?: Array<{ questionId: string; optionIds: string[] }>;
  isLoading?: boolean;
  dueDate?: string | null;
  isSubmitted?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toApiEnvelope(value: unknown): { success: boolean; message?: string; data?: unknown } | null {
  if (!isRecord(value)) return null;
  if (typeof value.success !== "boolean") return null;
  const message = typeof value.message === "string" ? value.message : undefined;
  return { success: value.success, message, data: value.data };
}

/**
 * Component form làm bài quiz
 * Hiển thị tất cả questions cùng lúc, có thể sửa đáp án trước khi submit
 */
export default function QuizAssignmentForm({
  assignment,
  onSubmit,
  initialAnswers = [],
  isLoading = false,
  dueDate,
  isSubmitted = false,
}: QuizAssignmentFormProps) {
  const { toast } = useToast();
  const confirm = useConfirm();

  // Timing: derive start/end/timeLimit
  const openAt = assignment.openAt ? new Date(assignment.openAt) : null;
  const lockAt = assignment.lockAt ? new Date(assignment.lockAt) : (dueDate ? new Date(dueDate) : null);
  const timeLimitMinutes = assignment.timeLimitMinutes;
  const storageKey = `quiz_started_at_${assignment.id}`;
  const draftKey = `quiz_draft_${assignment.id}`;
  const fillDraftKey = `quiz_fill_draft_${assignment.id}`;
  const attemptIdKey = `quiz_attempt_id_${assignment.id}`;
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);
  const terminatedByTeacherRef = useRef(false);
  const anti = assignment.antiCheatConfig ?? null;
  const requireFullscreen = !!anti?.requireFullscreen;
  const detectTabSwitch = !!anti?.detectTabSwitch;
  const disableCopyPaste = !!anti?.disableCopyPaste;
  const shuffleQuestionsFlag = !!anti?.shuffleQuestions;
  const shuffleOptionsFlag = !!anti?.shuffleOptions;
  const singleQuestionMode = !!anti?.singleQuestionMode;
  const enableFuzzyFillBlank = !!anti?.enableFuzzyFillBlank;
  const fuzzyThreshold: number = typeof anti?.fuzzyThreshold === "number" ? Math.min(0.5, Math.max(0, anti.fuzzyThreshold)) : 0.2;
  const hasSecurityConfig = requireFullscreen || detectTabSwitch || disableCopyPaste;
  const hasDisplayConfig = shuffleQuestionsFlag || shuffleOptionsFlag || singleQuestionMode;
  const maxAttempts = assignment.maxAttempts ?? null;
  const latestAttempt = assignment.latestAttempt ?? 0;
  const allowNewAttempt = assignment.allowNewAttempt ?? false;
  const [gateOpen, setGateOpen] = useState<boolean>(() => {
    // Nếu đã nộp và không được phép làm lại thì không cần màn "Bắt đầu làm".
    // Ngược lại, luôn mở gate để học sinh phải bấm "Bắt đầu làm" trước khi vào bài.
    if (isSubmitted && !allowNewAttempt) return false;
    return true;
  });
  const [isNewAttempt, setIsNewAttempt] = useState<boolean>(false);
  const [questionOrder, setQuestionOrder] = useState<string[] | null>(null);
  const [optionOrders, setOptionOrders] = useState<Record<string, string[]> | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumberState, setAttemptNumberState] = useState<number | null>(null);
  const [overrideTimeLimitMinutes, setOverrideTimeLimitMinutes] = useState<number | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  const attemptsLeft = maxAttempts != null ? Math.max(0, (maxAttempts as number) - (latestAttempt as number)) : null;
  const disabledMode = isSubmitted && !isNewAttempt;
  const pausedByTeacher = attemptStatus === "PAUSED_BY_TEACHER";
  const terminatedByTeacher = attemptStatus === "TERMINATED_TEACHER";
  const blockedByTeacher = pausedByTeacher || terminatedByTeacher;

  // Cảnh báo khi rời trang trong lúc đang làm bài
  useEffect(() => {
    if (disabledMode || gateOpen) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [disabledMode, gateOpen]);

  const logEvent = useCallback(async (type: string, meta?: Record<string, unknown>) => {
    try {
      await fetch('/api/exam-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          eventType: type,
          attempt: (attemptNumberState ?? (isNewAttempt ? (Number(latestAttempt) + 1) : (Number(latestAttempt) || null))),
          metadata: meta ?? null,
        })
      })
    } catch {}
  }, [assignment.id, isNewAttempt, latestAttempt, attemptNumberState]);

  const questionsById = useMemo(() => {
    const obj: Record<string, typeof assignment.questions[number]> = {};
    assignment.questions.forEach((q) => (obj[q.id] = q));
    return obj;
  }, [assignment.questions]);
  const orderedQuestionIds = useMemo(() => {
    return questionOrder || assignment.questions.map((q) => q.id);
  }, [questionOrder, assignment.questions]);
  const visibleQuestionIds = useMemo(() => {
    if (singleQuestionMode) {
      const id = orderedQuestionIds[currentIdx];
      return typeof id === "string" ? [id] : [];
    }
    return orderedQuestionIds;
  }, [orderedQuestionIds, singleQuestionMode, currentIdx]);
  const orderedQuestions = useMemo(() => visibleQuestionIds.map((id) => questionsById[id]).filter(Boolean), [visibleQuestionIds, questionsById]);
  const getOrderedOptions = (q: typeof assignment.questions[number]) => {
    const ids = optionOrders?.[q.id] || q.options.map((o) => o.id);
    const byId: Record<string, typeof q.options[number]> = {};
    q.options.forEach((o) => (byId[o.id] = o));
    return ids.map((oid) => byId[oid]);
  };

  const normalizeText = (s: string) =>
    (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  const levenshtein = (a: string, b: string) => {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = i - 1;
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + cost
        );
        prev = temp;
      }
    }
    return dp[n];
  };

  const normalizedDistance = (a: string, b: string) => {
    const L = Math.max(a.length, b.length) || 1;
    return levenshtein(a, b) / L;
  };

  const getFillText = (q: typeof assignment.questions[number]) => {
    const t = fillTexts.get(q.id);
    if (typeof t === "string") return t;
    const sel = answers.get(q.id);
    if (sel && sel.size > 0) {
      const selectedId = Array.from(sel)[0];
      const opt = q.options.find((o) => o.id === selectedId);
      return opt?.content || "";
    }
    return "";
  };

  const handleFillChange = (q: typeof assignment.questions[number], value: string) => {
    setFillTexts((prev) => {
      const m = new Map(prev);
      m.set(q.id, value);
      return m;
    });
    setAnswers((prev) => {
      const m = new Map(prev);
      const valN = normalizeText(value);
      let chosenId: string | null = null;
      // Exact match trước
      const exact = q.options.find((o) => normalizeText(o.content as string) === valN);
      if (exact) {
        chosenId = exact.id;
      } else if (enableFuzzyFillBlank && valN) {
        // Fuzzy match theo ngưỡng
        let bestId: string | null = null;
        let bestScore = Number.POSITIVE_INFINITY;
        for (const opt of q.options) {
          const on = normalizeText(opt.content as string);
          if (!on) continue;
          const dist = normalizedDistance(valN, on);
          if (dist < bestScore) {
            bestScore = dist;
            bestId = opt.id;
          }
        }
        if (bestId != null && bestScore <= fuzzyThreshold) {
          chosenId = bestId;
        }
      }
      if (chosenId) m.set(q.id, new Set([chosenId])); else m.set(q.id, new Set());
      return m;
    });
  };

  // Tạo map từ initialAnswers để dễ dàng lookup
  const initialAnswersMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    initialAnswers.forEach((answer) => {
      map.set(answer.questionId, new Set(answer.optionIds));
    });
    return map;
  }, [initialAnswers]);

  // State để lưu câu trả lời hiện tại
  const [answers, setAnswers] = useState<Map<string, Set<string>>>(initialAnswersMap);
  const [fillTexts, setFillTexts] = useState<Map<string, string>>(new Map());

  // Load draft answers from localStorage when mount (if not submitted)
  useEffect(() => {
    if (disabledMode) return;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(draftKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ questionId: string; optionIds: string[] }> | null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, Set<string>>();
          parsed.forEach((a) => map.set(a.questionId, new Set(a.optionIds)));
          setAnswers(map);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id, disabledMode]);

  // Load draft FILL_BLANK texts
  useEffect(() => {
    if (disabledMode) return;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(fillDraftKey) : null;
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, string> | null;
        if (obj && typeof obj === "object") {
          const m = new Map<string, string>();
          Object.entries(obj).forEach(([k, v]) => {
            if (typeof v === "string") m.set(k, v);
          });
          setFillTexts(m);
        }
      }
    } catch {}
  }, [fillDraftKey, disabledMode]);

  // Khôi phục attempt đang dở (nếu có) bằng attemptId trong localStorage
  useEffect(() => {
    if (disabledMode) return;
    let cancelled = false;
    (async () => {
      try {
        const lsAttemptId = typeof window !== 'undefined' ? window.localStorage.getItem(attemptIdKey) : null;
        if (!lsAttemptId) return;
        const res = await fetch(`/api/students/assignments/${assignment.id}/attempts/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        const raw: unknown = await res.json().catch(() => null);
        const result = toApiEnvelope(raw);
        if (!res.ok || !result?.success) return;
        if (cancelled) return;
        const data = result.data as { attemptId: string; attemptNumber: number; shuffleSeed: number; startedAt: string };
        setAttemptId(data.attemptId);
        setAttemptNumberState(data.attemptNumber);
        // Shuffle lại theo seed
        const srand = (s: number) => { let x = s || 123456789; return () => (x = (1103515245 * x + 12345) % 2147483647) / 2147483647; };
        const rnd = srand(data.shuffleSeed);
        const qIds = assignment.questions.map((q) => q.id);
        const qOrder = shuffleQuestionsFlag ? [...qIds].sort(() => rnd() - 0.5) : qIds;
        const optOrders: Record<string, string[]> = {};
        assignment.questions.forEach((q) => {
          const ids = q.options.map((o) => o.id);
          optOrders[q.id] = shuffleOptionsFlag ? [...ids].sort(() => rnd() - 0.5) : ids;
        });
        setQuestionOrder(qOrder);
        setOptionOrders(optOrders);
        setGateOpen(false);
        const started = data.startedAt ? new Date(data.startedAt) : new Date();
        setStartedAt(started);
      } catch {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id, disabledMode]);

  // Persist draft on answers change (lưu ngay để hạn chế mất dữ liệu khi reload)
  useEffect(() => {
    if (disabledMode) return;
    try {
      const arr = Array.from(answers.entries()).map(([questionId, set]) => ({ questionId, optionIds: Array.from(set) }));
      window.localStorage.setItem(draftKey, JSON.stringify(arr));
    } catch {}
  }, [answers, draftKey, disabledMode]);

  // Persist draft FILL_BLANK texts (lưu ngay để hạn chế mất dữ liệu khi reload)
  useEffect(() => {
    if (disabledMode) return;
    try {
      const obj: Record<string, string> = {};
      fillTexts.forEach((v, k) => { if (typeof v === "string") obj[k] = v; });
      window.localStorage.setItem(fillDraftKey, JSON.stringify(obj));
    } catch {}
  }, [fillTexts, fillDraftKey, disabledMode]);

  // Initialize startedAt from storage or now when interactive
  useEffect(() => {
    if (disabledMode) return;
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (!stored) return;
      const d = new Date(stored);
      if (!isNaN(d.getTime())) setStartedAt(d);
    } catch {}
  }, [disabledMode, storageKey]);

  // Poll trạng thái attempt để đồng bộ với can thiệp của giáo viên (gia hạn, pause, terminate)
  useEffect(() => {
    if (disabledMode) return;
    // Cần có assignmentId và attemptNumber (nếu đã bắt đầu)
    if (!assignment.id) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const query = attemptNumberState != null ? `?attemptNumber=${attemptNumberState}` : "";
        const res = await fetch(`/api/students/assignments/${assignment.id}/attempts/status${query}`);
        const raw: unknown = await res.json().catch(() => null);
        const j = toApiEnvelope(raw);
        if (!res.ok || !j?.success || cancelled) return;
        const data = j.data as { timeLimitMinutes: number | null; status: string | null } | null;
        if (!data) return;
        if (typeof data.timeLimitMinutes === "number" && data.timeLimitMinutes > 0) {
          setOverrideTimeLimitMinutes(data.timeLimitMinutes);
        }
        setAttemptStatus(data.status ?? null);
      } catch {}
    };

    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [assignment.id, attemptNumberState, disabledMode]);

  // Auto-submit khi giáo viên chấm dứt phiên thi
  useEffect(() => {
    if (disabledMode || isSubmitted) return;
    if (attemptStatus !== "TERMINATED_TEACHER") return;
    if (terminatedByTeacherRef.current) return;
    terminatedByTeacherRef.current = true;
    autoSubmittedRef.current = true;

    const answersArray = assignment.questions.map((q) => {
      const set = answers.get(q.id) || new Set<string>();
      return {
        questionId: q.id,
        optionIds: Array.from(set),
      };
    });
    const qOrder = questionOrder || assignment.questions.map((q) => q.id);
    const optOrder: Record<string, string[]> = {};
    assignment.questions.forEach((q) => {
      optOrder[q.id] = (optionOrders && optionOrders[q.id]) ? optionOrders[q.id] : q.options.map((o) => o.id);
    });
    onSubmit(answersArray, { questionOrder: qOrder, optionOrder: optOrder }).catch(() => {});
  }, [attemptStatus, disabledMode, isSubmitted, assignment.questions, answers, questionOrder, optionOrders, onSubmit]);

  // Compute effective deadline and drive countdown
  useEffect(() => {
    if (disabledMode) return;
    if (!startedAt) return;
    let effectiveDeadline: Date | null = lockAt ? new Date(lockAt) : null;
    const effectiveLimit = (overrideTimeLimitMinutes ?? timeLimitMinutes);
    if (effectiveLimit && effectiveLimit > 0) {
      const limitEnd = new Date(startedAt.getTime() + effectiveLimit * 60 * 1000);
      effectiveDeadline = effectiveDeadline ? new Date(Math.min(effectiveDeadline.getTime(), limitEnd.getTime())) : limitEnd;
    }
    if (!effectiveDeadline) return;

    const tick = () => {
      const now = new Date();
      const sec = Math.max(0, Math.floor((effectiveDeadline!.getTime() - now.getTime()) / 1000));
      setRemainingSec(sec);
      if (sec <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        // Auto-submit best-effort: gửi đủ answers cho tất cả câu hỏi
        const answersArray = assignment.questions.map((q) => {
          const set = answers.get(q.id) || new Set<string>();
          return {
            questionId: q.id,
            optionIds: Array.from(set),
          };
        });
        const qOrder = questionOrder || assignment.questions.map((q) => q.id);
        const optOrder: Record<string, string[]> = {};
        assignment.questions.forEach((q) => {
          optOrder[q.id] = (optionOrders && optionOrders[q.id]) ? optionOrders[q.id] : q.options.map((o) => o.id);
        });
        onSubmit(answersArray, { questionOrder: qOrder, optionOrder: optOrder }).catch(() => {});
        try {
          void logEvent('SESSION_COMPLETED', {
            reason: 'AUTO_SUBMIT_TIMEOUT',
            totalQuestions: assignment.questions.length,
          });
        } catch {}
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [answers, lockAt, disabledMode, onSubmit, startedAt, timeLimitMinutes, overrideTimeLimitMinutes]);

  const startAttempt = async () => {
    try {
      if (requireFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          toast({ title: "Không thể bật fullscreen", description: "Vui lòng cho phép fullscreen để bắt đầu làm bài", variant: "destructive" });
          return;
        }
      }
      const onFsChange = () => {
        if (!document.fullscreenElement && requireFullscreen) {
          logEvent('FULLSCREEN_EXIT');
          toast({ title: "Thoát fullscreen", description: "Vui lòng quay lại chế độ toàn màn hình", variant: "destructive" });
        }
      };
      document.addEventListener("fullscreenchange", onFsChange);
      cleanupRef.current.push(() => document.removeEventListener("fullscreenchange", onFsChange));
      if (detectTabSwitch) {
        const onHidden = () => {
          if (document.hidden) {
            toast({ title: "Cảnh báo", description: "Bạn đã chuyển tab khỏi bài làm", variant: "destructive" });
            logEvent('TAB_SWITCH');
          }
        };
        const onBlur = () => {
          toast({ title: "Cảnh báo", description: "Cửa sổ không còn ở trạng thái hoạt động", variant: "destructive" });
          logEvent('WINDOW_BLUR');
        };
        document.addEventListener("visibilitychange", onHidden);
        window.addEventListener("blur", onBlur);
        cleanupRef.current.push(() => {
          document.removeEventListener("visibilitychange", onHidden);
          window.removeEventListener("blur", onBlur);
        });
      }
      if (disableCopyPaste) {
        const prevent = (e: Event) => {
          e.preventDefault();
          logEvent('CLIPBOARD', { type: e.type || 'unknown' });
        };
        const onKey = (e: globalThis.KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
            e.preventDefault();
            logEvent('SHORTCUT', { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey });
          }
        };
        document.addEventListener("copy", prevent);
        document.addEventListener("cut", prevent);
        document.addEventListener("paste", prevent);
        document.addEventListener("contextmenu", prevent);
        document.addEventListener("keydown", onKey, true);
        cleanupRef.current.push(() => {
          document.removeEventListener("copy", prevent);
          document.removeEventListener("cut", prevent);
          document.removeEventListener("paste", prevent);
          document.removeEventListener("contextmenu", prevent);
          document.removeEventListener("keydown", onKey, true);
        });
      }

      // Gọi API server để khởi tạo attempt và lấy shuffleSeed
      const res = await fetch(`/api/students/assignments/${assignment.id}/attempts/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const raw: unknown = await res.json().catch(() => null);
      const result = toApiEnvelope(raw);
      if (!res.ok || !result?.success) {
        toast({ title: "Không thể bắt đầu làm bài", description: result?.message || res.statusText, variant: "destructive" });
        return;
      }
      const data = result.data as { attemptId: string; attemptNumber: number; shuffleSeed: number; startedAt: string; antiCheatConfig?: unknown; timeLimitMinutes?: number | null };

      // Lưu attemptId & attemptNumber
      setAttemptId(data.attemptId);
      setAttemptNumberState(data.attemptNumber);
      try { window.localStorage.setItem(attemptIdKey, data.attemptId); } catch {}

      // Dùng seed từ server để shuffle
      const srand = (s: number) => {
        let x = s || 123456789;
        return () => (x = (1103515245 * x + 12345) % 2147483647) / 2147483647;
      };
      const rnd = srand(data.shuffleSeed);
      const qIds = assignment.questions.map((q) => q.id);
      const qOrder = shuffleQuestionsFlag ? [...qIds].sort(() => rnd() - 0.5) : qIds;
      const optOrders: Record<string, string[]> = {};
      assignment.questions.forEach((q) => {
        const ids = q.options.map((o) => o.id);
        optOrders[q.id] = shuffleOptionsFlag ? [...ids].sort(() => rnd() - 0.5) : ids;
      });
      setQuestionOrder(qOrder);
      setOptionOrders(optOrders);
      setCurrentIdx(0);
      setIsNewAttempt(true);
      setGateOpen(false);

      // Clear draft trước attempt mới
      try {
        window.localStorage.removeItem(draftKey);
        window.localStorage.removeItem(fillDraftKey);
        window.localStorage.removeItem(storageKey);
      } catch {}
      setAnswers(new Map());

      // Sử dụng startedAt từ server nếu có
      const started = data.startedAt ? new Date(data.startedAt) : new Date();
      setStartedAt(started);
      try { window.localStorage.setItem(storageKey, started.toISOString()); } catch {}

      // Log bắt đầu phiên
      logEvent('SESSION_STARTED', { attemptId: data.attemptId, attemptNumber: data.attemptNumber }).catch(() => {});
    } catch {}
  };

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach((fn) => {
        try { fn(); } catch {}
      });
      cleanupRef.current = [];
    };
  }, []);

  // Toggle option selection
  const toggleOption = (questionId: string, optionId: string, questionType: string) => {
    const pausedByTeacher = attemptStatus === "PAUSED_BY_TEACHER";
    const terminatedByTeacher = attemptStatus === "TERMINATED_TEACHER";
    if (isLoading || isOverdue || disabledMode || pausedByTeacher || terminatedByTeacher) return;

    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const currentOptions = newAnswers.get(questionId) || new Set<string>();

      if (questionType === "SINGLE" || questionType === "TRUE_FALSE") {
        // Single choice: chỉ chọn 1 option
        newAnswers.set(questionId, new Set([optionId]));
      } else {
        // Multiple choice: toggle option
        if (currentOptions.has(optionId)) {
          currentOptions.delete(optionId);
        } else {
          currentOptions.add(optionId);
        }
        // Clone Set để đảm bảo React nhận diện thay đổi và re-render
        newAnswers.set(questionId, new Set(currentOptions));
      }

      return newAnswers;
    });
  };

  const handleOptionKeyDown = (
    e: ReactKeyboardEvent<HTMLInputElement>,
    questionId: string,
    optionId: string,
    questionType: string
  ) => {
    const pausedByTeacher = attemptStatus === "PAUSED_BY_TEACHER";
    const terminatedByTeacher = attemptStatus === "TERMINATED_TEACHER";
    if (isLoading || isOverdue || disabledMode || pausedByTeacher || terminatedByTeacher) return;
    const key = e.key;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      toggleOption(questionId, optionId, questionType);
      return;
    }
    if (key === 'ArrowDown' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowLeft') {
      e.preventDefault();
      const container = typeof document !== 'undefined' ? document.getElementById(`q-${questionId}`) : null;
      if (!container) return;
      const inputs = Array.from(container.querySelectorAll('input[type="radio"], input[type="checkbox"]')) as HTMLInputElement[];
      const idx = inputs.findIndex((el) => el === e.currentTarget);
      if (idx === -1 || inputs.length === 0) return;
      let nextIdx = idx;
      if (key === 'ArrowDown' || key === 'ArrowRight') nextIdx = Math.min(inputs.length - 1, idx + 1);
      if (key === 'ArrowUp' || key === 'ArrowLeft') nextIdx = Math.max(0, idx - 1);
      const next = inputs[nextIdx];
      if (next && typeof next.focus === 'function') {
        next.focus();
        try { next.scrollIntoView({ block: 'nearest' }); } catch {}
      }
    }
  };

  // Tính số câu đã trả lời
  const answeredCount = useMemo(() => {
    return assignment.questions.reduce((acc, q) => {
      if (q.type === "FILL_BLANK") {
        const t = (fillTexts.get(q.id) || "").trim();
        if (t) return acc + 1;
        const set = answers.get(q.id);
        return acc + (set && set.size > 0 ? 1 : 0);
      }
      const set = answers.get(q.id);
      return acc + (set && set.size > 0 ? 1 : 0);
    }, 0);
  }, [answers, fillTexts, assignment.questions]);

  const totalQuestions = assignment.questions.length;
  const allAnswered = answeredCount === totalQuestions;

  const scrollToFirstUnanswered = useCallback(() => {
    const pausedByTeacher = attemptStatus === "PAUSED_BY_TEACHER";
    const terminatedByTeacher = attemptStatus === "TERMINATED_TEACHER";
    if (singleQuestionMode || pausedByTeacher || terminatedByTeacher) return;
    for (const qid of orderedQuestionIds) {
      const q = questionsById[qid];
      if (!q) continue;
      let answered = false;
      if (q.type === "FILL_BLANK") {
        answered = !!(fillTexts.get(q.id) || "").trim();
        if (!answered) {
          const set = answers.get(q.id);
          answered = !!(set && set.size > 0);
        }
      } else {
        const set = answers.get(q.id);
        answered = !!(set && set.size > 0);
      }
      if (!answered) {
        const el = typeof document !== "undefined" ? document.getElementById(`q-${qid}`) : null;
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        break;
      }
    }
  }, [singleQuestionMode, orderedQuestionIds, questionsById, answers, fillTexts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chỉ cho phép submit khi được kích hoạt bởi nút submit (tránh Enter trong input)
    const native = e.nativeEvent;
    const submitter = native instanceof SubmitEvent ? native.submitter : null;
    if (!(submitter instanceof HTMLButtonElement)) {
      toast({ title: "Chưa nộp bài", description: "Vui lòng bấm nút 'Nộp bài' để xác nhận.", variant: "default" });
      return;
    }

    const pausedByTeacher = attemptStatus === "PAUSED_BY_TEACHER";
    const terminatedByTeacher = attemptStatus === "TERMINATED_TEACHER";

    if (pausedByTeacher || terminatedByTeacher) {
      toast({ title: "Không thể nộp bài", description: "Giáo viên đang tạm dừng hoặc đã chấm dứt phiên thi.", variant: "destructive" });
      return;
    }

    // Kiểm tra deadline
    if (dueDate && new Date(dueDate) < new Date()) {
      toast({
        title: "Lỗi",
        description: "Đã quá hạn nộp bài",
        variant: "destructive",
      });
      return;
    }

    // Xác nhận nộp bài
    const confirmMsg = allAnswered
      ? `Bạn đã trả lời ${answeredCount}/${totalQuestions} câu. Xác nhận nộp bài?`
      : `Bạn mới trả lời ${answeredCount}/${totalQuestions} câu, còn ${totalQuestions - answeredCount} câu chưa trả lời. Vẫn muốn nộp bài?`;
    const ok = await confirm({
      title: "Xác nhận nộp bài",
      description: confirmMsg,
      confirmText: "Nộp bài",
      cancelText: "Hủy",
    });
    if (!ok) return;

    // Transform answers: luôn gửi đủ tất cả câu hỏi, câu chưa trả lời có mảng optionIds rỗng
    const answersArray = assignment.questions.map((q) => {
      const set = answers.get(q.id) || new Set<string>();
      return {
        questionId: q.id,
        optionIds: Array.from(set),
      };
    });

    // Chuẩn bị snapshot presentation (questionOrder/optionOrder)
    const qOrder = questionOrder || assignment.questions.map((q) => q.id);
    const optOrder: Record<string, string[]> = {};
    assignment.questions.forEach((q) => {
      optOrder[q.id] = (optionOrders && optionOrders[q.id]) ? optionOrders[q.id] : q.options.map((o) => o.id);
    });

    await onSubmit(answersArray, { questionOrder: qOrder, optionOrder: optOrder });
    try {
      void logEvent('SESSION_COMPLETED', {
        reason: 'MANUAL_SUBMIT',
        answeredCount,
        totalQuestions,
      });
    } catch {}
    try {
      window.localStorage.removeItem(draftKey);
      window.localStorage.removeItem(fillDraftKey);
      window.localStorage.removeItem(attemptIdKey);
    } catch {}
  };

  // Overdue when countdown has reached 0 (preferred), else fallback to endAt check
  const isOverdue = remainingSec != null ? remainingSec <= 0 : !!(lockAt && new Date() > lockAt);
  const countdownLabel = useMemo(() => {
    if (remainingSec == null) return null;
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [remainingSec]);

  if (gateOpen) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-foreground">Bắt đầu làm bài</h3>
          <p className="text-sm text-muted-foreground mt-2">Vui lòng xác nhận cài đặt trước khi bắt đầu.</p>
        </div>
        {(hasSecurityConfig || hasDisplayConfig) && (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {hasSecurityConfig && (
              <div className="p-3 rounded-lg border border-border bg-muted/40">
                <div className="font-semibold text-foreground">Cấu hình bảo mật</div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>{requireFullscreen ? "Yêu cầu fullscreen" : "Không yêu cầu fullscreen"}</li>
                  <li>{detectTabSwitch ? "Phát hiện chuyển tab" : "Không phát hiện chuyển tab"}</li>
                  <li>{disableCopyPaste ? "Vô hiệu hóa copy/paste" : "Cho phép copy/paste"}</li>
                </ul>
              </div>
            )}
            {hasDisplayConfig && (
              <div className="p-3 rounded-lg border border-border bg-muted/40">
                <div className="font-semibold text-foreground">Cấu hình hiển thị</div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>{shuffleQuestionsFlag ? "Xáo thứ tự câu hỏi" : "Giữ nguyên thứ tự câu hỏi"}</li>
                  <li>{shuffleOptionsFlag ? "Xáo thứ tự đáp án" : "Giữ nguyên thứ tự đáp án"}</li>
                  <li>{singleQuestionMode ? "Chế độ từng câu một" : "Hiển thị tất cả câu"}</li>
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="mt-4 text-sm text-muted-foreground">
          {maxAttempts != null && (
            <div> Lần làm: {(latestAttempt as number)}/{(maxAttempts as number)}{attemptsLeft != null ? ` • Còn lại: ${attemptsLeft}` : ""}</div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={startAttempt}>Bắt đầu làm</Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-2xl p-6 shadow-lg border border-border relative"
    >
      <Dialog open={blockedByTeacher} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onClose={() => {}}>
          <DialogHeader>
            <DialogTitle>
              {pausedByTeacher ? "Phiên thi đang tạm dừng" : "Phiên thi đã bị chấm dứt"}
            </DialogTitle>
            <DialogDescription>
              {pausedByTeacher
                ? "Giáo viên đang tạm dừng phiên thi của bạn. Vui lòng chờ cho đến khi giáo viên tiếp tục."
                : "Giáo viên đã chấm dứt phiên thi. Bài làm hiện tại của bạn sẽ được nộp tự động và vẫn được tính điểm."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      {/* Status banner */}
      {blockedByTeacher && (
        <AttemptStatusBanner
          status={pausedByTeacher ? "paused" : "terminated"}
          description={pausedByTeacher ? "Giáo viên đang tạm dừng phiên thi của bạn. Vui lòng chờ tín hiệu tiếp tục." : "Phiên thi đã bị chấm dứt bởi giáo viên. Bài làm hiện tại sẽ được nộp tự động."}
        />
      )}

      {/* Progress indicator */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-green-800" aria-live="polite">
            Tiến độ: {answeredCount}/{totalQuestions} câu đã trả lời
          </span>
          <div className="flex items-center gap-3">
            {!singleQuestionMode && !allAnswered && !disabledMode && !blockedByTeacher && (
              <Button type="button" variant="outline" onClick={scrollToFirstUnanswered}>
                Tới câu chưa trả lời
              </Button>
            )}
            <span className="text-sm font-bold text-green-600">
              {Math.round((answeredCount / totalQuestions) * 100)}%
            </span>
          </div>
        </div>

      {singleQuestionMode && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">Câu {currentIdx + 1}/{assignment.questions.length}</div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label="Quay lại câu trước"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx <= 0}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              variant="default"
              aria-label="Chuyển sang câu tiếp theo"
              onClick={() => setCurrentIdx((i) => Math.min(i + 1, assignment.questions.length - 1))}
              disabled={currentIdx >= assignment.questions.length - 1}
            >
              Câu tiếp theo
            </Button>
          </div>
        </div>
      )}
        <AttemptProgressBar answered={answeredCount} total={totalQuestions} />
        {remainingSec != null && (
          <div className="mt-3 text-right text-sm">
            <AttemptTimer remainingSec={remainingSec} />
          </div>
        )}
        {!singleQuestionMode && (
          <div className="mt-4 overflow-x-auto">
            <div className="flex gap-2">
              {orderedQuestionIds.map((qid, idx) => {
                const q = questionsById[qid];
                let ans = false;
                if (q) {
                  if (q.type === "FILL_BLANK") {
                    ans = !!(fillTexts.get(q.id) || "").trim();
                    if (!ans) {
                      const set = answers.get(q.id);
                      ans = !!(set && set.size > 0);
                    }
                  } else {
                    const set = answers.get(q.id);
                    ans = !!(set && set.size > 0);
                  }
                }
                return (
                  <button
                    key={qid}
                    type="button"
                    aria-label={`Câu ${idx + 1}${ans ? ' đã trả lời' : ' chưa trả lời'}`}
                    onClick={() => {
                      const el = typeof document !== 'undefined' ? document.getElementById(`q-${qid}`) : null;
                      if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    onKeyDown={(e) => {
                      const key = e.key;
                      if (key !== 'ArrowRight' && key !== 'ArrowLeft') return;
                      e.preventDefault();
                      const container = e.currentTarget.parentElement;
                      if (!container) return;
                      const btns = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
                      const currentIndex = btns.findIndex((b) => b === e.currentTarget);
                      if (currentIndex < 0) return;
                      const delta = key === 'ArrowRight' ? 1 : -1;
                      let nextIndex = Math.min(Math.max(currentIndex + delta, 0), btns.length - 1);
                      const nextBtn = btns[nextIndex];
                      if (nextBtn && typeof nextBtn.focus === 'function') nextBtn.focus();
                    }}
                    className={`min-w-11 h-11 px-3 rounded-md text-sm font-medium border ${ans ? 'bg-green-50 border-green-400 text-green-700' : 'bg-background border-border text-foreground'} hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!disabledMode && !blockedByTeacher && (
          <div className="mt-3 text-right">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                try {
                  window.localStorage.removeItem(draftKey);
                  window.localStorage.removeItem(fillDraftKey);
                } catch {}
                setAnswers(new Map());
                setFillTexts(new Map());
              }}
            >
              Xóa nháp
            </Button>
          </div>
        )}
      </div>

      {/* Questions list */}
      <div className="space-y-6 mb-6">
        {orderedQuestions.map((question, index) => {
          const selectedOptions = answers.get(question.id) || new Set<string>();

          return (
            <div
              id={`q-${question.id}`}
              key={question.id}
              className="p-5 bg-muted/40 rounded-xl border border-border"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 id={`q-title-${question.id}`} className="font-semibold text-foreground">{question.content}</h3>
                    <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground">
                      {question.type === "FILL_BLANK"
                        ? "Nhập câu trả lời"
                        : (question.type === "SINGLE" || question.type === "TRUE_FALSE" ? "Chọn 1 đáp án" : "Chọn nhiều đáp án")}
                    </span>
                  </div>

                  {/* Options / Fill blank */}
                  {question.type === "FILL_BLANK" ? (
                    <div className="mt-4">
                      <input
                        type="text"
                        value={getFillText(question)}
                        onChange={(e) => handleFillChange(question, e.target.value)}
                        disabled={isLoading || isOverdue || disabledMode || blockedByTeacher}
                        aria-label={`Nhập đáp án cho câu ${index + 1}`}
                        aria-required="true"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        className="w-full rounded-lg border-2 border-border bg-background p-3 h-12 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        placeholder="Nhập đáp án..."
                      />
                    </div>
                  ) : (
                    <div
                      className="space-y-3 mt-4"
                      role={(question.type === "SINGLE" || question.type === "TRUE_FALSE") ? "radiogroup" : "group"}
                      aria-labelledby={`q-title-${question.id}`}
                    >
                      {getOrderedOptions(question).map((option, optIdx) => {
                        const isSelected = selectedOptions.has(option.id);
                        const isSingle = (question.type === "SINGLE" || question.type === "TRUE_FALSE");
                        const tabIndex = isSingle
                          ? (selectedOptions.size > 0 ? (isSelected ? 0 : -1) : (optIdx === 0 ? 0 : -1))
                          : 0;

                        return (
                          <label
                            key={option.id}
                            className={`flex items-start gap-3 p-3 min-h-[44px] rounded-lg border-2 cursor-pointer transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
                              isSelected
                                ? "bg-green-50 border-green-500"
                                : "bg-background border-border hover:border-green-300"
                            } ${isOverdue || isLoading || disabledMode || blockedByTeacher ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type={(question.type === "SINGLE" || question.type === "TRUE_FALSE") ? "radio" : "checkbox"}
                              checked={isSelected}
                              onChange={() => toggleOption(question.id, option.id, question.type)}
                              disabled={isLoading || isOverdue || disabledMode || blockedByTeacher}
                              className="mt-1"
                              aria-label={`Câu ${index + 1} - ${String.fromCharCode(65 + optIdx)}: ${option.content}`}
                              name={(question.type === "SINGLE" || question.type === "TRUE_FALSE") ? `question-${question.id}` : undefined}
                              onKeyDown={(e) => handleOptionKeyDown(e, question.id, option.id, question.type)}
                              tabIndex={tabIndex}
                            />
                            <div className="flex-1">
                              <span className="font-medium text-foreground mr-2">
                                {String.fromCharCode(65 + optIdx)}:
                              </span>
                              <span className="text-foreground">{option.content}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Question Comments - Expand/collapse */}
                  {disabledMode && (
                    <QuestionComments
                      questionId={question.id}
                      questionContent={question.content}
                      questionOrder={question.order}
                      initialCommentsCount={question._count.comments}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <div
        className="flex items-center justify-between pt-4 border-t border-border sticky bottom-0 bg-background/95 backdrop-blur-md z-10 px-0 md:px-0 -mx-0 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="text-sm text-muted-foreground">
          {!allAnswered && (
            <span className="text-amber-600 font-medium inline-flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Còn {totalQuestions - answeredCount} câu chưa trả lời
            </span>
          )}
          {allAnswered && (
            <span className="text-green-600 font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Đã trả lời tất cả câu hỏi
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!singleQuestionMode && !allAnswered && !disabledMode && !blockedByTeacher && (
            <Button type="button" variant="outline" onClick={scrollToFirstUnanswered}>
              Tới câu chưa trả lời
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading || isOverdue}
          >
            {isLoading
              ? "Đang xử lý..."
              : isSubmitted
              ? "Cập nhật bài làm"
              : isOverdue
              ? "Đã quá hạn"
              : "Nộp bài"}
          </Button>
        </div>
      </div>
    </form>
  );
}

