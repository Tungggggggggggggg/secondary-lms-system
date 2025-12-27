"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeacherSubmission } from "@/hooks/use-teacher-submissions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

interface SubmissionCardProps {
  submission: TeacherSubmission;
  assignmentType: "ESSAY" | "QUIZ";
  onGrade: (submission: TeacherSubmission) => void;
  assignmentId?: string;
}

/**
 * Card hiển thị một submission
 */
export default function SubmissionCard({
  submission,
  assignmentType,
  onGrade,
  assignmentId,
}: SubmissionCardProps) {
  const isGraded = submission.grade !== null;
  const submittedDate = new Date(submission.submittedAt);

  return (
    <div
      className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={() => onGrade(submission)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onGrade(submission);
        }
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-foreground">
              {submission.student.fullname}
            </h3>
            <Badge className="bg-muted text-muted-foreground">Lần nộp #{submission.attempt ?? 1}</Badge>
            {isGraded && (
              <Badge className="bg-green-600 text-white">Đã chấm</Badge>
            )}
            {!isGraded && (
              <Badge className="bg-yellow-500 text-white">Chưa chấm</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {submission.student.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Nộp lúc: {submittedDate.toLocaleString("vi-VN")}
          </p>
        </div>
        {isGraded && (
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {submission.grade?.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">điểm</div>
          </div>
        )}
      </div>

      {/* Nội dung bài nộp (preview) */}
      <div className="mb-4">
        <p className="text-sm font-medium text-foreground mb-2">Nội dung:</p>
        <div className="bg-muted/40 rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
          {assignmentType === "ESSAY" ? (
            <>
              <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">
                {submission.content || "(Chưa có nội dung văn bản)"}
              </p>
              {submission.filesCount && submission.filesCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Có kèm tệp: {submission.filesCount} tệp
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Bài trắc nghiệm (xem chi tiết để chấm điểm)
            </p>
          )}
        </div>
      </div>

      {/* Feedback */}
      {submission.feedback && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-1">Nhận xét:</p>
          <p className="text-sm text-blue-700 whitespace-pre-wrap">
            {submission.feedback}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
        {submission.isFileSubmission || submission.fileSubmissionId ? (
          <div className="flex gap-2">
            <Button
              onClick={async (event) => {
                event.stopPropagation();
                try {
                  const targetId = submission.fileSubmissionId || submission.id;
                  const resp = await fetch(`/api/submissions/${targetId}/files`);
                  const raw: unknown = await resp.json().catch(() => null);
                  if (
                    isRecord(raw) &&
                    raw.success === true &&
                    isRecord(raw.data) &&
                    Array.isArray(raw.data.files)
                  ) {
                    const files = raw.data.files.filter((f) => isRecord(f));
                    let delay = 0;
                    for (const f of files) {
                      const url = typeof f.url === "string" ? f.url : null;
                      const fileName = typeof f.fileName === "string" ? f.fileName : "file";
                      if (!url) continue;
                      setTimeout(() => {
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileName;
                        a.target = "_blank";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      }, delay);
                      delay += 250;
                    }
                  }
                } catch {}
              }}
              variant="outline"
            >
              Tải file ({submission.filesCount ?? 0})
            </Button>
            <Button
              onClick={(event) => {
                event.stopPropagation();
                onGrade(submission);
              }}
            >
              Xem/Chấm
            </Button>
          </div>
        ) : (
          <Button
            onClick={(event) => {
              event.stopPropagation();
              onGrade(submission);
            }}
            variant={isGraded ? "outline" : "default"}
          >
            {isGraded ? "Xem/Sửa điểm" : "Chấm bài"}
          </Button>
        )}
      </div>
    </div>
  );
}

