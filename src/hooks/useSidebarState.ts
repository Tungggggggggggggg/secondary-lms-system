import { useCallback, useEffect, useRef, useState } from "react";

// Hook quản lý trạng thái gập/mở của sidebar với lưu trữ localStorage.
// - An toàn SSR: kiểm tra typeof window trước khi truy cập localStorage.
// - Logging lỗi có tiền tố để dễ truy vết trong console.
export function useSidebarState(storageKey: string = "sidebar:state") {
  const [expanded, setExpanded] = useState<boolean>(true);
  const mountedRef = useRef(false);

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

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, next ? "1" : "0");
        }
      } catch (error) {
        console.error("Sidebar: write state error", { storageKey, error });
      }
      return next;
    });
  }, [storageKey]);

  return { expanded, toggle, mounted: mountedRef.current };
}


