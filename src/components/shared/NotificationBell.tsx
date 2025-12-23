"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  read?: boolean;
  actionUrl?: string;
}

interface NotificationBellProps {
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNotificationItem(value: unknown): value is NotificationItem {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.title === "string" && typeof value.createdAt === "string";
}

function getNotificationItemsFromResponse(data: unknown): NotificationItem[] {
  if (!isRecord(data)) return [];

  const payload = Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : [];
  return payload.filter(isNotificationItem);
}

function safeFormatDate(value: string): string {
  try {
    const d = new Date(value);
    const text = d.toLocaleString("vi-VN");
    if (text === "Invalid Date") return value;
    return text;
  } catch {
    return value;
  }
}

const fetcher = async (url: string): Promise<unknown> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error("fetch error");
  return r.json();
};

export default function NotificationBell(props?: NotificationBellProps) {
  const { className, buttonClassName, panelClassName } = props || {};
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [localItems, setLocalItems] = useState<NotificationItem[] | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const portalPanelRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number; maxHeight: number }>({
    left: 0,
    top: 0,
    maxHeight: 520,
  });

  const { data, error, isLoading, mutate } = useSWR<unknown>(
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
    return getNotificationItemsFromResponse(data);
  }, [data, localItems]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  useEffect(() => {
    setPortalReady(typeof window !== "undefined" && typeof document !== "undefined");
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (portalPanelRef.current && portalPanelRef.current.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!portalReady) return;

    const compute = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 8;

      const preferredWidth = panelClassName?.includes("w-64") ? 256 : 360;
      const availableBelow = vh - r.bottom - gap;
      const availableAbove = r.top - gap;
      const openUp = availableBelow < 260 && availableAbove > availableBelow;

      const maxHeight = Math.max(240, Math.min(520, openUp ? availableAbove : availableBelow));
      const top = openUp ? Math.max(gap, r.top - gap - maxHeight) : Math.min(vh - gap - maxHeight, r.bottom + gap);

      const leftIdeal = r.right - preferredWidth;
      const left = Math.min(Math.max(gap, leftIdeal), Math.max(gap, vw - gap - preferredWidth));

      setPanelPos({ left, top, maxHeight });
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, portalReady, panelClassName]);

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

  const markOneAsReadAndNavigate = async (n: NotificationItem) => {
    if (!n?.id) return;

    setLocalItems((prev) => {
      const base = prev ?? items;
      return base.map((it) => (it.id === n.id ? { ...it, read: true } : it));
    });

    try {
      await fetch(`/api/notifications/${encodeURIComponent(n.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
    } catch {}

    try {
      mutate();
    } catch {}

    if (n.actionUrl && typeof n.actionUrl === "string") {
      setOpen(false);
      router.push(n.actionUrl);
    }
  };

  return (
    <div className={`relative ${className || ""}`} ref={rootRef}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors ${buttonClassName || ""}`}
        aria-label="Thông báo"
        type="button"
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && portalReady &&
        createPortal(
          <>
            <style jsx global>{`
              [data-notification-panel] {
                background: #ffffff !important;
                color: #111827 !important;
                -webkit-text-fill-color: #111827 !important;
                text-shadow: none !important;
              }

              [data-notification-panel] * {
                color: inherit !important;
                -webkit-text-fill-color: currentColor !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: none !important;
                filter: none !important;
                mix-blend-mode: normal !important;
                text-shadow: none !important;
              }
            `}</style>

            <div
              ref={portalPanelRef}
              data-notification-panel
              className={`bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden ${panelClassName || ""}`}
              style={{
                position: "fixed",
                left: panelPos.left,
                top: panelPos.top,
                width: panelClassName?.includes("w-64") ? 256 : 360,
                maxHeight: panelPos.maxHeight,
                zIndex: 10000,
              }}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <h4 className="text-sm font-semibold text-gray-800">Thông báo</h4>
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                  type="button"
                >
                  <CheckCheck className="h-4 w-4" /> Đánh dấu đã đọc tất cả
                </button>
              </div>

              <div style={{ overflowY: "auto", maxHeight: panelPos.maxHeight - 44 }}>
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
                    {items.map((n) => {
                      const title = n.title?.trim() || "Thông báo mới";
                      const description = n.description?.trim() || "Không có nội dung";
                      const timeText = safeFormatDate(n.createdAt);

                      const itemBg = n.read ? "#FFFFFF" : "#EEF2FF";
                      const leftBorder = n.read ? "#E5E7EB" : "#4F46E5";
                      const dotColor = n.read ? "#D1D5DB" : "#4F46E5";

                      return (
                        <li
                          key={n.id}
                          style={{
                            padding: "12px 16px",
                            backgroundColor: itemBg,
                            borderLeft: `4px solid ${leftBorder}`,
                          }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => markOneAsReadAndNavigate(n)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                markOneAsReadAndNavigate(n);
                              }
                            }}
                            aria-label={`Mở thông báo: ${title}`}
                            style={{
                              width: "100%",
                              minHeight: 44,
                              cursor: "pointer",
                              textAlign: "left",
                              background: "transparent",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 12,
                              outline: "none",
                            }}
                          >
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 9999,
                                backgroundColor: dotColor,
                                marginTop: 4,
                                flex: "0 0 auto",
                              }}
                            />
                            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                              <div style={{ fontSize: 14, lineHeight: "20px", fontWeight: 600, color: "#111827" }}>{title}</div>
                              <div style={{ fontSize: 12, lineHeight: "16px", marginTop: 2, color: "#4B5563" }}>{description}</div>
                              <div style={{ fontSize: 11, lineHeight: "14px", marginTop: 6, color: "#9CA3AF" }}>{timeText}</div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
