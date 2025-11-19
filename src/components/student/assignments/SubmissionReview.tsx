"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentAssignmentDetail, SubmissionResponse } from "@/hooks/use-student-assignments";
import QuestionComments from "./QuestionComments";

interface SubmissionReviewProps {
  assignment: StudentAssignmentDetail;
  submission: SubmissionResponse;
}

/**
 * Component xem submission đã nộp
 */
export default function SubmissionReview({
  assignment,
  submission,
}: SubmissionReviewProps) {
  // Parse quiz answers nếu là quiz
  let quizAnswers: Array<{ questionId: string; optionIds: string[] }> | null = null;
  if (assignment.type === "QUIZ") {
    try {
      quizAnswers = JSON.parse(submission.content);
    } catch (e) {
      console.error("[SubmissionReview] Error parsing quiz answers:", e);
    }
  }

  // Tạo map để lookup answers
  const answersMap = quizAnswers
    ? new Map(quizAnswers.map((a) => [a.questionId, a.optionIds]))
    : null;

  // Presentation snapshot (nếu có)
  const presentation = (submission as any).presentation as
    | { questionOrder?: string[]; optionOrder?: Record<string, string[]> }
    | null
    | undefined;

  // Tải đáp án đúng (nếu chính sách cho phép)
  const [correctMap, setCorrectMap] = useState<Map<string, Set<string>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (assignment.type !== "QUIZ") return;
    (async () => {
      try {
        const res = await fetch(`/api/students/assignments/${assignment.id}/answers`);
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.success || !Array.isArray(j?.data?.questions)) {
          return; // Không được phép xem đáp án hoặc lỗi -> bỏ qua
        }
        if (cancelled) return;
        const map = new Map<string, Set<string>>();
        for (const q of j.data.questions as Array<{ questionId: string; correctOptionIds: string[] }>) {
          map.set(q.questionId, new Set(q.correctOptionIds || []));
        }
        setCorrectMap(map);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [assignment.id, assignment.type]);

  // Nguồn câu hỏi/đáp án: ưu tiên snapshot nếu có
  const snapshot = (submission as any).contentSnapshot as
    | { versionHash?: string; questions?: Array<{ id: string; content: string; type: string; options?: Array<{ id: string; label: string; content: string; isCorrect: boolean }> }> }
    | null
    | undefined;

  const currentHash = useMemo(() => {
    try {
      const norm = {
        questions: assignment.questions.map((q) => ({
          id: q.id,
          content: q.content,
          type: q.type,
          options: q.options.map((o) => ({ id: o.id, label: o.label, content: o.content, isCorrect: false })),
        })),
      };
      let h = 2166136261 >>> 0;
      const s = JSON.stringify(norm);
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(36).slice(0, 12);
    } catch {
      return null;
    }
  }, [assignment.questions]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Bài nộp của bạn</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
            Lần nộp #{(submission as any).attempt ?? 1}
          </span>
          <span>
            Nộp lúc:{" "}
            <span className="font-semibold text-gray-800">
              {new Date(submission.submittedAt).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </span>
          {submission.grade !== null && (
            <span>
              Điểm:{" "}
              <span className="font-bold text-green-600 text-lg">
                {submission.grade.toFixed(1)}/10
              </span>
            </span>
          )}
        </div>
        {assignment.type === "QUIZ" && snapshot?.versionHash && currentHash && snapshot.versionHash !== currentHash && (
          <div className="mt-3 p-3 rounded-lg border text-sm bg-amber-50 border-amber-200 text-amber-800">
            Lưu ý: Nội dung đề đã được thay đổi sau khi bạn nộp. Phần hiển thị này dùng ảnh chụp nội dung tại thời điểm nộp.
          </div>
        )}
      </div>

      {assignment.type === "ESSAY" ? (
        // Essay submission
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Nội dung bài làm:</h3>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
          </div>
        </div>
      ) : (
        // Quiz submission
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Câu trả lời của bạn:</h3>
          <div className="space-y-4">
            {(() => {
              const baseQuestions = (snapshot?.questions && snapshot.questions.length)
                ? snapshot.questions as any[]
                : assignment.questions as any[];
              const questionMap = new Map(baseQuestions.map((q: any) => [q.id, q]));
              const orderedQids = presentation?.questionOrder?.length
                ? presentation.questionOrder!
                : baseQuestions.map((q: any) => q.id);
              return orderedQids.map((qid, index) => {
                const question: any = questionMap.get(qid);
                if (!question) return null;
                const selectedOptionIds = answersMap?.get(question.id) || [];
                const orderedOptionIds = presentation?.optionOrder?.[question.id]?.length
                  ? presentation.optionOrder![question.id]!
                  : ((question.options || []) as any[]).map((o: any) => o.id);
                const optionById: Record<string, any> = {};
                ((question.options || []) as any[]).forEach((o: any) => (optionById[o.id] = o));

                return (
                  <div key={question.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-3">{question.content}</h4>
                        <div className="space-y-2">
                          {orderedOptionIds.map((oid, optIdx) => {
                            const option = optionById[oid];
                            if (!option) return null;
                            const isSelected = selectedOptionIds.includes(oid);
                            const isAnswer = correctMap?.get(question.id)?.has(oid) ?? false;
                            return (
                              <div
                                key={oid}
                                className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                                  isSelected
                                    ? "bg-indigo-50 border-indigo-500"
                                    : isAnswer
                                      ? "bg-green-50 border-green-400"
                                      : "bg-white border-gray-200"
                                }`}
                              >
                                <input
                                  type={question.type === "SINGLE" || question.type === "TRUE_FALSE" ? "radio" : "checkbox"}
                                  checked={isSelected}
                                  disabled
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <span className="font-medium text-gray-800 mr-2">
                                    {String.fromCharCode(65 + optIdx)}:
                                  </span>
                                  <span className="text-gray-700">{option.content}</span>
                                  {isAnswer && (
                                    <span className="ml-2 inline-flex text-[11px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Đáp án đúng</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Question comments (sau khi nộp) */}
                        <div className="mt-4">
                          <QuestionComments
                            questionId={question.id}
                            questionContent={question.content}
                            questionOrder={index + 1}
                            initialCommentsCount={(assignment.questions.find((q) => q.id === question.id)?._count?.comments as any) || 0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Feedback */}
      {submission.feedback && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Nhận xét của giáo viên:</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-gray-700">{submission.feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}


