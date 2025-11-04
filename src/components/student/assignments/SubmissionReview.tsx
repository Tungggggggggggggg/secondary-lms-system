"use client";

import { StudentAssignmentDetail, SubmissionResponse } from "@/hooks/use-student-assignments";

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

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <div className="mb-6 pb-6 border-b border-gray-200">
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
            {assignment.questions.map((question, index) => {
              const selectedOptionIds = answersMap?.get(question.id) || [];

              return (
                <div
                  key={question.id}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-3">{question.content}</h4>
                      <div className="space-y-2">
                        {question.options.map((option) => {
                          const isSelected = selectedOptionIds.includes(option.id);

                          return (
                            <div
                              key={option.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                                isSelected
                                  ? "bg-indigo-50 border-indigo-500"
                                  : "bg-white border-gray-200"
                              }`}
                            >
                              <input
                                type={question.type === "SINGLE" ? "radio" : "checkbox"}
                                checked={isSelected}
                                disabled
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-800 mr-2">
                                  {option.label}:
                                </span>
                                <span className="text-gray-700">{option.content}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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


