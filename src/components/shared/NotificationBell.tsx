"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  read?: boolean;
}

interface NotificationBellProps {
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("fetch error");
  return r.json();
});

export default function NotificationBell(props?: NotificationBellProps) {
  const { className, buttonClassName, panelClassName } = props || {};
  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState<NotificationItem[] | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    "/api/notifications",
    fetcher,
    {
      shouldRetryOnError: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: open ? 15000 : 0,
      dedupingInterval: 10000,
    }
  );

  const items: NotificationItem[] = useMemo(() => {
    if (localItems) return localItems;
    const payload = (data as any)?.data || (data as any)?.items || [];
    if (Array.isArray(payload)) return payload as NotificationItem[];
    return [];
  }, [data, localItems]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    let es: EventSource | null = null;
    const enableSSE = (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_NOTIF_SSE === "1") ||
      (typeof window !== "undefined" && (window as any).ENABLE_NOTIF_SSE === true);
    if (enableSSE && typeof window !== "undefined" && (window as any).EventSource) {
      try {
        es = new EventSource("/api/notifications/stream");
        es.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (Array.isArray(payload)) {
              setLocalItems(payload as NotificationItem[]);
            } else if (payload && payload.id) {
              setLocalItems((prev) => {
                const base = prev ?? [];
                const exists = base.some((i) => i.id === payload.id);
                return exists ? base.map((i) => (i.id === payload.id ? payload : i)) : [payload, ...base];
              });
            }
          } catch {}
        };
      } catch {}
    }
    return () => {
      try {
        es?.close();
      } catch {}
    };
  }, []);

  const markAllAsRead = async () => {
    setLocalItems((prev) => {
      const base = prev ?? items;
      return base.map((i) => ({ ...i, read: true }));
    });

    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {}

    try {
      mutate();
    } catch {}
  };

  return (
    <div className={`relative ${className || ""}`} ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors ${buttonClassName || ""}`}
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 ${panelClassName || ""}`}>
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h4 className="text-sm font-semibold text-gray-800">Thông báo</h4>
            <button onClick={markAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1">
              <CheckCheck className="h-4 w-4" /> Đánh dấu đã đọc tất cả
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-gray-500">Không thể tải thông báo</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Chưa có thông báo</div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li key={n.id} className={`px-4 py-3 ${n.read ? "bg-white" : "bg-indigo-50"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-gray-300" : "bg-indigo-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                        {n.description && (
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.description}</p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
