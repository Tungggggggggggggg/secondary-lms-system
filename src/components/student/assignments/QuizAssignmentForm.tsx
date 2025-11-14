"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  const maxAttempts = (assignment as any).maxAttempts ?? null;
  const latestAttempt = (assignment as any).latestAttempt ?? 0;
  const allowNewAttempt = (assignment as any).allowNewAttempt ?? false;
  const [gateOpen, setGateOpen] = useState<boolean>(Boolean((allowNewAttempt && isSubmitted) || requireFullscreen || detectTabSwitch || disableCopyPaste || shuffleQuestionsFlag || shuffleOptionsFlag || singleQuestionMode));
  const [isNewAttempt, setIsNewAttempt] = useState<boolean>(false);
  const [questionOrder, setQuestionOrder] = useState<string[] | null>(null);
  const [optionOrders, setOptionOrders] = useState<Record<string, string[]> | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const cleanupRef = useRef<(() => void)[]>([]);
  const attemptsLeft = maxAttempts != null ? Math.max(0, (maxAttempts as number) - (latestAttempt as number)) : null;
  const disabledMode = isSubmitted && !isNewAttempt;

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
          try { window.localStorage.removeItem(draftKey); } catch {}
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
      if (detectTabSwitch) {
        const onHidden = () => {
          if (document.hidden) {
            toast({ title: "Cảnh báo", description: "Bạn đã chuyển tab khỏi bài làm", variant: "destructive" });
          }
        };
        const onBlur = () => {
          toast({ title: "Cảnh báo", description: "Cửa sổ không còn ở trạng thái hoạt động", variant: "destructive" });
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
        };
        const onKey = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
            e.preventDefault();
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
      const seedKey = `quiz_seed_${assignment.id}_${(latestAttempt as number) + 1}`;
      let seed = 0;
      try {
        const raw = window.localStorage.getItem(seedKey);
        seed = raw ? parseInt(raw) : 0;
      } catch {}
      if (!seed) {
        seed = Math.floor(Date.now() % 2147483647);
        try { window.localStorage.setItem(seedKey, String(seed)); } catch {}
      }
      const srand = (s: number) => {
        let x = s || 123456789;
        return () => (x = (1103515245 * x + 12345) % 2147483647) / 2147483647;
      };
      const rnd = srand(seed);
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
      try {
        window.localStorage.removeItem(draftKey);
        window.localStorage.removeItem(storageKey);
      } catch {}
      setAnswers(new Map());
      const now = new Date();
      setStartedAt(now);
      try { window.localStorage.setItem(storageKey, now.toISOString()); } catch {}
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

      if (questionType === "SINGLE") {
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

  // Tính số câu đã trả lời
  const answeredCount = useMemo(() => {
    return Array.from(answers.values()).filter((options) => options.size > 0).length;
  }, [answers]);

  const totalQuestions = assignment.questions.length;
  const allAnswered = answeredCount === totalQuestions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    // Transform answers từ Map sang Array
    const answersArray = Array.from(answers.entries()).map(([questionId, optionIds]) => ({
      questionId,
      optionIds: Array.from(optionIds),
    }));

    await onSubmit(answersArray);
    try { window.localStorage.removeItem(draftKey); } catch {}
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
          <span className="text-sm font-semibold text-blue-800">
            Tiến độ: {answeredCount}/{totalQuestions} câu đã trả lời
          </span>
          <span className="text-sm font-bold text-blue-600">
            {Math.round((answeredCount / totalQuestions) * 100)}%
          </span>
        </div>

      {singleQuestionMode && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">Câu {currentIdx + 1}/{assignment.questions.length}</div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled
            >
              Quay lại
            </Button>
            <Button
              type="button"
              variant="default"
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
      </div>

      {/* Questions list */}
      <div className="space-y-6 mb-6">
        {orderedQuestions.map((question, index) => {
          const selectedOptions = answers.get(question.id) || new Set<string>();

          return (
            <div
              key={question.id}
              className="p-5 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-800">{question.content}</h3>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded text-gray-600">
                      {question.type === "SINGLE" ? "Chọn 1 đáp án" : "Chọn nhiều đáp án"}
                    </span>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 mt-4">
                    {getOrderedOptions(question).map((option) => {
                      const isSelected = selectedOptions.has(option.id);

                      return (
                        <label
                          key={option.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-500"
                              : "bg-white border-gray-200 hover:border-indigo-300"
                          } ${isOverdue || isLoading || disabledMode ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type={question.type === "SINGLE" ? "radio" : "checkbox"}
                            checked={isSelected}
                            onChange={() => toggleOption(question.id, option.id, question.type)}
                            disabled={isLoading || isOverdue || disabledMode}
                            className="mt-1"
                            name={question.type === "SINGLE" ? `question-${question.id}` : undefined}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-800 mr-2">
                              {option.label}:
                            </span>
                            <span className="text-gray-700">{option.content}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

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
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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
    </form>
  );
}

