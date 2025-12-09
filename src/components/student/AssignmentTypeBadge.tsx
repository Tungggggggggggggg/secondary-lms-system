"use client";

import { AssignmentTypeBadgeShared } from "@/components/shared";

interface Props { type: "ESSAY" | "QUIZ" | string }

export default function AssignmentTypeBadge({ type }: Props) {
  return <AssignmentTypeBadgeShared type={type} variant="student" />;
}
