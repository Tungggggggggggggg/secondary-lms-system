import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export default function LoadingSpinner({ className, label = "Đang tải" }: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <Loader2 className="h-5 w-5 animate-spin text-gray-600" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
