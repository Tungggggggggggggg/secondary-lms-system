"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";

type DashboardRole = "teacher" | "student" | "parent" | "admin";

type SystemSettingsPayload = {
  maintenance: { enabled: boolean; message: string | null };
  announcement: { enabled: boolean; message: string | null };
};

type SettingsResponse = {
  success?: boolean;
  data?: SystemSettingsPayload;
  message?: string;
  error?: boolean;
};
export default function SystemStatusGate({
  role,
  children,
}: {
  role: DashboardRole;
  children: ReactNode;
}) {
  const { data, isLoading, mutate } = useSWR<SettingsResponse>("/api/system/settings");

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

  const maintenanceEnabled = !!data?.data?.maintenance?.enabled;
  const maintenanceMessage = data?.data?.maintenance?.message || null;

  const announcementEnabled = !!data?.data?.announcement?.enabled;
  const announcementMessage = (data?.data?.announcement?.message || "").trim();

  if (!isLoading && maintenanceEnabled && role !== "admin") {
    return (
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="mx-auto max-w-3xl px-6 py-10">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="text-lg font-semibold text-amber-900">Hệ thống đang bảo trì</div>
              <div className="mt-2 text-sm text-amber-800 whitespace-pre-wrap">
                {maintenanceMessage || "Vui lòng quay lại sau."}
              </div>
              <div className="mt-5 flex items-center justify-end">
                <Button
                  onClick={() => {
                    void mutate();
                  }}
                >
                  Tải lại
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      {announcementEnabled && announcementMessage && (
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-blue-100 bg-blue-50 text-blue-900">
          <div className="text-sm whitespace-pre-wrap">{announcementMessage}</div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
