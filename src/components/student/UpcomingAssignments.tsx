"use client";

import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SectionCard from "@/components/shared/SectionCard";
import TabsButton, { type TabOption } from "@/components/shared/TabsButton";
import AssignmentCard from "@/components/student/AssignmentCard";
import type { PriorityLevel } from "@/components/shared/PriorityBadge";
import { ClipboardList } from "lucide-react";

export default function UpcomingAssignments() {
  const { assignments, isLoading, error, fetchAllAssignments } = useStudentAssignments();

  useEffect(() => {
    fetchAllAssignments();
  }, [fetchAllAssignments]);

  // Tabs: all | soon (<=72h) | overdue
  const [tab, setTab] = useState<"all" | "soon" | "overdue">("soon");

  const { soonList, overdueList, allList } = useMemo(() => {
    const result = { soonList: [] as typeof assignments, overdueList: [] as typeof assignments, allList: [] as typeof assignments };
    if (!assignments || assignments.length === 0) return result;

    const now = new Date();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const soonHoursBound = 72; // 3 ngày

    const list = assignments
      .filter((a) => a.dueDate && (!a.submission || a.status === "pending"))
      .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime());

    const soon: typeof assignments = [];
    const overdue: typeof assignments = [];
    const all: typeof assignments = [];

    list.forEach((a) => {
      const due = new Date(a.dueDate as string);
      const diffMs = due.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffMs < 0) overdue.push(a);
      if (diffHours <= soonHoursBound && diffHours >= 0) soon.push(a);
      if (diffMs >= 0 && diffMs <= sevenDays) all.push(a);
    });

    return { soonList: soon.slice(0, 5), overdueList: overdue.slice(0, 5), allList: all.slice(0, 5) };
  }, [assignments]);

  const getPriority = (dueDate: string): PriorityLevel => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours <= 24) return "urgent";
    if (hours <= 72) return "high";
    return "normal";
  };

  const tabOptions: TabOption[] = [
    { id: "soon", label: "Sắp đến hạn" },
    { id: "overdue", label: "Quá hạn" },
    { id: "all", label: "7 ngày tới" },
  ];

  if (isLoading) {
    return (
      <SectionCard
        className="student-border"
        title={
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-green-600" />
            <span>Bài tập sắp tới</span>
          </div>
        }
        actions={<Link href="/dashboard/student/assignments" className="text-sm text-green-600 hover:text-green-700 font-semibold">Xem tất cả</Link>}
      >
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard
        className="student-border"
        title={
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-green-600" />
            <span>Bài tập sắp tới</span>
          </div>
        }
        actions={<Link href="/dashboard/student/assignments" className="text-sm text-green-600 hover:text-green-700 font-semibold">Xem tất cả</Link>}
      >
        <div className="text-red-500 text-center py-4">Có lỗi xảy ra: {String(error)}</div>
      </SectionCard>
    );
  }

  const activeList = tab === "soon" ? soonList : tab === "overdue" ? overdueList : allList;

  if (!activeList || activeList.length === 0) {
    return (
      <SectionCard
        className="student-border"
        title={
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-green-600" />
            <span>Bài tập sắp tới</span>
          </div>
        }
        actions={<Link href="/dashboard/student/assignments" className="text-sm text-green-600 hover:text-green-700 font-semibold">Xem tất cả</Link>}
      >
        <TabsButton
          tabs={tabOptions}
          activeTab={tab}
          onTabChange={(id) => setTab(id as "all" | "soon" | "overdue")}
          size="sm"
          accent="student"
        />
        <div className="text-center py-8 text-gray-500 mt-4">
          <p>Không có bài tập nào</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      className="student-border"
      title={
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-green-600" />
          <span>Bài tập sắp tới</span>
        </div>
      }
      actions={<Link href="/dashboard/student/assignments" className="text-sm text-green-600 hover:text-green-700 font-semibold">Xem tất cả</Link>}
    >
      <TabsButton
        tabs={tabOptions}
        activeTab={tab}
        onTabChange={(id) => setTab(id as "all" | "soon" | "overdue")}
        size="sm"
        accent="student"
      />
      <div className="space-y-4 mt-4">
        {activeList.map((assignment) => {
          if (!assignment.dueDate) return null;
          const priority = getPriority(assignment.dueDate);
          const classroomName = assignment.classroom?.name || "Lớp học";

          return (
            <AssignmentCard
              key={assignment.id}
              id={assignment.id}
              title={assignment.title}
              classroomName={classroomName}
              dueDate={assignment.dueDate}
              priority={priority}
            />
          );
        })}
      </div>
    </SectionCard>
  );
}