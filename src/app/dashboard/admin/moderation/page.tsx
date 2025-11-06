"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ModerationPage() {
    const [orgId, setOrgId] = useState("");
    const [type, setType] = useState<"announcement" | "comment">(
        "announcement"
    );
    const url = useMemo(
        () =>
            `/api/admin/moderation/queue?type=${type}${
                orgId ? `&orgId=${encodeURIComponent(orgId)}` : ""
            }`,
        [type, orgId]
    );
    const { data, mutate, isLoading } = useSWR(url, fetcher);

    async function approve(item: any) {
        const endpoint =
            item.type === "announcement"
                ? `/api/admin/moderation/announcements/${item.id}/approve`
                : `/api/admin/moderation/comments/${item.id}/approve`;
        await fetch(endpoint, { method: "POST" });
        mutate();
    }

    async function reject(item: any) {
        const reason = prompt("Lý do từ chối?") || "";
        const endpoint =
            item.type === "announcement"
                ? `/api/admin/moderation/announcements/${item.id}/reject`
                : `/api/admin/moderation/comments/${item.id}/reject`;
        await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason }),
        });
        mutate();
    }

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-semibold">Moderation</h1>
            <div className="flex flex-wrap gap-2 items-center">
                <select
                    className="border rounded px-2 py-1"
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                >
                    <option value="announcement">Announcements</option>
                    <option value="comment">Comments</option>
                </select>
                <input
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="Lọc theo orgId"
                    className="border rounded px-2 py-1"
                />
            </div>
            <div className="rounded-md border overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left px-3 py-2">Thời gian</th>
                            <th className="text-left px-3 py-2">Loại</th>
                            <th className="text-left px-3 py-2">Nội dung</th>
                            <th className="text-right px-3 py-2">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr>
                                <td className="px-3 py-3" colSpan={4}>
                                    Đang tải...
                                </td>
                            </tr>
                        )}
                        {data?.data?.items?.map((item: any) => (
                            <tr key={item.id} className="border-t">
                                <td className="px-3 py-2">
                                    {new Date(item.createdAt).toLocaleString()}
                                </td>
                                <td className="px-3 py-2">{item.type}</td>
                                <td
                                    className="px-3 py-2 max-w-[600px] truncate"
                                    title={item.content}
                                >
                                    {item.content}
                                </td>
                                <td className="px-3 py-2 text-right space-x-2">
                                    <button
                                        onClick={() => approve(item)}
                                        className="px-3 py-1 rounded bg-green-600 text-white"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => reject(item)}
                                        className="px-3 py-1 rounded bg-red-600 text-white"
                                    >
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {!isLoading &&
                            (!data?.data?.items ||
                                data.data.items.length === 0) && (
                                <tr>
                                    <td
                                        className="px-3 py-3 text-gray-500"
                                        colSpan={4}
                                    >
                                        Không có nội dung chờ duyệt
                                    </td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

("use client");
import { useEffect, useState } from "react";

type Ann = {
    id: string;
    content: string;
    classroomId: string;
    authorId: string;
    createdAt: string;
};
type Cmt = {
    id: string;
    content: string;
    announcementId: string;
    authorId: string;
    createdAt: string;
};

export default function ModerationPage() {
    const [anns, setAnns] = useState<Ann[]>([]);
    const [cmts, setCmts] = useState<Cmt[]>([]);

    async function load() {
        const [ra, rc] = await Promise.all([
            fetch("/api/admin/org/moderation/announcements").then((r) =>
                r.json()
            ),
            fetch("/api/admin/org/moderation/comments").then((r) => r.json()),
        ]);
        setAnns(ra.items ?? []);
        setCmts(rc.items ?? []);
    }

    async function act(
        type: "ann" | "cmt",
        action: "APPROVE" | "REJECT",
        ids: string[]
    ) {
        const url =
            type === "ann"
                ? "/api/admin/org/moderation/announcements"
                : "/api/admin/org/moderation/comments";
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, action }),
        });
        await load();
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold">Moderation Queue</h1>

            <section>
                <h2 className="font-medium mb-2">Announcements pending</h2>
                <div className="space-y-2">
                    {anns.map((a) => (
                        <div key={a.id} className="p-3 bg-white border rounded">
                            <div className="text-sm text-gray-700 mb-2 line-clamp-3">
                                {a.content}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="px-3 py-1 bg-green-600 text-white rounded"
                                    onClick={() =>
                                        act("ann", "APPROVE", [a.id])
                                    }
                                >
                                    Duyệt
                                </button>
                                <button
                                    className="px-3 py-1 bg-red-600 text-white rounded"
                                    onClick={() => act("ann", "REJECT", [a.id])}
                                >
                                    Từ chối
                                </button>
                            </div>
                        </div>
                    ))}
                    {anns.length === 0 && (
                        <div className="text-sm text-gray-500">
                            Không có mục chờ duyệt.
                        </div>
                    )}
                </div>
            </section>

            <section>
                <h2 className="font-medium mb-2">Comments pending</h2>
                <div className="space-y-2">
                    {cmts.map((c) => (
                        <div key={c.id} className="p-3 bg-white border rounded">
                            <div className="text-sm text-gray-700 mb-2 line-clamp-3">
                                {c.content}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="px-3 py-1 bg-green-600 text-white rounded"
                                    onClick={() =>
                                        act("cmt", "APPROVE", [c.id])
                                    }
                                >
                                    Duyệt
                                </button>
                                <button
                                    className="px-3 py-1 bg-red-600 text-white rounded"
                                    onClick={() => act("cmt", "REJECT", [c.id])}
                                >
                                    Từ chối
                                </button>
                            </div>
                        </div>
                    ))}
                    {cmts.length === 0 && (
                        <div className="text-sm text-gray-500">
                            Không có mục chờ duyệt.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
