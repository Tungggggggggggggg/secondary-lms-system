"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import { ClassroomResponse } from "@/types/classroom";
import { SectionCard } from "@/components/shared";
import { BookOpen, Calendar, FileText, ChevronRight } from "lucide-react";

export default function RecentClasses() {
    const router = useRouter();
    const { classrooms, isLoading } = useClassroom();

    // Lấy 3 lớp học mới nhất, sắp xếp theo createdAt (mới nhất trước)
    const recentClasses = useMemo(() => {
        if (!classrooms || classrooms.length === 0) return [];
        
        const sorted = [...classrooms].sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA; // Mới nhất trước
        });
        
        return sorted.slice(0, 3); // Lấy 3 lớp đầu tiên
    }, [classrooms]);

    // Helper function để format ngày tháng
    const formatDate = (dateString: string | Date) => {
        const date = new Date(dateString);
        const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return ` ${day}/${month}/${year}`;
    };

    // Teacher role gradient (không phụ thuộc emoji)
    const teacherGradient = "from-indigo-500 to-purple-600";

    if (isLoading) {
        return (
            <SectionCard
                title={<div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /><span>Lớp học gần đây</span></div>}
                actions={<Link href="/dashboard/teacher/classrooms" className="text-sm font-semibold text-green-600 hover:text-green-700 inline-flex items-center">Xem tất cả <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>}
            >
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 rounded-2xl bg-muted/80 animate-pulse" />
                    ))}
                </div>
            </SectionCard>
        );
    }

    return (
        <SectionCard
            title={<div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /><span>Lớp học gần đây</span></div>}
            actions={<Link href="/dashboard/teacher/classrooms" className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-indigo-700 group-hover:text-indigo-700">Xem tất cả <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>}
        >
            <div className="space-y-4">
                {recentClasses.length > 0 ? (
                    recentClasses.map((classroom: ClassroomResponse) => (
                        <div
                            key={classroom.id}
                            onClick={() => router.push(`/dashboard/teacher/classrooms/${classroom.id}`)}
                            className="group cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.currentTarget !== event.target) return;
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    router.push(`/dashboard/teacher/classrooms/${classroom.id}`);
                                }
                            }}
                        >
                            <div className="flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl bg-card/95 border border-border shadow-[0_8px_24px_rgba(15,23,42,0.06)] px-5 py-4 sm:px-6 sm:py-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                                <div className="flex items-center sm:items-start gap-3 sm:gap-4 flex-shrink-0">
                                    <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${teacherGradient} text-white shadow-sm`}>
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                </div>

                                <div className="flex flex-1 flex-col justify-between gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-foreground line-clamp-2">
                                                {classroom.name}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-muted-foreground">
                                                {classroom._count?.students ?? 0}/{classroom.maxStudents} học sinh
                                            </p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border ${
                                                    classroom.isActive
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                        : "bg-muted text-muted-foreground border-border"
                                                }`}
                                            >
                                                {classroom.isActive ? "Đang hoạt động" : "Đã lưu trữ"}
                                            </span>
                                            {classroom.code ? (
                                                <div className="text-[11px] text-muted-foreground">Mã: {classroom.code}</div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs text-muted-foreground">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground border border-border">
                                                <Calendar className="h-3 w-3" />
                                                <span>{formatDate(classroom.createdAt)}</span>
                                            </span>
                                            {classroom.description && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border max-w-xs truncate">
                                                    <FileText className="h-3 w-3" />
                                                    <span className="truncate">{classroom.description}</span>
                                                </span>
                                            )}
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                                            Vào lớp
                                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-4">Chưa có lớp học nào</p>
                        <Link href="/dashboard/teacher/classrooms/new" className="text-sm font-semibold text-purple-600 hover:text-purple-700 inline-flex items-center">
                            Tạo lớp học đầu tiên
                            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                )}
            </div>
        </SectionCard>
    );
}
