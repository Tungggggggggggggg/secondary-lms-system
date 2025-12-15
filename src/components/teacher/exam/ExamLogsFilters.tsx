"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type AssignmentOption = {
  id: string;
  title: string;
};

interface ExamLogsFiltersProps {
  assignmentId: string;
  assignments?: AssignmentOption[];
  assignmentDisabled?: boolean;
  studentId: string;
  attempt: string;
  from: string;
  to: string;
  limit: string;
  loading: boolean;
  canSubmit: boolean;
  onAssignmentIdChange: (value: string) => void;
  onStudentIdChange: (value: string) => void;
  onAttemptChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onLimitChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export default function ExamLogsFilters({
  assignmentId,
  assignments,
  assignmentDisabled,
  studentId,
  attempt,
  from,
  to,
  limit,
  loading,
  canSubmit,
  onAssignmentIdChange,
  onStudentIdChange,
  onAttemptChange,
  onFromChange,
  onToChange,
  onLimitChange,
  onSubmit,
  onClear,
}: ExamLogsFiltersProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <Label htmlFor="assignmentId">Bài Quiz</Label>
          {assignments && assignments.length > 0 ? (
            <Select
              id="assignmentId"
              value={assignmentId}
              onChange={(e) => onAssignmentIdChange(e.target.value)}
              disabled={loading || assignmentDisabled}
            >
              <option value="">Chọn bài Quiz...</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id="assignmentId"
              placeholder="assignment id"
              value={assignmentId}
              onChange={(e) => onAssignmentIdChange(e.target.value)}
            />
          )}
        </div>
        <div className="md:col-span-4">
          <Label htmlFor="studentId">Student ID (tuỳ chọn)</Label>
          <Input
            id="studentId"
            placeholder="student id"
            value={studentId}
            onChange={(e) => onStudentIdChange(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="attempt">Attempt (tuỳ chọn)</Label>
          <Input
            id="attempt"
            placeholder="VD: 1"
            value={attempt}
            onChange={(e) => onAttemptChange(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="limit">Số dòng tối đa</Label>
          <Input
            id="limit"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => onLimitChange(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="from">Từ thời điểm (tuỳ chọn)</Label>
          <Input
            id="from"
            type="datetime-local"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="to">Đến thời điểm (tuỳ chọn)</Label>
          <Input
            id="to"
            type="datetime-local"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <Button onClick={onSubmit} disabled={!canSubmit || loading}>
          {loading ? "Đang tải..." : "Tải logs"}
        </Button>
        <Button variant="outline" onClick={onClear}>
          Xoá kết quả
        </Button>
      </div>
    </>
  );
}
