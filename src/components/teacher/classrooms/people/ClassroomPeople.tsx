"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import gsap from "gsap";
import { useClassroomStudents } from "@/hooks/use-classroom-students";
import type { ClassroomStudent } from "@/hooks/use-classroom-students";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createConversationFromTeacher } from "@/hooks/use-chat";
import { StatsGrid } from "@/components/shared";
import { EmptyState } from "@/components/shared";
import { Users, NotebookText, BarChart3, GraduationCap } from "lucide-react";
import StudentsTable from "@/components/teacher/students/StudentsTable";
import type { StudentListItem } from "@/components/teacher/students/StudentList";

export default function ClassroomPeople() {
    const params = useParams();
    const classroomId = params.classroomId as string;
    const router = useRouter();
    const { students, isLoading, error, refresh, getStatistics, searchStudents } = useClassroomStudents(classroomId);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [sortKey, setSortKey] = useState<"name" | "submitted" | "grade">("name");
    const rootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<"list" | "table">(() => {
        if (typeof window === "undefined") return "list";
        return (window.localStorage.getItem("teacher:people:view") as "list" | "table") || "list";
    });
    useEffect(() => {
        try { window.localStorage.setItem("teacher:people:view", view); } catch {}
    }, [view]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
    const displayedStudents = useMemo(() => {
        const data = [...filteredStudents];
        if (sortKey === "name") {
            data.sort((a, b) => (a.fullname || "").localeCompare(b.fullname || "", "vi"));
        } else if (sortKey === "grade") {
            const ag = (x: any) => (x?.stats?.averageGrade ?? -1);
            data.sort((a, b) => ag(b) - ag(a));
        } else if (sortKey === "submitted") {
            const rate = (x: any) => {
                const t = x?.stats?.totalAssignments || 0;
                if (!t) return -1;
                return (x?.stats?.submittedCount || 0) / t;
            };
            data.sort((a, b) => rate(b) - rate(a));
        }
        return data;
    }, [filteredStudents, sortKey]);

    const tableStudents: StudentListItem[] = useMemo(() => {
        return displayedStudents.map((s: ClassroomStudent) => {
            const total = s.stats.totalAssignments || 0;
            const rate = total ? (s.stats.submittedCount / total) * 100 : 0;
            return {
                id: s.id,
                fullname: s.fullname,
                avatarInitial: (s.fullname || "").charAt(0).toUpperCase(),
                classroomId,
                classroomName: "",
                classroomCode: "",
                averageGrade: s.stats.averageGrade,
                submissionRate: rate,
                submittedCount: s.stats.submittedCount,
                totalAssignments: total,
                status: "active",
            } as StudentListItem;
        });
    }, [displayedStudents, classroomId]);

    const toggleOne = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const toggleAll = (checked: boolean) => {
        setSelectedIds(checked ? tableStudents.map((s) => s.id) : []);
    };

    const exportCsv = () => {
        const header = [
            "id","fullname","averageGrade","submissionRate","submitted","totalAssignments"
        ];
        const rows = tableStudents
            .filter((s) => selectedIds.length === 0 || selectedIds.includes(s.id))
            .map((s) => [
                s.id,
                s.fullname.replaceAll('"','""'),
                s.averageGrade ?? "",
                Math.round(s.submissionRate),
                s.submittedCount,
                s.totalAssignments,
            ]);
        const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "students.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

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
            <StatsGrid
                items={[
                    { icon: <Users className="h-5 w-5" />, color: "from-blue-200 to-indigo-200", label: "Học sinh", value: String(stats.totalStudents) },
                    { icon: <NotebookText className="h-5 w-5" />, color: "from-sky-200 to-indigo-200", label: "Bài tập", value: String(stats.totalAssignments) },
                    { icon: <BarChart3 className="h-5 w-5" />, color: "from-emerald-200 to-green-200", label: "Tỷ lệ nộp", value: `${stats.submissionRate}%` },
                    { icon: <GraduationCap className="h-5 w-5" />, color: "from-amber-200 to-orange-200", label: "Điểm TB", value: stats.averageGrade != null ? stats.averageGrade.toFixed(1) : "-" },
                ]}
                onItemClick={(_, idx) => {
                    if (idx === 0) setSortKey("name");
                    if (idx === 2) setSortKey("submitted");
                    if (idx === 3) setSortKey("grade");
                }}
            />

            {/* Search / Controls */}
            <div className="bg-white rounded-lg p-4 shadow flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                    placeholder="Tìm kiếm học sinh theo tên hoặc email..."
                    aria-label="Tìm kiếm học sinh"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSearch();
                        }
                    }}
                    className="h-11 sm:max-w-sm"
                />
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-xl border border-blue-200 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setView("list")}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm ${view === "list" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
                            aria-pressed={view === "list"}
                        >
                            Danh sách
                        </button>
                        <button
                            type="button"
                            onClick={() => setView("table")}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm border-l border-blue-200 ${view === "table" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
                            aria-pressed={view === "table"}
                        >
                            Bảng
                        </button>
                    </div>
                    {view === "table" && (
                        <Button variant="outline" onClick={exportCsv}>Xuất CSV</Button>
                    )}
                </div>
            </div>

            {/* Students List */}
            <section className="rounded-lg border border-gray-200 bg-white shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                        Danh sách học sinh ({displayedStudents.length})
                    </h2>
                </div>

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
                        <h3 className="font-semibold mb-2">Lỗi tải danh sách học sinh</h3>
                        <p className="text-sm mb-4">{error}</p>
                        <Button onClick={() => refresh()}>Thử lại</Button>
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
                ) : displayedStudents.length === 0 ? (
                    <EmptyState
                        title={searchQuery ? "Không có kết quả" : "Chưa có học sinh"}
                        description={searchQuery ? "Hãy thử đổi từ khóa hoặc xoá bộ lọc." : "Khi có học sinh tham gia, danh sách sẽ hiển thị ở đây."}
                        variant="teacher"
                        icon={<Users className="h-10 w-10 text-blue-600" />}
                    />
                ) : view === "table" ? (
                    <>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                                <div>{selectedIds.length} mục đã chọn</div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" onClick={exportCsv}>Xuất CSV</Button>
                                    <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Bỏ chọn</Button>
                                </div>
                            </div>
                        )}
                        <StudentsTable students={tableStudents} selectedIds={selectedIds} onToggleOne={toggleOne} onToggleAll={toggleAll} />
                    </>
                ) : (
                    <div className="space-y-3">
                        {displayedStudents.map((student: ClassroomStudent) => (
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
                                        {student.parents && student.parents.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {student.parents.map((p: NonNullable<ClassroomStudent["parents"]>[number]) => (
                                                    <span key={p.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700">
                                                        <span>👨‍👩‍👧</span>
                                                        <span className="font-medium">{p.fullname}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
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
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push(`/dashboard/teacher/classrooms/${classroomId}/people/${student.id}`)}
                                        >
                                            Xem chi tiết
                                        </Button>
                                        <Button
                                            onClick={async () => {
                                                try {
                                                    const res = await createConversationFromTeacher(student.id, true, classroomId);
                                                    const id = res?.conversationId as string | undefined;
                                                    if (id) router.push(`/dashboard/teacher/messages?open=${encodeURIComponent(id)}`);
                                                } catch (e) {
                                                    console.error("[ClassroomPeople] createConversation error", e);
                                                }
                                            }}
                                        >
                                            Nhắn tin
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
