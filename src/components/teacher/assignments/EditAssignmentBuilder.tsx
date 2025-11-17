"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import EssayContentBuilder from "./EssayContentBuilder";
import QuizContentBuilder from "./QuizContentBuilder";
import ClassroomSelector from "./ClassroomSelector";

import { useAutoSave } from "@/hooks/useAutoSave";
import {
  AssignmentData,
  QuizQuestion,
  AssignmentType,
  SubmissionFormat,
} from "@/types/assignment-builder";
import { AntiCheatConfig } from "@/types/exam-system";

import { CheckCircle, AlertCircle } from "lucide-react";

interface EditAssignmentBuilderProps {
  assignmentId: string;
}

// Kiểu dữ liệu API trả về cho trang chỉnh sửa
type ApiOption = { id: string; label: string; content: string; isCorrect: boolean; order: number };
type ApiQuestion = { id: string; content: string; type: string; order: number; options?: ApiOption[] };
type ApiAssignment = {
  id: string;
  title: string;
  description?: string | null;
  type: AssignmentType;
  dueDate?: string | null;
  openAt?: string | null;
  lockAt?: string | null;
  timeLimitMinutes?: number | null;
  subject?: string | null;
  submission_format?: SubmissionFormat | null;
  max_attempts?: number | null;
  anti_cheat_config?: AntiCheatConfig | null;
  questions: ApiQuestion[];
  classrooms?: { classroomId: string }[];
};

