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
    if (isSubmitted) return;
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
  }, [assignment.id, isSubmitted]);

  // Persist draft on answers change (debounced)
  useEffect(() => {
    if (isSubmitted) return;
    const id = window.setTimeout(() => {
      try {
        const arr = Array.from(answers.entries()).map(([questionId, set]) => ({ questionId, optionIds: Array.from(set) }));
        window.localStorage.setItem(draftKey, JSON.stringify(arr));
      } catch {}
    }, 300);
    return () => window.clearTimeout(id);
  }, [answers, draftKey, isSubmitted]);

  // Initialize startedAt from storage or now when interactive
  useEffect(() => {
    if (isSubmitted) return; // no timer for submitted
    const now = new Date();
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime())) setStartedAt(d);
    } else {
      setStartedAt(now);
      try { window.localStorage.setItem(storageKey, now.toISOString()); } catch {}
    }
  }, [isSubmitted, storageKey]);

  // Compute effective deadline and drive countdown
  useEffect(() => {
    if (isSubmitted) return;
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
  }, [answers, lockAt, isSubmitted, onSubmit, startedAt, timeLimitMinutes]);

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
        {assignment.questions.map((question, index) => {
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
                    {question.options.map((option) => {
                      const isSelected = selectedOptions.has(option.id);

                      return (
                        <label
                          key={option.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-500"
                              : "bg-white border-gray-200 hover:border-indigo-300"
                          } ${isOverdue || isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type={question.type === "SINGLE" ? "radio" : "checkbox"}
                            checked={isSelected}
                            onChange={() => toggleOption(question.id, option.id, question.type)}
                            disabled={isLoading || isOverdue}
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

