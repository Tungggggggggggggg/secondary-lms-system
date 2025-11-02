"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import { useClassroom } from "@/hooks/use-classroom";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function JoinClassPage() {
    const { joinClassroom, isLoading } = useClassroom();
    const [code, setCode] = useState("");
    const router = useRouter();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            toast({
                title: "Lỗi",
                description: "Vui lòng nhập mã lớp học",
                variant: "destructive",
            });
            return;
        }

        const classroom = await joinClassroom(code.trim().toUpperCase());
        if (classroom) {
            toast({
                title: "Thành công",
                description: "Đã tham gia lớp học thành công!",
                variant: "success",
            });
            router.push(`/dashboard/student/classes/${classroom.id}`);
        } else {
            // Error đã được xử lý trong hook
        }
    };

    // Breadcrumb items
    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard/student/dashboard" },
        { label: "Lớp học", href: "/dashboard/student/classes" },
        { label: "Tham gia lớp", href: "/dashboard/student/classes/join" },
    ];

    return (
        <div className="max-w-md mx-auto p-6">
            <div className="mb-4">
                <Breadcrumb items={breadcrumbItems} />
            </div>
            <div className="mb-4 flex items-center justify-end">
                <BackButton href="/dashboard/student/classes" />
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h1 className="text-2xl font-bold mb-6 text-center">
                    Tham gia lớp học
                </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="code">Mã lớp học</Label>
                    <Input
                        id="code"
                        placeholder="Nhập mã lớp học"
                        className="mt-1 uppercase"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Nhập mã lớp học mà giáo viên đã cung cấp
                    </p>
                </div>

                <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                >
                    {isLoading ? "Đang xử lý..." : "Tham gia lớp"}
                </Button>
            </form>
            </div>
        </div>
    );
}
