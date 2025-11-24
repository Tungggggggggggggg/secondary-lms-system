"use client";

import { useEffect, useState } from "react";

interface Props {
  isSuperAdmin: boolean;
}

export default function ViewAsToggle({ isSuperAdmin }: Props) {
  const [viewAsStaff, setViewAsStaff] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/view-as");
        const data = await res.json();
        if (mounted) setViewAsStaff(!!data?.viewAsStaff);
      } catch {}
    };
    load();
    const handler = () => load();
    window.addEventListener("view-as-changed", handler as any);
    return () => {
      mounted = false;
      window.removeEventListener("view-as-changed", handler as any);
    };
  }, []);

  const toggle = async () => {
    try {
      setLoading(true);
      const next = !viewAsStaff;
      const res = await fetch("/api/admin/view-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewAsStaff: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as any));
        throw new Error(data?.error || "Không thể cập nhật chế độ xem");
      }
      setViewAsStaff(next);
      window.dispatchEvent(new CustomEvent("view-as-changed"));
    } catch (e: any) {
      alert(e?.message || "Không thể cập nhật chế độ xem");
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={viewAsStaff}
        disabled={loading}
        onChange={toggle}
      />
      <span>Xem như Staff</span>
    </label>
  );
}
