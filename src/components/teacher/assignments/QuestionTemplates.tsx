"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  Edit3,
  Zap,
  Copy,
  Upload
} from 'lucide-react';
import { QuestionType, QuizQuestion } from '@/types/assignment-builder';

interface QuestionTemplate {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  template: Partial<QuizQuestion>;
}

interface QuestionTemplatesProps {
  onAddQuestion: (template: Partial<QuizQuestion>) => void;
  onBulkImport?: () => void;
  className?: string;
}

const questionTemplates: QuestionTemplate[] = [
  {
    id: 'multiple_choice_4',
    type: 'MULTIPLE',
    title: 'Trắc nghiệm 4 đáp án',
    description: 'Câu hỏi lựa chọn với 4 đáp án A, B, C, D',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'from-blue-500 to-blue-600',
    template: {
      id: '',
      content: '',
      type: 'MULTIPLE',
      options: [
        { label: 'A', content: '', isCorrect: false },
        { label: 'B', content: '', isCorrect: false },
        { label: 'C', content: '', isCorrect: false },
        { label: 'D', content: '', isCorrect: false }
      ],
      explanation: ''
    }
  },
  {
    id: 'true_false',
    type: 'TRUE_FALSE',
    title: 'Đúng/Sai',
    description: 'Câu hỏi với 2 lựa chọn: Đúng hoặc Sai',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'from-green-500 to-green-600',
    template: {
      id: '',
      content: '',
      type: 'TRUE_FALSE',
      options: [
        { label: 'Đúng', content: 'Đúng', isCorrect: false },
        { label: 'Sai', content: 'Sai', isCorrect: false }
      ],
      explanation: ''
    }
  },
  {
    id: 'fill_blank',
    type: 'FILL_BLANK',
    title: 'Điền từ',
    description: 'Câu hỏi yêu cầu điền từ/cụm từ vào chỗ trống',
    icon: <Edit3 className="h-5 w-5" />,
    color: 'from-purple-500 to-purple-600',
    template: {
      id: '',
      content: 'Điền từ thích hợp vào chỗ trống: _____',
      type: 'FILL_BLANK',
      options: [
        { label: 'Đáp án', content: '', isCorrect: true }
      ],
      explanation: ''
    }
  },
  {
    id: 'single_choice',
    type: 'SINGLE',
    title: 'Trắc nghiệm 1 đáp án',
    description: 'Câu hỏi lựa chọn với 1 đáp án đúng duy nhất',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'from-indigo-500 to-indigo-600',
    template: {
      id: '',
      content: '',
      type: 'SINGLE',
      options: [
        { label: 'A', content: '', isCorrect: false },
        { label: 'B', content: '', isCorrect: false },
        { label: 'C', content: '', isCorrect: false },
        { label: 'D', content: '', isCorrect: false }
      ],
      explanation: ''
    }
  }
];

export function QuestionTemplates({ 
  onAddQuestion, 
  onBulkImport,
  className 
}: QuestionTemplatesProps) {
  
  const handleTemplateClick = (template: QuestionTemplate) => {
    onAddQuestion(template.template);
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Tạo nhanh câu hỏi
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Chọn template để tạo câu hỏi nhanh chóng
          </p>
        </div>
        
        {/* Bulk Actions */}
        <div className="flex gap-2">
          {onBulkImport && (
            <Button
              variant="outline"
              onClick={onBulkImport}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </Button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {questionTemplates.map((template) => (
          <Card 
            key={template.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
            onClick={() => handleTemplateClick(template)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-3">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${template.color} flex items-center justify-center text-white shadow-lg`}>
                  {template.icon}
                </div>
                
                {/* Title */}
                <h4 className="font-semibold text-gray-800 text-sm">
                  {template.title}
                </h4>
                
                {/* Description */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {template.description}
                </p>
                
                {/* Add Button */}
                <Button 
                  variant="ghost" 
                  className="w-full h-8 text-xs hover:bg-blue-50 hover:text-blue-600"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Thêm
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <FileText className="h-4 w-4" />
          <span className="text-sm font-medium">
            💡 Mẹo: Sau khi thêm câu hỏi, bạn có thể duplicate (Ctrl+D) để tạo nhanh câu hỏi tương tự
          </span>
        </div>
      </div>
    </div>
  );
}

export default QuestionTemplates;
