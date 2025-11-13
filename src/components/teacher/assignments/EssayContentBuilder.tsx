"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { 
  Upload, 
  FileText, 
  Image, 
  Video,
  X,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Import Types
import { SubmissionFormat } from '@/types/assignment-builder';

interface EssayContent {
  question: string;
  attachments?: File[];
  submissionFormat: SubmissionFormat;
  openAt?: Date;
  dueDate?: Date;
}

interface EssayContentBuilderProps {
  content?: EssayContent;
  onContentChange: (content: EssayContent) => void;
}

/**
 * Essay Content Builder - Đơn giản và trực quan
 * Theo đề xuất user: chỉ cần question + file upload + timing
 */
export default function EssayContentBuilder({ content, onContentChange }: EssayContentBuilderProps) {
  const [dragActive, setDragActive] = useState(false);

  // Initialize default content
  const currentContent: EssayContent = content || {
    question: '',
    attachments: [],
    submissionFormat: 'BOTH',
    openAt: new Date(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
  };

  // Update handlers
  const updateQuestion = useCallback((question: string) => {
    onContentChange({
      ...currentContent,
      question
    });
  }, [currentContent, onContentChange]);

  const updateSubmissionFormat = useCallback((format: SubmissionFormat) => {
    onContentChange({
      ...currentContent,
      submissionFormat: format
    });
  }, [currentContent, onContentChange]);

  const updateTiming = useCallback((field: 'openAt' | 'dueDate', date: Date | undefined) => {
    onContentChange({
      ...currentContent,
      [field]: date
    });
  }, [currentContent, onContentChange]);

  // File upload handlers
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter(file => {
      // Validate file types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4'
      ];
      
      // Max 10MB per file
      const maxSize = 10 * 1024 * 1024;
      
      return allowedTypes.includes(file.type) && file.size <= maxSize;
    });

    const updatedAttachments = [...(currentContent.attachments || []), ...newFiles];
    
    onContentChange({
      ...currentContent,
      attachments: updatedAttachments
    });
  }, [currentContent, onContentChange]);

  const removeFile = useCallback((index: number) => {
    const updatedAttachments = currentContent.attachments?.filter((_, i) => i !== index) || [];
    onContentChange({
      ...currentContent,
      attachments: updatedAttachments
    });
  }, [currentContent, onContentChange]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // File icon helper
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Nội Dung Bài Tập Tự Luận
        </h2>
        <p className="text-gray-600">
          Tạo câu hỏi và đính kèm tài liệu cho học sinh
        </p>
      </div>

      {/* Question Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Câu hỏi bài tập
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="question" className="text-base font-medium">
              Nội dung câu hỏi <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question"
              value={currentContent.question}
              onChange={(e) => updateQuestion(e.target.value)}
              placeholder="Nhập câu hỏi tự luận cho học sinh..."
              className="mt-2 min-h-[120px] text-base"
            />
            <p className="text-sm text-gray-500 mt-2">
              Hỗ trợ formatting cơ bản. Học sinh sẽ thấy câu hỏi này khi làm bài.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Đính kèm tài liệu (tùy chọn)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Kéo thả file hoặc click để chọn
            </h3>
            <p className="text-gray-600 mb-4">
              Hỗ trợ: PDF, DOC, DOCX, JPG, PNG, GIF, MP4 (tối đa 10MB/file)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Chọn file
            </Button>
          </div>

          {/* File List */}
          {currentContent.attachments && currentContent.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">File đã chọn:</h4>
              {currentContent.attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Định dạng nộp bài
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { value: 'TEXT' as SubmissionFormat, label: 'Chỉ văn bản', desc: 'Học sinh nhập trực tiếp' },
              { value: 'FILE' as SubmissionFormat, label: 'Chỉ file', desc: 'Học sinh upload file' },
              { value: 'BOTH' as SubmissionFormat, label: 'Cả hai', desc: 'Linh hoạt nhất' }
            ].map((option) => (
              <div
                key={option.value}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  currentContent.submissionFormat === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateSubmissionFormat(option.value)}
              >
                <h4 className="font-medium text-gray-900 mb-1">{option.label}</h4>
                <p className="text-sm text-gray-600">{option.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Thời gian
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
                label="Hạn nộp bài"
                value={currentContent.dueDate}
                onChange={(date) => updateTiming('dueDate', date)}
                placeholder="Chọn hạn nộp bài"
                required
              />
            </div>
          </div>

          {/* Validation Warning */}
          {currentContent.openAt && currentContent.dueDate && 
           currentContent.openAt >= currentContent.dueDate && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                Thời gian mở bài phải trước hạn nộp bài
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📋 Tóm tắt bài tập</h3>
        <div className="space-y-1 text-sm text-blue-700">
          <p>• <strong>Câu hỏi:</strong> {currentContent.question ? '✓ Đã nhập' : '⚠️ Chưa nhập'}</p>
          <p>• <strong>File đính kèm:</strong> {currentContent.attachments?.length || 0} file</p>
          <p>• <strong>Định dạng nộp:</strong> {
            currentContent.submissionFormat === 'TEXT' ? 'Văn bản' :
            currentContent.submissionFormat === 'FILE' ? 'File' : 'Cả hai'
          }</p>
          <p>• <strong>Thời gian:</strong> {
            currentContent.openAt && currentContent.dueDate 
              ? `${currentContent.openAt.toLocaleDateString()} - ${currentContent.dueDate.toLocaleDateString()}`
              : 'Chưa thiết lập'
          }</p>
        </div>
      </div>
    </div>
  );
}
