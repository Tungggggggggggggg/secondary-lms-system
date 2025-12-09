"use client";

import { useMemo } from "react";

type Props = {
  files: File[];
  onRemove?: (index: number) => void;
  className?: string;
};

export default function AttachmentBar({ files, onRemove, className }: Props) {
  const total = files?.length ?? 0;
  const items = useMemo(() => files || [], [files]);

  if (!total) return null;

  return (
    <div className={`text-xs text-slate-700 bg-slate-50 rounded-xl p-2 ${className ?? ""}`}>
      <div className="font-medium mb-1.5">Đính kèm ({total})</div>
      <ul className="space-y-1.5">
        {items.map((f, idx) => (
          <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2">
            <div className="truncate" title={f.name}>
              {f.name}
            </div>
            {typeof onRemove === "function" && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:brightness-110"
                aria-label={`Xoá tệp ${f.name}`}
              >
                Xoá
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
