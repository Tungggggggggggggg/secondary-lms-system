"use client";

import { useEffect } from "react";
import { useTeacherDashboardPerformance } from "@/hooks/use-teacher-dashboard";
import gsap from "gsap";
import { SectionCard } from "@/components/shared";
import { BarChart3, BookOpen } from "lucide-react";

export default function PerformanceChart() {
  const { performance, isLoading, error } = useTeacherDashboardPerformance();

  useEffect(() => {
    if (performance && performance.length > 0) {
      // Animate bars khi có dữ liệu
      gsap.fromTo(
        ".chart-bar",
        { width: 0 },
        { width: (i, el) => el.getAttribute("data-width") + "%", duration: 1.2, delay: 0.2, stagger: 0.3 }
      );
    }
  }, [performance]);

  // Loading state
  if (isLoading && !performance) {
    return (
      <SectionCard title={<span className="flex items-center gap-2 text-indigo-700"><BarChart3 className="h-5 w-5" /> Hiệu suất giảng dạy</span>}>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-4 w-12 bg-muted rounded"></div>
              </div>
              <div className="h-3 bg-muted/60 rounded-full"></div>
              <div className="h-3 w-24 bg-muted rounded mt-1"></div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  // Error state
  if (error) {
    return (
      <SectionCard title={<span className="flex items-center gap-2 text-indigo-700"><BarChart3 className="h-5 w-5" /> Hiệu suất giảng dạy</span>}>
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <p className="text-destructive text-sm">Lỗi khi tải hiệu suất: {error}</p>
        </div>
      </SectionCard>
    );
  }

  // No data state
  if (!performance || performance.length === 0) {
    return (
      <SectionCard title={<span className="flex items-center gap-2 text-indigo-700"><BarChart3 className="h-5 w-5" /> Hiệu suất giảng dạy</span>}>
        <div className="bg-muted/40 border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Chưa có dữ liệu hiệu suất</p>
          <p className="text-sm text-muted-foreground mt-2">Tạo bài tập và chấm điểm để xem hiệu suất giảng dạy</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={<span className="flex items-center gap-2 text-indigo-700"><BarChart3 className="h-5 w-5" /> Hiệu suất giảng dạy</span>}>
      <div className="space-y-6">
        {performance.slice(0, 5).map((item, idx) => (
          <div key={item.classroomId}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground inline-flex items-center gap-1">
                <BookOpen className="h-4 w-4" /> {item.classroomName}
              </span>
              <span className="text-sm font-bold text-foreground">{item.averageGrade}%</span>
            </div>
            <div className="h-3 bg-muted/60 rounded-full overflow-hidden">
              <div
                className={`chart-bar h-full bg-gradient-to-r ${item.color} rounded-full`}
                data-width={item.averageGrade}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Điểm trung bình lớp • {item.submittedCount}/{item.totalStudents} học sinh đã nộp
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}