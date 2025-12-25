export type AssignmentDeadlineSource = {
  dueDate?: Date | null;
  lockAt?: Date | null;
};

/**
 * Tính “deadline hiệu lực” của assignment theo rule hệ thống.
 * - Ưu tiên `lockAt` (thường dùng cho QUIZ)
 * - Fallback `dueDate` (thường dùng cho ESSAY)
 */
export function getEffectiveDeadline(source: AssignmentDeadlineSource): Date | null {
  return source.lockAt ?? source.dueDate ?? null;
}

/**
 * Kiểm tra assignment đã quá hạn hay chưa dựa trên deadline hiệu lực.
 * Side effects: none.
 */
export function isAssignmentOverdue(source: AssignmentDeadlineSource, now: Date): boolean {
  const deadline = getEffectiveDeadline(source);
  if (!deadline) return false;
  return deadline.getTime() < now.getTime();
}
