"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { QuizOption, QuizQuestion } from "@/types/assignment-builder";
import { Copy, GripVertical, Trash2 } from "lucide-react";

interface QuestionItemProps {
  question: QuizQuestion;
  index: number;
  onUpdateQuestion: <K extends keyof QuizQuestion>(index: number, field: K, value: QuizQuestion[K]) => void;
  onUpdateOption: <K extends keyof QuizOption>(qIndex: number, oIndex: number, field: K, value: QuizOption[K]) => void;
  onToggleCorrect: (qIndex: number, oIndex: number, checked: boolean) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
}

export default function QuestionItem({ question, index, onUpdateQuestion, onUpdateOption, onToggleCorrect, onDuplicate, onRemove }: QuestionItemProps) {
  return (
    <div className="border-2 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Drag Handle (chưa kích hoạt dnd) */}
          <div className="cursor-move text-gray-400 hover:text-gray-600">
            <GripVertical className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-lg text-gray-800">Câu {index + 1}</h4>
          <Badge variant="outline" className="text-xs">{question.type}</Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => onDuplicate(index)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onRemove(index)}
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
            onChange={(e) => onUpdateQuestion(index, 'content', e.target.value)}
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
                onChange={(e) => onUpdateOption(index, oIndex, 'content', e.target.value)}
                placeholder={`Đáp án ${option.label}...`}
                className="flex-1"
              />
              {question.type === 'SINGLE' || question.type === 'TRUE_FALSE' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={option.isCorrect}
                    onChange={() => onToggleCorrect(index, oIndex, true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <Label className="text-sm">Đúng</Label>
                </div>
              ) : question.type === 'MULTIPLE' ? (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={option.isCorrect}
                    onCheckedChange={(checked) => onToggleCorrect(index, oIndex, checked)}
                  />
                  <Label className="text-sm">Đúng</Label>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
