"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StudentAssignmentDetail } from "@/hooks/use-student-assignments";
import QuestionComments from "./QuestionComments";

interface QuizAssignmentFormProps {
  assignment: StudentAssignmentDetail;
  onSubmit: (answers: Array<{ questionId: string; optionIds: string[] }>) => Promise<void>;
  initialAnswers?: Array<{ questionId: string; optionIds: string[] }>;
  isLoading?: boolean;
  dueDate?: string | null;
  isSubmitted?: boolean;
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

  // Timing: derive start/end/timeLimit
  const openAt = (assignment as any).openAt ? new Date((assignment as any).openAt) : null;
  const lockAt = (assignment as any).lockAt ? new Date((assignment as any).lockAt) : (dueDate ? new Date(dueDate) : null);
  const timeLimitMinutes = (assignment as any).timeLimitMinutes as number | null | undefined;
  const storageKey = `quiz_started_at_${assignment.id}`;
  const draftKey = `quiz_draft_${assignment.id}`;
  const fillDraftKey = `quiz_fill_draft_${assignment.id}`;
  const attemptIdKey = `quiz_attempt_id_${assignment.id}`;
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);
  const anti = ((assignment as any).antiCheatConfig || {}) as {
    requireFullscreen?: boolean;
    detectTabSwitch?: boolean;
    disableCopyPaste?: boolean;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    singleQuestionMode?: boolean;
  };
  const requireFullscreen = !!anti.requireFullscreen;
  const detectTabSwitch = !!anti.detectTabSwitch;
  const disableCopyPaste = !!anti.disableCopyPaste;
  const shuffleQuestionsFlag = !!anti.shuffleQuestions;
  const shuffleOptionsFlag = !!anti.shuffleOptions;
  const singleQuestionMode = !!anti.singleQuestionMode;
  const enableFuzzyFillBlank = !!(anti as any).enableFuzzyFillBlank;
  const fuzzyThreshold: number = typeof (anti as any).fuzzyThreshold === 'number' ? Math.min(0.5, Math.max(0, (anti as any).fuzzyThreshold)) : 0.2;
  const maxAttempts = (assignment as any).maxAttempts ?? null;
  const latestAttempt = (assignment as any).latestAttempt ?? 0;
  const allowNewAttempt = (assignment as any).allowNewAttempt ?? false;
  const [gateOpen, setGateOpen] = useState<boolean>(Boolean((allowNewAttempt && isSubmitted) || requireFullscreen || detectTabSwitch || disableCopyPaste || shuffleQuestionsFlag || shuffleOptionsFlag || singleQuestionMode));
  const [isNewAttempt, setIsNewAttempt] = useState<boolean>(false);
  const [questionOrder, setQuestionOrder] = useState<string[] | null>(null);
  const [optionOrders, setOptionOrders] = useState<Record<string, string[]> | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumberState, setAttemptNumberState] = useState<number | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  const attemptsLeft = maxAttempts != null ? Math.max(0, (maxAttempts as number) - (latestAttempt as number)) : null;
  const disabledMode = isSubmitted && !isNewAttempt;

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
        const result = await res.json().catch(() => null as any);
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

  // Persist draft on answers change (debounced)
  useEffect(() => {
    if (disabledMode) return;
    const id = window.setTimeout(() => {
      try {
        const arr = Array.from(answers.entries()).map(([questionId, set]) => ({ questionId, optionIds: Array.from(set) }));
        window.localStorage.setItem(draftKey, JSON.stringify(arr));
      } catch {}
    }, 300);
    return () => window.clearTimeout(id);
  }, [answers, draftKey, disabledMode]);

  // Persist draft FILL_BLANK texts (debounced)
  useEffect(() => {
    if (disabledMode) return;
    const id = window.setTimeout(() => {
      try {
        const obj: Record<string, string> = {};
        fillTexts.forEach((v, k) => { if (typeof v === "string") obj[k] = v; });
        window.localStorage.setItem(fillDraftKey, JSON.stringify(obj));
      } catch {}
    }, 300);
    return () => window.clearTimeout(id);
  }, [fillTexts, fillDraftKey, disabledMode]);

  // Initialize startedAt from storage or now when interactive
  useEffect(() => {
    if (disabledMode) return;
    const now = new Date();
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime())) setStartedAt(d);
    } else {
      setStartedAt(now);
      try { window.localStorage.setItem(storageKey, now.toISOString()); } catch {}
    }
  }, [disabledMode, storageKey]);

  // Compute effective deadline and drive countdown
  useEffect(() => {
    if (disabledMode) return;
    if (!startedAt) return;
    let effectiveDeadline: Date | null = lockAt ? new Date(lockAt) : null;
    if (timeLimitMinutes && timeLimitMinutes > 0) {
      const limitEnd = new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
      effectiveDeadline = effectiveDeadline ? new Date(Math.min(effectiveDeadline.getTime(), limitEnd.getTime())) : limitEnd;
    }
    if (!effectiveDeadline) return;

    const tick = () => {
      const now = new Date();
      const sec = Math.max(0, Math.floor((effectiveDeadline!.getTime() - now.getTime()) / 1000));
      setRemainingSec(sec);
      if (sec <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        // Auto-submit best-effort: chỉ gửi nếu có ít nhất 1 câu đã chọn
        const answersArray = Array.from(answers.entries()).map(([questionId, optionIds]) => ({
          questionId,
          optionIds: Array.from(optionIds),
        }));
        if (answersArray.some((a) => a.optionIds.length > 0)) {
          onSubmit(answersArray).catch(() => {});
        } else {
          // Không gửi request rỗng để tránh 400; chỉ khoá UI (isOverdue sẽ true)
          try {
            window.localStorage.removeItem(draftKey);
            window.localStorage.removeItem(fillDraftKey);
            window.localStorage.removeItem(attemptIdKey);
          } catch {}
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [answers, lockAt, disabledMode, onSubmit, startedAt, timeLimitMinutes]);

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
          logEvent('CLIPBOARD', { type: (e as any).type || 'unknown' });
        };
        const onKey = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
            e.preventDefault();
            logEvent('SHORTCUT', { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey });
          }
        };
        document.addEventListener("copy", prevent);
        document.addEventListener("cut", prevent);
        document.addEventListener("paste", prevent);
        document.addEventListener("contextmenu", prevent);
        document.addEventListener("keydown", onKey as any, true);
        cleanupRef.current.push(() => {
          document.removeEventListener("copy", prevent);
          document.removeEventListener("cut", prevent);
          document.removeEventListener("paste", prevent);
          document.removeEventListener("contextmenu", prevent);
          document.removeEventListener("keydown", onKey as any, true);
        });
      }

      // Gọi API server để khởi tạo attempt và lấy shuffleSeed
      const res = await fetch(`/api/students/assignments/${assignment.id}/attempts/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json().catch(() => null as any);
      if (!res.ok || !result?.success) {
        toast({ title: "Không thể bắt đầu làm bài", description: result?.message || res.statusText, variant: "destructive" });
        return;
      }
      const data = result.data as { attemptId: string; attemptNumber: number; shuffleSeed: number; startedAt: string; antiCheatConfig?: any; timeLimitMinutes?: number | null };

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
    if (isLoading || (dueDate && new Date(dueDate) < new Date())) return;

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
        newAnswers.set(questionId, currentOptions);
      }

      return newAnswers;
    });
  };

  const handleOptionKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    questionId: string,
    optionId: string,
    questionType: string
  ) => {
    if (isLoading || isOverdue || disabledMode) return;
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
    if (singleQuestionMode) return;
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
    const submitter = (e as any).nativeEvent?.submitter as HTMLButtonElement | undefined;
    if (!submitter) {
      toast({ title: "Chưa nộp bài", description: "Vui lòng bấm nút 'Nộp bài' để xác nhận.", variant: "default" });
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

    // Validate tất cả câu hỏi đều đã trả lời
    if (!allAnswered) {
      toast({
        title: "Lỗi",
        description: `Vui lòng trả lời tất cả ${totalQuestions} câu hỏi`,
        variant: "destructive",
      });
      return;
    }

    // Xác nhận nộp bài
    const confirmMsg = `Bạn đã trả lời ${answeredCount}/${totalQuestions} câu. Xác nhận nộp bài?`;
    if (!window.confirm(confirmMsg)) return;

    // Transform answers từ Map sang Array
    const answersArray = Array.from(answers.entries()).map(([questionId, optionIds]) => ({
      questionId,
      optionIds: Array.from(optionIds),
    }));

    await onSubmit(answersArray);
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
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800">Bắt đầu làm bài</h3>
          <p className="text-sm text-gray-600 mt-2">Vui lòng xác nhận cài đặt trước khi bắt đầu.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg border bg-gray-50">
            <div className="font-semibold text-gray-800">Cấu hình bảo mật</div>
            <ul className="mt-2 space-y-1 text-gray-700">
              <li>{requireFullscreen ? "Yêu cầu fullscreen" : "Không yêu cầu fullscreen"}</li>
              <li>{detectTabSwitch ? "Phát hiện chuyển tab" : "Không phát hiện chuyển tab"}</li>
              <li>{disableCopyPaste ? "Vô hiệu hóa copy/paste" : "Cho phép copy/paste"}</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg border bg-gray-50">
            <div className="font-semibold text-gray-800">Cấu hình hiển thị</div>
            <ul className="mt-2 space-y-1 text-gray-700">
              <li>{shuffleQuestionsFlag ? "Xáo thứ tự câu hỏi" : "Giữ nguyên thứ tự câu hỏi"}</li>
              <li>{shuffleOptionsFlag ? "Xáo thứ tự đáp án" : "Giữ nguyên thứ tự đáp án"}</li>
              <li>{singleQuestionMode ? "Chế độ từng câu một" : "Hiển thị tất cả câu"}</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-700">
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
      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
    >
      {/* Progress indicator */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-blue-800" aria-live="polite">
            Tiến độ: {answeredCount}/{totalQuestions} câu đã trả lời
          </span>
          <div className="flex items-center gap-3">
            {!singleQuestionMode && !allAnswered && !disabledMode && (
              <Button type="button" variant="outline" onClick={scrollToFirstUnanswered}>
                Tới câu chưa trả lời
              </Button>
            )}
            <span className="text-sm font-bold text-blue-600">
              {Math.round((answeredCount / totalQuestions) * 100)}%
            </span>
          </div>
        </div>

      {singleQuestionMode && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">Câu {currentIdx + 1}/{assignment.questions.length}</div>
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
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
        {countdownLabel && (
          <div className="mt-3 text-right text-sm text-blue-800" aria-live="polite">
            ⏳ Thời gian còn lại: <span className="font-semibold">{countdownLabel}</span>
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
                    className={`min-w-11 h-11 px-3 rounded-md text-sm font-medium border ${ans ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-700'} hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!disabledMode && (
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
              className="p-5 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 id={`q-title-${question.id}`} className="font-semibold text-gray-800">{question.content}</h3>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-600">
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
                        disabled={isLoading || isOverdue || disabledMode}
                        aria-label={`Nhập đáp án cho câu ${index + 1}`}
                        aria-required="true"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        className="w-full rounded-lg border-2 border-gray-200 p-3 h-12 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            className={`flex items-start gap-3 p-3 min-h-[44px] rounded-lg border-2 cursor-pointer transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-500"
                                : "bg-white border-gray-200 hover:border-indigo-300"
                              } ${isOverdue || isLoading || disabledMode ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <input
                              type={(question.type === "SINGLE" || question.type === "TRUE_FALSE") ? "radio" : "checkbox"}
                              checked={isSelected}
                              onChange={() => toggleOption(question.id, option.id, question.type)}
                              disabled={isLoading || isOverdue || disabledMode}
                              className="mt-1"
                              aria-label={`Câu ${index + 1} - ${option.label}: ${option.content}`}
                              name={(question.type === "SINGLE" || question.type === "TRUE_FALSE") ? `question-${question.id}` : undefined}
                              onKeyDown={(e) => handleOptionKeyDown(e, question.id, option.id, question.type)}
                              tabIndex={tabIndex}
                            />
                            <div className="flex-1">
                              <span className="font-medium text-gray-800 mr-2">
                                {option.label}:
                              </span>
                              <span className="text-gray-800">{option.content}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Question Comments - Expand/collapse */}
                  <QuestionComments
                    questionId={question.id}
                    questionContent={question.content}
                    questionOrder={question.order}
                    initialCommentsCount={question._count.comments}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <div
        className="flex items-center justify-between pt-4 border-t border-gray-200 sticky bottom-0 bg-white/95 backdrop-blur-md z-10 px-0 md:px-0 -mx-0 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="text-sm text-gray-600">
          {!allAnswered && (
            <span className="text-orange-600 font-medium">
              ⚠️ Còn {totalQuestions - answeredCount} câu chưa trả lời
            </span>
          )}
          {allAnswered && (
            <span className="text-green-600 font-medium">✓ Đã trả lời tất cả câu hỏi</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!singleQuestionMode && !allAnswered && !disabledMode && (
            <Button type="button" variant="outline" onClick={scrollToFirstUnanswered}>
              Tới câu chưa trả lời
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading || isOverdue || !allAnswered}
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

