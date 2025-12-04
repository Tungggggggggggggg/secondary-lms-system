"use client";

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search, Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "name" | "students";
type ViewMode = "grid" | "list";

interface ClassesToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export default function ClassesToolbar({
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  view,
  onViewChange,
  className,
}: ClassesToolbarProps) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onQueryChange(debouncedQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [debouncedQuery, onQueryChange]);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 gap-3 items-center",
        className
      )}
    >
      {/* Search Input (left) */}
      <div className="relative md:justify-self-start">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Tìm kiếm lớp học..."
          value={debouncedQuery}
          onChange={(e) => setDebouncedQuery(e.target.value)}
          color="green"
          className="pl-10 h-12 w-full md:w-80"
          aria-label="Tìm kiếm lớp học"
        />
      </div>

      {/* Controls group (right): view toggle + sort */}
      <div className="flex items-center justify-start md:justify-end gap-2">
        <div className="flex h-12 items-center gap-2 border border-gray-200 rounded-xl p-1 bg-white">
          <button
            onClick={() => onViewChange("grid")}
            className={cn(
              "p-2 rounded-lg",
              "transition-all duration-200 motion-safe:duration-200 motion-reduce:duration-0",
              view === "grid"
                ? "bg-green-100 text-green-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
            aria-label="Xem dạng lưới"
            aria-pressed={view === "grid"}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={cn(
              "p-2 rounded-lg",
              "transition-all duration-200 motion-safe:duration-200 motion-reduce:duration-0",
              view === "list"
                ? "bg-green-100 text-green-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
            aria-label="Xem dạng danh sách"
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <Select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          color="green"
          className="sm:w-44 h-12"
          aria-label="Sắp xếp lớp học"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="name">Theo tên</option>
          <option value="students">Số học sinh</option>
        </Select>
      </div>
    </div>
  );
}
