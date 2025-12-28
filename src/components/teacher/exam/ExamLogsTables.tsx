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
  student?: { id: string; fullname: string };
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
        <div className="space-y-2">
          {summaryByType.map((row) => (
            <div key={row.type} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate" title={row.type}>
                    {row.type}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <div>
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
                  </div>
                  <div className="text-sm font-semibold">{row.count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Tổng hợp theo học sinh/attempt</h4>
        <div className="space-y-2">
          {summaryByStudentAttempt.map((row) => {
            const flagged = row.high >= 1 || row.high + row.medium >= 3;
            return (
              <div
                key={`${row.studentId}|${row.attempt}`}
                className={`rounded-lg border border-border p-3 ${flagged ? "bg-red-50" : "bg-card"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate" title={row.fullname}>
                      {row.fullname}{" "}
                      <span className="text-gray-500 text-xs">({row.studentId})</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Attempt: {row.attempt ?? "-"}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold">{row.count} sự kiện</div>
                    <div className="mt-1">
                      {flagged ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" /> Nghi ngờ cao
                        </Badge>
                      ) : (
                        <Badge variant="outline">-</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Chi tiết sự kiện</h4>
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {ev.eventType}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(ev.createdAt).toLocaleString()} • Attempt: {ev.attempt ?? "-"}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {ev.student?.fullname || ev.studentId}{" "}
                    <span className="text-gray-500 text-xs">({ev.studentId})</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {ev.metadata ? JSON.stringify(ev.metadata) : "-"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
