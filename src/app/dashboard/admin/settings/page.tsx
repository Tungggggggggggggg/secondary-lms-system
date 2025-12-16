"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type SystemSettings = {
  maintenance: { enabled: boolean; message: string | null };
  announcement: { enabled: boolean; message: string | null };
};

function notifySystemSettingsUpdated() {
  try {
    localStorage.setItem("system_settings_updated_at", String(Date.now()));
  } catch {}

  try {
    window.dispatchEvent(new Event("system-settings-updated"));
  } catch {}

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("system_settings");
      bc.postMessage({ type: "updated", at: Date.now() });
      bc.close();
    }
  } catch {}
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>("");

  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState<string>("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải system settings");
      }

      const data = json.data as SystemSettings;
      setMaintenanceEnabled(!!data?.maintenance?.enabled);
      setMaintenanceMessage(data?.maintenance?.message || "");

      setAnnouncementEnabled(!!data?.announcement?.enabled);
      setAnnouncementMessage(data?.announcement?.message || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenance: { enabled: maintenanceEnabled, message: maintenanceMessage || null },
          announcement: { enabled: announcementEnabled, message: announcementMessage || null },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể lưu system settings");
      }

      await fetchSettings();
      notifySystemSettingsUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Cấu hình bảo trì và thông báo toàn hệ thống"
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Maintenance mode</div>
              <div className="text-xs text-slate-500 mt-1">
                Bật để thông báo hệ thống đang bảo trì.
              </div>
            </div>
            <Switch
              checked={maintenanceEnabled}
              onCheckedChange={setMaintenanceEnabled}
              disabled={loading || saving}
              aria-label="Bật/tắt maintenance mode"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600">Thông báo bảo trì (tuỳ chọn)</div>
            <Textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="VD: Hệ thống sẽ bảo trì từ 22:00 đến 23:00..."
              rows={4}
              disabled={loading || saving}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Global announcement</div>
              <div className="text-xs text-slate-500 mt-1">
                Hiển thị banner thông báo cho tất cả người dùng đã đăng nhập.
              </div>
            </div>
            <Switch
              checked={announcementEnabled}
              onCheckedChange={setAnnouncementEnabled}
              disabled={loading || saving}
              aria-label="Bật/tắt global announcement"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600">Nội dung thông báo</div>
            <Textarea
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              placeholder="VD: Chào mừng bạn đến với hệ thống..."
              rows={4}
              disabled={loading || saving}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={fetchSettings} disabled={loading || saving}>
          Tải lại
        </Button>
        <Button onClick={save} disabled={loading || saving}>
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}
