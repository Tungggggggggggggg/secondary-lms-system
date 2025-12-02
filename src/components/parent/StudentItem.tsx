"use client";

import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentItemProps {
  student: {
    id: string;
    fullname: string;
  };
  teacherId: string;
  classroomId: string;
  onMessageTeacher: (teacherId: string, classroomId: string, studentId: string) => void;
  sendingKey: string | null;
}

export default function StudentItem({
  student,
  teacherId,
  classroomId,
  onMessageTeacher,
  sendingKey,
}: StudentItemProps) {
  const key = `${teacherId}-${classroomId}-${student.id}`;
  const isSending = sendingKey === key;

  const initial = student.fullname?.charAt(0).toUpperCase() || "S";

  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-white/60 hover:bg-amber-100/50 transition-all duration-300 hover:shadow-sm group border border-amber-100/50 hover:border-amber-300/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-gray-500 font-semibold">Con:</div>
          <div className="font-semibold text-gray-900 group-hover:text-amber-800 transition-colors duration-300 truncate text-sm">
            {student.fullname}
          </div>
        </div>
      </div>
      <Button
        color="amber"
        size="sm"
        onClick={() => onMessageTeacher(teacherId, classroomId, student.id)}
        disabled={isSending}
        className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline text-xs">Mở...</span>
          </>
        ) : (
          <>
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Nhắn</span>
          </>
        )}
      </Button>
    </div>
  );
}
