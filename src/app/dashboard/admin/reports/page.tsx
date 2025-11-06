"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReportsPage() {
  const [orgId, setOrgId] = useState("");
  const overviewUrl = useMemo(() => `/api/admin/reports/overview${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""}`, [orgId]);
  const usageUrl = useMemo(() => `/api/admin/reports/usage${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""}`, [orgId]);
  const growthUrl = useMemo(() => `/api/admin/reports/growth${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""}`, [orgId]);
  const { data: overview } = useSWR(overviewUrl, fetcher);
  const { data: usage } = useSWR(usageUrl, fetcher);
  const { data: growth } = useSWR(growthUrl, fetcher);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="orgId (tùy chọn)" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
      </div>

      <section>
        <h2 className="font-medium mb-2">Tổng quan</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Users" value={overview?.data?.users ?? 0} />
          <MetricCard title="Announcements" value={overview?.data?.announcements ?? 0} />
          <MetricCard title="Comments" value={overview?.data?.comments ?? 0} />
          <MetricCard title="Pending" value={overview?.data?.pending ?? 0} />
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Usage (7d)</h2>
        <div className="rounded border p-3 text-sm">
          <div>Announcements groups: {usage?.data?.anns?.length ?? 0}</div>
          <div>Comments groups: {usage?.data?.cmts?.length ?? 0}</div>
        </div>
      </section>

      <section>
        <h2 className="font-medium mb-2">Growth (30d)</h2>
        <div className="rounded border p-3 text-sm space-y-1 max-h-60 overflow-auto">
          {growth?.data?.map((r: any) => (
            <div key={r.date} className="flex justify-between">
              <span>{r.date}</span>
              <span className="font-medium">+{r.count}</span>
            </div>
          )) || <div className="text-gray-500">No data</div>}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type Stats = { users: number; classrooms: number; courses: number; assignments: number; submissions: number };

export default function ReportsPage() {
  const [orgId, setOrgId] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/org/reports/overview${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""}`);
    const data = await res.json();
    setStats(data.stats ?? null);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1" placeholder="Organization ID (tùy chọn)" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
        <button className="px-3 py-1 bg-black text-white rounded" onClick={load}>Tải</button>
      </div>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 bg-white rounded border"><div className="text-xs text-gray-500">Users</div><div className="text-lg font-semibold">{stats.users}</div></div>
          <div className="p-4 bg-white rounded border"><div className="text-xs text-gray-500">Classrooms</div><div className="text-lg font-semibold">{stats.classrooms}</div></div>
          <div className="p-4 bg-white rounded border"><div className="text-xs text-gray-500">Courses</div><div className="text-lg font-semibold">{stats.courses}</div></div>
          <div className="p-4 bg-white rounded border"><div className="text-xs text-gray-500">Assignments</div><div className="text-lg font-semibold">{stats.assignments}</div></div>
          <div className="p-4 bg-white rounded border"><div className="text-xs text-gray-500">Submissions</div><div className="text-lg font-semibold">{stats.submissions}</div></div>
        </div>
      )}
    </div>
  );
}


