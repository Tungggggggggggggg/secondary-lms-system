"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, WifiOff } from "lucide-react";

export interface MonitorSessionView {
  id: string;
  studentName: string;
  assignmentTitle: string;
  status: string;
  startTime: string;
  timeRemaining: string;
  progress: number;
  currentQuestion: number;
  totalQuestions: number;
  suspiciousActivities: number;
  isOnline: boolean;
}

interface ExamMonitoringListProps {
  sessions: MonitorSessionView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  renderStatusBadge: (status: string) => ReactNode;
}

export default function ExamMonitoringList({
  sessions,
  selectedId,
  onSelect,
  renderStatusBadge,
}: ExamMonitoringListProps) {
  if (!sessions.length) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Chưa có dữ liệu phiên thi real-time để hiển thị.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const isSelected = selectedId === session.id;
        return (
          <div
            key={session.id}
            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
              isSelected ? "bg-blue-50 border-blue-500 shadow-sm" : "bg-white hover:bg-gray-50"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
            onClick={() => onSelect(session.id)}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(session.id);
              }
            }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.isOnline ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{session.studentName}</h3>
                    {isSelected && (
                      <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 bg-blue-50">
                        Đang điều khiển
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{session.assignmentTitle}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Tiến độ</p>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${session.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{session.progress}%</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">Thời gian còn lại</p>
                <p className="font-medium">{session.timeRemaining}</p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">Câu hỏi</p>
                <p className="font-medium">
                  {session.currentQuestion}/{session.totalQuestions}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">Cảnh báo</p>
                <Badge variant={session.suspiciousActivities > 0 ? "destructive" : "outline"}>
                  {session.suspiciousActivities}
                </Badge>
              </div>

              <div>{renderStatusBadge(session.status)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
