"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";

import { EmptyState, SectionHeader } from "@/components/shared";
import CardListSkeleton from "@/components/shared/loading/CardListSkeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type LessonListItem = {
  id: string;
  title: string;
  order: number;
  courseId: string;
  courseTitle: string;
  publishedAt: string;
};

type ApiResponse = {
  success?: boolean;
  data?: {
    items?: LessonListItem[];
  };
  message?: string;
};

export default function StudentClassroomLessonsPage() {
  const params = useParams();
  const classId = params.classId as string;

  const { data, error, isLoading } = useSWR<ApiResponse>(
    classId ? `/api/students/classes/${classId}/lessons?limit=200` : null,
    fetcher
  );

  const items = data?.data?.items ?? [];

  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});

  const readDone = (lessonId: string): boolean => {
    try {
      return localStorage.getItem(`lesson:done:${lessonId}`) === "1";
    } catch {
      return false;
    }
  };

  const refreshDone = () => {
    setDoneMap((prev) => {
      const next = { ...prev };
      for (const it of items) {
        next[it.id] = readDone(it.id);
      }
      return next;
    });
  };

  useEffect(() => {
    refreshDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((x) => x.id).join(",")]);

  useEffect(() => {
    const onFocus = () => refreshDone();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshDone();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((x) => x.id).join(",")]);

  const toggleDone = (lessonId: string) => {
    setDoneMap((prev) => {
      const next = !prev[lessonId];
      try {
        localStorage.setItem(`lesson:done:${lessonId}`, next ? "1" : "0");
      } catch {}
      return { ...prev, [lessonId]: next };
    });
  };

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) {
      if (!map.has(it.courseId)) {
        map.set(it.courseId, it.courseTitle);
      }
    }
    return Array.from(map.entries())
      .map(([courseId, courseTitle]) => ({ courseId, courseTitle }))
      .sort((a, b) => a.courseTitle.localeCompare(b.courseTitle, "vi"));
  }, [items]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");

  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "todo">("all");

  const visibleItems = useMemo(() => {
    if (selectedCourseId === "all") return items;
    return items.filter((x) => x.courseId === selectedCourseId);
  }, [items, selectedCourseId]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return visibleItems;
    if (statusFilter === "done") return visibleItems.filter((x) => !!doneMap[x.id]);
    return visibleItems.filter((x) => !doneMap[x.id]);
  }, [doneMap, statusFilter, visibleItems]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { courseId: string; courseTitle: string; lessons: LessonListItem[] }>();
    for (const it of filteredItems) {
      if (!groups.has(it.courseId)) {
        groups.set(it.courseId, { courseId: it.courseId, courseTitle: it.courseTitle, lessons: [] });
      }
      groups.get(it.courseId)!.lessons.push(it);
    }
    for (const g of groups.values()) {
      g.lessons.sort((a, b) => a.order - b.order);
    }
    return Array.from(groups.values()).sort((a, b) => a.courseTitle.localeCompare(b.courseTitle, "vi"));
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={<span className="text-green-700">Bài học</span>}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {courseOptions.length > 1 && (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="appearance-none px-3 sm:px-4 h-10 rounded-xl border border-border bg-background text-sm text-foreground font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Lọc theo khóa học"
              >
                <option value="all">Tất cả khóa học</option>
                {courseOptions.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseTitle}
                  </option>
                ))}
              </select>
            )}

            <div
              className="inline-flex h-10 rounded-xl border border-border bg-background p-1"
              role="group"
              aria-label="Lọc theo trạng thái học"
            >
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                aria-pressed={statusFilter === "all"}
                className={
                  `${statusFilter === "all"
                    ? "px-3 rounded-lg text-sm font-semibold bg-green-100 text-green-900"
                    : "px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted/40"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
                }
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("todo")}
                aria-pressed={statusFilter === "todo"}
                className={
                  `${statusFilter === "todo"
                    ? "px-3 rounded-lg text-sm font-semibold bg-green-100 text-green-900"
                    : "px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted/40"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
                }
              >
                Chưa học
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("done")}
                aria-pressed={statusFilter === "done"}
                className={
                  `${statusFilter === "done"
                    ? "px-3 rounded-lg text-sm font-semibold bg-green-100 text-green-900"
                    : "px-3 rounded-lg text-sm font-semibold text-foreground hover:bg-muted/40"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
                }
              >
                Đã học
              </button>
            </div>
          </div>
        }
      />

      {isLoading ? (
        <CardListSkeleton items={3} showChips={false} />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          Không tải được danh sách bài học. Vui lòng thử lại sau.
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Chưa có bài học"
          description="Giáo viên chưa thêm bài học nào cho lớp này hoặc chưa gán khóa học."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.courseId} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground truncate">
                  {g.courseTitle}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground font-medium">
                    {(() => {
                      const total = g.lessons.length;
                      const done = g.lessons.reduce((acc, l) => acc + (doneMap[l.id] ? 1 : 0), 0);
                      return `${done}/${total} đã học`;
                    })()}
                  </div>
                  <div className="w-28 h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: (() => {
                          const total = g.lessons.length || 1;
                          const done = g.lessons.reduce((acc, l) => acc + (doneMap[l.id] ? 1 : 0), 0);
                          return `${Math.round((done / total) * 100)}%`;
                        })(),
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3" role="list">
                {g.lessons.map((l) => (
                  <Link
                    key={l.id}
                    href={`/dashboard/student/classes/${classId}/lessons/${l.id}`}
                    className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="bg-card/90 rounded-2xl border border-border p-4 sm:p-5 hover:border-green-200 hover:bg-green-50/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-9 w-9 rounded-xl bg-green-100 text-green-800 flex items-center justify-center text-[11px] font-extrabold">
                          BÀI
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{l.title}</p>
                              <p className="text-xs text-muted-foreground truncate">Bài {l.order}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleDone(l.id);
                                }}
                                className={`inline-flex items-center gap-2 h-10 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                                  doneMap[l.id]
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-background text-foreground border-border hover:bg-muted/40"
                                }`}
                                aria-pressed={!!doneMap[l.id]}
                                aria-label={doneMap[l.id] ? "Đánh dấu chưa học" : "Đánh dấu đã học"}
                              >
                                <span className={`h-2.5 w-2.5 rounded-full ${doneMap[l.id] ? "bg-emerald-600" : "bg-muted-foreground/60"}`} aria-hidden="true" />
                                {doneMap[l.id] ? "Đã học" : "Chưa học"}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Phát hành: {new Date(l.publishedAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
