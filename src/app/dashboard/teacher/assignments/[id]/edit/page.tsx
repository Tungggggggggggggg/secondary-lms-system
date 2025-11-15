"use client";
import { useParams } from "next/navigation";
import EditAssignmentBuilder from "@/components/teacher/assignments/EditAssignmentBuilder";

// Trang chỉnh sửa bài tập sử dụng giao diện mới (Tabs + Sticky Action Bar)
export default function AssignmentEditPage() {
  const params = useParams() as { id: string };
  const { id } = params;
  return <EditAssignmentBuilder assignmentId={id} />;
}
