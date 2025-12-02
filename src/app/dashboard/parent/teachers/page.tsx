"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { createConversationGeneric } from "@/hooks/use-chat";
import HeaderParent from "@/components/parent/Header";
import TeacherCard from "@/components/parent/TeacherCard";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type TeacherClassroomStudent = {
  id: string;
  fullname: string;
};

type TeacherClassroom = {
  id: string;
  name: string;
  code: string;
  icon: string;
  students: TeacherClassroomStudent[];
};

type TeacherItem = {
  id: string;
  email: string;
  fullname: string;
  classrooms: TeacherClassroom[];
};

type TeachersResponse = {
  success: boolean;
  data: TeacherItem[];
  message?: string;
};


export default function ParentTeachersPage() {
  const router = useRouter();
  const [sendingKey, setSendingKey] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<TeachersResponse>("/api/parent/teachers");

  const teachers: TeacherItem[] = data?.success && Array.isArray(data.data) ? data.data : [];

  const handleMessageTeacher = async (teacherId: string, classroomId: string, studentId: string) => {
    const key = `${teacherId}-${classroomId}-${studentId}`;
    try {
      setSendingKey(key);
      const res = await createConversationGeneric([teacherId, studentId], classroomId, studentId);
      const id = (res as any)?.conversationId as string | undefined;
      if (id) {
        router.push(`/dashboard/parent/messages?open=${encodeURIComponent(id)}`);
      }
    } catch (e) {
      console.error("[ParentTeachersPage] createConversation error", e);
    } finally {
      setSendingKey((current) => (current === key ? null : current));
    }
  };

  if (isLoading) {
    return (
      <>
        <HeaderParent
          title="Giáo viên của con"
          subtitle="Danh sách giáo viên phụ trách các lớp mà con bạn đang theo học"
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <>
        <HeaderParent
          title="Giáo viên của con"
          subtitle="Danh sách giáo viên phụ trách các lớp mà con bạn đang theo học"
        />
        <EmptyState
          icon="❌"
          title="Có lỗi xảy ra"
          description="Không thể tải danh sách giáo viên. Vui lòng thử lại sau."
          variant="parent"
        />
      </>
    );
  }

  if (teachers.length === 0) {
    return (
      <>
        <HeaderParent
          title="Giáo viên của con"
          subtitle="Danh sách giáo viên phụ trách các lớp mà con bạn đang theo học"
        />
        <EmptyState
          icon="👨‍🏫"
          title="Chưa có giáo viên nào"
          description="Khi con của bạn tham gia các lớp học, danh sách giáo viên phụ trách sẽ xuất hiện tại đây để bạn dễ dàng trao đổi."
          variant="parent"
        />
      </>
    );
  }

  return (
    <>
      <HeaderParent
        title="Giáo viên của con"
        subtitle="Danh sách giáo viên phụ trách các lớp mà con bạn đang theo học"
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => (
          <TeacherCard
            key={teacher.id}
            teacher={teacher}
            classrooms={teacher.classrooms}
            onMessageTeacher={handleMessageTeacher}
            sendingKey={sendingKey}
          />
        ))}
      </div>
    </>
  );
}
