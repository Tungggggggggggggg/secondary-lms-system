"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
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
        const res = await fetch(`/api/assignments/${assignmentId}`);
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
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumb items={breadcrumbItems} />
        <BackButton
          href={`/dashboard/teacher/assignments/${assignmentId}`}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Chấm bài tập
        </h1>
        <p className="text-gray-600">
          Xem và chấm điểm các bài nộp của học sinh
        </p>
      </div>

      <SubmissionsList
        assignmentId={assignmentId}
        assignmentType={assignmentType}
      />
    </div>
  );
}
