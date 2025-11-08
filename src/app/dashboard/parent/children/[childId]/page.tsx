"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Mail, GraduationCap, Calendar, BookOpen, Award } from "lucide-react";

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

export default function ParentChildDetailPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { data: session } = useSession();
  const router = useRouter();

  // Lấy danh sách con để tìm con được chọn
  const { data: childrenData, error: childrenError, isLoading: childrenLoading } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
    error?: string;
  }>("/api/parent/children", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const children = (childrenData?.success && childrenData?.items) ? childrenData.items : [];
  const selectedChild = children.find((rel) => rel.student.id === childId || rel.studentId === childId);

  if (childrenLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (childrenError || !childrenData?.success) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.</p>
            <Link href="/dashboard/parent/children">
              <Button className="mt-4">Quay lại</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">Không tìm thấy thông tin học sinh này.</p>
            <Link href="/dashboard/parent/children">
              <Button>Quay lại danh sách</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const student = selectedChild.student;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/parent/children">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{student.fullname || "Học sinh"}</h1>
          <p className="text-gray-600 mt-2">Thông tin chi tiết về học sinh</p>
        </div>
      </div>

      {/* Student Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin cơ bản
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Họ và tên</label>
              <p className="text-lg font-semibold text-gray-900">{student.fullname || "Không có"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="text-lg text-gray-900">{student.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                Vai trò
              </label>
              <p className="text-lg text-gray-900">Học sinh</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Ngày liên kết
              </label>
              <p className="text-lg text-gray-900">
                {new Date(selectedChild.createdAt).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Học tập
            </CardTitle>
            <CardDescription>Thông tin về học tập (Sắp ra mắt)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">Tính năng đang được phát triển</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bài tập</CardTitle>
            <CardDescription>Danh sách bài tập (Sắp ra mắt)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Tính năng đang được phát triển</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Điểm số</CardTitle>
            <CardDescription>Bảng điểm (Sắp ra mắt)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Tính năng đang được phát triển</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

