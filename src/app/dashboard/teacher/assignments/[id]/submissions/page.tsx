"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import { PageHeader } from "@/components/shared";
import SubmissionsList from "@/components/teacher/submissions/SubmissionsList";

/**
 * Trang chấm bài assignment submissions
 */
export default function AssignmentSubmissionsPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const assignmentId = params.id;

  const [assignmentType, setAssignmentType] = useState<"ESSAY" | "QUIZ">("ESSAY");

  // Fetch assignment type để hiển thị đúng UI
  useEffect(() => {
    async function fetchAssignmentType() {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}`, { cache: "no-store" });
        const result = await res.json();
        if (result.success && result.data) {
          setAssignmentType(result.data.type || "ESSAY");
        }
      } catch (err) {
        console.error("[SubmissionsPage] Lỗi khi lấy assignment type:", err);
      }
    }
    if (assignmentId) fetchAssignmentType();
  }, [assignmentId]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Bài tập", href: "/dashboard/teacher/assignments" },
    { label: "Chấm bài", href: `#` },
  ];

  return (
    <div className="px-6 py-4">
      <div className="mb-4">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <PageHeader
        title="Chấm bài tập"
        subtitle="Xem và chấm điểm các bài nộp của học sinh"
        role="teacher"
        actions={<BackButton />}
      />

      <SubmissionsList
        assignmentId={assignmentId}
        assignmentType={assignmentType}
      />
    </div>
  );
}
