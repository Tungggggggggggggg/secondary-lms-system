"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BookOpen, Brain, ChevronRight, Eye, FileText, Home, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AssignmentData, AssignmentType, SubmissionFormat, QuizQuestion } from "@/types/assignment-builder";
import { AntiCheatConfig } from "@/types/exam-system";
import EssayContentBuilder from "./EssayContentBuilder";
import QuizContentBuilder from "./QuizContentBuilder";
import ClassroomSelector from "./ClassroomSelector";
import { WizardStepper } from "@/components/shared";
import { StepFooter } from "@/components/shared";
import { ValidationChecklist } from "@/components/shared";
import { OptionTile } from "@/components/shared";
import { useAutoSave, generateDraftKey } from "@/hooks/useAutoSave";
import { buildStepValidation } from "@/validation/assignmentBuilder";

 type Mode = "create" | "edit";
 type Step = "type" | "basic" | "content" | "classrooms" | "preview";
 interface StepInfo { key: Step; label: string; icon: LucideIcon; description: string; }
 const createSteps: StepInfo[] = [
   { key: "type", label: "Loại bài tập", icon: Brain, description: "Chọn loại" },
   { key: "basic", label: "Thông tin", icon: FileText, description: "Tên & mô tả" },
   { key: "content", label: "Nội dung", icon: BookOpen, description: "Câu hỏi & cài đặt" },
   { key: "classrooms", label: "Lớp học", icon: Users, description: "Chọn lớp" },
   { key: "preview", label: "Xem trước", icon: Eye, description: "Kiểm tra & lưu" },
 ];
 const editSteps: StepInfo[] = [
   { key: "basic", label: "Thông tin", icon: FileText, description: "Tên & mô tả" },
   { key: "content", label: "Nội dung", icon: BookOpen, description: "Câu hỏi & cài đặt" },
   { key: "classrooms", label: "Lớp học", icon: Users, description: "Chọn lớp" },
   { key: "preview", label: "Xem trước", icon: Eye, description: "Kiểm tra & lưu" },
 ];

 interface AssignmentBuilderProps { mode: Mode; assignmentId?: string; }
 type ApiOption = { id: string; label: string; content: string; isCorrect: boolean; order: number };
 type ApiQuestion = { id: string; content: string; type: string; order: number; options?: ApiOption[] };
 interface ApiAssignment {
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
 }

 export default function AssignmentBuilder({ mode, assignmentId }: AssignmentBuilderProps) {
   const router = useRouter();
   const { toast } = useToast();

   const steps = mode === "create" ? createSteps : editSteps;
   const [currentStep, setCurrentStep] = useState<Step>(steps[0].key);
   const currentStepIndex = steps.findIndex((s) => s.key === currentStep);
   const isFirstStep = currentStepIndex === 0;
   const isLastStep = currentStepIndex === steps.length - 1;

   const [data, setData] = useState<AssignmentData>({ type: "ESSAY", title: "", description: "", subject: "", classrooms: [] });
   const draftKey = useMemo(() => (mode === "create" ? generateDraftKey() : `edit_assignment_${assignmentId}`), [mode, assignmentId]);
   const autoSave = useAutoSave(data, { key: draftKey, interval: 30000, enabled: true });

   useEffect(() => {
     if (mode !== "edit" || !assignmentId) return;
     let mounted = true;
     (async () => {
       try {
         const res = await fetch(`/api/assignments/${assignmentId}`, { cache: "no-store" });
         const j = await res.json();
         if (!j?.success) return;
         const a: ApiAssignment = j.data as ApiAssignment;
         const selectedClassrooms: string[] = Array.isArray(a.classrooms) ? a.classrooms.map((c) => c.classroomId) : [];
         const questions: ApiQuestion[] = Array.isArray(a.questions) ? a.questions : [];
         if (!mounted) return;
         const next: AssignmentData = {
           type: a.type,
           title: a.title || "",
           description: a.description || "",
           subject: a.subject || "",
           classrooms: selectedClassrooms,
           ...(a.type === "ESSAY"
             ? {
                 essayContent: {
                   question: (questions[0]?.content as string) || "",
                   attachments: [],
                   submissionFormat: (a.submission_format ?? "BOTH") as SubmissionFormat,
                   openAt: a.openAt ? new Date(a.openAt) : undefined,
                   dueDate: a.dueDate ? new Date(a.dueDate) : undefined,
                 },
               }
             : {}),
           ...(a.type === "QUIZ"
             ? {
                 quizContent: {
                   questions: questions.map((q) => ({
                     id: q.id,
                     content: q.content,
                     type: q.type,
                     options: (q.options || []).map((o) => ({ label: o.label, content: o.content, isCorrect: !!o.isCorrect })),
                     order: q.order,
                   })) as QuizQuestion[],
                   timeLimitMinutes: a.timeLimitMinutes || 30,
                   openAt: a.openAt ? new Date(a.openAt) : undefined,
                   lockAt: a.lockAt ? new Date(a.lockAt) : undefined,
                   maxAttempts: a.max_attempts || 1,
                   antiCheatConfig: (a.anti_cheat_config as AntiCheatConfig) || {
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
         setData(next);
       } catch {}
     })();
     return () => {
       mounted = false;
     };
   }, [mode, assignmentId]);

   const goNext = useCallback(() => { if (!isLastStep) setCurrentStep(steps[currentStepIndex + 1].key); }, [isLastStep, steps, currentStepIndex]);
   const goBack = useCallback(() => { if (!isFirstStep) setCurrentStep(steps[currentStepIndex - 1].key); }, [isFirstStep, steps, currentStepIndex]);
   const canProceed = useCallback(() => buildStepValidation(currentStep, data).ok, [currentStep, data]);

   const updateType = useCallback((t: AssignmentType) => setData((p) => ({ ...p, type: t, essayContent: undefined, quizContent: undefined })), []);
   const updateBasic = useCallback((field: string, value: string) => setData((p) => ({ ...p, [field]: value })), []);
   const updateEssay = useCallback((v: NonNullable<AssignmentData["essayContent"]>) => setData((p) => ({ ...p, essayContent: v })), []);
   const updateQuiz = useCallback((v: NonNullable<AssignmentData["quizContent"]>) => setData((p) => ({ ...p, quizContent: v })), []);
   const updateClassrooms = useCallback((ids: string[]) => setData((p) => ({ ...p, classrooms: ids })), []);

   const handleCreate = useCallback(async () => {
     try {
       const payload = { ...data, title: data.title.trim(), description: data.description?.trim() || null, subject: data.subject?.trim() || null };
       const res = await fetch("/api/assignments/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
       const j = await res.json();
       if (!res.ok || !j?.success) throw new Error(j?.message || "Tạo bài tập thất bại");
       autoSave.clearDraft();
       const id = j?.data?.id as string | undefined;
       router.push(id ? `/dashboard/teacher/assignments/${id}` : "/dashboard/teacher/assignments");
     } catch {
       toast({ title: "Lỗi tạo bài tập", variant: "destructive" });
     }
   }, [data, autoSave, router, toast]);

   const handleUpdate = useCallback(async () => {
     if (mode !== "edit" || !assignmentId) return;
     try {
       const base: Record<string, unknown> = { title: data.title, description: data.description ?? null, type: data.type, subject: data.subject ?? null, classrooms: data.classrooms || [] };
       if (data.type === "ESSAY" && data.essayContent) {
         base.submissionFormat = data.essayContent.submissionFormat;
         base.openAt = data.essayContent.openAt?.toISOString() || null;
         base.dueDate = data.essayContent.dueDate?.toISOString() || null;
         base.timeLimitMinutes = null;
         base.lockAt = null;
         base.maxAttempts = null;
         base.antiCheatConfig = null;
         base.questions = [ { id: "", content: data.essayContent.question, type: "ESSAY", order: 1, options: [] } ];
       }
       if (data.type === "QUIZ" && data.quizContent) {
         base.openAt = data.quizContent.openAt?.toISOString() || null;
         base.lockAt = data.quizContent.lockAt?.toISOString() || null;
         base.timeLimitMinutes = data.quizContent.timeLimitMinutes || null;
         base.maxAttempts = data.quizContent.maxAttempts || 1;
         base.antiCheatConfig = data.quizContent.antiCheatConfig || null;
         base.questions = (data.quizContent.questions || []).map((q, idx) => ({
           id: q.id || "",
           content: q.content,
           type: q.type,
           order: q.order ?? idx + 1,
           options: (q.options || []).map((o, j) => ({ label: o.label || String.fromCharCode(65 + j), content: o.content, isCorrect: !!o.isCorrect, order: j + 1 })),
         }));
       }
       const res = await fetch(`/api/assignments/${assignmentId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(base) });
       const j = await res.json();
       if (!res.ok || !j?.success) throw new Error(j?.message || "Cập nhật thất bại");
       router.push(`/dashboard/teacher/assignments/${assignmentId}`);
     } catch {
       toast({ title: "Lỗi khi lưu", variant: "destructive" });
     }
   }, [mode, assignmentId, data, router, toast]);

   const wizardSteps = steps.map((s, i) => ({ id: i + 1, label: s.label }));

   return (
     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-xl">
           <CardHeader className="px-6 py-3 space-y-2">
             <div className="flex items-center gap-3">
               <Button variant="ghost" onClick={() => router.push('/dashboard/teacher/assignments')} className="flex items-center gap-2 hover:bg-gray-100">
                 <ArrowLeft className="h-4 w-4" /> Quay lại
               </Button>
               <ChevronRight className="h-4 w-4 text-gray-400" />
               <Home className="h-4 w-4 text-gray-500" />
               <span className="text-sm text-gray-500">Dashboard</span>
               <ChevronRight className="h-4 w-4 text-gray-400" />
               <span className="text-sm text-gray-500">Bài tập</span>
               <ChevronRight className="h-4 w-4 text-gray-400" />
               <span className="text-sm font-medium text-blue-600">{mode === 'create' ? 'Tạo mới' : 'Chỉnh sửa'}</span>
             </div>
             <div className="text-center">
               <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{mode === 'create' ? 'Tạo Bài Tập Mới' : 'Chỉnh Sửa Bài Tập'}</h1>
             </div>
             <WizardStepper steps={wizardSteps} current={currentStepIndex + 1} size="sm" className="px-0" allowFutureNavigation={false} />
           </CardHeader>
           <CardContent className="p-5">
             {mode === 'create' && currentStep === 'type' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto p-8">
                 <OptionTile title="Tự Luận" selected={data.type === 'ESSAY'} onSelect={() => updateType('ESSAY')} color="green" size="sm" />
                 <OptionTile title="Trắc Nghiệm" selected={data.type === 'QUIZ'} onSelect={() => updateType('QUIZ')} color="blue" size="sm" />
               </div>
             )}
             {currentStep === 'basic' && (
               <div className="space-y-6 p-8">
                 <div>
                   <Label htmlFor="title" className="text-sm font-medium">Tên bài tập *</Label>
                   <Input id="title" value={data.title} onChange={(e) => updateBasic('title', e.target.value)} placeholder="Nhập tên bài tập..." className="mt-2 text-sm h-9" />
                 </div>
                 <div>
                   <Label htmlFor="description" className="text-sm font-medium">Mô tả (tùy chọn)</Label>
                   <Textarea id="description" value={data.description || ''} onChange={(e) => updateBasic('description', e.target.value)} placeholder="Mô tả ngắn..." className="mt-2 text-sm" rows={3} />
                 </div>
                 <div>
                   <Label htmlFor="subject" className="text-sm font-medium">Môn học (tùy chọn)</Label>
                   <Input id="subject" value={data.subject || ''} onChange={(e) => updateBasic('subject', e.target.value)} placeholder="VD: Toán, Văn..." className="mt-2 text-sm h-9" />
                 </div>
               </div>
             )}
             {currentStep === 'content' && (
               <div>
                 {data.type === 'ESSAY' ? (
                   <EssayContentBuilder content={data.essayContent} onContentChange={updateEssay} assignmentId={mode === 'edit' ? assignmentId : undefined} />
                 ) : (
                   <QuizContentBuilder content={data.quizContent} onContentChange={updateQuiz} />
                 )}
               </div>
             )}
             {currentStep === 'classrooms' && (
               <ClassroomSelector selectedClassrooms={data.classrooms || []} onClassroomsChange={updateClassrooms} />
             )}
             {currentStep === 'preview' && (
               <div className="space-y-6 max-w-4xl mx-auto">
                 <ValidationChecklist
                   items={[
                     { label: 'Tên bài tập', ok: !!data.title },
                     { label: 'Nội dung', ok: (data.type === 'ESSAY' && !!data.essayContent?.question) || (data.type === 'QUIZ' && !!data.quizContent?.questions.length) },
                     ...(data.type === 'ESSAY'
                       ? [{ label: 'Hạn nộp', ok: !!data.essayContent?.dueDate }] as const
                       : [{ label: 'Thời gian đóng', ok: !!data.quizContent?.lockAt }] as const),
                   ]}
                 />
               </div>
             )}
           </CardContent>
         </Card>
         <StepFooter
           canProceed={canProceed()}
           isFirst={isFirstStep}
           isLast={isLastStep}
           onBack={goBack}
           onNext={isLastStep ? (mode === 'create' ? handleCreate : handleUpdate) : goNext}
           current={currentStepIndex + 1}
           total={steps.length}
           dense
           transparent
           className="mt-0"
           position="fixed"
           lastLabel={mode === 'edit' ? 'Lưu thay đổi' : 'Tạo bài tập'}
         />
       </div>
     </div>
   );
}
