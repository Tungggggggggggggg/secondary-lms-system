"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useStudentAssignments,
  StudentAssignmentDetail,
  SubmissionResponse,
} from "@/hooks/use-student-assignments";
import { useToast } from "@/hooks/use-toast";
import AssignmentDetailHeader from "@/components/student/assignments/AssignmentDetailHeader";
import EssayAssignmentForm from "@/components/student/assignments/EssayAssignmentForm";
import QuizAssignmentForm from "@/components/student/assignments/QuizAssignmentForm";
import SubmissionReview from "@/components/student/assignments/SubmissionReview";
import FileSubmissionPanel from "@/components/student/assignments/FileSubmissionPanel";
import AssignmentComments from "@/components/student/assignments/AssignmentComments";
// Helpers for image preview signed URLs
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const publicUrlForStored = (path: string) => {
  const clean = path.replace(/^\//, "");
  if (SUPABASE_URL) return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clean}`;
  return `/storage/v1/object/public/${BUCKET}/${clean}`;
};
const isImageByName = (name?: string) => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].some((ext) => lower.endsWith(ext));
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

  const router = useRouter();

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
          url = publicUrlForStored(path);
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
        const j = await r.json();
        if (r.ok && j?.success && Array.isArray(j.data)) {
          setAttachments(j.data.map((f: any) => ({ id: f.id, name: f.name, url: f.url, mimeType: f.mimeType })));
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
            const j = await resp.json();
            if (resp.ok && j?.success && j.data) {
              setFileSubmission(j.data);
              const imgs = (j.data.files || []).filter((f: any) => f?.mimeType?.startsWith("image/") || isImageByName(f?.fileName) || isImageByName(f?.storagePath));
              imgs.forEach(async (f: any) => {
                try {
                  const r = await fetch(`/api/submissions/signed-url?path=${encodeURIComponent(f.storagePath)}`);
                  const jj = await r.json();
                  if (r.ok && jj?.success && jj.data?.url) {
                    setSignedUrlByPath((prev) => ({ ...prev, [f.storagePath]: jj.data.url }));
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
          const j = await resp.json();
          if (resp.ok && j?.success && j.data) {
            setFileSubmission(j.data);
            const imgs = (j.data.files || []).filter((f: any) => f?.mimeType?.startsWith("image/") || isImageByName(f?.fileName) || isImageByName(f?.storagePath));
            // prefetch signed urls
            imgs.forEach(async (f: any) => {
              try {
                const r = await fetch(`/api/submissions/signed-url?path=${encodeURIComponent(f.storagePath)}`);
                const jj = await r.json();
                if (r.ok && jj?.success && jj.data?.url) {
                  setSignedUrlByPath((prev) => ({ ...prev, [f.storagePath]: jj.data.url }));
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

  // Xử lý submit essay
  const handleEssaySubmit = async (content: string) => {
    if (!assignmentId) return;

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

    const payload: any = presentation ? { answers, presentation } : { answers };
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
      <div className="max-w-5xl mx-auto space-y-4">
        <Breadcrumb items={breadcrumbItems} className="mb-2" />
        <div className="text-center py-12 text-slate-500 animate-pulse">
          Đang tải chi tiết bài tập...
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Breadcrumb items={breadcrumbItems} className="mb-2" />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6 text-rose-700">
          <h3 className="font-semibold mb-2">Lỗi tải chi tiết bài tập</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button
            onClick={() => {
              fetchAssignmentDetail(assignmentId);
            }}
            size="sm"
            className="bg-rose-600 hover:bg-rose-700"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Breadcrumb items={breadcrumbItems} className="mb-2" />
        <div className="text-center py-12 text-slate-400">
          Không tìm thấy bài tập
        </div>
      </div>
    );
  }

  const hasSubmission = submission !== null || !!fileSubmission;
  const canEdit = !!submission && submission.grade === null; // Chỉ edit được nếu chưa chấm
  const now = new Date();
  const openAt = (assignment as any).openAt ? new Date((assignment as any).openAt) : null;
  const lockAt = (assignment as any).lockAt ? new Date((assignment as any).lockAt) : (assignment.dueDate ? new Date(assignment.dueDate) : null);
  const notOpened = openAt ? now < openAt : false;
  const locked = lockAt ? now > lockAt : false;
  const workDisabled = (notOpened || locked) && !canEdit;

  

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb items={breadcrumbItems} />
        <BackButton href="/dashboard/student/assignments" />
      </div>

      <AssignmentDetailHeader
        assignment={assignment}
        submission={
          submission
            ? (submission as any)
            : fileSubmission
            ? ({
                id: "file",
                submittedAt: new Date().toISOString(),
                grade: (submission as any)?.grade ?? null,
                feedback: (submission as any)?.feedback ?? null,
              } as any)
            : undefined
        }
      />

      {attachments.length > 0 && (
        <div className="bg-white/90 rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold text-sm sm:text-base text-slate-900">
            Tài liệu đính kèm từ giáo viên
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {attachments.map((f) => (
              <a
                key={f.id}
                href={f.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 hover:border-slate-200 transition-colors"
              >
                <span className="font-medium truncate" title={f.name}>
                  {f.name}
                </span>
                <span className="mt-1 text-[11px] text-slate-500 truncate">
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
        <TabsList className="mb-6 inline-flex rounded-full bg-slate-100/80 px-1 py-1 border border-slate-200">
          <TabsTrigger
            value="work"
            disabled={workDisabled}
            className="px-4 py-1.5 text-xs sm:text-sm rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm"
          >
            {hasSubmission && canEdit ? "Chỉnh sửa bài làm" : "Làm bài"}
          </TabsTrigger>
          {hasSubmission && (
            <TabsTrigger
              value="review"
              className="px-4 py-1.5 text-xs sm:text-sm rounded-full data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm"
            >
              Xem bài nộp
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="work">
          {workDisabled ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-6">
              <div className="font-semibold mb-1">Hiện chưa thể làm bài</div>
              <div className="text-sm">{(openAt && new Date() < openAt) ? `Bài sẽ mở lúc ${openAt.toLocaleString("vi-VN")}` : (lockAt ? `Bài đã khoá lúc ${lockAt.toLocaleString("vi-VN")}` : "Không khả dụng")}</div>
            </div>
          ) : assignment.type === "ESSAY" ? (
            (() => {
              const format = ((assignment as any).submissionFormat as string) || "BOTH";
              if (format === "TEXT") {
                return (
                  <EssayAssignmentForm
                    assignmentId={assignmentId}
                    onSubmit={canEdit ? (c) => handleUpdateSubmission(c) : handleEssaySubmit}
                    initialContent={submission?.content || ""}
                    isLoading={isLoading}
                    dueDate={assignment.dueDate}
                    isSubmitted={!!submission && canEdit}
                    openAt={(assignment as any).openAt || null}
                    lockAt={(assignment as any).lockAt || null}
                    timeLimitMinutes={(assignment as any).timeLimitMinutes || null}
                  />
                );
              }
              if (format === "FILE") {
                return (
                  <div className="bg-white rounded-xl p-6 shadow space-y-4">
                    <p className="text-sm text-gray-700">Bạn cần nộp tệp theo yêu cầu của giáo viên.</p>
                    <FileSubmissionPanel assignmentId={assignmentId} />
                  </div>
                );
              }
              return (
                <div className="bg-white rounded-xl p-6 shadow space-y-6">
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">Bạn có thể chọn nộp văn bản hoặc nộp tệp. Chỉ cần chọn một hình thức phù hợp.</div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Nộp văn bản</h4>
                      <EssayAssignmentForm
                        assignmentId={assignmentId}
                        onSubmit={canEdit ? (c) => handleUpdateSubmission(c) : handleEssaySubmit}
                        initialContent={submission?.content || ""}
                        isLoading={isLoading}
                        dueDate={assignment.dueDate}
                        isSubmitted={!!submission && canEdit}
                        openAt={(assignment as any).openAt || null}
                        lockAt={(assignment as any).lockAt || null}
                        timeLimitMinutes={(assignment as any).timeLimitMinutes || null}
                      />
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold">Nộp tệp</h4>
                      <FileSubmissionPanel assignmentId={assignmentId} />
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
            <div className="bg-white rounded-xl p-6 shadow">
              <h3 className="font-semibold mb-3">Tệp đã nộp</h3>
              {fileSubmission.files?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {fileSubmission.files.map((f, idx) => (
                    <div key={idx} className="border rounded-lg p-2 bg-gray-50">
                      <div className="aspect-video bg-white flex items-center justify-center overflow-hidden rounded">
                        {f.mimeType?.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={signedUrlByPath[f.storagePath] || publicUrlForStored(f.storagePath)} alt={f.fileName} className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-xs text-gray-500">{f.fileName}</div>
                        )}
                      </div>
                      <div className="mt-2 text-xs truncate" title={f.fileName}>{f.fileName}</div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(f.storagePath, f.fileName)}
                          className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
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
                <div className="text-sm text-gray-600">Chưa có tệp nào.</div>
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

