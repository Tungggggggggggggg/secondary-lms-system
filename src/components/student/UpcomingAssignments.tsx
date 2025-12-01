"use client";

import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { useEffect, useMemo } from "react";
import Link from "next/link";

export default function UpcomingAssignments() {
  const { assignments, isLoading, error, fetchAllAssignments } = useStudentAssignments();

  useEffect(() => {
    fetchAllAssignments();
  }, [fetchAllAssignments]);

  // Lọc và sắp xếp assignments sắp đến hạn
  const upcomingAssignments = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return assignments
      .filter((assignment) => {
        if (!assignment.dueDate) return false;
        const dueDate = new Date(assignment.dueDate);
        // Chỉ lấy assignments chưa nộp và sắp đến hạn
        return (
          dueDate >= now &&
          dueDate <= sevenDaysFromNow &&
          (!assignment.submission || assignment.status === "pending")
        );
      })
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 5); // Chỉ lấy 5 assignments gần nhất
  }, [assignments]);

  const formatTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} ngày nữa`;
    } else if (hours > 0) {
      return `Còn ${hours} giờ`;
    } else {
      return "Sắp hết hạn";
    }
  };

  const getPriority = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours <= 24) {
      return {
        label: "SẮP HẾT HẠN",
        color: "red",
        borderClass: "border-red-500",
        bgClass: "bg-red-50",
        textClass: "text-red-600",
        badgeClass: "bg-red-100",
      };
    } else if (hours <= 72) {
      return {
        label: "QUAN TRỌNG",
        color: "yellow",
        borderClass: "border-yellow-500",
        bgClass: "bg-yellow-50",
        textClass: "text-yellow-600",
        badgeClass: "bg-yellow-100",
      };
    } else {
      return {
        label: "BÌNH THƯỜNG",
        color: "blue",
        borderClass: "border-blue-500",
        bgClass: "bg-blue-50",
        textClass: "text-blue-600",
        badgeClass: "bg-blue-100",
      };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📋 Bài tập sắp tới
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📋 Bài tập sắp tới
        </h2>
        <div className="text-red-500 text-center py-4">
          Có lỗi xảy ra: {error}
        </div>
      </div>
    );
  }

  if (upcomingAssignments.length === 0) {
    return (
      <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
          📋 Bài tập sắp tới
        </h2>
        <div className="text-center py-8 text-gray-500">
          <p>Không có bài tập nào sắp đến hạn</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6 sm:p-7">
      <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center gap-2">
        📋 Bài tập sắp tới
      </h2>
      <div className="space-y-4">
        {upcomingAssignments.map((assignment) => {
          if (!assignment.dueDate) return null;
          const priority = getPriority(assignment.dueDate);
          const timeRemaining = formatTimeRemaining(assignment.dueDate);
          const classroomName = assignment.classroom?.name || "Lớp học";

          return (
            <Link
              key={assignment.id}
              href={`/dashboard/student/assignments/${assignment.id}`}
              className="block"
            >
              <div
                className={`border-l-4 ${priority.borderClass} ${priority.bgClass} rounded-r-xl p-4 hover:shadow-md transition-shadow cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-semibold ${priority.textClass} ${priority.badgeClass} px-2 py-1 rounded-full`}
                  >
                    {priority.label}
                  </span>
                  <span className="text-xs text-gray-500">{timeRemaining}</span>
                </div>
                <h4 className="font-bold text-gray-800 mb-1">{assignment.title}</h4>
                <p className="text-sm text-gray-600">{classroomName}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
  