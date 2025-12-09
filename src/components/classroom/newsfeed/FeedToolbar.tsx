"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedSort = "new" | "comments" | "attachments";
export type FeedToolbarValue = { q: string; sort: FeedSort; hasAttachment: boolean };

type Props = {
  value: FeedToolbarValue;
  onChange: (v: FeedToolbarValue) => void;
  className?: string;
};

export default function FeedToolbar({ value, onChange, className }: Props) {
  const [qInput, setQInput] = useState(value.q ?? "");

  useEffect(() => {
    const t = setTimeout(() => onChange({ ...value, q: qInput }), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center", className)}>
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Tìm trong bảng tin..."
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          color="blue"
          className="pl-10 h-12"
          aria-label="Tìm kiếm bài đăng"
        />
      </div>

      <label className="flex items-center gap-2 justify-start md:justify-center h-12 rounded-xl px-3 border border-gray-200 bg-white">
        <Checkbox
          checked={!!value.hasAttachment}
          onCheckedChange={(checked) => onChange({ ...value, hasAttachment: !!checked })}
          aria-label="Chỉ hiện bài có đính kèm"
        />
        <span className="text-sm text-slate-700">Có đính kèm</span>
      </label>

      <Select
        value={value.sort}
        onChange={(e) => onChange({ ...value, sort: e.target.value as FeedSort })}
        color="blue"
        className="h-12 sm:w-56"
        aria-label="Sắp xếp bài đăng"
      >
        <option value="new">Mới nhất</option>
        <option value="comments">Nhiều bình luận</option>
        <option value="attachments">Nhiều đính kèm</option>
      </Select>
    </div>
  );
}
