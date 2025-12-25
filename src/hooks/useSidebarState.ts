import { useCallback, useEffect, useRef, useState } from "react";

// Hook quản lý trạng thái gập/mở của sidebar với lưu trữ localStorage.
// - An toàn SSR: kiểm tra typeof window trước khi truy cập localStorage.
// - Logging lỗi có tiền tố để dễ truy vết trong console.
export function useSidebarState(storageKey: string = "sidebar:state") {
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(storageKey);
        if (raw !== null) return raw === "1";
      }
    } catch {}
    return true;
  });
  const mountedRef = useRef(false);
  const EVENT = "sidebar:state-change";

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) setExpanded(raw === "1");
    } catch (error) {
      console.error("Sidebar: read state error", { storageKey, error });
    } finally {
      mountedRef.current = true;
    }
  }, [storageKey]);

  // Lắng nghe thay đổi từ các component khác (cùng tab)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: boolean }>).detail;
      if (!detail) return;
      if (detail.key === storageKey) {
        const val = detail.value;
        setTimeout(() => setExpanded(val), 0);
      }
    };
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, [storageKey]);

  // Lắng nghe storage event (khác tab)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const val = e.newValue === "1";
        setTimeout(() => setExpanded(val), 0);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, next ? "1" : "0");
          // Phát sự kiện để các hook khác trong cùng tab nhận được thay đổi ngay lập tức
          // Dispatch async để chạy sau khi React commit render hiện tại
          setTimeout(() => {
            try {
              window.dispatchEvent(
                new CustomEvent(EVENT, { detail: { key: storageKey, value: next } })
              );
            } catch {}
          }, 0);
        }
      } catch (error) {
        console.error("Sidebar: write state error", { storageKey, error });
      }
      return next;
    });
  }, [storageKey]);

  return { expanded, toggle, mounted: mountedRef.current };
}


