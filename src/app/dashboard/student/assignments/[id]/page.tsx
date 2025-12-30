"use client";

import { useEffect, useState, useRef } from "react";

import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useStudentAssignments,
  StudentAssignmentDetail,
  SubmissionResponse,
  type SubmitAssignmentRequest,
} from "@/hooks/use-student-assignments";
import { useToast } from "@/hooks/use-toast";
import AssignmentDetailHeader from "@/components/student/assignments/AssignmentDetailHeader";
import EssayAssignmentForm from "@/components/student/assignments/EssayAssignmentForm";
import QuizAssignmentForm from "@/components/student/assignments/QuizAssignmentForm";
import SubmissionReview from "@/components/student/assignments/SubmissionReview";
import FileSubmissionPanel, { FileSubmissionPanelHandle } from "@/components/student/assignments/FileSubmissionPanel";
import AssignmentComments from "@/components/student/assignments/AssignmentComments";
import RichTextPreview from "@/components/shared/RichTextPreview";

const isImageByName = (name?: string) => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].some((ext) => lower.endsWith(ext));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

type TeacherAttachment = { id: string; name: string; url: string | null; mimeType: string };
type StoredSubmissionFile = { fileName: string; mimeType: string; sizeBytes: number; storagePath: string };
type FileSubmission = { id: string; status: string; files: StoredSubmissionFile[] };

const parseTeacherAttachments = (data: unknown): TeacherAttachment[] => {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = typeof item.id === "string" ? item.id : "";
    const name = typeof item.name === "string" ? item.name : "";
    const mimeType = typeof item.mimeType === "string" ? item.mimeType : "";
    const url = typeof item.url === "string" ? item.url : null;
    if (!id || !name || !mimeType) return [];
    return [{ id, name, url, mimeType }];
  });
};

const parseFileSubmission = (data: unknown): FileSubmission | null => {
  if (!isRecord(data)) return null;
  const id = typeof data.id === "string" ? data.id : "";
  const status = typeof data.status === "string" ? data.status : "";
  const filesRaw = data.files;
  const files: StoredSubmissionFile[] = Array.isArray(filesRaw)
    ? filesRaw.flatMap((f) => {
        if (!isRecord(f)) return [];
        const fileName = typeof f.fileName === "string" ? f.fileName : "";
        const mimeType = typeof f.mimeType === "string" ? f.mimeType : "";
        const sizeBytes = typeof f.sizeBytes === "number" ? f.sizeBytes : 0;
        const storagePath = typeof f.storagePath === "string" ? f.storagePath : "";
        if (!fileName || !mimeType || !storagePath) return [];
        return [{ fileName, mimeType, sizeBytes, storagePath }];
      })
    : [];
  if (!id || !status) return null;
  return { id, status, files };
};

/**
 * Trang chi tiết assignment cho student
 */