export default function EditAssignmentBuilder({ assignmentId }: EditAssignmentBuilderProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<"basic" | "content" | "classrooms" | "preview">("basic");

  const [editData, setEditData] = useState<AssignmentData>({
    type: "ESSAY",
    title: "",
    description: "",
    subject: "",
    classrooms: [],
  });

  // Auto save
  const autoSave = useAutoSave(editData, {
    key: `edit_assignment_${assignmentId}`,
    interval: 30000,
    enabled: true,
  });

  // Fetch assignment detail and map to AssignmentData
  useEffect(() => {
    let mounted = true;

    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/assignments/${assignmentId}`);
        const result = await res.json();
        if (!result?.success) {
          setError(result?.message || "Không lấy được dữ liệu bài tập");
          return;
        }

        const data: ApiAssignment = result.data as ApiAssignment;
        const type: AssignmentType = data.type;

        // Map classrooms
        const selectedClassrooms: string[] = Array.isArray(data.classrooms)
          ? data.classrooms.map((c) => c.classroomId)
          : [];

        // Map questions
        const questions: ApiQuestion[] = Array.isArray(data.questions) ? data.questions : [];

        if (!mounted) return;

        const nextData: AssignmentData = {
          type,
          title: data.title || "",
          description: data.description || "",
          subject: data.subject || "",
          classrooms: selectedClassrooms,
          ...(type === "ESSAY"
            ? {
                essayContent: {
                  question: (questions[0]?.content as string) || "",
                  attachments: [],
                  submissionFormat: (data.submission_format ?? "BOTH") as SubmissionFormat,
                  openAt: data.openAt ? new Date(data.openAt) : new Date(),
                  dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                },
              }
            : {}),
          ...(type === "QUIZ"
            ? {
                quizContent: {
                  questions: questions.map((q) => ({
                    id: q.id,
                    content: q.content,
                    type: q.type,
                    options: (q.options || []).map((o) => ({
                      label: o.label,
                      content: o.content,
                      isCorrect: !!o.isCorrect,
                    })),
                    order: q.order,
                  })) as QuizQuestion[],
                  timeLimitMinutes: data.timeLimitMinutes || 30,
                  openAt: data.openAt ? new Date(data.openAt) : new Date(),
                  lockAt: data.lockAt ? new Date(data.lockAt) : undefined,
                  maxAttempts: data.max_attempts || 1,
                  antiCheatConfig: (data.anti_cheat_config as AntiCheatConfig) || {
                    preset: "BASIC",
                    shuffleQuestions: false,
                    shuffleOptions: false,
                    singleQuestionMode: false,
                    timePerQuestion: undefined,
                    requireFullscreen: false,
                    detectTabSwitch: false,
                    disableCopyPaste: false,
                  },
                },
              }
            : {}),
        };

        setEditData(nextData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (assignmentId) fetchDetail();
    return () => {
      mounted = false;
    };
  }, [assignmentId]);

  const canSave = useMemo(() => {
    if (!editData.title?.trim()) return false;
    if (editData.type === "ESSAY") {
      return !!editData.essayContent?.question?.trim() && !!editData.essayContent?.dueDate;
    }
    if (editData.type === "QUIZ") {
      const qs = editData.quizContent?.questions || [];
      if (!(qs.length > 0 && !!editData.quizContent?.lockAt)) return false;
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i];
        if (q.type === "SINGLE" || q.type === "TRUE_FALSE") {
          const count = (q.options || []).filter((o) => o.isCorrect).length;
          if (count !== 1) return false;
        }
        if (q.type === "FILL_BLANK") {
          const opts = (q.options || []).map(o => (o.content || '').trim()).filter(Boolean);
          if (opts.length < 1) return false;
          const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
          const set = new Set<string>();
          for (const c of opts) {
            const key = normalize(c);
            if (set.has(key)) return false;
            set.add(key);
          }
        }
      }
      return true;
    }
    return true;
  }, [editData]);

  const onChangeBasic = useCallback((field: "title" | "description" | "subject", value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const onChangeEssay = useCallback((content: NonNullable<AssignmentData["essayContent"]>) => {
    setEditData((prev) => ({ ...prev, essayContent: content }));
  }, []);

  const onChangeQuiz = useCallback((content: NonNullable<AssignmentData["quizContent"]>) => {
    setEditData((prev) => ({ ...prev, quizContent: content }));
  }, []);

  const onChangeClassrooms = useCallback((classrooms: string[]) => {
    setEditData((prev) => ({ ...prev, classrooms }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);

      if (editData.type === "QUIZ") {
        const qs = editData.quizContent?.questions || [];
        if (!qs.length) {
          toast({ title: "Lỗi validation", description: "Quiz cần có ít nhất 1 câu hỏi", variant: "destructive" });
          return;
        }
        for (let i = 0; i < qs.length; i++) {
          const q = qs[i];
          if (q.type === "SINGLE" || q.type === "TRUE_FALSE") {
            const count = (q.options || []).filter((o) => o.isCorrect).length;
            if (count !== 1) {
              toast({ title: "Lỗi đáp án đúng", description: `Câu ${i + 1} (${q.type}) phải có đúng 1 đáp án đúng`, variant: "destructive" });
              return;
            }
          }
          if (q.type === "FILL_BLANK") {
            const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
            const contents = (q.options || []).map(o => (o.content || '').trim()).filter(Boolean);
            if (contents.length < 1) {
              toast({ title: "Thiếu đáp án chấp nhận", description: `Câu ${i + 1} (FILL_BLANK) cần ít nhất 1 đáp án chấp nhận`, variant: "destructive" });
              return;
            }
            const set = new Set<string>();
            for (const c of contents) {
              const key = normalize(c);
              if (set.has(key)) {
                toast({ title: "Trùng đáp án chấp nhận", description: `Câu ${i + 1} (FILL_BLANK) có đáp án trùng nhau (sau khi bỏ dấu): "${c}"`, variant: "destructive" });
                return;
              }
              set.add(key);
            }
          }
        }
      }

      const basePayload: Record<string, unknown> = {
        title: editData.title,
        description: editData.description ?? null,
        type: editData.type,
        subject: editData.subject ?? null,
        classrooms: editData.classrooms || [],
      };

      if (editData.type === "ESSAY" && editData.essayContent) {
        basePayload.submissionFormat = editData.essayContent.submissionFormat;
        basePayload.openAt = editData.essayContent.openAt?.toISOString() || null;
        basePayload.dueDate = editData.essayContent.dueDate?.toISOString() || null;
        basePayload.timeLimitMinutes = null;
        basePayload.lockAt = null;
        basePayload.maxAttempts = null;
        basePayload.antiCheatConfig = null;
        basePayload.questions = [
          {
            id: "",
            content: editData.essayContent.question,
            type: "ESSAY",
            order: 1,
            options: [],
          },
        ];
      }

      if (editData.type === "QUIZ" && editData.quizContent) {
        basePayload.openAt = editData.quizContent.openAt?.toISOString() || null;
        basePayload.lockAt = editData.quizContent.lockAt?.toISOString() || null;
        basePayload.timeLimitMinutes = editData.quizContent.timeLimitMinutes || null;
        basePayload.maxAttempts = editData.quizContent.maxAttempts || 1;
        basePayload.antiCheatConfig = editData.quizContent.antiCheatConfig || null;
        basePayload.questions = (editData.quizContent.questions || []).map((q, idx) => ({
          id: q.id || "",
          content: q.content,
          type: q.type,
          order: q.order ?? idx + 1,
          options: (q.options || []).map((o, j) => ({
            label: o.label || String.fromCharCode(65 + j),
            content: o.content,
            isCorrect: !!o.isCorrect,
            order: j + 1,
          })),
        }));
      }

      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      const result = await res.json();

      if (!res.ok || !result?.success) {
        toast({ title: result?.message || "Cập nhật thất bại!", variant: "destructive" });
        return;
      }

      toast({ title: "Đã lưu thay đổi!", description: "Bài tập đã được cập nhật.", variant: "success" });
      router.push(`/dashboard/teacher/assignments/${assignmentId}`);
    } catch (err) {
      console.error("[EditAssignment] Save error:", err);
      toast({ title: "Có lỗi khi lưu!", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [editData, assignmentId, router, toast]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 md:px-0">
        <div className="bg-white p-7 rounded-2xl shadow">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="text-gray-600 font-medium">Đang tải dữ liệu bài tập...</div>
            <div className="text-sm text-gray-400">Vui lòng chờ trong giây lát</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="py-12 text-center text-red-500">Lỗi: {error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={editData.type === "ESSAY" ? "bg-indigo-50 text-indigo-700" : "bg-pink-50 text-pink-700"}>
              {editData.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}
            </Badge>
            <span className="text-xs text-gray-500">ID: {assignmentId}</span>
          </div>
          <Input
            value={editData.title}
            onChange={(e) => onChangeBasic("title", e.target.value)}
            placeholder="Nhập tiêu đề bài tập"
            className="text-xl font-bold"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Huỷ</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as "basic" | "content" | "classrooms" | "preview")}>
        <TabsList>
          <TabsTrigger value="basic">Thông tin</TabsTrigger>
          <TabsTrigger value="content">Nội dung</TabsTrigger>
          <TabsTrigger value="classrooms">Lớp học</TabsTrigger>
          <TabsTrigger value="preview">Xem trước</TabsTrigger>
        </TabsList>

        {/* Basic Tab */}
        <TabsContent value="basic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Mô tả</Label>
                <Textarea
                  value={editData.description || ""}
                  onChange={(e) => onChangeBasic("description", e.target.value)}
                  placeholder="Mô tả ngắn về bài tập"
                  className="mt-2"
                />
              </div>
              <div className="max-w-sm">
                <Label>Môn học</Label>
                <Input
                  value={editData.subject || ""}
                  onChange={(e) => onChangeBasic("subject", e.target.value)}
                  placeholder="VD: Toán, Văn..."
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-4">
          {editData.type === "ESSAY" && (
            <EssayContentBuilder assignmentId={assignmentId} content={editData.essayContent} onContentChange={onChangeEssay} />
          )}
          {editData.type === "QUIZ" && (
            <QuizContentBuilder content={editData.quizContent} onContentChange={onChangeQuiz} />
          )}
        </TabsContent>

        {/* Classrooms Tab */}
        <TabsContent value="classrooms" className="mt-4">
          <ClassroomSelector selectedClassrooms={editData.classrooms || []} onClassroomsChange={onChangeClassrooms} />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tóm tắt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {editData.title ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={editData.title ? "text-green-700" : "text-red-700"}>Tiêu đề</span>
                </div>
                <div className="flex items-center gap-2">
                  {(editData.type === "ESSAY" && editData.essayContent?.question) ||
                  (editData.type === "QUIZ" && (editData.quizContent?.questions?.length || 0) > 0) ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={
                    (editData.type === "ESSAY" && editData.essayContent?.question) ||
                    (editData.type === "QUIZ" && (editData.quizContent?.questions?.length || 0) > 0)
                      ? "text-green-700"
                      : "text-red-700"
                  }>Nội dung</span>
                </div>
                {editData.type === "ESSAY" && (
                  <div className="flex items-center gap-2">
                    {editData.essayContent?.dueDate ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={editData.essayContent?.dueDate ? "text-green-700" : "text-red-700"}>Hạn nộp</span>
                  </div>
                )}
                {editData.type === "QUIZ" && (
                  <div className="flex items-center gap-2">
                    {editData.quizContent?.lockAt ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={editData.quizContent?.lockAt ? "text-green-700" : "text-red-700"}>Thời gian đóng</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Xem nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editData.type === "ESSAY" && editData.essayContent ? (
                  <div className="space-y-2">
                    <Label>Câu hỏi</Label>
                    <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                      <p className="whitespace-pre-wrap">{editData.essayContent.question}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Định dạng nộp</Label>
                        <p className="mt-1">
                          {editData.essayContent.submissionFormat === "TEXT"
                            ? "Văn bản"
                            : editData.essayContent.submissionFormat === "FILE"
                            ? "File"
                            : "Cả hai"}
                        </p>
                      </div>
                      <div>
                        <Label>Thời gian mở</Label>
                        <p className="mt-1">{editData.essayContent.openAt?.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label>Hạn nộp</Label>
                        <p className="mt-1">{editData.essayContent.dueDate?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ) : editData.type === "QUIZ" && editData.quizContent ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Số câu hỏi</Label>
                        <p className="mt-1">{editData.quizContent.questions.length}</p>
                      </div>
                      <div>
                        <Label>Thời gian</Label>
                        <p className="mt-1">{editData.quizContent.timeLimitMinutes} phút</p>
                      </div>
                      <div>
                        <Label>Số lần làm</Label>
                        <p className="mt-1">{editData.quizContent.maxAttempts} lần</p>
                      </div>
                      <div>
                        <Label>Đóng bài</Label>
                        <p className="mt-1">{editData.quizContent.lockAt?.toLocaleString()}</p>
                      </div>
                    </div>
                    {editData.quizContent.questions[0] && (
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium">
                          Câu 1: {editData.quizContent.questions[0].content}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {autoSave.lastSaved ? (
              <span>Đã lưu nháp lúc {autoSave.lastSaved.toLocaleTimeString()}</span>
            ) : autoSave.isSaving ? (
              <span>Đang lưu nháp…</span>
            ) : (
              <span>Nhập liệu sẽ tự động lưu nháp</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>Huỷ</Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
