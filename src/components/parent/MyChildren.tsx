"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, User } from "lucide-react";
import type { ParentStudentRelationship } from "@/types/parent";

// types imported from shared module; SWR fetcher is provided globally

export default function MyChildren() {
  const { data, error, isLoading } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
    error?: string;
  }>("/api/parent/children");

  const children = (data?.success && data?.items) ? data.items : [];
  const total = data?.total || 0;

  if (isLoading) {
    return (
      <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            👨‍👩‍👧 Con của tôi
          </CardTitle>
          <CardDescription className="text-amber-700">Đang tải...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            👨‍👩‍👧 Con của tôi
          </CardTitle>
          <CardDescription className="text-amber-700">Không thể tải dữ liệu</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30 hover:border-amber-200 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          👨‍👩‍👧 Con của tôi
        </CardTitle>
        <CardDescription className="text-amber-700 font-medium">
          {total === 0
            ? "Chưa có học sinh nào được liên kết"
            : `${total} ${total === 1 ? "học sinh" : "học sinh"} được liên kết`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {children.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">👨‍👩‍👧</div>
            <p className="text-sm text-amber-700 font-medium mb-4">
              Hãy liên hệ với quản trị viên để được liên kết với tài khoản học sinh của con bạn.
            </p>
            <Link href="/dashboard/parent/children">
              <Button color="amber" size="sm">
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
                  className="block group"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border-l-4 border-l-transparent hover:border-l-amber-500 hover:bg-white/60 transition-all duration-300 hover:scale-102 hover:shadow-sm">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold transition-transform duration-300 group-hover:scale-110">
                      {student.fullname?.charAt(0).toUpperCase() || "S"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate group-hover:text-amber-700 transition-colors duration-300">
                        {student.fullname || "Không có tên"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{student.email}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 transition-all duration-300 group-hover:text-amber-600 group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
            {children.length > 3 && (
              <Link href="/dashboard/parent/children">
                <Button color="amber" variant="outline" className="w-full" size="sm">
                  Xem tất cả ({total})
                </Button>
              </Link>
            )}
            {children.length <= 3 && (
              <Link href="/dashboard/parent/children">
                <Button color="amber" variant="outline" className="w-full" size="sm">
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

