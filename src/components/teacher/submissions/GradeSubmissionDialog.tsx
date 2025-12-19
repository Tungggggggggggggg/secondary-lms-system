"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmissionDetail } from "@/hooks/use-teacher-submissions";
import RateLimitDialog, {
  getRetryAfterSecondsFromResponse,
} from "@/components/shared/RateLimitDialog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type ApiEnvelope = {
  success: boolean;
  message?: string;
  data?: unknown;
};

function toApiEnvelope(value: unknown): ApiEnvelope | null {
  if (!isRecord(value)) return null;
  if (typeof value.success !== "boolean") return null;
  return {
    success: value.success,
    message: typeof value.message === "string" ? value.message : undefined,
    data: value.data,
  };
}

type AiSuggestion = { score: number; feedback: string; corrections?: Array<{ excerpt: string; suggestion: string }> };

function isAiSuggestion(value: unknown): value is AiSuggestion {
  if (!isRecord(value)) return false;
  return typeof value.score === "number" && typeof value.feedback === "string";
}

interface GradeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionDetail | null;
  assignmentId: string;
  onGrade: (grade: number, feedback?: string) => Promise<boolean>;
  fileList?: Array<{ fileName: string; mimeType: string; url: string | null }>; // optional for file submissions
}

/**
 * Dialog để giáo viên chấm bài tập
 */
