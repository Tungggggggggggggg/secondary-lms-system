"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

interface OrgItem {
  id: string;
  name: string;
}

export default function OrgSwitcher() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [viewAsStaff, setViewAsStaff] = useState(false);

  // Load current org context
  const loadContext = async () => {
    try {
      const res = await fetch("/api/org/context");
      const data = await res.json();
      setCurrentOrgId(data?.orgId || "");
    } catch (e) {
      console.error("[OrgSwitcher] load context error", e);
    }
  };

  // Load org list for selector
  const loadMyOrgs = async () => {
    try {
      const res = await fetch("/api/org/mine");
      const data = await res.json();
      setOrgs(data?.items || []);
    } catch (e) {
      console.error("[OrgSwitcher] load orgs error", e);
    }
  };

  const loadViewAs = async () => {
    try {
      const res = await fetch("/api/admin/view-as");
      const data = await res.json();
      setViewAsStaff(!!data?.viewAsStaff);
    } catch {}
  };

  useEffect(() => {
    loadContext();
    loadMyOrgs();
    loadViewAs();
    const handler = () => loadViewAs();
    window.addEventListener("view-as-changed", handler as any);
    return () => window.removeEventListener("view-as-changed", handler as any);
  }, []);

  // When session role changes, refresh
  useEffect(() => {
    loadContext();
  }, [role]);

  const handleChange = async (value: string) => {
    try {
      setLoading(true);
      if (!value && isSuperAdmin) {
        // Clear cookie client-side for system-wide view (read-only)
        document.cookie = "x-org-id=; Max-Age=0; path=/; SameSite=Lax";
        setCurrentOrgId("");
        window.dispatchEvent(new CustomEvent("org-context-changed"));
        return;
      }

      const res = await fetch("/api/org/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Không thể cập nhật Trường/Đơn vị");
      }
      setCurrentOrgId(value);
      window.dispatchEvent(new CustomEvent("org-context-changed"));
    } catch (e: any) {
      console.error("[OrgSwitcher] change error", e);
      alert(e?.message || "Không thể cập nhật Trường/Đơn vị");
    } finally {
      setLoading(false);
    }
  };

  const options = useMemo(() => orgs, [orgs]);

  // If view-as-staff and SUPER_ADMIN has no org selected, auto-pick first org
  useEffect(() => {
    const autoPick = async () => {
      if (isSuperAdmin && viewAsStaff && !currentOrgId && options.length > 0) {
        await handleChange(options[0].id);
      }
    };
    autoPick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, viewAsStaff, currentOrgId, options]);

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-gray-500">Trường/Đơn vị:</div>
      <select
        className="min-w-[220px] text-sm border rounded-md px-2 py-1 bg-white"
        value={currentOrgId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        aria-label="Chọn Trường/Đơn vị"
        title={isSuperAdmin && !viewAsStaff && !currentOrgId ? "Toàn hệ thống (chỉ xem)" : currentOrgId ? "Phạm vi hiện tại theo Trường/Đơn vị" : ""}
      >
        {isSuperAdmin && !viewAsStaff && (
          <option value="">Toàn hệ thống (chỉ xem)</option>
        )}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
