"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings2 } from "lucide-react";

interface ColumnVisibilityMenuProps<T extends string> {
  columns: Record<T, boolean>;
  onToggle: (key: T) => void;
  triggerLabel?: string;
}

export default function ColumnVisibilityMenu<T extends string>({ columns, onToggle, triggerLabel = "Cột" }: ColumnVisibilityMenuProps<T>) {
  const keys = Object.keys(columns) as T[];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-2 text-slate-600 hover:bg-slate-50">
          <Settings2 className="h-4 w-4 mr-2" /> {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {keys.map((k) => (
          <DropdownMenuItem
            key={k as string}
            onSelect={(event) => {
              event.preventDefault();
              onToggle(k);
            }}
          >
            <input type="checkbox" className="mr-2" readOnly checked={columns[k]} /> {k as string}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
