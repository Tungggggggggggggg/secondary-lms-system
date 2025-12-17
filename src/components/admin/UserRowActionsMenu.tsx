"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface UserRowActionsMenuProps {
  detailHref: string;
  disabled?: boolean;
  disableToggle?: boolean;
  disableDelete?: boolean;
  onToggleBan: () => void;
  onDeleteUser: () => void;
  toggleLabel: string;
}

export default function UserRowActionsMenu({
  detailHref,
  disabled,
  disableToggle,
  disableDelete,
  onToggleBan,
  onDeleteUser,
  toggleLabel,
}: UserRowActionsMenuProps) {
  const router = useRouter();
  const isToggleDisabled = !!disabled || !!disableToggle;
  const isDeleteDisabled = !!disabled || !!disableDelete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" color="slate" disabled={disabled} className="min-w-24">
          Thao tác
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          aria-disabled={!!disabled}
          className={disabled ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!disabled) router.push(detailHref);
          }}
        >
          Xem chi tiết
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          aria-disabled={isToggleDisabled}
          className={isToggleDisabled ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!isToggleDisabled) onToggleBan();
          }}
        >
          {toggleLabel}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          aria-disabled={isDeleteDisabled}
          className={
            isDeleteDisabled
              ? "opacity-60 cursor-not-allowed text-red-700"
              : "text-red-700 hover:bg-red-50"
          }
          onClick={() => {
            if (!isDeleteDisabled) onDeleteUser();
          }}
        >
          Xóa người dùng
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
