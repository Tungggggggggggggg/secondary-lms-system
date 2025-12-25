"use client";

import { AssignmentTypeBadge as SharedAssignmentTypeBadge } from "@/components/shared";

interface Props { type: "ESSAY" | "QUIZ" | string }

export default function AssignmentTypeBadge({ type }: Props) {
  return <SharedAssignmentTypeBadge type={type} variant="student" />;
}
