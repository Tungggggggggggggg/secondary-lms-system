"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type TeacherCourse = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
};

type AssignedCourse = {
  id: string;
  title: string;
  description: string | null;
  addedAt: string;
  updatedAt: string;
};

type CoursesApi = {
  success?: boolean;
  data?: { items?: TeacherCourse[] };
  message?: string;
};

type AssignedApi = {
  success?: boolean;
  data?: { items?: AssignedCourse[] };
  message?: string;
};

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    const json = await r.json().catch(() => ({}));
    if (!r.ok || json?.success === false) throw new Error(json?.message || "fetch error");
    return json as any;
  });

export default function TeacherClassroomCoursesPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: allCoursesRes } = useSWR<CoursesApi>("/api/teachers/courses?take=200", fetcher);
  const { data: assignedRes, isLoading, error, mutate } = useSWR<AssignedApi>(
    classroomId ? `/api/teachers/classrooms/${classroomId}/courses` : null,
    fetcher
  );

  const allCourses = allCoursesRes?.data?.items ?? [];
  const assigned = assignedRes?.data?.items ?? [];

  const availableCourses = useMemo(() => {
    const assignedSet = new Set(assigned.map((c) => c.id));
    return allCourses.filter((c) => !assignedSet.has(c.id));
  }, [allCourses, assigned]);

  const addCourse = async () => {
    if (!selectedCourseId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/teachers/classrooms/${classroomId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourseId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể gán khóa học vào lớp");
      }
      setSelectedCourseId("");
      await mutate();
      toast({ title: "Đã gán khóa học", variant: "success" });
    } catch (e) {
      toast({
        title: "Gán thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async (courseId: string) => {
    try {
      setSaving(true);
      setRemovingId(courseId);
      const res = await fetch(`/api/teachers/classrooms/${classroomId}/courses/${courseId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể gỡ khóa học");
      }
      await mutate();
      toast({ title: "Đã gỡ khóa học", variant: "success" });
    } catch (e) {
      toast({
        title: "Gỡ thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        role="teacher"
        title="Khóa học trong lớp"
        subtitle="Gán khóa học để học sinh xem bài học và dùng Tutor."
        showIcon={false}
      />

      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">Thêm khóa học vào lớp</div>
            <div className="text-xs text-slate-500 mt-1">Chỉ hiện các khóa học bạn sở hữu và chưa gán vào lớp.</div>
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <Select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full"
                color="blue"
                disabled={saving}
              >
                <option value="">-- Chọn khóa học --</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
              <Button onClick={addCourse} disabled={!selectedCourseId || saving}>
                {saving && selectedCourseId ? "Đang gán..." : "Gán vào lớp"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-4 w-40 bg-slate-100 rounded" />
              <div className="h-3 w-56 bg-slate-100 rounded mt-3" />
              <div className="h-10 w-44 bg-slate-100 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <div className="font-semibold">Không tải được danh sách khóa học trong lớp.</div>
          <div className="mt-3">
            <Button variant="outline" onClick={() => mutate()} disabled={saving}>
              Thử lại
            </Button>
          </div>
        </div>
      ) : assigned.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          <div className="text-sm font-semibold text-slate-900">Chưa có khóa học</div>
          <div className="text-sm text-slate-600 mt-1">Hãy gán một khóa học để học sinh có thể bắt đầu học.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Khóa học đã gán</div>
            <div className="text-xs text-slate-500">{assigned.length} khóa học</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {assigned.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:bg-blue-50/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                        KH
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Gán lúc: {new Date(c.addedAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div className="inline-flex h-10 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/teacher/courses/${c.id}`)}
                        disabled={saving}
                        className="h-10 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                      >
                        Quản lý
                      </button>
                      <div className="w-px bg-slate-200" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => removeCourse(c.id)}
                        disabled={saving}
                        className="h-10 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                      >
                        {removingId === c.id ? "Đang gỡ..." : "Gỡ"}
                      </button>
                    </div>
                  </div>
                </div>

                {c.description && <p className="text-sm text-slate-600 mt-3 line-clamp-3">{c.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
