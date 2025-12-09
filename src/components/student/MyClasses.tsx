"use client";

import { useEffect } from "react";
import { useClassroom } from "@/hooks/use-classroom";
import Link from "next/link";
import { SectionCard } from "@/components/shared";
import ClassCard from "@/components/student/ClassCard";
import { BookOpen, ChevronRight } from "lucide-react";

export default function MyClasses() {
  const { classrooms, isLoading, error, fetchClassrooms } = useClassroom();

  // Tự động fetch khi component mount
  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  if (isLoading) {
    return (
      <SectionCard
        className="student-border"
        title={
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            <span>Lớp học của tôi</span>
          </div>
        }
        actions={
          <Link href="/dashboard/student/classes/join" className="text-sm font-semibold text-green-600 hover:text-green-700 inline-flex items-center">
            Tham gia lớp mới
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        }
      >
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded-xl"></div>
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
            <BookOpen className="h-5 w-5 text-green-600" />
            <span>Lớp học của tôi</span>
          </div>
        }
        actions={
          <Link href="/dashboard/student/classes/join" className="text-sm font-semibold text-green-600 hover:text-green-700 inline-flex items-center">
            Tham gia lớp mới
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        }
      >
        <div className="text-red-500 text-center py-4">Có lỗi xảy ra: {error}</div>
      </SectionCard>
    );
  }

  if (!classrooms || classrooms.length === 0) {
    return (
      <SectionCard
        className="student-border"
        title={
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            <span>Lớp học của tôi</span>
          </div>
        }
        actions={
          <Link href="/dashboard/student/classes/join" className="text-sm font-semibold text-green-600 hover:text-green-700 inline-flex items-center">
            Tham gia lớp mới
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        }
      >
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">Bạn chưa tham gia lớp học nào.</p>
          <Link href="/dashboard/student/classes/join" className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700">
            Tham gia lớp học đầu tiên
            <ChevronRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      className="student-border"
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-green-600" />
          <span>Lớp học của tôi</span>
        </div>
      }
      actions={
        <Link href="/dashboard/student/classes/join" className="text-sm font-semibold text-green-600 hover:text-green-700 inline-flex items-center">
          Tham gia lớp mới
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      <div className="space-y-4">
        {classrooms.map((classroom) => (
          <ClassCard
            key={classroom.id}
            id={classroom.id}
            name={classroom.name}
            icon={classroom.icon}
            code={classroom.code}
            teacherName={classroom.teacher?.fullname || "Giáo viên"}
            studentCount={classroom._count?.students || 0}
            joinedAt={classroom.joinedAt}
          />
        ))}
      </div>
    </SectionCard>
  );
}