export default function StudentAssignmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const assignmentId = params.id as string;

  const {
    fetchAssignmentDetail,
    fetchSubmission,
    submitAssignment,
    updateSubmission,
    isLoading,
    error,
  } = useStudentAssignments();

  const { toast } = useToast();

  const [assignment, setAssignment] = useState<StudentAssignmentDetail | null>(null);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [fileSubmission, setFileSubmission] = useState<{ id: string; status: string; files: Array<{ id?: string; fileName: string; mimeType: string; sizeBytes: number; storagePath: string }> } | null>(null);
  const [signedUrlByPath, setSignedUrlByPath] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; url: string | null; mimeType: string }>>([]);
  const filePanelRef = useRef<FileSubmissionPanelHandle | null>(null);

  const handleDownload = async (path: string, filename: string) => {
    try {
      let url = signedUrlByPath[path];
      if (!url) {
        const r = await fetch(`/api/submissions/signed-url?path=${encodeURIComponent(path)}`);
        const j = await r.json();
        if (r.ok && j?.success && j.data?.url) {
          url = j.data.url;
          setSignedUrlByPath((prev) => ({ ...prev, [path]: url! }));
        } else {
          toast({
            title: "Không thể tải tệp",
            description: "Không tạo được liên kết tải xuống. Vui lòng thử lại.",
            variant: "destructive",
          });
          return;
        }
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "download";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {}
  };

  const [activeTab, setActiveTab] = useState<"work" | "review">("work");

  const showNoMoreAttemptsToast = () => {
    if (!assignment) return;

    const gradedSubmission = !!submission && submission.grade !== null;
    const noMoreQuizAttempts =
      assignment.type === "QUIZ" && gradedSubmission && !(assignment.allowNewAttempt ?? false);
    const gradedEssay = assignment.type === "ESSAY" && gradedSubmission;

    if (!noMoreQuizAttempts && !gradedEssay) return;

    const description = noMoreQuizAttempts
      ? "Bạn đã sử dụng hết số lần làm bài cho bài tập này. Hãy xem lại kết quả ở tab \"Xem bài nộp\"."
      : "Bài tập này đã được chấm điểm. Bạn chỉ có thể xem lại kết quả, không thể nộp lại.";

    toast({
      title: "Không thể nộp lại bài",
      description,
      variant: "destructive",
    });
  };

  // Load assignment detail và submission
  useEffect(() => {
    if (!assignmentId) return;

    async function loadData() {
      // Load assignment detail
      const assignmentData = await fetchAssignmentDetail(assignmentId);
      if (assignmentData) {
        setAssignment(assignmentData);
      }

      try {
        const r = await fetch(`/api/assignments/${assignmentId}/files`);
        const j: unknown = await r.json();
        if (r.ok && isRecord(j) && j.success === true) {
          setAttachments(parseTeacherAttachments(j.data));
        }
      } catch {}

      // Load submission (essay/quiz legacy)
      const submissionData = await fetchSubmission(assignmentId);
      if (submissionData) {
        setSubmission(submissionData);
        // Nếu nội dung trống (điểm/feedback do GV chấm cho bài nộp file), cũng tải danh sách file để hiển thị
        if (!submissionData.content || submissionData.content.trim() === "") {
          try {
            const resp = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
            const j: unknown = await resp.json();
            const parsed = resp.ok && isRecord(j) && j.success === true ? parseFileSubmission(j.data) : null;
            if (parsed) {
              setFileSubmission(parsed);
              const imgs = parsed.files.filter(
                (f) => f.mimeType.startsWith("image/") || isImageByName(f.fileName) || isImageByName(f.storagePath)
              );
              imgs.forEach(async (f) => {
                try {
                  const r = await fetch(`/api/submissions/signed-url?path=${encodeURIComponent(f.storagePath)}`);
                  const jj: unknown = await r.json();
                  if (r.ok && isRecord(jj) && jj.success === true) {
                    const data = (jj as { data?: unknown }).data;
                    if (isRecord(data) && typeof data.url === "string") {
                      setSignedUrlByPath((prev) => ({ ...prev, [f.storagePath]: data.url as string }));
                    }
                  }
                } catch {}
              });
            }
          } catch {}
        }
        setActiveTab("review");
      } else {
        // Kiểm tra nộp file kiểu mới
        try {
          const resp = await fetch(`/api/submissions?assignmentId=${assignmentId}`);
          const j: unknown = await resp.json();
          const parsed = resp.ok && isRecord(j) && j.success === true ? parseFileSubmission(j.data) : null;
          if (parsed) {
            setFileSubmission(parsed);
            const imgs = parsed.files.filter(
              (f) => f.mimeType.startsWith("image/") || isImageByName(f.fileName) || isImageByName(f.storagePath)
            );
            // prefetch signed urls
            imgs.forEach(async (f) => {
              try {
                const r = await fetch(`/api/submissions/signed-url?path=${encodeURIComponent(f.storagePath)}`);
                const jj: unknown = await r.json();
                if (r.ok && isRecord(jj) && jj.success === true) {
                  const data = (jj as { data?: unknown }).data;
                  if (isRecord(data) && typeof data.url === "string") {
                    setSignedUrlByPath((prev) => ({ ...prev, [f.storagePath]: data.url as string }));
                  }
                }
              } catch {}
            });
            setActiveTab("review");
          }
        } catch {}
      }
    }

    loadData();
  }, [assignmentId, fetchAssignmentDetail, fetchSubmission]);

  // Nộp kết hợp nội dung + file cho bài ESSAY dạng BOTH
  const handleEssaySubmitCombined = async (content: string) => {
    if (!assignmentId) return;

    if (assignment && submission && submission.grade !== null) {
      showNoMoreAttemptsToast();
      return;
    }

    const trimmed = content.trim();
    const hasText = !!trimmed;
    const hasFiles = filePanelRef.current?.hasFiles() ?? false;

    if (!hasText && !hasFiles) {
      toast({
        title: "Lỗi",
        description: "Bạn cần nhập nội dung hoặc chọn ít nhất một tệp trước khi nộp.",
        variant: "destructive",
      });
      return;
    }

    try {
      let result: SubmissionResponse | null = null;

      if (hasText) {
        result = await submitAssignment(assignmentId, { content: trimmed });
      }

      if (hasFiles) {
        await filePanelRef.current?.submitFiles();
      }

      toast({
        title: "Nộp bài thành công",
        description: hasText && hasFiles
          ? "Đã nộp cả nội dung và tệp đính kèm."
          : hasText
          ? "Đã nộp nội dung bài làm."
          : "Đã nộp tệp bài làm.",
        variant: "success",
      });

      const submissionData = await fetchSubmission(assignmentId);
      if (submissionData) {
        setSubmission(submissionData);
        setActiveTab("review");
      }
    } catch (e) {
      toast({
        title: "Nộp bài thất bại",
        description: "Không thể nộp bài tập. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Xử lý submit essay
  const handleEssaySubmit = async (content: string) => {
    if (!assignmentId) return;

    if (assignment && submission && submission.grade !== null) {
      showNoMoreAttemptsToast();
      return;
    }

    const result = await submitAssignment(assignmentId, { content });

    if (result) {
      toast({
        title: "Nộp bài thành công",
        description: "Bài tập của bạn đã được nộp",
        variant: "success",
      });
      // Reload submission
      const submissionData = await fetchSubmission(assignmentId);
      if (submissionData) {
        setSubmission(submissionData);
        setActiveTab("review");
      }
    } else {
      toast({
        title: "Nộp bài thất bại",
        description: "Không thể nộp bài tập. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Xử lý submit quiz
  const handleQuizSubmit = async (
    answers: Array<{ questionId: string; optionIds: string[] }>,
    presentation?: { questionOrder: string[]; optionOrder: Record<string, string[]>; seed?: number | string; versionHash?: string }
  ) => {
    if (!assignmentId) return;

    if (assignment && !(assignment.allowNewAttempt ?? true)) {
      showNoMoreAttemptsToast();
      return;
    }

    const payload: SubmitAssignmentRequest = presentation ? { answers, presentation } : { answers };
    const result = await submitAssignment(assignmentId, payload);

    if (result) {
      const message =
        result.grade !== null
          ? `Nộp bài thành công! Điểm của bạn: ${result.grade.toFixed(1)}/10`
          : "Nộp bài thành công";
      toast({
        title: "Nộp bài thành công",
        description: message,
        variant: "success",
      });
      // Reload submission
      const submissionData = await fetchSubmission(assignmentId);
      if (submissionData) {
        setSubmission(submissionData);
        setActiveTab("review");
      }
    } else {
      toast({
        title: "Nộp bài thất bại",
        description: "Không thể nộp bài tập. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Xử lý update submission
  const handleUpdateSubmission = async (
    content?: string,
    answers?: Array<{ questionId: string; optionIds: string[] }>
  ) => {
    if (!assignmentId) return;

    let result: SubmissionResponse | null = null;

    if (assignment?.type === "ESSAY" && content) {
      result = await updateSubmission(assignmentId, { content });
    } else if (assignment?.type === "QUIZ" && answers) {
      // Update quiz - API sẽ nhận answers và tự convert
      result = await updateSubmission(assignmentId, { answers });
    }

    if (result) {
      toast({
        title: "Cập nhật thành công",
        description: "Bài làm của bạn đã được cập nhật",
        variant: "success",
      });
      // Reload assignment và submission
      const [assignmentData, submissionData] = await Promise.all([
        fetchAssignmentDetail(assignmentId),
        fetchSubmission(assignmentId),
      ]);
      if (assignmentData) {
        setAssignment(assignmentData);
      }
      if (submissionData) {
        setSubmission(submissionData);
      }
    } else {
      toast({
        title: "Cập nhật thất bại",
        description: "Không thể cập nhật bài làm. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Bài tập", href: "/dashboard/student/assignments" },
    { label: assignment?.title || "Chi tiết", href: `/dashboard/student/assignments/${assignmentId}` },
  ];

  if (isLoading && !assignment) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbItems} className="mb-2" color="green" />
        <div className="text-center py-12 text-muted-foreground animate-pulse">
          Đang tải chi tiết bài tập...
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbItems} className="mb-2" color="green" />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6 text-rose-700">
          <h3 className="font-semibold mb-2">Lỗi tải chi tiết bài tập</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button
            onClick={() => {
              fetchAssignmentDetail(assignmentId);
            }}
            size="sm"
            variant="outline"
            color="green"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbItems} className="mb-2" color="green" />
        <div className="text-center py-12 text-muted-foreground">
          Không tìm thấy bài tập
        </div>
      </div>
    );
  }

  const hasSubmission = submission !== null || !!fileSubmission;
  const canEdit = !!submission && submission.grade === null; // Chỉ edit được nếu chưa chấm
  const now = new Date();
  const openAt = assignment.openAt ? new Date(assignment.openAt) : null;
  const lockAt = assignment.lockAt ? new Date(assignment.lockAt) : (assignment.dueDate ? new Date(assignment.dueDate) : null);
  const notOpened = openAt ? now < openAt : false;
  const locked = lockAt ? now > lockAt : false;
  const workDisabled = (notOpened || locked) && !canEdit;

  const quizReadonly =
    assignment.type === "QUIZ" &&
    !(assignment.allowNewAttempt ?? true);

  const headerSubmission = submission
    ? submission
    : fileSubmission
      ? {
          id: fileSubmission.id,
          submittedAt: new Date().toISOString(),
          grade: null,
          feedback: null,
          attempt: null,
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb items={breadcrumbItems} color="green" />
        <BackButton />
      </div>

      <AssignmentDetailHeader
        assignment={assignment}
        submission={headerSubmission}
      />

      {attachments.length > 0 && (
        <div className="bg-card/90 rounded-2xl border border-border shadow-sm p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold text-sm sm:text-base text-foreground">
            Tài liệu đính kèm từ giáo viên
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {attachments.map((f) => (
              <a
                key={f.id}
                href={f.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs sm:text-sm text-foreground hover:bg-muted/60 hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="font-medium truncate" title={f.name}>
                  {f.name}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground truncate">
                  {f.mimeType}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "work" | "review")}
      >
        <TabsList className="mb-6 inline-flex rounded-full bg-green-100/60 px-1 py-1 border border-green-200 text-green-700">
          <TabsTrigger
            value="work"
            disabled={workDisabled}
            className="px-4 py-1.5 text-xs sm:text-sm rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:bg-background data-[state=active]:text-green-700 data-[state=active]:shadow-sm"
          >
            {hasSubmission && canEdit ? "Chỉnh sửa bài làm" : "Làm bài"}
          </TabsTrigger>
          {hasSubmission && (
            <TabsTrigger
              value="review"
              className="px-4 py-1.5 text-xs sm:text-sm rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:bg-background data-[state=active]:text-green-700 data-[state=active]:shadow-sm"
            >
              Xem bài nộp
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="work">
          {quizReadonly ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-6 text-sm">
              <div className="font-semibold mb-1">Bạn đã hoàn thành bài trắc nghiệm này</div>
              <p>
                Bài đã được chấm điểm và bạn không thể làm lại. Hãy xem chi tiết kết quả ở tab
                {" "}
                <span className="font-semibold">"Xem bài nộp"</span>.
              </p>
            </div>
          ) : workDisabled ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-6">
              <div className="font-semibold mb-1">Hiện chưa thể làm bài</div>
              <div className="text-sm">{(openAt && new Date() < openAt) ? `Bài sẽ mở lúc ${openAt.toLocaleString("vi-VN")}` : (lockAt ? `Bài đã khoá lúc ${lockAt.toLocaleString("vi-VN")}` : "Không khả dụng")}</div>
            </div>
          ) : assignment.type === "ESSAY" ? (
            (() => {
              const format = assignment.submissionFormat ?? "BOTH";
              const hasPrompt = Array.isArray(assignment.questions) && assignment.questions.length > 0;
              const promptPanel = hasPrompt ? (
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <h3 className="text-base font-semibold text-foreground mb-4">
                    Đề bài
                  </h3>
                  <div className="space-y-3">
                    {assignment.questions.map((q, idx) => (
                      <div key={q.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <RichTextPreview
                          html={q.content || ""}
                          className="flex-1 text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;

              if (format === "TEXT") {
                return (
                  <div className="space-y-6">
                    {promptPanel}
                    <EssayAssignmentForm
                      assignmentId={assignmentId}
                      onSubmit={canEdit ? (c) => handleUpdateSubmission(c) : handleEssaySubmit}
                      initialContent={submission?.content || ""}
                      isLoading={isLoading}
                      dueDate={assignment.dueDate}
                      isSubmitted={!!submission && canEdit}
                      openAt={assignment.openAt ?? null}
                      lockAt={assignment.lockAt ?? null}
                      timeLimitMinutes={assignment.timeLimitMinutes ?? null}
                    />
                  </div>
                );
              }
              if (format === "FILE") {
                return (
                  <div className="space-y-6">
                    {promptPanel}
                    <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
                      <p className="text-sm text-muted-foreground">Bạn cần nộp tệp theo yêu cầu của giáo viên.</p>
                      <FileSubmissionPanel assignmentId={assignmentId} />
                    </div>
                  </div>
                );
              }
              return (
                <div className="space-y-6">
                  {promptPanel}
                  <div className="bg-card rounded-xl p-6 shadow border border-border space-y-6">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">Bạn có thể chọn nộp văn bản hoặc nộp tệp. Chỉ cần chọn một hình thức phù hợp.</div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold">Nộp văn bản</h4>
                        <EssayAssignmentForm
                          assignmentId={assignmentId}
                          onSubmit={
                            !submission
                              ? handleEssaySubmitCombined
                              : canEdit
                              ? (c) => handleUpdateSubmission(c)
                              : handleEssaySubmit
                          }
                          initialContent={submission?.content || ""}
                          isLoading={isLoading}
                          dueDate={assignment.dueDate}
                          isSubmitted={!!submission && canEdit}
                          openAt={assignment.openAt ?? null}
                          lockAt={assignment.lockAt ?? null}
                          timeLimitMinutes={assignment.timeLimitMinutes ?? null}
                          allowEmptyContent
                        />
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold">Nộp tệp</h4>
                        <FileSubmissionPanel ref={filePanelRef} assignmentId={assignmentId} showSubmitButton={false} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <QuizAssignmentForm
              assignment={assignment}
              onSubmit={
                hasSubmission && canEdit
                  ? async (answers) => {
                      await handleUpdateSubmission(undefined, answers);
                    }
                  : handleQuizSubmit
              }
              initialAnswers={
                submission && assignment.type === "QUIZ"
                  ? (() => {
                      try {
                        return JSON.parse(submission?.content ?? "[]");
                      } catch {
                        return [];
                      }
                    })()
                  : undefined
              }
              isLoading={isLoading}
              dueDate={assignment.dueDate}
              isSubmitted={hasSubmission}
            />
          )}
        </TabsContent>

        <TabsContent value="review">
          {fileSubmission ? (
            <div className="bg-card rounded-xl p-6 shadow border border-border">
              <h3 className="font-semibold mb-3 text-foreground">Tệp đã nộp</h3>
              {fileSubmission.files?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {fileSubmission.files.map((f, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-2 bg-muted/40">
                      <div className="aspect-video bg-background flex items-center justify-center overflow-hidden rounded">
                        {f.mimeType?.startsWith("image/") ? (
                          signedUrlByPath[f.storagePath] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={signedUrlByPath[f.storagePath]} alt={f.fileName} className="object-cover w-full h-full" />
                          ) : (
                            <div className="text-xs text-muted-foreground">Không có bản xem trước</div>
                          )
                        ) : (
                          <div className="text-xs text-muted-foreground">{f.fileName}</div>
                        )}
                      </div>
                      <div className="mt-2 text-xs truncate text-foreground" title={f.fileName}>{f.fileName}</div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(f.storagePath, f.fileName)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                            <path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1z" />
                            <path d="M5 18a2 2 0 002 2h10a2 2 0 002-2v-1a1 1 0 112 0v1a4 4 0 01-4 4H7a4 4 0 01-4-4v-1a1 1 0 112 0v1z" />
                          </svg>
                          Tải xuống
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Chưa có tệp nào.</div>
              )}
            </div>
          ) : submission ? (
            <SubmissionReview assignment={assignment} submission={submission} />
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Assignment Comments - Chỉ hiển thị cho ESSAY */}
      {assignment.type === "ESSAY" && (
        <div className="mt-6">
          <AssignmentComments assignment={assignment} />
        </div>
      )}
    </div>
  );
}