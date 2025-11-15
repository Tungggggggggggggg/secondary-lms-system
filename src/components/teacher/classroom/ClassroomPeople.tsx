"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { useClassroomStudents } from "@/hooks/use-classroom-students";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ClassroomPeople() {
    const params = useParams();
    const classroomId = params.classroomId as string;
    const router = useRouter();
    const { students, isLoading, error, fetchClassroomStudents, getStatistics, searchStudents } = useClassroomStudents();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (classroomId) {
            fetchClassroomStudents(classroomId);
        }
    }, [classroomId, fetchClassroomStudents]);

    useEffect(() => {
        if (!rootRef.current) return;
        gsap.fromTo(
            rootRef.current.querySelectorAll("section"),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power1.out" }
        );
    }, [students]);

    const stats = getStatistics();
    const filteredStudents = searchQuery ? searchStudents(searchQuery) : students;

    useEffect(() => {
        const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const handleSearch = () => {
        setSearchQuery(searchInput.trim());
    };

    return (
        <div ref={rootRef} className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-gray-600">Tổng số học sinh</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalStudents}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-gray-600">Tổng số bài tập</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalAssignments}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-gray-600">Tỷ lệ nộp bài</p>
                    <p className="text-2xl font-bold text-indigo-600">{stats.submissionRate}%</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                    <p className="text-sm text-gray-600">Điểm trung bình</p>
                    <p className="text-2xl font-bold text-green-600">
                        {stats.averageGrade?.toFixed(1) || "-"}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg p-4 shadow flex gap-4">
                <Input
                    placeholder="Tìm kiếm học sinh theo tên hoặc email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSearch();
                        }
                    }}
                />
                <Button variant="outline" disabled>
                    Tìm kiếm
                </Button>
            </div>

            {/* Students List */}
            <section className="rounded-lg border border-gray-200 bg-white shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                        Danh sách học sinh ({filteredStudents.length})
                    </h2>
                </div>

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
                        <h3 className="font-semibold mb-2">Lỗi tải danh sách học sinh</h3>
                        <p className="text-sm mb-4">{error}</p>
                        <Button onClick={() => fetchClassroomStudents(classroomId)}>Thử lại</Button>
                    </div>
                ) : isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="flex-1">
                                    <Skeleton className="h-4 w-1/3 mb-2" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                                <Skeleton className="h-8 w-24" />
                            </div>
                        ))}
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        {searchQuery ? "Không tìm thấy học sinh nào" : "Chưa có học sinh nào trong lớp"}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredStudents.map((student) => (
                            <div
                                key={student.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <span className="text-indigo-600 font-bold text-lg">
                                            {student.fullname.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800">{student.fullname}</h3>
                                        <p className="text-sm text-gray-600">{student.email}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Tham gia: {new Date(student.joinedAt).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    student.stats.submittedCount === student.stats.totalAssignments
                                                        ? "bg-green-50 text-green-700 border-green-200"
                                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                }
                                            >
                                                {student.stats.submittedCount}/{student.stats.totalAssignments} bài
                                            </Badge>
                                        </div>
                                        {student.stats.averageGrade !== null && (
                                            <p className="text-sm font-semibold text-indigo-600">
                                                ĐTB: {student.stats.averageGrade.toFixed(1)}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push(`/dashboard/teacher/classrooms/${classroomId}/people/${student.id}`)}
                                    >
                                        Xem chi tiết
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}


