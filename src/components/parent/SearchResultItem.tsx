"use client";

import { Mail, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchResultItemProps {
  student: {
    id: string;
    email: string;
    fullname: string | null;
    classrooms?: Array<{ name: string }>;
  };
  isLinked?: boolean;
  hasExistingRequest?: boolean;
  onSendRequest?: (studentId: string) => void;
  isLoading?: boolean;
}

export default function SearchResultItem({
  student,
  isLinked = false,
  hasExistingRequest = false,
  onSendRequest,
  isLoading = false,
}: SearchResultItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border-l-4 border-l-transparent hover:border-l-amber-500 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-102 group">
      <div className="flex-1">
        <div className="font-semibold text-foreground group-hover:text-amber-700 transition-colors duration-300">
          {student.fullname || "Học sinh"}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
          <Mail className="h-3 w-3" />
          {student.email}
        </div>
        {student.classrooms && student.classrooms.length > 0 && (
          <div className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">Lớp:</span> {student.classrooms.map((c) => c.name).join(", ")}
          </div>
        )}
      </div>
      <div>
        {isLinked ? (
          <Button size="default" variant="outline" disabled className="border-green-300 text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Đã liên kết
          </Button>
        ) : hasExistingRequest ? (
          <Button size="default" variant="outline" disabled className="border-orange-300 text-orange-600">
            <Clock className="h-4 w-4 mr-1" />
            Đang chờ
          </Button>
        ) : (
          <Button
            size="default"
            color="amber"
            onClick={() => onSendRequest?.(student.id)}
            disabled={isLoading}
          >
            Gửi yêu cầu
          </Button>
        )}
      </div>
    </div>
  );
}
