"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RateLimitDialog, {
  getRetryAfterSecondsFromResponse,
} from "@/components/shared/RateLimitDialog";
import { ScheduleSection } from "@/components/shared";
import { FormSwitchRow } from "@/components/shared";
import { AccordionItem } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { 
  Plus,
  Brain,
  Timer,
  ClipboardList
} from 'lucide-react';

// Import Types
import { QuizQuestion, QuizOption } from '@/types/assignment-builder';
import { AntiCheatConfig } from '@/types/exam-system';

// Import Components
import QuestionTemplates from './QuestionTemplates';
import QuestionItem from './QuestionItem';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type ApiEnvelope = {
  success: boolean;
  message?: string;
  data?: unknown;
};

function toApiEnvelope(value: unknown): ApiEnvelope | null {
  if (!isRecord(value)) return null;
  if (typeof value.success !== "boolean") return null;
  return {
    success: value.success,
    message: typeof value.message === "string" ? value.message : undefined,
    data: value.data,
  };
}

function getAiQuestionsFromEnvelope(envelope: ApiEnvelope | null): QuizQuestion[] {
  if (!envelope?.data || !isRecord(envelope.data)) return [];
  const questions = envelope.data.questions;
  if (!Array.isArray(questions)) return [];
  return questions as QuizQuestion[];
}

function parseShowCorrectMode(value: string): AntiCheatConfig["showCorrectMode"] {
  if (value === "never" || value === "afterSubmit" || value === "afterLock") return value;
  return "never";
}

interface QuizContent {
  questions: QuizQuestion[];
  timeLimitMinutes: number;
  openAt?: Date;
  lockAt?: Date;
  maxAttempts: number;
  antiCheatConfig?: AntiCheatConfig;
}

interface QuizContentBuilderProps {
  content?: QuizContent;
  onContentChange: (content: QuizContent) => void;
}

// Time presets theo đề xuất user
const TIME_PRESETS = [
  { label: '15 phút', value: 15, description: 'Kiểm tra nhanh' },
  { label: '30 phút', value: 30, description: 'Kiểm tra ngắn' },
  { label: '45 phút', value: 45, description: 'Kiểm tra trung bình' },
  { label: '60 phút', value: 60, description: 'Kiểm tra dài' },
  { label: '90 phút', value: 90, description: 'Thi cuối kỳ' }
];

/**
 * Quiz Content Builder - Với time presets và security settings
 * Theo đề xuất user: 5 presets cơ bản + custom option
 */
