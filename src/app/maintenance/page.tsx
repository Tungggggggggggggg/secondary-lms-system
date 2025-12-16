"use client";

import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";

type SettingsResponse = {
  success?: boolean;
  data?: {
    maintenance?: { enabled: boolean; message: string | null };
    announcement?: { enabled: boolean; message: string | null };
  };
};

export default function MaintenancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user?.role || "").toString().toUpperCase();
  const isAdmin = role === "ADMIN";

  const { data, mutate } = useSWR<SettingsResponse>("/api/system/settings");

  const maintenanceEnabled = !!data?.data?.maintenance?.enabled;
  const message = (data?.data?.maintenance?.message || "Vui lòng quay lại sau.").trim();

  useEffect(() => {
    if (!data) return;
    if (!maintenanceEnabled) {
      router.replace("/dashboard");
      router.refresh();
    }
  }, [data, maintenanceEnabled, router]);

  useEffect(() => {
    const refresh = () => {
      void mutate();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "system_settings_updated_at") refresh();
    };

    window.addEventListener("system-settings-updated", refresh);
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("system_settings");
        bc.onmessage = (evt) => {
          if (evt?.data?.type === "updated") refresh();
        };
      }
    } catch {}

    return () => {
      window.removeEventListener("system-settings-updated", refresh);
      window.removeEventListener("storage", onStorage);
      try {
        bc?.close();
      } catch {}
    };
  }, [mutate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="text-xl font-extrabold text-amber-950">Hệ thống đang bảo trì</div>
          <div className="mt-2 text-sm text-amber-900 whitespace-pre-wrap">{message}</div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
            {isAdmin ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/admin/settings">Mở System Settings</Link>
              </Button>
            ) : null}
            <Button
              onClick={() => {
                router.refresh();
              }}
            >
              Tải lại
            </Button>
          </div>
        </div>

        
      </div>
    </div>
  );
}
