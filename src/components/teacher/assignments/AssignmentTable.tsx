"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AssignmentT } from "@/hooks/use-assignments";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarDays, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ColumnVisibilityMenu } from "@/components/shared";

export type AssignmentTableColumnKey = "title" | "type" | "classrooms" | "due" | "submissions" | "status" | "actions";

type Props = {
  items: AssignmentT[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSubmissions?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
};

export default function AssignmentTable({ items, onView, onEdit, onSubmissions, onDelete, onDuplicate }: Props) {
  const [columns, setColumns] = useState<Record<AssignmentTableColumnKey, boolean>>({
    title: true,
    type: true,
    classrooms: true,
    due: true,
    submissions: true,
    status: true,
    actions: true,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(40);
  const rowHeight = 64; // px (approx)

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const visible = Math.ceil(el.clientHeight / rowHeight) + 10;
      const s = Math.max(0, Math.floor(el.scrollTop / rowHeight) - 5);
      setStart(s);
      setEnd(Math.min(items.length, s + visible));
    };
    onScroll();
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const slice = useMemo(() => items.slice(start, end), [items, start, end]);
  const topSpacer = start * rowHeight;
  const bottomSpacer = Math.max(0, (items.length - end) * rowHeight);

  const toggleColumn = (key: AssignmentTableColumnKey) => setColumns((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <div className="text-sm font-semibold text-slate-700">Bảng bài tập</div>
        <ColumnVisibilityMenu<AssignmentTableColumnKey>
          columns={columns}
          onToggle={toggleColumn}
          triggerLabel="Cột"
        />
      </div>

      <div className="overflow-auto max-h-[70vh]" ref={containerRef}>
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-blue-50 z-10 text-blue-900">
            <tr className="text-left">
              {columns.title && <th className="px-4 py-3 font-semibold">Tiêu đề</th>}
              {columns.type && <th className="px-4 py-3 font-semibold">Loại</th>}
              {columns.classrooms && <th className="px-4 py-3 font-semibold">Lớp</th>}
              {columns.due && <th className="px-4 py-3 font-semibold">Thời hạn</th>}
              {columns.submissions && <th className="px-4 py-3 font-semibold">Đã nộp</th>}
              {columns.status && <th className="px-4 py-3 font-semibold">Trạng thái</th>}
              {columns.actions && <th className="px-4 py-3 font-semibold text-right">Hành động</th>}
            </tr>
          </thead>
          <tbody>
            {topSpacer > 0 && (
              <tr style={{ height: topSpacer }}>
                <td colSpan={7} />
              </tr>
            )}
            {slice.map((a) => {
              const effective = a.type === "QUIZ" ? (a.lockAt || a.dueDate) : a.dueDate;
              const dueStr = effective ? new Date(effective).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Không rõ";
              return (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  {columns.title && (
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.title}</div>
                      <div className="text-xs text-slate-500">{a.description ?? ""}</div>
                    </td>
                  )}
                  {columns.type && <td className="px-4 py-3 text-slate-700">{a.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}</td>}
                  {columns.classrooms && (
                    <td className="px-4 py-3 text-slate-700">—</td>
                  )}
                  {columns.due && (
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-700"><CalendarDays className="h-4 w-4 text-slate-500" /> {dueStr}</span>
                    </td>
                  )}
                  {columns.submissions && (
                    <td className="px-4 py-3 text-slate-700">{a._count?.submissions ?? 0}</td>
                  )}
                  {columns.status && (
                    <td className="px-4 py-3 text-slate-700">{effective ? (new Date(effective) >= new Date() ? "Đang diễn ra" : "Đã kết thúc") : "—"}</td>
                  )}
                  {columns.actions && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => onView?.(a.id)}>
                        <Eye className="h-4 w-4 mr-1.5" /> Xem
                      </Button>
                      <Button variant="ghost" className="text-blue-700 hover:bg-blue-50" onClick={() => onEdit?.(a.id)}>
                        <Pencil className="h-4 w-4 mr-1.5" /> Sửa
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-50">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onSubmissions?.(a.id)}>Xem bài nộp</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onDuplicate?.(a.id)}>Nhân bản</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onSelect={() => onDelete?.(a.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Xoá
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
            {bottomSpacer > 0 && (
              <tr style={{ height: bottomSpacer }}>
                <td colSpan={7} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
