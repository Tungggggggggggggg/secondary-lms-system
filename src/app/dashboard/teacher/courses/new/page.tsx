"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Page() {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = title.trim().length > 0 && !saving;

  const onSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      const res = await fetch("/api/teachers/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          coverImage: null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo khóa học");
      }

      toast({ title: "Đã tạo khóa học", variant: "success" });
      const id = json?.data?.id as string | undefined;
      if (id) {
        router.push(`/dashboard/teacher/courses/${id}`);
      } else {
        router.push("/dashboard/teacher/courses");
      }
    } catch (e) {
      toast({
        title: "Tạo khóa học thất bại",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        role="teacher"
        title="Tạo khóa học mới"
        subtitle="Tạo khóa học, thêm bài học và gán vào lớp để học sinh sử dụng Tutor."
      />

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-800">Tên khóa học</div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Toán - Đại số cơ bản"
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-800">Mô tả (tuỳ chọn)</div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mục tiêu học tập, nội dung chính, yêu cầu..."
            rows={5}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/teacher/courses")} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {saving ? "Đang tạo..." : "Tạo khóa học"}
          </Button>
        </div>
      </div>
    </div>
  );
}

