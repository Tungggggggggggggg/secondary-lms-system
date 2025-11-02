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
import AssignmentComments from "@/components/student/assignments/AssignmentComments";

/**
 * Trang chi tiết assignment cho student
 */
export default function StudentAssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

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

      // Load submission
      const submissionData = await fetchSubmission(assignmentId);
      if (submissionData) {
        setSubmission(submissionData);
        // Nếu đã nộp, mặc định hiển thị tab review
        setActiveTab("review");
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
    answers: Array<{ questionId: string; optionIds: string[] }>
  ) => {
    if (!assignmentId) return;

    const result = await submitAssignment(assignmentId, { answers });

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
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="text-center py-12 text-gray-500 animate-pulse">
          Đang tải chi tiết bài tập...
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lỗi tải chi tiết bài tập</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button
            onClick={() => {
              fetchAssignmentDetail(assignmentId);
            }}
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="text-center py-12 text-gray-400">
          Không tìm thấy bài tập
        </div>
      </div>
    );
  }

  const hasSubmission = submission !== null;
  const canEdit = hasSubmission && submission.grade === null; // Chỉ edit được nếu chưa chấm

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumb items={breadcrumbItems} />
        <BackButton href="/dashboard/student/assignments" />
      </div>

      <AssignmentDetailHeader assignment={assignment} submission={submission || undefined} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "work" | "review")}>
        <TabsList className="mb-6">
          <TabsTrigger value="work" disabled={!hasSubmission && false}>
            {hasSubmission && canEdit ? "Chỉnh sửa bài làm" : "Làm bài"}
          </TabsTrigger>
          {hasSubmission && (
            <TabsTrigger value="review">Xem bài nộp</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="work">
          {assignment.type === "ESSAY" ? (
            <EssayAssignmentForm
              assignmentId={assignmentId}
              onSubmit={hasSubmission && canEdit ? handleUpdateSubmission : handleEssaySubmit}
              initialContent={
                hasSubmission && assignment.type === "ESSAY" ? submission.content : undefined
              }
              isLoading={isLoading}
              dueDate={assignment.dueDate}
              isSubmitted={hasSubmission}
            />
          ) : (
            <QuizAssignmentForm
              assignment={assignment}
              onSubmit={
                hasSubmission && canEdit
                  ? (answers) => handleUpdateSubmission(undefined, answers)
                  : handleQuizSubmit
              }
              initialAnswers={
                hasSubmission && assignment.type === "QUIZ"
                  ? (() => {
                      try {
                        return JSON.parse(submission.content);
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

        {hasSubmission && (
          <TabsContent value="review">
            <SubmissionReview assignment={assignment} submission={submission} />
          </TabsContent>
        )}
      </Tabs>

      {/* Assignment Comments - Hiển thị ở cả 2 tabs */}
      <div className="mt-6">
        <AssignmentComments assignment={assignment} />
      </div>
    </div>
  );
}

