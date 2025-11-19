"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, GraduationCap, Users, MessageCircle } from "lucide-react";
import { createConversationGeneric } from "@/hooks/use-chat";

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ParentTeachersPage() {
  const router = useRouter();
  const [sendingKey, setSendingKey] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR<TeachersResponse>("/api/parent/teachers", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Giáo viên của con</h1>
          <p className="text-gray-600 mt-2">Đang tải danh sách giáo viên...</p>
        </div>
      </div>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Giáo viên của con</h1>
          <p className="text-gray-600 mt-2">Không thể tải danh sách giáo viên, vui lòng thử lại sau.</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-red-600 text-sm">
            Đã xảy ra lỗi khi tải dữ liệu.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Giáo viên của con</h1>
          <p className="text-gray-600 mt-2">Hiện chưa có giáo viên nào liên kết với các lớp của con bạn.</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-gray-500 text-sm">
            Khi con của bạn tham gia các lớp học, danh sách giáo viên phụ trách sẽ xuất hiện tại đây để bạn dễ dàng trao đổi.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Giáo viên của con</h1>
        <p className="text-gray-600 mt-2">
          Danh sách giáo viên phụ trách các lớp mà con bạn đang theo học. Bạn có thể chọn lớp và nhắn tin trực tiếp cho giáo viên.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => (
          <Card key={teacher.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>{teacher.fullname}</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                <Mail className="h-4 w-4" />
                <span>{teacher.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teacher.classrooms.map((cls) => (
                <div key={cls.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <span className="text-lg">{cls.icon || "📘"}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{cls.name}</div>
                        <div className="text-xs text-gray-500">Mã lớp: {cls.code}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-1 border-t border-dashed border-gray-200 mt-2">
                    {cls.students.map((student) => {
                      const key = `${teacher.id}-${cls.id}-${student.id}`;
                      const isSending = sendingKey === key;
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="text-gray-700">
                            <span className="text-xs text-gray-500 mr-1">Con:</span>
                            <span className="font-medium">{student.fullname}</span>
                          </div>
                          <Button
                            variant="default"
                            onClick={() => handleMessageTeacher(teacher.id, cls.id, student.id)}
                            disabled={isSending}
                            className="inline-flex items-center gap-1"
                          >
                            <MessageCircle className="h-4 w-4" />
                            {isSending ? "Đang mở..." : "Nhắn giáo viên"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
