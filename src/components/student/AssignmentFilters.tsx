"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Value {
  status: "all" | "pending" | "submitted" | "overdue";
  query: string;
  sort: "due_asc" | "recent" | "grade_desc";
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
  color?: "green" | "blue" | "amber";
}

export default function AssignmentFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Tabs value={value.status} onValueChange={(v) => onChange({ ...value, status: v as Value["status"] })}>
        <TabsList className="grid grid-cols-4 bg-green-100/60 text-green-700">
          <TabsTrigger className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500" value="all">Tất cả</TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500" value="pending">Chưa nộp</TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500" value="submitted">Đã nộp</TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-green-200 data-[state=active]:text-green-900 focus-visible:ring-green-500" value="overdue">Quá hạn</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          type="text"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder="Tìm kiếm bài tập..."
          className="flex-1"
          color="green"
        />
        <Select
          value={value.sort}
          onChange={(e) => onChange({ ...value, sort: e.target.value as Value["sort"] })}
          color="green"
        >
          <option value="due_asc">Sắp hết hạn</option>
          <option value="recent">Mới nhất</option>
          <option value="grade_desc">Điểm cao</option>
        </Select>
      </div>
    </div>
  );
}
