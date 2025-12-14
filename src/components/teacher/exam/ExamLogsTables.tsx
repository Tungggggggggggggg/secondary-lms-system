"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

type Severity = "low" | "medium" | "high" | "info";

interface SummaryByTypeRow {
  type: string;
  count: number;
  severity: Severity;
}

interface SummaryByStudentAttemptRow {
  studentId: string;
  fullname: string;
  attempt: number | null;
  count: number;
  high: number;
  medium: number;
}

interface LogEvent {
  id: string;
  createdAt: string;
  studentId: string;
  attempt: number | null;
  eventType: string;
  metadata: unknown;
  student?: { id: string; fullname: string; email: string };
}

interface ExamLogsTablesProps {
  events: LogEvent[];
  summaryByType: SummaryByTypeRow[];
  summaryByStudentAttempt: SummaryByStudentAttemptRow[];
}

export default function ExamLogsTables({
  events,
  summaryByType,
  summaryByStudentAttempt,
}: ExamLogsTablesProps) {
  if (!events.length) return null;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Tổng hợp theo loại sự kiện</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Loại</th>
                <th className="py-2 pr-4">Mức độ</th>
                <th className="py-2 pr-4">Số sự kiện</th>
              </tr>
            </thead>
            <tbody>
              {summaryByType.map((row) => (
                <tr key={row.type} className="border-b">
                  <td className="py-2 pr-4">{row.type}</td>
                  <td className="py-2 pr-4">
                    {row.severity === "high" ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" /> Cao
                      </Badge>
                    ) : row.severity === "medium" ? (
                      <Badge variant="warning">Trung bình</Badge>
                    ) : row.severity === "info" ? (
                      <Badge>Thông tin</Badge>
                    ) : (
                      <Badge variant="outline">Thấp</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-4">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Tổng hợp theo học sinh/attempt</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Học sinh</th>
                <th className="py-2 pr-4">Attempt</th>
                <th className="py-2 pr-4">Số sự kiện</th>
                <th className="py-2 pr-4">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {summaryByStudentAttempt.map((row) => {
                const flagged = row.high >= 1 || row.high + row.medium >= 3;
                return (
                  <tr
                    key={`${row.studentId}|${row.attempt}`}
                    className={`border-b ${flagged ? "bg-red-50" : ""}`}
                  >
                    <td className="py-2 pr-4">
                      {row.fullname} {" "}
                      <span className="text-gray-500 text-xs">({row.studentId})</span>
                    </td>
                    <td className="py-2 pr-4">{row.attempt ?? "-"}</td>
                    <td className="py-2 pr-4">{row.count}</td>
                    <td className="py-2 pr-4">
                      {flagged ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" /> Nghi ngờ cao
                        </Badge>
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Chi tiết sự kiện</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Thời gian</th>
                <th className="py-2 pr-4">Học sinh</th>
                <th className="py-2 pr-4">Attempt</th>
                <th className="py-2 pr-4">Sự kiện</th>
                <th className="py-2 pr-4">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b align-top">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    {ev.student?.fullname || ev.studentId}{" "}
                    <span className="text-gray-500 text-xs">({ev.studentId})</span>
                  </td>
                  <td className="py-2 pr-4">{ev.attempt ?? "-"}</td>
                  <td className="py-2 pr-4">{ev.eventType}</td>
                  <td className="py-2 pr-4 max-w-[360px] whitespace-pre-wrap break-words text-xs">
                    {ev.metadata ? JSON.stringify(ev.metadata) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
