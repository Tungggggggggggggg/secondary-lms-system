"use client";

import Button from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface UserRowActionsMenuProps {
  disabled?: boolean;
  disableReset?: boolean;
  disableToggle?: boolean;
  disableDelete?: boolean;
  onResetPassword: () => void;
  onToggleBan: () => void;
  onDeleteUser: () => void;
  toggleLabel: string;
}

export default function UserRowActionsMenu({
  disabled,
  disableReset,
  disableToggle,
  disableDelete,
  onResetPassword,
  onToggleBan,
  onDeleteUser,
  toggleLabel,
}: UserRowActionsMenuProps) {
  const isResetDisabled = !!disabled || !!disableReset;
  const isToggleDisabled = !!disabled || !!disableToggle;
  const isDeleteDisabled = !!disabled || !!disableDelete;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          Thao tác
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          aria-disabled={isResetDisabled}
          className={isResetDisabled ? "opacity-60 cursor-not-allowed" : undefined}
          onClick={() => {
            if (!isResetDisabled) onResetPassword();
          }}
        >
          Reset mật khẩu
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
