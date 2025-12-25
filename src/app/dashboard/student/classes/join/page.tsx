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
import { PageHeader } from "@/components/shared";
import { Hash } from "lucide-react";

export default function JoinClassPage() {
    const { joinClassroom, isLoading, getLastError } = useClassroom();
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
            toast({
                title: "Tham gia thất bại",
                description: getLastError() || "Không thể tham gia lớp học",
                variant: "destructive",
            });
        }
    };

    // Breadcrumb items
    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard/student/dashboard" },
        { label: "Lớp học", href: "/dashboard/student/classes" },
        { label: "Tham gia lớp", href: "/dashboard/student/classes/join" },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumb items={breadcrumbItems} color="green" />

            <PageHeader
              role="student"
              title="Tham gia lớp học"
              subtitle="Nhập mã lớp do giáo viên cung cấp để tham gia lớp."
              badge={<BackButton href="/dashboard/student/classes" />}
            />

            <div className="max-w-md mx-auto">
              <div className="bg-card rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] p-6 border border-border">
                <form onSubmit={handleSubmit} className="space-y-4" aria-label="Biểu mẫu tham gia lớp học">
                  <div>
                    <Label htmlFor="code">Mã lớp học</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="code"
                        placeholder="VD: 12A2-DEMO"
                        className="mt-1 uppercase pl-9 h-12"
                        color="green"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                        autoComplete="off"
                        inputMode="text"
                        aria-describedby="code-help"
                        pattern="[A-Za-z0-9-]{4,20}"
                      />
                    </div>
                    <p id="code-help" className="text-xs text-muted-foreground mt-1">
                      Nhập mã lớp học mà giáo viên đã cung cấp (chữ hoa/số, có thể có dấu gạch nối).
                    </p>
                  </div>

                  <Button
                    type="submit"
                    color="green"
                    size="lg"
                    className="w-full gap-2"
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading ? "Đang xử lý..." : "Tham gia lớp"}
                  </Button>
                </form>
              </div>
            </div>
        </div>
    );
}
