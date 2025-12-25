"use client";

import Link from "next/link";
import { SectionCard } from "@/components/shared";
import { FileText, GraduationCap, MessageSquare, BookOpen } from "lucide-react";

interface Props {
  classId: string;
}

export default function StudentQuickActions({ classId }: Props) {
  const actions = [
    {
      icon: <BookOpen className="h-5 w-5" />, label: "Bài học", href: `/dashboard/student/classes/${classId}/lessons`,
    },
    {
      icon: <FileText className="h-5 w-5" />, label: "Bài tập", href: `/dashboard/student/classes/${classId}/assignments`,
    },
    {
      icon: <GraduationCap className="h-5 w-5" />, label: "Điểm số", href: `/dashboard/student/classes/${classId}/grades`,
    },
    {
      icon: <MessageSquare className="h-5 w-5" />, label: "Tin nhắn", href: `/dashboard/student/messages?class=${encodeURIComponent(classId)}`,
    },
  ];

  return (
    <SectionCard
      title={<span className="text-green-700">Hành động nhanh</span>}
      description="Truy cập nhanh các chức năng"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            aria-label={a.label}
            className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-green-200 bg-green-50/40 text-green-700 hover:bg-green-50 hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer group">
              <div className="transition-transform duration-200 group-hover:scale-110">
                {a.icon}
              </div>
              <p className="text-xs font-semibold mt-2 text-center">{a.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
