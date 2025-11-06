"use client";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data, mutate } = useSWR(`/api/admin/settings`, fetcher);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [valueText, setValueText] = useState<string>("{}");
  const keyUrl = useMemo(() => (selectedKey ? `/api/admin/settings/${encodeURIComponent(selectedKey)}` : null), [selectedKey]);
  const { data: current } = useSWR(keyUrl, fetcher);

  useEffect(() => {
    if (current?.data) {
      try {
        setValueText(JSON.stringify(current.data.value ?? null, null, 2));
      } catch {
        setValueText("null");
      }
    }
  }, [current?.data]);

  async function save() {
    if (!selectedKey) return;
    let json: any = null;
    try {
      json = valueText ? JSON.parse(valueText) : null;
    } catch (e) {
      alert("JSON không hợp lệ");
      return;
    }
    await fetch(`/api/admin/settings/${encodeURIComponent(selectedKey)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: json }) });
    mutate();
  }

  async function removeKey(k: string) {
    await fetch(`/api/admin/settings/${encodeURIComponent(k)}`, { method: "DELETE" });
    if (selectedKey === k) setSelectedKey("");
    mutate();
  }

  const keys: { key: string; updatedAt: string }[] = data?.data ?? [];

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">System Settings</h1>
          <button className="px-2 py-1 rounded border" onClick={() => { const k = prompt("Nhập key mới"); if (k) setSelectedKey(k); }}>+ New</button>
        </div>
        <div className="rounded border divide-y">
          {keys?.map((k) => (
            <div key={k.key} className={`flex items-center justify-between px-3 py-2 ${selectedKey === k.key ? "bg-gray-50" : ""}`}>
              <button className="text-left truncate" onClick={() => setSelectedKey(k.key)} title={k.key}>{k.key}</button>
              <button className="text-red-600 text-sm" onClick={() => removeKey(k.key)}>Delete</button>
            </div>
          ))}
          {(!keys || keys.length === 0) && <div className="px-3 py-2 text-sm text-gray-500">Chưa có key nào</div>}
        </div>
      </div>

      <div className="md:col-span-2">
        {selectedKey ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Key: <span className="font-mono">{selectedKey}</span></div>
              <div className="space-x-2">
                <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={save}>Save</button>
              </div>
            </div>
            <textarea value={valueText} onChange={(e) => setValueText(e.target.value)} className="w-full h-[400px] border rounded p-2 font-mono text-sm" placeholder="Nhập JSON" />
            <div className="text-xs text-gray-500">Giá trị là JSON bất kỳ. Cache server 60s; cập nhật sẽ xóa cache ngay.</div>
          </div>
        ) : (
          <div className="text-gray-500">Chọn hoặc tạo key để xem/sửa nội dung</div>
        )}
      </div>
    </div>
  );
}