export default function QuizContentBuilder({ content, onContentChange }: QuizContentBuilderProps) {
  const [customTime, setCustomTime] = useState(false);
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiSourceFile, setAiSourceFile] = useState<File | null>(null);
  const [aiNumQuestions, setAiNumQuestions] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [rateLimitRetryAfterSeconds, setRateLimitRetryAfterSeconds] = useState(0);
  const [lastAiRequest, setLastAiRequest] = useState<
    | { mode: "text"; sourceText: string; numQuestions: number }
    | { mode: "file"; file: File; numQuestions: number }
    | null
  >(null);

  const currentContent: QuizContent = useMemo(() => (
    content ?? {
      questions: [],
      timeLimitMinutes: 30,
      openAt: undefined,
      lockAt: undefined,
      maxAttempts: 1,
      antiCheatConfig: {
        preset: 'BASIC' as const,
        shuffleQuestions: false,
        shuffleOptions: false,
        singleQuestionMode: false,
        timePerQuestion: undefined,
        requireFullscreen: false,
        detectTabSwitch: false,
        disableCopyPaste: false,
        enableFuzzyFillBlank: false,
        fuzzyThreshold: 0.2,
        showCorrectMode: 'never'
      }
    }
  ), [content]);

  // Update handlers
  const updateTimeLimit = useCallback((minutes: number) => {
    onContentChange({
      ...currentContent,
      timeLimitMinutes: minutes
    });
  }, [currentContent, onContentChange]);

  const updateTiming = useCallback((field: 'openAt' | 'lockAt', date: Date | undefined) => {
    onContentChange({
      ...currentContent,
      [field]: date
    });
  }, [currentContent, onContentChange]);

  const updateMaxAttempts = useCallback((attempts: number) => {
    onContentChange({
      ...currentContent,
      maxAttempts: Math.max(1, attempts)
    });
  }, [currentContent, onContentChange]);

  const updateAntiCheat: <K extends keyof AntiCheatConfig>(field: K, value: AntiCheatConfig[K]) => void = useCallback((field, value) => {
    const updatedConfig: AntiCheatConfig = {
      preset: currentContent.antiCheatConfig?.preset || 'BASIC',
      shuffleQuestions: currentContent.antiCheatConfig?.shuffleQuestions || false,
      shuffleOptions: currentContent.antiCheatConfig?.shuffleOptions || false,
      singleQuestionMode: currentContent.antiCheatConfig?.singleQuestionMode || false,
      timePerQuestion: currentContent.antiCheatConfig?.timePerQuestion,
      requireFullscreen: currentContent.antiCheatConfig?.requireFullscreen || false,
      detectTabSwitch: currentContent.antiCheatConfig?.detectTabSwitch || false,
      disableCopyPaste: currentContent.antiCheatConfig?.disableCopyPaste || false,
      ...currentContent.antiCheatConfig,
      [field]: value
    };
    
    onContentChange({
      ...currentContent,
      antiCheatConfig: updatedConfig
    });
  }, [currentContent, onContentChange]);

  // Question management
  const addQuestion = useCallback(() => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      content: '',
      type: 'SINGLE',
      options: [
        { label: 'A', content: '', isCorrect: false },
        { label: 'B', content: '', isCorrect: false },
        { label: 'C', content: '', isCorrect: false },
        { label: 'D', content: '', isCorrect: false }
      ]
    };

    onContentChange({
      ...currentContent,
      questions: [...currentContent.questions, newQuestion]
    });
  }, [currentContent, onContentChange]);

  // Add question from template
  const addQuestionFromTemplate = useCallback((template: Partial<QuizQuestion>) => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      content: template.content || '',
      type: template.type || 'SINGLE',
      options: template.options || [
        { label: 'A', content: '', isCorrect: false },
        { label: 'B', content: '', isCorrect: false },
        { label: 'C', content: '', isCorrect: false },
        { label: 'D', content: '', isCorrect: false }
      ],
      explanation: template.explanation || ''
    };

    onContentChange({
      ...currentContent,
      questions: [...currentContent.questions, newQuestion]
    });
  }, [currentContent, onContentChange]);

  const updateQuestion: <K extends keyof QuizQuestion>(index: number, field: K, value: QuizQuestion[K]) => void = useCallback((index, field, value) => {
    const updatedQuestions = currentContent.questions.map((q, i) => {
      if (i !== index) return q;
      if (field === 'type') {
        const newType = value as QuizQuestion['type'];
        if (newType === 'TRUE_FALSE') {
          return {
            ...q,
            type: newType,
            options: [
              { label: 'A', content: 'Đúng', isCorrect: true },
              { label: 'B', content: 'Sai', isCorrect: false },
            ],
          };
        }
        if (newType === 'SINGLE') {
          const firstTrue = (q.options || []).findIndex(o => o.isCorrect);
          const idx = firstTrue >= 0 ? firstTrue : 0;
          const normalized = (q.options || []).map((o, j) => ({ ...o, isCorrect: j === idx }));
          return { ...q, type: newType, options: normalized };
        }
        if (newType === 'FILL_BLANK') {
          const normalized = (q.options || [{ label: 'A', content: '', isCorrect: true }]).map(o => ({ ...o, isCorrect: true }));
          return { ...q, type: newType, options: normalized };
        }
        return { ...q, [field]: value };
      }
      return { ...q, [field]: value };
    });

    onContentChange({
      ...currentContent,
      questions: updatedQuestions
    });
  }, [currentContent, onContentChange]);

  const updateOption: <K extends keyof QuizOption>(questionIndex: number, optionIndex: number, field: K, value: QuizOption[K]) => void = useCallback((questionIndex, optionIndex, field, value) => {
    const updatedQuestions = currentContent.questions.map((q, i) => {
      if (i !== questionIndex) return q;
      // Base update
      let updatedOptions = q.options.map((opt, j) => (j === optionIndex ? { ...opt, [field]: value } : opt));
      // Enforce constraints on correctness flags
      if (field === 'isCorrect') {
        if (q.type === 'MULTIPLE') {
          // allow independent toggles
        } else if (q.type === 'FILL_BLANK') {
          // all treated as acceptable answers
          updatedOptions = updatedOptions.map((o) => ({ ...o, isCorrect: true }));
        } else {
          // SINGLE or TRUE_FALSE -> only one correct
          const checked = Boolean(value);
          updatedOptions = updatedOptions.map((o, j) => ({ ...o, isCorrect: checked ? j === optionIndex : false }));
        }
      }
      return { ...q, options: updatedOptions };
    });

    onContentChange({
      ...currentContent,
      questions: updatedQuestions
    });
  }, [currentContent, onContentChange]);

  const toggleCorrect = useCallback((questionIndex: number, optionIndex: number, checked: boolean) => {
    const updatedQuestions = currentContent.questions.map((q, i) => {
      if (i !== questionIndex) return q;
      if (q.type === 'MULTIPLE') {
        const opts = q.options.map((opt, j) => (j === optionIndex ? { ...opt, isCorrect: checked } : opt));
        return { ...q, options: opts };
      }
      if (q.type === 'FILL_BLANK') {
        const opts = q.options.map((opt) => ({ ...opt, isCorrect: true }));
        return { ...q, options: opts };
      }
      // SINGLE | TRUE_FALSE: luôn đảm bảo đúng 1 đáp án
      const opts = q.options.map((opt, j) => ({ ...opt, isCorrect: j === optionIndex }));
      return { ...q, options: opts };
    });
    onContentChange({ ...currentContent, questions: updatedQuestions });
  }, [currentContent, onContentChange]);

  const removeQuestion = useCallback((index: number) => {
    const updatedQuestions = currentContent.questions.filter((_, i) => i !== index);
    onContentChange({
      ...currentContent,
      questions: updatedQuestions
    });
  }, [currentContent, onContentChange]);

  const duplicateQuestion = useCallback((index: number) => {
    const questionToDuplicate = currentContent.questions[index];
    const duplicatedQuestion: QuizQuestion = {
      ...questionToDuplicate,
      id: `q_${Date.now()}`,
      content: `${questionToDuplicate.content} (Copy)`
    };

    const updatedQuestions = [...currentContent.questions];
    updatedQuestions.splice(index + 1, 0, duplicatedQuestion);

    onContentChange({
      ...currentContent,
      questions: updatedQuestions
    });
  }, [currentContent, onContentChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        // Duplicate last question or first if none selected
        const lastIndex = currentContent.questions.length - 1;
        if (lastIndex >= 0) {
          duplicateQuestion(lastIndex);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentContent.questions.length, duplicateQuestion]);

  const applyAiQuestions = useCallback(
    (aiQuestions: QuizQuestion[]) => {
      if (!aiQuestions.length) {
        setAiError("AI không tạo được câu hỏi phù hợp. Hãy thử rút gọn hoặc làm rõ nội dung.");
        return;
      }
      onContentChange({
        ...currentContent,
        questions: [...currentContent.questions, ...aiQuestions],
      });
    },
    [currentContent, onContentChange]
  );

  const openRateLimitDialog = useCallback(
    (retryAfterSeconds: number) => {
      setRateLimitRetryAfterSeconds(retryAfterSeconds);
      setRateLimitOpen(true);
    },
    []
  );

  const runAiFromText = useCallback(async () => {
    const source = aiSourceText.trim();
    if (!source) return;

    setLastAiRequest({ mode: "text", sourceText: source, numQuestions: aiNumQuestions });

    try {
      setAiLoading(true);
      setAiError(null);
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: source,
          numQuestions: aiNumQuestions,
        }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const json = toApiEnvelope(raw);
      if (res.status === 429) {
        openRateLimitDialog(getRetryAfterSecondsFromResponse(res, raw) ?? 60);
        return;
      }
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể sinh câu hỏi bằng AI");
      }

      const aiQuestions = getAiQuestionsFromEnvelope(json);
      applyAiQuestions(aiQuestions);
    } catch (e) {
      console.error("[QuizContentBuilder] AI quiz error", e);
      setAiError(e instanceof Error ? e.message : "Có lỗi xảy ra khi gọi AI. Vui lòng thử lại.");
    } finally {
      setAiLoading(false);
    }
  }, [aiNumQuestions, aiSourceText, applyAiQuestions, openRateLimitDialog]);

  const runAiFromFile = useCallback(async () => {
    if (!aiSourceFile) return;

    setLastAiRequest({ mode: "file", file: aiSourceFile, numQuestions: aiNumQuestions });

    try {
      setAiLoading(true);
      setAiError(null);

      const fd = new FormData();
      fd.append("file", aiSourceFile);
      fd.append("numQuestions", String(aiNumQuestions));

      const res = await fetch("/api/ai/quiz/file", { method: "POST", body: fd });
      const raw: unknown = await res.json().catch(() => null);
      const json = toApiEnvelope(raw);
      if (res.status === 429) {
        openRateLimitDialog(getRetryAfterSecondsFromResponse(res, raw) ?? 60);
        return;
      }
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể sinh câu hỏi bằng AI");
      }

      const aiQuestions = getAiQuestionsFromEnvelope(json);
      applyAiQuestions(aiQuestions);
    } catch (e) {
      console.error("[QuizContentBuilder] AI quiz file error", e);
      setAiError(e instanceof Error ? e.message : "Có lỗi xảy ra khi gọi AI. Vui lòng thử lại.");
    } finally {
      setAiLoading(false);
    }
  }, [aiNumQuestions, aiSourceFile, applyAiQuestions, openRateLimitDialog]);

  const handleRetryAi = useCallback(async () => {
    if (!lastAiRequest) return;

    if (lastAiRequest.mode === "text") {
      setAiSourceText(lastAiRequest.sourceText);
      await runAiFromText();
      return;
    }

    setAiSourceFile(lastAiRequest.file);
    await runAiFromFile();
  }, [lastAiRequest, runAiFromFile, runAiFromText]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1.5">
          Nội Dung Bài Tập Trắc Nghiệm
        </h2>
        <p className="text-gray-600 text-sm">
          Tạo câu hỏi và cài đặt thời gian, bảo mật
        </p>
      </div>

      {/* AI Quiz Generator */}
      <Card className="border-dashed border-blue-200 bg-blue-50/60">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-800">
              <Brain className="w-5 h-5" />
              <span>AI Quiz Generator</span>
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              Dán nội dung bài học → để AI gợi ý câu hỏi trắc nghiệm
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-xs font-semibold text-slate-700">
            Nội dung bài học / tài liệu
          </Label>
          <textarea
            value={aiSourceText}
            onChange={(e) => setAiSourceText(e.target.value)}
            placeholder="Dán nội dung bài giảng, đoạn văn, ghi chú... (Tiếng Việt)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs min-h-[96px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          />

          <div className="grid gap-2">
            <Label className="text-xs font-semibold text-slate-700" htmlFor="aiSourceFile">
              Hoặc tải file (PDF/DOCX/TXT)
            </Label>
            <Input
              id="aiSourceFile"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              disabled={aiLoading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setAiSourceFile(file);
                setAiError(null);
              }}
            />
            <p className="text-[11px] text-slate-600">
              Gợi ý: file nên nhỏ hơn 5MB và ưu tiên nội dung chữ (không scan hình).
            </p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <Label htmlFor="aiNumQuestions" className="font-semibold">
                Số câu hỏi mong muốn
              </Label>
              <Input
                id="aiNumQuestions"
                type="number"
                min={1}
                max={60}
                value={aiNumQuestions}
                onChange={(e) => setAiNumQuestions(parseInt(e.target.value) || 1)}
                className="w-20 h-8 text-xs"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                className="text-[11px]"
                disabled={aiLoading}
                onClick={() => {
                  setAiSourceText("");
                  setAiSourceFile(null);
                  setAiError(null);
                }}
              >
                Xoá nội dung
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-[11px]"
                disabled={aiLoading || (!aiSourceText.trim() && !aiSourceFile)}
                onClick={async () => {
                  if (aiSourceFile) {
                    await runAiFromFile();
                    return;
                  }
                  await runAiFromText();
                }}
              >
                {aiLoading
                  ? "Đang sinh câu hỏi..."
                  : aiSourceFile
                  ? "Tạo câu hỏi từ file"
                  : "Tạo câu hỏi bằng AI"}
              </Button>
            </div>
          </div>
          {aiError && (
            <p className="text-[11px] text-red-600 mt-1">{aiError}</p>
          )}
        </CardContent>
      </Card>

      <RateLimitDialog
        open={rateLimitOpen}
        onOpenChange={setRateLimitOpen}
        retryAfterSeconds={rateLimitRetryAfterSeconds}
        title="Bạn đang yêu cầu AI quá nhanh"
        description="Vui lòng chờ thêm một chút rồi thử lại."
        onRetry={handleRetryAi}
      />

      {/* Question Templates (Top) */}
      <QuestionTemplates 
        onAddQuestion={addQuestionFromTemplate}
        className="mb-4"
      />

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Câu hỏi ({currentContent.questions.length})
            </div>
            <Button onClick={addQuestion} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Thêm câu hỏi
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentContent.questions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Chưa có câu hỏi nào. Nhấn &quot;Thêm câu hỏi&quot; để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentContent.questions.map((question, qIndex) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  index={qIndex}
                  onUpdateQuestion={updateQuestion}
                  onUpdateOption={updateOption}
                  onToggleCorrect={toggleCorrect}
                  onDuplicate={duplicateQuestion}
                  onRemove={removeQuestion}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Thời gian làm bài
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Presets */}
          <div>
            <Label className="text-base font-medium mb-4 block">
              Chọn thời gian nhanh
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {TIME_PRESETS.map((preset) => (
                <div
                  key={preset.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-center ${
                    currentContent.timeLimitMinutes === preset.value && !customTime
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setCustomTime(false);
                    updateTimeLimit(preset.value);
                  }}
                >
                  <div className="font-bold text-lg text-blue-600">{preset.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Time */}
          <div className="flex items-center gap-4">
            <Switch
              checked={customTime}
              onCheckedChange={setCustomTime}
            />
            <Label className="text-base">Tùy chỉnh thời gian</Label>
          </div>

          {customTime && (
            <div className="max-w-xs">
              <Label htmlFor="customTime">Thời gian (phút)</Label>
              <Input
                id="customTime"
                type="number"
                min="5"
                max="300"
                value={currentContent.timeLimitMinutes}
                onChange={(e) => updateTimeLimit(parseInt(e.target.value) || 30)}
                className="mt-2"
              />
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700">
              ⏱️ <strong>Thời gian hiện tại:</strong> {currentContent.timeLimitMinutes} phút
              {currentContent.questions.length > 0 && (
                <span className="ml-2">
                  (~{Math.round(currentContent.timeLimitMinutes / currentContent.questions.length)} phút/câu)
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      

      {/* Security Settings (Collapsible) */}
      <AccordionItem title="Cài đặt bảo mật" defaultOpen={false} className="bg-white border rounded-lg">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <FormSwitchRow
                label="Xáo thứ tự câu hỏi"
                description="Mỗi học sinh có thứ tự khác nhau"
                checked={currentContent.antiCheatConfig?.shuffleQuestions || false}
                onChange={(checked) => updateAntiCheat('shuffleQuestions', checked)}
              />
              <FormSwitchRow
                label="Xáo thứ tự đáp án"
                description="A, B, C, D sẽ khác nhau"
                checked={currentContent.antiCheatConfig?.shuffleOptions || false}
                onChange={(checked) => updateAntiCheat('shuffleOptions', checked)}
              />
              <FormSwitchRow
                label="Hiển thị từng câu"
                description="Không cho quay lại câu trước"
                checked={currentContent.antiCheatConfig?.singleQuestionMode || false}
                onChange={(checked) => updateAntiCheat('singleQuestionMode', checked)}
              />

              {/* Chính sách hiển thị đáp án đúng */}
              <div>
                <Label className="text-sm font-medium">Hiển thị đáp án đúng cho học sinh</Label>
                <p className="text-xs text-gray-600">Chọn thời điểm cho phép hiển thị đáp án đúng</p>
                <div className="mt-2">
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={currentContent.antiCheatConfig?.showCorrectMode || 'never'}
                    onChange={(e) => updateAntiCheat('showCorrectMode', parseShowCorrectMode(e.target.value))}
                  >
                    <option value="never">Không bao giờ (khuyến nghị)</option>
                    <option value="afterSubmit">Sau khi học sinh nộp bài</option>
                    <option value="afterLock">Sau khi bài thi đóng</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="space-y-3">
              <FormSwitchRow
                label="Bắt buộc fullscreen"
                description="Phải làm bài toàn màn hình"
                checked={currentContent.antiCheatConfig?.requireFullscreen || false}
                onChange={(checked) => updateAntiCheat('requireFullscreen', checked)}
              />
              <FormSwitchRow
                label="Phát hiện chuyển tab"
                description="Cảnh báo khi rời khỏi trang"
                checked={currentContent.antiCheatConfig?.detectTabSwitch || false}
                onChange={(checked) => updateAntiCheat('detectTabSwitch', checked)}
              />
              <FormSwitchRow
                label="Vô hiệu hóa copy/paste"
                description="Không cho sao chép dán"
                checked={currentContent.antiCheatConfig?.disableCopyPaste || false}
                onChange={(checked) => updateAntiCheat('disableCopyPaste', checked)}
              />

              <div className="border-t pt-3 space-y-2.5">
                <FormSwitchRow
                  label="Fuzzy match cho FILL_BLANK"
                  description="Chấp nhận câu trả lời gần đúng theo ngưỡng"
                  checked={currentContent.antiCheatConfig?.enableFuzzyFillBlank || false}
                  onChange={(checked) => updateAntiCheat('enableFuzzyFillBlank', checked)}
                />
                {(currentContent.antiCheatConfig?.enableFuzzyFillBlank) && (
                  <div>
                    <Label htmlFor="fuzzy-threshold" className="text-xs">Ngưỡng sai lệch (0 → 0.5)</Label>
                    <Input
                      id="fuzzy-threshold"
                      type="number"
                      min={0}
                      max={0.5}
                      step={0.05}
                      value={typeof currentContent.antiCheatConfig?.fuzzyThreshold === 'number' ? currentContent.antiCheatConfig?.fuzzyThreshold : 0.2}
                      onChange={(e) => updateAntiCheat('fuzzyThreshold', Math.max(0, Math.min(0.5, parseFloat(e.target.value) || 0)))}
                      className="mt-2 max-w-[160px] h-9 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* Schedule Settings (Collapsible) */}
      <AccordionItem title="Lịch trình thi" defaultOpen={false} className="bg-white border rounded-lg">
        <div className="p-4 space-y-4">
          <ScheduleSection
            openAt={currentContent.openAt}
            lockAt={currentContent.lockAt}
            timeLimitMinutes={currentContent.timeLimitMinutes}
            onChange={(next) => {
              onContentChange({
                ...currentContent,
                openAt: next.openAt,
                lockAt: next.lockAt,
              });
            }}
          />
          <div className="max-w-xs">
            <Label htmlFor="maxAttempts" className="text-sm font-medium">
              Số lần làm bài tối đa
            </Label>
            <Input
              id="maxAttempts"
              type="number"
              min="1"
              max="10"
              value={currentContent.maxAttempts}
              onChange={(e) => updateMaxAttempts(parseInt(e.target.value) || 1)}
              className="mt-2 h-9 text-sm text-center"
            />
          </div>
        </div>
      </AccordionItem>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          <span>Tóm tắt bài thi</span>
        </h3>
        <div className="space-y-1 text-sm text-blue-700">
          <p>• <strong>Số câu hỏi:</strong> {currentContent.questions.length}</p>
          <p>• <strong>Thời gian:</strong> {currentContent.timeLimitMinutes} phút</p>
          <p>• <strong>Số lần làm:</strong> {currentContent.maxAttempts} lần</p>
          <p>• <strong>Bảo mật:</strong> {
            Object.values(currentContent.antiCheatConfig || {}).filter(v => v === true).length
          } tính năng được bật</p>
        </div>
      </div>
    </div>
  );
}
