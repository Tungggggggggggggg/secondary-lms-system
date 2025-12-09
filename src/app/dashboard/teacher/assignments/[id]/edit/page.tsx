"use client";
import { useParams } from "next/navigation";
import AssignmentWizard from "@/components/teacher/assignments/AssignmentWizard";

// Trang chỉnh sửa bài tập sử dụng giao diện mới (Tabs + Sticky Action Bar)
export default function AssignmentEditPage() {
  const params = useParams() as { id: string };
  const { id } = params;
  return <AssignmentWizard mode="edit" assignmentId={id} />;
}
