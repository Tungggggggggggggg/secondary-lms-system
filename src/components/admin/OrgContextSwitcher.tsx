"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isStaffRole, isSuperAdminRole } from "@/lib/rbac";

type OrgItem = { id: string; name: string };

export default function OrgContextSwitcher() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const sessionOrgId = (session as any)?.orgId as string | null | undefined;

  const [items, setItems] = useState<OrgItem[]>([]);
  const [value, setValue] = useState<string>(sessionOrgId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValue(sessionOrgId || "");
  }, [sessionOrgId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/org/mine");
        const data = await res.json();
        if (mounted && data?.items) {
          setItems(data.items as OrgItem[]);
        }
      } catch (e) {
        // noop
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(() => items, [items]);

  const onChange = async (orgId: string) => {
    setValue(orgId);
    setLoading(true);
    try {
      await fetch("/api/org/context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      router.refresh();
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  if (!role || (!isStaffRole(role) && !isSuperAdminRole(role))) return null;
  if (!options.length) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="org-switcher" className="text-xs text-gray-500 hidden sm:block">
        Tổ chức
      </label>
      <select
        id="org-switcher"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-2 rounded-md border border-gray-300 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
        disabled={loading}
      >
        <option value="" disabled>
          Chọn tổ chức...
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
