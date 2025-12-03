"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  Calendar,
  Shield,
  AlertCircle,
  Brain,
  Timer,
  Copy,
  GripVertical,
  ClipboardList
} from 'lucide-react';

// Import Types
import { QuizQuestion, QuizOption } from '@/types/assignment-builder';
import { AntiCheatConfig } from '@/types/exam-system';

// Import Components
import QuestionTemplates from './QuestionTemplates';

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Nội Dung Bài Tập Trắc Nghiệm
        </h2>
        <p className="text-gray-600">
          Tạo câu hỏi và cài đặt thời gian, bảo mật
        </p>
      </div>

      {/* Question Templates */}
      <QuestionTemplates 
        onAddQuestion={addQuestionFromTemplate}
        className="mb-8"
      />

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

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Lịch trình thi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <DateTimePicker
                label="Thời gian mở bài"
                value={currentContent.openAt}
                onChange={(date) => updateTiming('openAt', date)}
                placeholder="Chọn thời gian mở bài"
              />
            </div>

            <div>
              <DateTimePicker
                label="Thời gian đóng bài"
                value={currentContent.lockAt}
                onChange={(date) => updateTiming('lockAt', date)}
                placeholder="Chọn thời gian đóng bài"
                required
              />
            </div>
          </div>

          <div className="max-w-xs">
            <Label htmlFor="maxAttempts" className="text-base font-medium">
              Số lần làm bài tối đa
            </Label>
            <Input
              id="maxAttempts"
              type="number"
              min="1"
              max="10"
              value={currentContent.maxAttempts}
              onChange={(e) => updateMaxAttempts(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>

          {/* Validation Warning */}
          {currentContent.openAt && currentContent.lockAt && 
           currentContent.openAt >= currentContent.lockAt && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Thời gian mở bài phải trước thời gian đóng bài
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Cài đặt bảo mật
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Xáo thứ tự câu hỏi</Label>
                  <p className="text-sm text-gray-600">Mỗi học sinh có thứ tự khác nhau</p>
                </div>
                <Switch
                  checked={currentContent.antiCheatConfig?.shuffleQuestions || false}
                  onCheckedChange={(checked) => updateAntiCheat('shuffleQuestions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Xáo thứ tự đáp án</Label>
                  <p className="text-sm text-gray-600">A, B, C, D sẽ khác nhau</p>
                </div>
                <Switch
                  checked={currentContent.antiCheatConfig?.shuffleOptions || false}
                  onCheckedChange={(checked) => updateAntiCheat('shuffleOptions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Hiển thị từng câu</Label>
                  <p className="text-sm text-gray-600">Không cho quay lại câu trước</p>
                </div>
                <Switch
                  checked={currentContent.antiCheatConfig?.singleQuestionMode || false}
                  onCheckedChange={(checked) => updateAntiCheat('singleQuestionMode', checked)}
                />
              </div>

              {/* Chính sách hiển thị đáp án đúng */}
              <div>
                <Label className="text-base font-medium">Hiển thị đáp án đúng cho học sinh</Label>
                <p className="text-sm text-gray-600">Chọn thời điểm cho phép hiển thị đáp án đúng</p>
                <div className="mt-2">
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={currentContent.antiCheatConfig?.showCorrectMode || 'never'}
                    onChange={(e) => updateAntiCheat('showCorrectMode', e.target.value as any)}
                  >
                    <option value="never">Không bao giờ (khuyến nghị)</option>
                    <option value="afterSubmit">Sau khi học sinh nộp bài</option>
                    <option value="afterLock">Sau khi bài thi đóng</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Bắt buộc fullscreen</Label>
                  <p className="text-sm text-gray-600">Phải làm bài toàn màn hình</p>
                </div>
                <Switch
                  checked={currentContent.antiCheatConfig?.requireFullscreen || false}
                  onCheckedChange={(checked) => updateAntiCheat('requireFullscreen', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Phát hiện chuyển tab</Label>
                  <p className="text-sm text-gray-600">Cảnh báo khi rời khỏi trang</p>
                </div>
                <Switch
                  checked={currentContent.antiCheatConfig?.detectTabSwitch || false}
                  onCheckedChange={(checked) => updateAntiCheat('detectTabSwitch', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Vô hiệu hóa copy/paste</Label>
                  <p className="text-sm text-gray-600">Không cho sao chép dán</p>
                </div>
                <Switch
                  checked={currentContent.antiCheatConfig?.disableCopyPaste || false}
                  onCheckedChange={(checked) => updateAntiCheat('disableCopyPaste', checked)}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Fuzzy match cho FILL_BLANK</Label>
                    <p className="text-sm text-gray-600">Chấp nhận câu trả lời gần đúng theo ngưỡng</p>
                  </div>
                  <Switch
                    checked={currentContent.antiCheatConfig?.enableFuzzyFillBlank || false}
                    onCheckedChange={(checked) => updateAntiCheat('enableFuzzyFillBlank', checked)}
                  />
                </div>
                {(currentContent.antiCheatConfig?.enableFuzzyFillBlank) && (
                  <div>
                    <Label htmlFor="fuzzy-threshold" className="text-sm">Ngưỡng sai lệch (0 → 0.5)</Label>
                    <Input
                      id="fuzzy-threshold"
                      type="number"
                      min={0}
                      max={0.5}
                      step={0.05}
                      value={typeof currentContent.antiCheatConfig?.fuzzyThreshold === 'number' ? currentContent.antiCheatConfig?.fuzzyThreshold : 0.2}
                      onChange={(e) => updateAntiCheat('fuzzyThreshold', Math.max(0, Math.min(0.5, parseFloat(e.target.value) || 0)) as any)}
                      className="mt-2 max-w-[160px]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="text-center py-12 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Chưa có câu hỏi nào. Nhấn &quot;Thêm câu hỏi&quot; để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentContent.questions.map((question, qIndex) => (
                <div key={question.id} className="border-2 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* Drag Handle */}
                      <div className="cursor-move text-gray-400 hover:text-gray-600">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-lg text-gray-800">
                        Câu {qIndex + 1}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {question.type}
                      </Badge>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => duplicateQuestion(qIndex)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        title="Duplicate (Ctrl+D)"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Nội dung câu hỏi</Label>
                      <Textarea
                        value={question.content}
                        onChange={(e) => updateQuestion(qIndex, 'content', e.target.value)}
                        placeholder="Nhập câu hỏi..."
                        className="mt-2"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>
                        Đáp án {
                          question.type === 'FILL_BLANK'
                            ? '(danh sách đáp án chấp nhận)'
                            : (question.type === 'MULTIPLE' ? '(có thể nhiều đáp án đúng)' : '(chỉ 1 đáp án đúng)')
                        }
                      </Label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700">
                            {option.label}
                          </div>
                          <Input
                            value={option.content}
                            onChange={(e) => updateOption(qIndex, oIndex, 'content', e.target.value)}
                            placeholder={`Đáp án ${option.label}...`}
                            className="flex-1"
                          />
                          {question.type === 'SINGLE' || question.type === 'TRUE_FALSE' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={option.isCorrect}
                                onChange={() => toggleCorrect(qIndex, oIndex, true)}
                                className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                              />
                              <Label className="text-sm">Đúng</Label>
                            </div>
                          ) : question.type === 'MULTIPLE' ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={option.isCorrect}
                                onCheckedChange={(checked) => toggleCorrect(qIndex, oIndex, checked)}
                              />
                              <Label className="text-sm">Đúng</Label>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="bg-blue-50 p-6 rounded-lg">
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
