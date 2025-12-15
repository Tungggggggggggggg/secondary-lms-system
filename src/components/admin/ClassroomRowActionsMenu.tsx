"use client";

import Button from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ClassroomRowActionsMenuProps {
  disabled?: boolean;
  isArchived: boolean;
  onOpenStudents: () => void;
  onOpenBulkAddStudents: () => void;
  onOpenEdit: () => void;
  onOpenChangeTeacher: () => void;
  onToggleArchive: () => void;
}

export default function ClassroomRowActionsMenu({
  disabled,
  isArchived,
  onOpenStudents,
  onOpenBulkAddStudents,
  onOpenEdit,
  onOpenChangeTeacher,
  onToggleArchive,
}: ClassroomRowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          Thao tác
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          aria-disabled={disabled}
          className={disabled ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!disabled) onOpenStudents();
          }}
        >
          Xem học sinh
        </DropdownMenuItem>

        <DropdownMenuItem
          aria-disabled={disabled || isArchived}
          className={disabled || isArchived ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!disabled && !isArchived) onOpenBulkAddStudents();
          }}
        >
          Thêm học sinh hàng loạt
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          aria-disabled={disabled || isArchived}
          className={disabled || isArchived ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!disabled && !isArchived) onOpenEdit();
          }}
        >
          Chỉnh sửa lớp
        </DropdownMenuItem>

        <DropdownMenuItem
          aria-disabled={disabled || isArchived}
          className={disabled || isArchived ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!disabled && !isArchived) onOpenChangeTeacher();
          }}
        >
          Đổi giáo viên phụ trách
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          aria-disabled={disabled}
          className={disabled ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!disabled) onToggleArchive();
          }}
        >
          {isArchived ? "Khôi phục lớp" : "Lưu trữ lớp"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
