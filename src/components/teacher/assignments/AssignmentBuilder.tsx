 "use client";

 import React, { useCallback, useEffect, useMemo, useState } from "react";
 import { useRouter } from "next/navigation";
 import { useToast } from "@/hooks/use-toast";
 import { Card, CardContent, CardHeader } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   ArrowLeft,
   BookOpen,
   Brain,
   ChevronRight,
   Eye,
   FileText,
   Home,
   Users,
 } from "lucide-react";
 import type { LucideIcon } from "lucide-react";
 import {
   AssignmentData,
   AssignmentType,
   SubmissionFormat,
   QuizQuestion,
 } from "@/types/assignment-builder";
 import { AntiCheatConfig } from "@/types/exam-system";
 import EssayContentBuilder from "./EssayContentBuilder";
 import QuizContentBuilder from "./QuizContentBuilder";
 import ClassroomSelector from "./ClassroomSelector";
 import { WizardStepper, StepFooter, OptionTile } from "@/components/shared";
 import { useAutoSave, generateDraftKey } from "@/hooks/useAutoSave";
 import { buildStepValidation } from "@/validation/assignmentBuilder";
 import RichTextPreview from "@/components/shared/RichTextPreview";

 type Mode = "create" | "edit";
 type Step = "type" | "basic" | "content" | "classrooms" | "preview";

 interface StepInfo {
   key: Step;
   label: string;
   icon: LucideIcon;
   description: string;
 }

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

 interface AssignmentBuilderProps {
   mode: Mode;
   assignmentId?: string;
 }

 type ApiOption = {
   id: string;
   label: string;
   content: string;
   isCorrect: boolean;
   order: number;
 };

 type ApiQuestion = {
   id: string;
   content: string;
   type: string;
   order: number;
   options?: ApiOption[];
 };

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

 function formatPreviewDate(d?: Date) {
   if (!d) return "Chưa thiết lập";
   return d.toLocaleString("vi-VN", {
     day: "2-digit",
     month: "2-digit",
     year: "numeric",
     hour: "2-digit",
     minute: "2-digit",
   });
 }

 function AssignmentPreviewCard({ data }: { data: AssignmentData }) {
  const isEssay = data.type === "ESSAY";
  const essay = data.essayContent;
  const quiz = data.quizContent;

  const openAt = isEssay ? essay?.openAt : quiz?.openAt;
  const endAt = isEssay ? essay?.dueDate : quiz?.lockAt;

  const typeLabel = isEssay ? "Tự luận" : "Trắc nghiệm";
  const typeClasses = isEssay
    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
    : "bg-pink-50 text-pink-700 border border-pink-200";
  const TypeIcon = isEssay ? FileText : BookOpen;

  const stripHtml = (value?: string | null) =>
    value ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">
            {data.title || "Chưa đặt tên bài tập"}
          </h2>
          {data.description && (
            <p className="text-sm text-slate-600 whitespace-pre-line">
              {data.description}
            </p>
          )}
          <p className="text-xs text-slate-500">
            Môn học:{" "}
            <span className="font-medium">
              {data.subject || "Chưa chọn"}
            </span>
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2 text-xs text-slate-600">
          <span
            className={`inline-flex items-center gap-1 px-4 py-1 rounded-full text-sm font-semibold ${typeClasses}`}
          >
            <TypeIcon className="h-4 w-4" />
            <span>{typeLabel}</span>
          </span>
          <div className="space-y-1 text-left md:text-right">
            <div>
              <span className="font-semibold">Mở bài: </span>
              {formatPreviewDate(openAt)}
            </div>
            <div>
              <span className="font-semibold">
                {isEssay ? "Hạn nộp: " : "Đóng bài: "}
              </span>
              {formatPreviewDate(endAt)}
            </div>
            {quiz?.timeLimitMinutes ? (
              <div>
                <span className="font-semibold">Thời gian làm: </span>
                {quiz.timeLimitMinutes} phút
              </div>
            ) : null}
            {quiz?.maxAttempts ? (
              <div>
                <span className="font-semibold">Số lần làm: </span>
                {quiz.maxAttempts}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Nội dung chính
        </h3>

        {isEssay ? (
          (essay?.question ? (
            <RichTextPreview
              html={essay.question}
              className="text-sm text-slate-700"
            />
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-line">
              Chưa nhập câu hỏi tự luận.
            </p>
          ))
        ) : (
          <div className="space-y-2 text-sm text-slate-700">
            <div>
              Số câu hỏi:{" "}
              <span className="font-semibold">
                {quiz?.questions?.length || 0}
              </span>
            </div>

            {quiz?.questions && quiz.questions.length > 0 && (
              <div className="space-y-3 text-xs text-slate-700">
                {quiz.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="border border-slate-200 rounded-lg bg-white/70 px-3 py-2"
                  >
                    <div className="font-semibold text-slate-800 mb-1">
                      Câu {idx + 1}:{" "}
                      <span className="font-normal">
                        {stripHtml(q.content)}
                      </span>
                    </div>

                    {q.options && q.options.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {q.options.map((opt, j) => (
                          <li
                            key={`${q.id || idx}-opt-${j}`}
                            className={`flex items-start gap-2 ${
                              opt.isCorrect
                                ? "text-emerald-700"
                                : "text-slate-700"
                            }`}
                          >
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold ${
                                opt.isCorrect
                                  ? "bg-emerald-50 border-emerald-400"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              {opt.label || String.fromCharCode(65 + j)}
                            </span>
                            <span className="flex-1">
                              {stripHtml(opt.content)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-slate-200 pt-3 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          Lớp giao:{" "}
          {data.classrooms?.length
            ? `${data.classrooms.length} lớp đã chọn`
            : "Chưa chọn lớp"}
        </span>
        <span>
          Bạn vẫn có thể quay lại các bước trước để chỉnh sửa trước khi tạo.
        </span>
      </div>
    </div>
  );
}

 export default function AssignmentBuilder({ mode, assignmentId }: AssignmentBuilderProps) {
   const router = useRouter();
   const { toast } = useToast();

   const steps = mode === "create" ? createSteps : editSteps;
   const [currentStep, setCurrentStep] = useState<Step>(steps[0].key);
   const currentStepIndex = steps.findIndex((s) => s.key === currentStep);
   const isFirstStep = currentStepIndex === 0;
   const isLastStep = currentStepIndex === steps.length - 1;

   const [data, setData] = useState<AssignmentData>({
     type: "ESSAY",
     title: "",
     description: "",
     subject: "",
     classrooms: [],
   });

   const draftKey = useMemo(
     () => (mode === "create" ? generateDraftKey() : `edit_assignment_${assignmentId}`),
     [mode, assignmentId]
   );

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
         const selectedClassrooms: string[] = Array.isArray(a.classrooms)
           ? a.classrooms.map((c) => c.classroomId)
           : [];
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
                     options: (q.options || []).map((o) => ({
                       label: o.label,
                       content: o.content,
                       isCorrect: !!o.isCorrect,
                     })),
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
       } catch {
         // ignore
       }
     })();

     return () => {
       mounted = false;
     };
   }, [mode, assignmentId]);

   const goNext = useCallback(() => {
     if (!isLastStep) setCurrentStep(steps[currentStepIndex + 1].key);
   }, [isLastStep, steps, currentStepIndex]);

   const goBack = useCallback(() => {
     if (!isFirstStep) setCurrentStep(steps[currentStepIndex - 1].key);
   }, [isFirstStep, steps, currentStepIndex]);

   const canProceed = useCallback(
     () => buildStepValidation(currentStep, data).ok,
     [currentStep, data]
   );

   const updateType = useCallback((t: AssignmentType) => {
     setData((p) => ({ ...p, type: t, essayContent: undefined, quizContent: undefined }));
   }, []);

   const updateBasic = useCallback((field: string, value: string) => {
     setData((p) => ({ ...p, [field]: value }));
   }, []);

   const updateEssay = useCallback((v: NonNullable<AssignmentData["essayContent"]>) => {
     setData((p) => ({ ...p, essayContent: v }));
   }, []);

   const updateQuiz = useCallback((v: NonNullable<AssignmentData["quizContent"]>) => {
     setData((p) => ({ ...p, quizContent: v }));
   }, []);

   const updateClassrooms = useCallback((ids: string[]) => {
     setData((p) => ({ ...p, classrooms: ids }));
   }, []);

   const handleCreate = useCallback(async () => {
     try {
       const payload = {
         ...data,
         title: data.title.trim(),
         description: data.description?.trim() || null,
         subject: data.subject?.trim() || null,
       };

       const res = await fetch("/api/assignments/create", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload),
       });

       const j = await res.json().catch(() => null);
       if (!res.ok || !j?.success) {
         const details = j?.details ? ` - ${typeof j.details === "string" ? j.details : JSON.stringify(j.details)}` : "";
         throw new Error(`${j?.message || "Tạo bài tập thất bại"}${details}`);
       }

       autoSave.clearDraft();
       const id = j?.data?.id as string | undefined;
       router.push(id ? `/dashboard/teacher/assignments/${id}` : "/dashboard/teacher/assignments");
     } catch (err: unknown) {
       const msg = err instanceof Error ? err.message : "Tạo bài tập thất bại";
       toast({ title: "Lỗi tạo bài tập", description: msg, variant: "destructive" });
     }
   }, [data, autoSave, router, toast]);

   const handleUpdate = useCallback(async () => {
     if (mode !== "edit" || !assignmentId) return;
     try {
       const base: Record<string, unknown> = {
         title: data.title,
         description: data.description ?? null,
         type: data.type,
         subject: data.subject ?? null,
         classrooms: data.classrooms || [],
       };

       if (data.type === "ESSAY" && data.essayContent) {
         base.submissionFormat = data.essayContent.submissionFormat;
         base.openAt = data.essayContent.openAt?.toISOString() || null;
         base.dueDate = data.essayContent.dueDate?.toISOString() || null;
         // Không gửi các field quiz-only để tránh zod reject (vd maxAttempts=null)
         delete (base as Record<string, unknown>).timeLimitMinutes;
         delete (base as Record<string, unknown>).lockAt;
         delete (base as Record<string, unknown>).maxAttempts;
         delete (base as Record<string, unknown>).antiCheatConfig;
         base.questions = [
           {
             id: "",
             content: data.essayContent.question,
             type: "ESSAY",
             order: 1,
             options: [],
           },
         ];
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
         body: JSON.stringify(base),
       });

       const j = await res.json().catch(() => null);
       if (!res.ok || !j?.success) {
         const details = j?.details ? ` - ${typeof j.details === "string" ? j.details : JSON.stringify(j.details)}` : "";
         throw new Error(`${j?.message || "Cập nhật thất bại"}${details}`);
       }

       router.push(`/dashboard/teacher/assignments/${assignmentId}`);
     } catch (err: unknown) {
       const msg = err instanceof Error ? err.message : "Cập nhật thất bại";
       toast({ title: "Lỗi khi lưu", description: msg, variant: "destructive" });
     }
   }, [mode, assignmentId, data, router, toast]);

   const wizardSteps = steps.map((s, i) => ({ id: i + 1, label: s.label }));

   return (
     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-start items-stretch px-4 py-10">
       <div className="w-full max-w-4xl mx-auto">
         <Card className="shadow-xl">
           <CardHeader className="px-6 py-3 space-y-2">
             <div className="flex items-center gap-3">
               <Button
                 variant="ghost"
                 onClick={() => router.push("/dashboard/teacher/assignments")}
                 className="flex items-center gap-2 hover:bg-gray-100"
               >
                 <ArrowLeft className="h-4 w-4" /> Quay lại
               </Button>
               <ChevronRight className="h-4 w-4 text-gray-400" />
               <Home className="h-4 w-4 text-gray-500" />
               <span className="text-sm text-gray-500">Dashboard</span>
               <ChevronRight className="h-4 w-4 text-gray-400" />
               <span className="text-sm text-gray-500">Bài tập</span>
               <ChevronRight className="h-4 w-4 text-gray-400" />
               <span className="text-sm font-medium text-blue-600">
                 {mode === "create" ? "Tạo mới" : "Chỉnh sửa"}
               </span>
             </div>
             <div className="text-center">
               <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                 {mode === "create" ? "Tạo Bài Tập Mới" : "Chỉnh Sửa Bài Tập"}
               </h1>
             </div>
             <WizardStepper
               steps={wizardSteps}
               current={currentStepIndex + 1}
               size="sm"
               className="px-0"
               allowFutureNavigation={false}
             />
           </CardHeader>
           <CardContent className="p-5">
             {mode === "create" && currentStep === "type" && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto p-8">
                 <OptionTile
                   title="Tự Luận"
                   selected={data.type === "ESSAY"}
                   onSelect={() => updateType("ESSAY")}
                   color="green"
                   size="sm"
                 />
                 <OptionTile
                   title="Trắc Nghiệm"
                   selected={data.type === "QUIZ"}
                   onSelect={() => updateType("QUIZ")}
                   color="blue"
                   size="sm"
                 />
               </div>
             )}

             {currentStep === "basic" && (
               <div className="space-y-6 p-8">
                 <div>
                   <Label htmlFor="title" className="text-sm font-medium">
                     Tên bài tập *
                   </Label>
                   <Input
                     id="title"
                     value={data.title}
                     onChange={(e) => updateBasic("title", e.target.value)}
                     placeholder="Nhập tên bài tập..."
                     className="mt-2 text-sm h-9"
                   />
                 </div>
                 <div>
                   <Label htmlFor="description" className="text-sm font-medium">
                     Mô tả (tùy chọn)
                   </Label>
                   <Textarea
                     id="description"
                     value={data.description || ""}
                     onChange={(e) => updateBasic("description", e.target.value)}
                     placeholder="Mô tả ngắn..."
                     className="mt-2 text-sm"
                     rows={3}
                   />
                 </div>
                 <div>
                   <Label htmlFor="subject" className="text-sm font-medium">
                     Môn học (tùy chọn)
                   </Label>
                   <Input
                     id="subject"
                     value={data.subject || ""}
                     onChange={(e) => updateBasic("subject", e.target.value)}
                     placeholder="VD: Toán, Văn..."
                     className="mt-2 text-sm h-9"
                   />
                 </div>
               </div>
             )}

             {currentStep === "content" && (
               <div>
                 {data.type === "ESSAY" ? (
                   <EssayContentBuilder
                     content={data.essayContent}
                     onContentChange={updateEssay}
                     assignmentId={mode === "edit" ? assignmentId : undefined}
                   />
                 ) : (
                   <QuizContentBuilder
                     content={data.quizContent}
                     onContentChange={updateQuiz}
                   />
                 )}
               </div>
             )}

             {currentStep === "classrooms" && (
               <ClassroomSelector
                 selectedClassrooms={data.classrooms || []}
                 onClassroomsChange={updateClassrooms}
               />
             )}

             {currentStep === "preview" && (
               <div className="max-w-4xl mx-auto">
                 <AssignmentPreviewCard data={data} />
               </div>
             )}
           </CardContent>
         </Card>
         <StepFooter
           canProceed={canProceed()}
           isFirst={isFirstStep}
           isLast={isLastStep}
           onBack={goBack}
           onNext={isLastStep ? (mode === "create" ? handleCreate : handleUpdate) : goNext}
           current={currentStepIndex + 1}
           total={steps.length}
           dense
           transparent
           className="mt-6 w-full max-w-4xl mx-auto"
           position="static"
           lastLabel={mode === "edit" ? "Lưu thay đổi" : "Tạo bài tập"}
         />
       </div>
     </div>
   );
 }


