"use client";
import { useEffect, useState } from "react";

type SettingsMap = Record<string, any>;

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/system/settings");
      const data = await res.json();
      setSettings(data.settings || {});
    } finally { setLoading(false); }
  }

  async function save(key: string, value: unknown) {
    setSavingKey(key);
    setMsg(null);
    try {
      // Validate cơ bản
      if (key === "upload.maxSizeMB" && (typeof value !== "number" || value <= 0)) {
        setMsg("Giá trị upload.maxSizeMB phải là số > 0");
        return;
      }
      const res = await fetch("/api/admin/system/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j?.message || "Lưu thất bại");
        return;
      }
      setMsg("Đã lưu cài đặt");
      await load();
    } finally {
      setSavingKey(null);
      setTimeout(() => setMsg(null), 2000);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-sm text-gray-600">Đang tải cài đặt...</div>;

  const premoderation = Boolean(settings["content.premoderation"] ?? false);
  const maintenance = Boolean(settings["system.maintenance"] ?? false);
  const maxSizeMB = Number(settings["upload.maxSizeMB"] ?? 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Cài đặt hệ thống</h1>
        {msg && <div className="mt-2 text-sm text-green-700">{msg}</div>}
      </div>

      <section className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-medium">Nội dung</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={premoderation}
            onChange={(e) => save("content.premoderation", e.target.checked)}
            disabled={savingKey === "content.premoderation"}
          />
          Bật kiểm duyệt trước khi hiển thị (premoderation)
        </label>
      </section>

      <section className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-medium">Hệ thống</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={maintenance}
            onChange={(e) => save("system.maintenance", e.target.checked)}
            disabled={savingKey === "system.maintenance"}
          />
          Bật chế độ bảo trì (maintenance)
        </label>
      </section>

      <section className="bg-white border rounded p-4 space-y-3">
        <h2 className="font-medium">Upload</h2>
        <div className="flex items-center gap-2 text-sm">
          <span>Kích thước tối đa (MB):</span>
          <input
            className="border rounded px-2 py-1 w-24"
            type="number"
            min={1}
            value={maxSizeMB}
            onChange={(e) => save("upload.maxSizeMB", Number(e.target.value))}
            disabled={savingKey === "upload.maxSizeMB"}
          />
        </div>
      </section>
    </div>
  );
}


