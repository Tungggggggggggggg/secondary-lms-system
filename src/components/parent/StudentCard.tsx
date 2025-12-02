"use client";

import Link from "next/link";
import { Mail, ArrowRight, GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/admin/format-date";

interface StudentCardProps {
  student: {
    id: string;
    email: string;
    fullname: string;
  };
  createdAt?: string;
  href?: string;
  actionButton?: React.ReactNode;
  className?: string;
}

export default function StudentCard({
  student,
  createdAt,
  href = `/dashboard/parent/children/${student.id}`,
  actionButton,
  className = "",
}: StudentCardProps) {
  const initial = student.fullname?.charAt(0).toUpperCase() || "S";

  return (
    <Card className={`border-amber-100 hover:shadow-lg hover:border-amber-200 transition-all duration-300 hover:scale-102 group ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg transition-transform duration-300 group-hover:scale-110">
              {initial}
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-amber-700 transition-colors duration-300">
                {student.fullname || "Không có tên"}
              </CardTitle>
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
          {createdAt && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">Liên kết từ:</span>{" "}
              {formatDate(createdAt, "medium")}
            </div>
          )}
          <div className="pt-3 border-t border-amber-100">
            {actionButton ? (
              actionButton
            ) : (
              <Link href={href}>
                <Button variant="outline" color="amber" className="w-full flex items-center justify-center gap-2 transition-all duration-300">
                  Xem chi tiết
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