export default function GradeSubmissionDialog({
  open,
  onOpenChange,
  submission,
  assignmentId,
  onGrade,
  fileList,
}: GradeSubmissionDialogProps) {
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [rateLimitRetryAfterSeconds, setRateLimitRetryAfterSeconds] = useState(0);
  const [aiSuggestion, setAiSuggestion] = useState<
    | { score: number; feedback: string; corrections?: Array<{ excerpt: string; suggestion: string }> }
    | null
  >(null);

  // Sync state với submission data
  useEffect(() => {
    if (submission) {
      setGrade(submission.grade?.toString() || "");
      setFeedback(submission.feedback || "");
      setAiError(null);
      setAiSuggestion(null);
    } else {
      setGrade("");
      setFeedback("");
      setAiError(null);
      setAiSuggestion(null);
    }
  }, [submission]);

  const canUseAi =
    !!submission &&
    submission.assignment.type === "ESSAY" &&
    !submission.isFileSubmission &&
    !(fileList && fileList.length > 0) &&
    typeof submission.content === "string" &&
    submission.content.trim().length > 0;

  const handleAiSuggest = async () => {
    if (!submission) return;
    if (!canUseAi) return;
    try {
      setAiLoading(true);
      setAiError(null);
      const res = await fetch("/api/ai/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          submissionId: submission.id,
        }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const json = toApiEnvelope(raw);
      if (res.status === 429) {
        const retryAfterSeconds = getRetryAfterSecondsFromResponse(res, raw) ?? 60;
        setRateLimitRetryAfterSeconds(retryAfterSeconds);
        setRateLimitOpen(true);
        return;
      }
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể lấy gợi ý chấm từ AI");
      }

      const next = isAiSuggestion(json?.data) ? json?.data : null;
      if (!next) {
        throw new Error("Không thể lấy gợi ý chấm từ AI");
      }
      setAiSuggestion(next);
    } catch (e) {
      setAiSuggestion(null);
      setAiError(e instanceof Error ? e.message : "Có lỗi xảy ra khi gọi AI");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setGrade(String(aiSuggestion.score));
    setFeedback(aiSuggestion.feedback);
  };

  const handleSubmit = async () => {
    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) {
      setGradeError("Điểm phải từ 0 đến 10");
      return;
    }
    setGradeError(null);

    setIsGrading(true);
    try {
      const success = await onGrade(gradeNum, feedback);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("[GradeSubmissionDialog] Lỗi khi chấm bài:", error);
    } finally {
      setIsGrading(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-2xl" onClose={() => onOpenChange(false)}>
        <RateLimitDialog
          open={rateLimitOpen}
          onOpenChange={setRateLimitOpen}
          retryAfterSeconds={rateLimitRetryAfterSeconds}
          title="Bạn đang yêu cầu AI quá nhanh"
          description="Vui lòng chờ thêm một chút rồi thử lại."
          onRetry={handleAiSuggest}
        />
        <div className="bg-gradient-to-r from-blue-50 to-background px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-xl">Chấm bài tập</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Xem chi tiết và chấm điểm bài nộp của học sinh
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="md:grid md:grid-cols-2 gap-6 p-6 max-h-[80vh] overflow-y-auto">
          {/* Thông tin học sinh */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                {submission.student.fullname?.charAt(0) || "S"}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{submission.student.fullname}</h3>
                <p className="text-xs text-muted-foreground">{submission.student.email}</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Nộp lúc: {new Date(submission.submittedAt).toLocaleString("vi-VN")}</div>
          </div>

          {/* Form chấm điểm */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Điểm số (0 - 10)</Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Nhập điểm (0-10)"
                />
                {gradeError && (
                  <p className="text-sm text-destructive">{gradeError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Nhận xét (tùy chọn)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Nhập nhận xét cho học sinh..."
                  rows={6}
                />
              </div>

              {canUseAi && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={aiLoading}
                      onClick={handleAiSuggest}
                      className="inline-flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {aiLoading ? "Đang gợi ý..." : "AI gợi ý chấm"}
                    </Button>
                    {aiSuggestion && (
                      <Button type="button" onClick={applyAiSuggestion} disabled={aiLoading}>
                        Áp dụng gợi ý
                      </Button>
                    )}
                  </div>

                  {aiError && <p className="text-sm text-destructive">{aiError}</p>}

                  {aiSuggestion && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                      <div className="font-semibold">Gợi ý từ AI</div>
                      <div className="mt-1">
                        <span className="font-medium">Điểm:</span> {aiSuggestion.score}/10
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">
                        <span className="font-medium">Nhận xét:</span> {aiSuggestion.feedback}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hiển thị nội dung bài nộp */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm">Nội dung bài nộp</Label>
            {fileList && fileList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fileList.map((f, idx) => (
                  <div key={idx} className="border border-border rounded-md p-2 bg-muted/40">
                    <div className="aspect-video bg-background rounded flex items-center justify-center overflow-hidden">
                      {f.mimeType?.startsWith("image/") && f.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.url} alt={f.fileName} className="object-cover w-full h-full" />
                      ) : (
                        <div className="text-xs text-muted-foreground">{f.fileName}</div>
                      )}
                    </div>
                    {f.url && (
                      <a className="mt-2 inline-flex text-xs px-2 py-1 rounded border border-border bg-background" href={f.url} target="_blank" rel="noreferrer">Tải xuống</a>
                    )}
                  </div>
                ))}
              </div>
            ) : submission.assignment.type === "ESSAY" ? (
              <div className="bg-background border border-border rounded-lg p-6 min-h-[240px] shadow-sm">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                  {submission.content}
                </pre>
              </div>
            ) : (
              // Quiz: Hiển thị theo snapshot presentation (ưu tiên contentSnapshot nếu có)
              <div className="space-y-4">
                {submission.answers && (submission.assignment.questions || submission.contentSnapshot) ? (
                  (() => {
                    type QuestionVM = {
                      id: string;
                      content: string;
                      type: string;
                      options: Array<{ id: string; label: string; content: string; isCorrect: boolean }>;
                    };

                    const snapshot = submission.contentSnapshot;
                    const baseQuestions: QuestionVM[] = (snapshot?.questions && snapshot.questions.length)
                      ? snapshot.questions.map((q) => ({
                          id: q.id,
                          content: q.content,
                          type: q.type,
                          options: (q.options ?? []).map((o) => ({
                            id: o.id,
                            label: o.label,
                            content: o.content,
                            isCorrect: Boolean(o.isCorrect),
                          })),
                        }))
                      : (submission.assignment.questions || []).map((q) => ({
                          id: q.id,
                          content: q.content,
                          type: q.type,
                          options: (q.options ?? []).map((o) => ({
                            id: o.id,
                            label: o.label,
                            content: o.content,
                            isCorrect: o.isCorrect,
                          })),
                        }));

                    const questionMap = new Map<string, QuestionVM>(baseQuestions.map((q) => [q.id, q]));
                    const answersMap = new Map(
                      submission.answers.map((a) => [a.questionId, a.optionIds])
                    );

                    const presentation = submission.presentation;
                    const orderedQids = (presentation?.questionOrder && presentation.questionOrder.length)
                      ? presentation.questionOrder
                      : baseQuestions.map((q) => q.id);

                    return orderedQids.map((qid, qIdx) => {
                      const q = questionMap.get(qid);
                      if (!q) return null;
                      const selected = new Set(answersMap.get(qid) || []);
                      const correctSet = new Set(
                        q.options.filter((o) => o.isCorrect).map((o) => o.id)
                      );
                      const isCorrect =
                        selected.size === correctSet.size &&
                        Array.from(selected).every((id) => correctSet.has(id));

                      const orderedOids = presentation?.optionOrder?.[qid]?.length
                        ? presentation.optionOrder[qid]
                        : q.options.map((o) => o.id);
                      const optionById: Record<string, { id: string; label: string; content: string; isCorrect: boolean }> = {};
                      q.options.forEach((o) => (optionById[o.id] = o));

                      return (
                        <div
                          key={qid}
                          className={`border rounded-lg p-4 shadow-sm ${
                            isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground">
                              Câu {qIdx + 1}: {q.content}
                            </h4>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                              }`}
                            >
                              {isCorrect ? "✓ Đúng" : "✗ Sai"}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {orderedOids.map((oid, optIdx) => {
                              const opt = optionById[oid];
                              if (!opt) return null;
                              const picked = selected.has(oid);
                              const isAns = correctSet.has(oid);
                              return (
                                <div
                                  key={oid}
                                  className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                                    picked
                                      ? "bg-indigo-50 border-indigo-500"
                                      : isAns
                                        ? "bg-green-50 border-green-400"
                                        : "bg-background border-border"
                                  }`}
                                >
                                  <input
                                    type={q.type === "SINGLE" || q.type === "TRUE_FALSE" ? "radio" : "checkbox"}
                                    checked={picked}
                                    disabled
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <span className="font-medium text-foreground mr-2">
                                      {String.fromCharCode(65 + optIdx)}:
                                    </span>
                                    <span className="text-foreground">{opt.content}</span>
                                    {isAns && (
                                      <span className="ml-2 inline-flex text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Đáp án đúng</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <div className="bg-background border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Không có câu trả lời</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spacer to balance grid on large screens */}
          <div className="hidden md:block" />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGrading}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isGrading}>
            {isGrading ? "Đang lưu..." : "Lưu điểm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

