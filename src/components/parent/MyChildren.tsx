"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, User } from "lucide-react";

interface Student {
  id: string;
  email: string;
  fullname: string;
  role: string;
}

interface ParentStudentRelationship {
  id: string;
  studentId: string;
  createdAt: string;
  student: Student;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MyChildren() {
  const { data: session } = useSession();
  const { data, error, isLoading } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
    error?: string;
  }>("/api/parent/children", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const children = (data?.success && data?.items) ? data.items : [];
  const total = data?.total || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Con của tôi
          </CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Con của tôi
          </CardTitle>
          <CardDescription>Không thể tải dữ liệu</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Con của tôi
        </CardTitle>
        <CardDescription>
          {total === 0
            ? "Chưa có học sinh nào được liên kết"
            : `${total} ${total === 1 ? "học sinh" : "học sinh"} được liên kết`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {children.length === 0 ? (
          <div className="text-center py-6">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              Hãy liên hệ với quản trị viên để được liên kết với tài khoản học sinh của con bạn.
            </p>
            <Link href="/dashboard/parent/children">
              <Button variant="outline" size="sm">
                Xem thêm
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {children.slice(0, 3).map((relationship) => {
              const student = relationship.student;
              return (
                <Link
                  key={relationship.id}
                  href={`/dashboard/parent/children/${student.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {student.fullname?.charAt(0).toUpperCase() || "S"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {student.fullname || "Không có tên"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{student.email}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
            {children.length > 3 && (
              <Link href="/dashboard/parent/children">
                <Button variant="outline" className="w-full" size="sm">
                  Xem tất cả ({total})
                </Button>
              </Link>
            )}
            {children.length <= 3 && (
              <Link href="/dashboard/parent/children">
                <Button variant="outline" className="w-full" size="sm">
                  Xem chi tiết
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

