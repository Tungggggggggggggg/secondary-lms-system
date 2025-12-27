import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudentStatus = "active" | "warning" | "inactive";

interface StudentStatusBadgeProps {
  status: StudentStatus;
  className?: string;
}

export default function StudentStatusBadge({ status, className }: StudentStatusBadgeProps) {
  let label: string = status;
  let baseClass =
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border";
  let colorClass = "";
  let Icon = CheckCircle2;

  if (status === "active") {
    label = "Hoạt động tốt";
    colorClass = "bg-green-50 text-green-700 border-green-200";
    Icon = CheckCircle2;

  // Các trạng thái khác (warning, inactive) không hiển thị badge nữa
  } else {
    return null;
  }

  return (
    <span className={cn(baseClass, colorClass, className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
}
