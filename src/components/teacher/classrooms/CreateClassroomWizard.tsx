"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionCard } from "@/components/shared";
import { ValidationSummary } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import type { CreateClassroomDTO } from "@/types/classroom";
import { WizardStepper } from "@/components/shared";
import { FormField } from "@/components/shared";
import { CodeField } from "@/components/shared";
import { WizardActions } from "@/components/shared";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { classroomCreateSchema } from "@/lib/validation/classroom.schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Icon đã bỏ khỏi UI; giữ giá trị mặc định trong state ("book") để tương thích backend.

type Step = 1 | 2 | 3;

export default function CreateClassroomWizard() {
  const router = useRouter();
  const { createClassroom, isLoading } = useClassroom();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [showErrors, setShowErrors] = useState(false);

  const [form, setForm] = useState<CreateClassroomDTO>({
    name: "",
    description: "",
    icon: "book",
    maxStudents: 30,
  });
  const [code, setCode] = useState<string>("");

  const step1Schema = useMemo(() => z.object({
    name: classroomCreateSchema.shape.name,
    description: classroomCreateSchema.shape.description,
    icon: classroomCreateSchema.shape.icon,
    maxStudents: classroomCreateSchema.shape.maxStudents,
  }), []);

  const step2Schema = useMemo(() => z.object({
    code: classroomCreateSchema.shape.code,
  }), []);

  const canNext = useMemo(() => errors.length === 0, [errors]);

  const validations = useMemo(() => {
    let v: string[] = [];
    const fErr: Record<string, string | undefined> = {};
    if (step === 1) {
      const r = step1Schema.safeParse(form);
      if (!r.success) {
        r.error.issues.forEach((i) => {
          const k = String(i.path[0] ?? "");
          fErr[k] = i.message;
          v.push(i.message);
        });
      }
    }
    if (step === 2) {
      const r = step2Schema.safeParse({ code });
      if (!r.success) {
        r.error.issues.forEach((i) => {
          const k = String(i.path[0] ?? "");
          fErr[k] = i.message;
          v.push(i.message);
        });
      }
    }
    setFieldErrors(fErr);
    return v;
  }, [step, form, code, step1Schema, step2Schema]);

  useEffect(() => {
    setErrors(validations);
  }, [validations]);

  const genCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setCode(s);
  };

  const dirty = useMemo(() => {
    return form.name.trim().length > 0 || (form.description ?? "").trim().length > 0 || form.icon !== "book" || form.maxStudents !== 30 || code.trim().length > 0;
  }, [form, code]);
  useUnsavedChangesGuard(dirty);

  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showErrors && errors.length > 0) {
      summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const order: Array<{ key: string; id: string }> = [
        { key: "name", id: "name" },
        { key: "description", id: "desc" },
        { key: "maxStudents", id: "max" },
        { key: "code", id: "code" },
      ];
      for (const item of order) {
        if (fieldErrors[item.key]) {
          const el = document.getElementById(item.id) as HTMLInputElement | HTMLTextAreaElement | null;
          if (el) { el.focus(); break; }
        }
      }
    }
  }, [errors, showErrors, fieldErrors]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextArea = target && target.tagName === "TEXTAREA";
      if (e.ctrlKey && e.key === "Enter" && step === 3) {
        e.preventDefault();
        onSubmit();
      } else if (!isTextArea && e.key === "Enter") {
        e.preventDefault();
        if (step < 3) {
          if (canNext) {
            setShowErrors(false);
            setStep((s) => ((s + 1) as Step));
          } else {
            setShowErrors(true);
          }
        }
      } else if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        if (step > 1) setStep((s) => ((s - 1) as Step));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, canNext]);

  useEffect(() => {
    // Khi đổi bước, ẩn lỗi cho bước mới
    setShowErrors(false);
  }, [step]);

  useEffect(() => {
    const focusId = step === 1 ? "name" : step === 2 ? "code" : undefined;
    if (focusId) {
      const el = document.getElementById(focusId) as HTMLInputElement | null;
      el?.focus();
    }
  }, [step]);

  const onSubmit = async () => {
    try {
      setSaving(true);
      const trimmedCode = code.trim();
      const payload: CreateClassroomDTO = trimmedCode ? { ...form, code: trimmedCode } : form;
      const created = await createClassroom(payload);
      if (created?.id) {
        toast({ title: "Tạo lớp thành công", variant: "success" });
        router.push("/dashboard/teacher/classrooms");
      }
    } catch (e) {
      // Errors handled in hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
      <div className="px-6 sm:px-8 pt-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-2">
          <div className="col-start-2 justify-self-center">
            <WizardStepper
            steps={[
              { id: 1, label: "Thông tin" },
              { id: 2, label: "Mã lớp" },
              { id: 3, label: "Xác nhận" },
            ]}
            current={step}
            onStepClick={(id) => id < step && setStep(id as Step)}
            sticky
            size="sm"
            />
          </div>
          <div className="col-start-3 justify-self-end">
            <WizardActions
            onBack={() => (step > 1 ? setStep((s) => ((s - 1) as Step)) : router.back())}
            onNext={() => {
              if (step < 3) {
                if (errors.length === 0) {
                  setShowErrors(false);
                  setStep((s) => ((s + 1) as Step));
                } else {
                  setShowErrors(true);
                }
              } else {
                onSubmit();
              }
            }}
            nextLabel={step < 3 ? "Tiếp tục →" : "Tạo lớp"}
            disabled={step < 3 ? false : (saving || isLoading)}
            loading={saving || isLoading}
            />
          </div>
        </div>
      </div>
      {showErrors && errors.length > 0 && (
        <div ref={summaryRef} className="px-6 sm:px-8 mt-3 mb-2">
          <ValidationSummary issues={errors} />
        </div>
      )}

      {step === 1 && (
        <div className="px-6 sm:px-8 mt-4">
          <SectionCard
            title={<span className="text-blue-950">Thông tin lớp học</span>}
            description="Nhập các thông tin cơ bản của lớp"
            size="sm"
          >
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Tên lớp học" htmlFor="name" required error={showErrors ? fieldErrors.name : undefined}>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="VD: Lịch sử 8A1"
                    color="blue"
                    aria-label="Tên lớp học"
                    className="h-11"
                  />
                </FormField>
                <FormField label="Sĩ số tối đa" htmlFor="max" error={showErrors ? fieldErrors.maxStudents : undefined}>
                  <NumberInput
                    ariaLabel="Sĩ số tối đa"
                    value={form.maxStudents}
                    onChange={(val) => setForm((f) => ({ ...f, maxStudents: val }))}
                    min={1}
                    max={200}
                    step={1}
                    className="h-11"
                  />
                </FormField>
              </div>
              <FormField label="Mô tả" htmlFor="desc" error={showErrors ? fieldErrors.description : undefined}>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả ngắn về lớp..."
                  rows={3}
                  className="resize-none"
                  color="blue"
                  aria-label="Mô tả lớp học"
                />
              </FormField>
            </div>
          </SectionCard>
        </div>
      )}

      {step === 2 && (
        <div className="px-6 sm:px-8 mt-4">
          <SectionCard
            title={<span className="text-blue-950">Mã lớp học</span>}
            description="Tự sinh hoặc nhập tay, có thể để trống để hệ thống tự tạo"
            size="sm"
          >
            <div className="grid gap-6">
              <FormField label="Mã lớp" htmlFor="code" hint="4–10 ký tự; chỉ A–Z và số 2–9" error={showErrors ? fieldErrors.code : undefined}>
                <CodeField id="code" value={code} onChange={setCode} onGenerate={genCode} error={showErrors ? fieldErrors.code : undefined} />
              </FormField>
            </div>
          </SectionCard>
        </div>
      )}

      {step === 3 && (
        <div className="px-6 sm:px-8 mt-4 mb-2">
          <SectionCard
            title={<span className="text-blue-950">Xác nhận</span>}
            description="Kiểm tra lại trước khi tạo lớp"
            size="sm"
          >
            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex justify-between items-start"><span className="font-semibold text-slate-900">Tên:</span> <span className="text-right">{form.name}</span></div>
              <div className="flex justify-between items-start"><span className="font-semibold text-slate-900">Mô tả:</span> <span className="text-right">{form.description || "(Không có)"}</span></div>
              <div className="flex justify-between items-start"><span className="font-semibold text-slate-900">Sĩ số tối đa:</span> <span className="text-right">{form.maxStudents}</span></div>
              <div className="flex justify-between items-start"><span className="font-semibold text-slate-900">Mã lớp:</span> <span className="text-right font-mono">{code || "(Tự động)"}</span></div>
            </div>
          </SectionCard>
        </div>
      )}
      </div>

      {/* Sticky bottom actions on mobile */}
      <div className="md:hidden sticky bottom-0 inset-x-0 bg-white/85 backdrop-blur border-t border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-end">
          <WizardActions
            onBack={() => (step > 1 ? setStep((s) => ((s - 1) as Step)) : router.back())}
            onNext={() => (step < 3 ? setStep((s) => ((s + 1) as Step)) : onSubmit())}
            nextLabel={step < 3 ? "Tiếp tục →" : "Tạo lớp"}
            disabled={step < 3 ? (!canNext || errors.length > 0) : (saving || isLoading)}
            loading={saving || isLoading}
          />
        </div>
      </div>
    </div>
  );
}
