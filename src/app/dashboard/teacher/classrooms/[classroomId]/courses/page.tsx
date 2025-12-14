"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

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

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [saving, setSaving] = useState(false);

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
      await fetch(`/api/teachers/classrooms/${classroomId}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourseId }),
      });
      setSelectedCourseId("");
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async (courseId: string) => {
    try {
      setSaving(true);
      await fetch(`/api/teachers/classrooms/${classroomId}/courses/${courseId}`, {
        method: "DELETE",
      });
      await mutate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        role="teacher"
        title="Khóa học trong lớp"
        subtitle="Gán khóa học để học sinh xem bài học và dùng Tutor."
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
                Gán vào lớp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
          <div className="h-4 w-40 bg-slate-100 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded mt-3" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          Không tải được danh sách khóa học trong lớp.
        </div>
      ) : assigned.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          Lớp chưa được gán khóa học nào.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {assigned.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                      <div className="text-xs text-slate-500">
                        Gán lúc: {new Date(c.addedAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => removeCourse(c.id)}
                  disabled={saving}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Gỡ
                </Button>
              </div>

              {c.description && <p className="text-sm text-slate-600 mt-3 line-clamp-3">{c.description}</p>}

              <div className="mt-4 flex items-center justify-end">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/teacher/courses/${c.id}`)}
                  disabled={saving}
                >
                  Quản lý bài học
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
