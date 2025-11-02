"use client";

import { useState, useEffect } from "react";
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

interface GradeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionDetail | null;
  assignmentId: string;
  onGrade: (grade: number, feedback?: string) => Promise<boolean>;
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
}: GradeSubmissionDialogProps) {
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [isGrading, setIsGrading] = useState(false);

  // Sync state với submission data
  useEffect(() => {
    if (submission) {
      setGrade(submission.grade?.toString() || "");
      setFeedback(submission.feedback || "");
    } else {
      setGrade("");
      setFeedback("");
    }
  }, [submission]);

  // Parse quiz answers để hiển thị
  const parseQuizAnswers = () => {
    if (!submission || !submission.answers || !submission.assignment.questions) {
      return null;
    }

    const questionMap = new Map(
      submission.assignment.questions.map((q) => [q.id, q])
    );

    return submission.answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) return null;

      const selectedOptions = question.options?.filter((opt) =>
        answer.optionIds.includes(opt.id)
      ) || [];

      const correctOptions =
        question.options?.filter((opt) => opt.isCorrect) || [];

      const isCorrect =
        selectedOptions.length === correctOptions.length &&
        selectedOptions.every((opt) => opt.isCorrect);

      return {
        question,
        selectedOptions,
        correctOptions,
        isCorrect,
      };
    });
  };

  const quizAnswers = parseQuizAnswers();

  const handleSubmit = async () => {
    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) {
      alert("Điểm phải từ 0 đến 10");
      return;
    }

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chấm bài tập</DialogTitle>
          <DialogDescription>
            Chấm điểm và đưa feedback cho bài nộp của học sinh
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thông tin học sinh */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">
              Học sinh: {submission.student.fullname}
            </h3>
            <p className="text-sm text-gray-600">{submission.student.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              Nộp lúc: {new Date(submission.submittedAt).toLocaleString("vi-VN")}
            </p>
          </div>

          {/* Hiển thị nội dung bài nộp */}
          <div className="space-y-2">
            <Label>Nội dung bài nộp</Label>
            {submission.assignment.type === "ESSAY" ? (
              <div className="bg-white border rounded-lg p-4 min-h-[200px]">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                  {submission.content}
                </pre>
              </div>
            ) : (
              // Quiz: Hiển thị câu trả lời với kết quả
              <div className="space-y-4">
                {quizAnswers && quizAnswers.length > 0 ? (
                  quizAnswers.map((answer, idx) => {
                    if (!answer) return null;
                    return (
                      <div
                        key={idx}
                        className={`border rounded-lg p-4 ${
                          answer.isCorrect
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-800">
                            Câu {answer.question.order}: {answer.question.content}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              answer.isCorrect
                                ? "bg-green-200 text-green-800"
                                : "bg-red-200 text-red-800"
                            }`}
                          >
                            {answer.isCorrect ? "✓ Đúng" : "✗ Sai"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Học sinh chọn:
                            </p>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                              {answer.selectedOptions.map((opt) => (
                                <li key={opt.id}>
                                  {opt.label}: {opt.content}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {!answer.isCorrect && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Đáp án đúng:
                              </p>
                              <ul className="list-disc list-inside text-sm text-green-700">
                                {answer.correctOptions.map((opt) => (
                                  <li key={opt.id}>
                                    {opt.label}: {opt.content}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      Không có câu trả lời
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form chấm điểm */}
          <div className="space-y-4 border-t pt-4">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Nhận xét (tùy chọn)</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Nhập nhận xét cho học sinh..."
                rows={4}
              />
            </div>
          </div>
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

