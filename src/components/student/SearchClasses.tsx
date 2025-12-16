"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useClassroom } from "@/hooks/use-classroom";
import { useToast } from "@/hooks/use-toast";
import type { SearchClassItem, SearchClassesResponse } from "@/types/api";

type Props = {
    defaultQuery?: string;
};

function useDebouncedValue<T>(value: T, delayMs: number, compositionActive: boolean) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        if (compositionActive) return; // đợi IME kết thúc
        const id = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs, compositionActive]);
    return debounced;
}

export default function SearchClasses({ defaultQuery = "" }: Props) {
    const { searchClassrooms } = useClassroom();
    const { toast } = useToast();

    const [q, setQ] = useState(defaultQuery);
    const [isComposing, setIsComposing] = useState(false);
    const [items, setItems] = useState<SearchClassItem[]>([]);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const controllerRef = useRef<AbortController | null>(null);
    const debouncedQ = useDebouncedValue(q, 300, isComposing);

    const hasQuery = useMemo(() => (debouncedQ || "").trim().length >= 2, [debouncedQ]);

    // GSAP micro animation for result cards
    useEffect(() => {
        let ctx: { revert?: () => void } | null = null;
        (async () => {
            if (items.length === 0) return;
            try {
                const gsap = (await import("gsap")).default;
                ctx = (gsap.context(() => {
                    gsap.from("[data-card]", { opacity: 0, y: 8, stagger: 0.03, duration: 0.25, ease: "power1.out" });
                }) as unknown) as { revert?: () => void };
            } catch {}
        })();
        return () => {
            if (ctx && typeof ctx.revert === "function") ctx.revert();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.map((i) => i.id).join(",")]);

    useEffect(() => {
        if (!hasQuery) {
            setItems([]);
            setNextCursor(undefined);
            setError(null);
            return;
        }
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setIsLoading(true);
        setError(null);
        searchClassrooms({ q: debouncedQ, limit: 12 }, { signal: controller.signal })
            .then((res: SearchClassesResponse) => {
                setItems(res.items);
                setNextCursor(res.nextCursor);
            })
            .catch((err) => {
                if (err?.name === "AbortError") return;
                const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
                setError(message);
                toast({ title: "Không thể tìm kiếm", description: message, variant: "destructive" });
            })
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQ]);

    const loadMore = async () => {
        if (!nextCursor || !hasQuery) return;
        try {
            setIsLoading(true);
            const res = await searchClassrooms({ q: debouncedQ, limit: 12, cursor: nextCursor });
            setItems((prev) => [...prev, ...res.items]);
            setNextCursor(res.nextCursor);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast({ title: "Không thể tải thêm", description: message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const onJoin = async (classId: string) => {
        try {
            const res = await fetch("/api/classrooms/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ classroomId: classId }),
            });
            const data = (await res.json().catch(() => null)) as unknown;
            if (!res.ok) {
                const msg =
                    typeof data === "object" &&
                    data !== null &&
                    typeof (data as { message?: unknown }).message === "string"
                        ? (data as { message: string }).message
                        : "Không thể tham gia lớp học";
                throw new Error(msg);
            }
            // Đánh dấu đã tham gia
            setItems((prev) => prev.map((it) => (it.id === classId ? { ...it, joined: true } : it)));
            toast({ title: "Đã tham gia lớp", description: "Bạn đã tham gia lớp thành công.", variant: "success" });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast({ title: "Tham gia thất bại", description: message, variant: "destructive" });
        }
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col gap-2">
                <label htmlFor="class-search" className="text-sm font-medium">
                    Tìm lớp học
                </label>
                <div className="relative">
                    <input
                        id="class-search"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                        placeholder="Nhập tên lớp hoặc giáo viên... (/ để focus)"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") setQ("");
                        }}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        aria-label="Tìm lớp học"
                    />
                    {q && (
                        <button
                            type="button"
                            aria-label="Xóa tìm kiếm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                            onClick={() => setQ("")}
                        >
                            Xóa
                        </button>
                    )}
                </div>
                <div className="text-xs text-gray-500" aria-live="polite">
                    {hasQuery && !isLoading ? `${items.length} kết quả` : ""}
                </div>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
                    ))}
                </div>
            )}

            {!isLoading && hasQuery && items.length === 0 && !error && (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
                    Không tìm thấy lớp phù hợp. Thử từ khóa khác.
                </div>
            )}

            {!isLoading && items.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((c) => (
                        <div data-card key={c.id} className="rounded-xl border border-gray-200 p-4 shadow-sm transition hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold">{c.name}</div>
                                    <div className="mt-1 text-xs text-gray-500">GV: {c.teacherName}</div>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="text-xs text-gray-400">
                                    {new Intl.DateTimeFormat("vi-VN").format(new Date(c.createdAt))}
                                </div>
                                {c.joined ? (
                                    <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Đã tham gia</span>
                                ) : (
                                    <button
                                        onClick={() => onJoin(c.id)}
                                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                    >
                                        Tham gia
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {nextCursor && !isLoading && (
                <div className="flex justify-center">
                    <button
                        onClick={loadMore}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                    >
                        Tải thêm
                    </button>
                </div>
            )}
        </div>
    );
}


