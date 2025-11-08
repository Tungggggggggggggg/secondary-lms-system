"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, GraduationCap, ArrowRight, Users } from "lucide-react";
import { formatDate } from "@/lib/admin/format-date";

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

export default function ParentChildrenPage() {
  const { data: session } = useSession();
  const { data, error, isLoading, mutate } = useSWR<{
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Con của tôi</h1>
          <p className="text-gray-600 mt-2">Danh sách các con đã được liên kết với tài khoản của bạn</p>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Con của tôi</h1>
          <p className="text-gray-600 mt-2">Danh sách các con đã được liên kết với tài khoản của bạn</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.</p>
            <Button onClick={() => mutate()} className="mt-4">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Con của tôi</h1>
        <p className="text-gray-600 mt-2">
          Danh sách các con đã được liên kết với tài khoản của bạn ({total} {total === 1 ? "học sinh" : "học sinh"})
        </p>
      </div>

      {/* Children List */}
      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chưa có học sinh nào được liên kết
            </h3>
            <p className="text-gray-600 mb-4">
              Hãy liên hệ với quản trị viên để được liên kết với tài khoản học sinh của con bạn.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((relationship) => {
            const student = relationship.student;
            return (
              <Card key={relationship.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.fullname?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{student.fullname || "Không có tên"}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {student.email}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <GraduationCap className="h-4 w-4" />
                      <span>Học sinh</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Liên kết từ:</span>{" "}
                      {formatDate(relationship.createdAt, "medium")}
                    </div>
                    <div className="pt-3 border-t">
                      <Link href={`/dashboard/parent/children/${student.id}`}>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          Xem chi tiết
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

