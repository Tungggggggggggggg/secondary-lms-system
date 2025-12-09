"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Mail, GraduationCap, Calendar, BookOpen, Award } from "lucide-react";
import type { ParentStudentRelationship } from "@/types/parent";

// types imported from shared module; SWR fetcher is provided globally

export default function ParentChildDetailPage() {
  const params = useParams();
  const childId = params.childId as string;
  const { data: session } = useSession();
  const router = useRouter();

  // Láº¥y danh sÃ¡ch con Ä‘á»ƒ tÃ¬m con Ä‘Æ°á»£c chá»n
  const { data: childrenData, error: childrenError, isLoading: childrenLoading } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
    error?: string;
  }>("/api/parent/children");

  const children = (childrenData?.success && childrenData?.items) ? childrenData.items : [];
  const selectedChild = children.find((rel) => rel.student.id === childId || rel.studentId === childId);

  if (childrenLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-amber-700">Äang táº£i...</p>
        </div>
      </div>
    );
  }

  if (childrenError || !childrenData?.success) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center">
            <p className="text-red-600">CÃ³ lá»—i xáº£y ra khi táº£i dá»¯ liá»‡u. Vui lÃ²ng thá»­ láº¡i sau.</p>
            <Link href="/dashboard/parent/children">
              <Button color="amber" className="mt-4">Quay láº¡i</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 to-orange-50/20">
          <CardContent className="py-12 text-center">
            <p className="text-amber-700 mb-4">KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin há»c sinh nÃ y.</p>
            <Link href="/dashboard/parent/children">
              <Button color="amber">Quay láº¡i danh sÃ¡ch</Button>
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
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-50/60 to-orange-50/40 p-6 rounded-lg border border-amber-100">
        <div>
          <Link href="/dashboard/parent/children">
            <Button variant="ghost" size="default" color="amber" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay láº¡i
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-amber-900">{student.fullname || "Há»c sinh"}</h1>
          <p className="text-amber-700 mt-2">ThÃ´ng tin chi tiáº¿t vá» há»c sinh</p>
        </div>
      </div>

      {/* Student Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 to-orange-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <User className="h-5 w-5 text-amber-600" />
              ThÃ´ng tin cÆ¡ báº£n
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-amber-700">Há» vÃ  tÃªn</label>
              <p className="text-lg font-semibold text-gray-900">{student.fullname || "KhÃ´ng cÃ³"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-amber-700 flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="text-lg text-gray-900">{student.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-amber-700 flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                Vai trÃ²
              </label>
              <p className="text-lg text-gray-900">Há»c sinh</p>
            </div>
            <div>
              <label className="text-sm font-medium text-amber-700 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                NgÃ y liÃªn káº¿t
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

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 to-orange-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Há»c táº­p
            </CardTitle>
            <CardDescription className="text-amber-700">ThÃ´ng tin vá» há»c táº­p (Sáº¯p ra máº¯t)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-amber-700">
              <Award className="h-12 w-12 mx-auto mb-3 text-amber-400" />
              <p className="text-sm">TÃ­nh nÄƒng Ä‘ang Ä‘Æ°á»£c phÃ¡t triá»ƒn</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 to-orange-50/20">
          <CardHeader>
            <CardTitle className="text-amber-900">BÃ i táº­p</CardTitle>
            <CardDescription className="text-amber-700">Danh sÃ¡ch bÃ i táº­p (Sáº¯p ra máº¯t)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-amber-700">
              <p className="text-sm">TÃ­nh nÄƒng Ä‘ang Ä‘Æ°á»£c phÃ¡t triá»ƒn</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 to-orange-50/20">
          <CardHeader>
            <CardTitle className="text-amber-900">Äiá»ƒm sá»‘</CardTitle>
            <CardDescription className="text-amber-700">Xem báº£ng Ä‘iá»ƒm vÃ  káº¿t quáº£ há»c táº­p</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto mb-3 text-amber-500" />
              <p className="text-sm text-amber-700 mb-4">Xem táº¥t cáº£ Ä‘iá»ƒm sá»‘ vÃ  káº¿t quáº£ há»c táº­p cá»§a con</p>
              <Link href={`/dashboard/parent/children/${childId}/grades`}>
                <Button color="amber" className="w-full">
                  Xem Ä‘iá»ƒm sá»‘
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



