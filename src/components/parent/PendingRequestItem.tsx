"use client";

import { Mail, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/admin/format-date";

interface PendingRequestItemProps {
  request: {
    id: string;
    student: {
      id: string;
      email: string;
      fullname: string;
    };
    createdAt: string;
  };
  onCancel?: (requestId: string) => void;
  isLoading?: boolean;
}

export default function PendingRequestItem({
  request,
  onCancel,
  isLoading = false,
}: PendingRequestItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border-l-4 border-l-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-102 group bg-orange-50/30">
      <div className="flex-1">
        <div className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">
          {request.student.fullname}
        </div>
        <div className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
          <Mail className="h-3 w-3" />
          {request.student.email}
        </div>
        <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Gửi lúc: {formatDate(request.createdAt, "medium")}
        </div>
      </div>
      <Button
        size="default"
        variant="outline"
        color="violet"
        onClick={() => onCancel?.(request.id)}
        disabled={isLoading}
        className="!border-red-300 !text-red-600 hover:!bg-red-50 hover:!border-red-400"
      >
        <X className="h-4 w-4 mr-1" />
        Hủy
      </Button>
    </div>
  );
}
