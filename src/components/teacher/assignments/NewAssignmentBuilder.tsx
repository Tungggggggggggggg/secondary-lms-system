"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Brain, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Users,
  FileText,
  Eye,
  AlertCircle,
  Home,
  ChevronRight
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Import Types
import { 
  AssignmentData,
  AssignmentType
} from '@/types/assignment-builder';

// Import Content Builders
import EssayContentBuilder from './EssayContentBuilder';
import QuizContentBuilder from './QuizContentBuilder';
import ClassroomSelector from './ClassroomSelector';

// Import Hooks
import { useAutoSave, generateDraftKey } from '@/hooks/useAutoSave';

// Steps definition
type Step = 'type' | 'basic' | 'content' | 'classrooms' | 'preview';

interface StepInfo {
  key: Step;
  label: string;
  icon: LucideIcon;
  description: string;
}

const steps: StepInfo[] = [
  { key: 'type', label: 'Loại bài tập', icon: Brain, description: 'Chọn Essay hoặc Quiz' },
  { key: 'basic', label: 'Thông tin', icon: FileText, description: 'Tên và mô tả bài tập' },
  { key: 'content', label: 'Nội dung', icon: BookOpen, description: 'Tạo câu hỏi và cài đặt' },
  { key: 'classrooms', label: 'Lớp học', icon: Users, description: 'Chọn lớp học để giao bài tập' },
  { key: 'preview', label: 'Xem trước', icon: Eye, description: 'Kiểm tra và tạo bài tập' }
];

/**
 * New Assignment Builder - Simplified Workflow
 * Redesigned theo feedback của user với UX cải tiến
 */
export default function NewAssignmentBuilder() {
  // Hooks
  const router = useRouter();
  const { toast } = useToast();
  
  // Generate unique key for this session
  const [draftKey] = useState(() => generateDraftKey());
  
  // State management
  const [currentStep, setCurrentStep] = useState<Step>('type');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [assignmentData, setAssignmentData] = useState<AssignmentData>({
    type: 'ESSAY',
    title: '',
    description: '',
    subject: '',
    classrooms: []
  });

  // Auto-save functionality
  const autoSave = useAutoSave(assignmentData, {
    key: draftKey,
    interval: 30000, // 30 seconds
    enabled: true
  });

  // Load draft on mount
  useEffect(() => {
    const savedDraft = autoSave.loadDraft();
    if (savedDraft) {
      const shouldLoad = window.confirm(
        'Tìm thấy bản nháp đã lưu. Bạn có muốn tiếp tục từ bản nháp này không?'
      );
      
      if (shouldLoad) {
        setAssignmentData(savedDraft);
        console.log('[NewAssignmentBuilder] Loaded draft data');
      } else {
        autoSave.clearDraft();
      }
    }
  }, [autoSave]);

  // Navigation helpers
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const goToStep = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    if (!isLastStep) {
      const nextStep = steps[currentStepIndex + 1];
      setCurrentStep(nextStep.key);
    }
  }, [currentStepIndex, isLastStep]);

  const goBack = useCallback(() => {
    if (!isFirstStep) {
      const prevStep = steps[currentStepIndex - 1];
      setCurrentStep(prevStep.key);
    }
  }, [currentStepIndex, isFirstStep]);

  // Update handlers
  const updateAssignmentType = useCallback((type: AssignmentType) => {
    setAssignmentData(prev => ({
      ...prev,
      type,
      // Reset content when changing type
      essayContent: undefined,
      quizContent: undefined
    }));
  }, []);

  const updateBasicInfo = useCallback((field: string, value: string) => {
    setAssignmentData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateEssayContent = useCallback((essayContent: NonNullable<AssignmentData['essayContent']>) => {
    setAssignmentData(prev => ({
      ...prev,
      essayContent
    }));
  }, []);

  const updateQuizContent = useCallback((quizContent: NonNullable<AssignmentData['quizContent']>) => {
    setAssignmentData(prev => ({
      ...prev,
      quizContent
    }));
  }, []);

  const updateClassrooms = useCallback((classrooms: string[]) => {
    setAssignmentData(prev => ({
      ...prev,
      classrooms
    }));
  }, []);

  // Validation
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'type':
        return !!assignmentData.type;
      case 'basic':
        return !!assignmentData.title.trim();
      case 'content':
        if (assignmentData.type === 'ESSAY') {
          return !!assignmentData.essayContent?.question.trim();
        } else {
          return !!assignmentData.quizContent?.questions.length;
        }
      case 'classrooms':
        return true; // Classroom selection is optional
      case 'preview':
        return true;
      default:
        return false;
    }
  }, [currentStep, assignmentData]);

  // Navigation functions
  const handleExit = useCallback(() => {
    console.log('🚪 Exit clicked - hasUnsavedChanges:', hasUnsavedChanges);
    if (hasUnsavedChanges) {
      console.log('⚠️ Showing exit dialog');
      setShowExitDialog(true);
    } else {
      console.log('✅ No unsaved changes, redirecting');
      router.push('/dashboard/teacher/assignments');
    }
  }, [hasUnsavedChanges, router]);

  const confirmExit = useCallback(() => {
    setShowExitDialog(false);
    router.push('/dashboard/teacher/assignments');
  }, [router]);

  const cancelExit = useCallback(() => {
    setShowExitDialog(false);
  }, []);

  // Track changes
  useEffect(() => {
    const hasContent = !!(
      assignmentData.title.trim() ||
      assignmentData.description?.trim() ||
      assignmentData.subject?.trim() ||
      assignmentData.essayContent?.question.trim() ||
      ((assignmentData.quizContent?.questions.length ?? 0) > 0) ||
      ((assignmentData.classrooms || []).length > 0)
    );
    setHasUnsavedChanges(hasContent);
  }, [assignmentData]);

  // Handle create assignment
  const handleCreateAssignment = useCallback(async () => {
    if (!canProceed()) {
      toast({
        title: "Lỗi validation",
        description: "Vui lòng kiểm tra lại thông tin bài tập",
        variant: "destructive"
      });
      return;
    }

    try {
      // Send the entire assignmentData as payload (backend expects this structure)
      const payload = {
        ...assignmentData,
        title: assignmentData.title.trim(),
        description: assignmentData.description?.trim() || null,
        subject: assignmentData.subject?.trim() || null
      };

      // Debug logging
      console.log('🔍 Assignment Type:', assignmentData.type);
      console.log('🔍 Has Essay Content:', !!assignmentData.essayContent);
      console.log('🔍 Has Quiz Content:', !!assignmentData.quizContent);
      
      if (assignmentData.type === 'ESSAY' && assignmentData.essayContent) {
        console.log('📝 Essay Content Question:', assignmentData.essayContent.question);
        console.log('📝 Essay Content Attachments:', assignmentData.essayContent.attachments?.length || 0);
      }
      
      if (assignmentData.type === 'QUIZ' && assignmentData.quizContent) {
        console.log('📝 Quiz Content Questions:', assignmentData.quizContent.questions?.length || 0);
      }

      console.log('🚀 Creating assignment with payload:', payload);

      const response = await fetch('/api/assignments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Tạo bài tập thành công!",
          description: `Bài tập "${assignmentData.title}" đã được tạo thành công.`
        });

        // Phase B: Upload attachments nếu là ESSAY
        try {
          if (
            assignmentData.type === 'ESSAY' &&
            assignmentData.essayContent?.attachments &&
            assignmentData.essayContent.attachments.length > 0
          ) {
            const assignmentId = result?.data?.id as string | undefined;
            if (assignmentId) {
              const files = assignmentData.essayContent.attachments;
              console.log(`[AssignmentUpload] Bắt đầu upload ${files.length} file cho assignment ${assignmentId}`);
              for (const file of files) {
                try {
                  const form = new FormData();
                  form.append('file', file);
                  const resp = await fetch(`/api/assignments/${assignmentId}/upload`, {
                    method: 'POST',
                    body: form,
                  });
                  const j = await resp.json().catch(() => ({}));
                  if (!resp.ok || !j?.success) {
                    console.error('[AssignmentUpload] Upload thất bại:', j);
                  }
                } catch (e) {
                  console.error('[AssignmentUpload] Lỗi upload 1 file:', e);
                }
              }
              console.log('[AssignmentUpload] Hoàn tất upload file');
            }
          }
        } catch (e) {
          console.error('[AssignmentUpload] Lỗi tổng khi upload attachments:', e);
        }

        // Clear draft
        autoSave.clearDraft();

        // Redirect to assignments list
        router.push('/dashboard/teacher/assignments');
      } else {
        throw new Error(result.message || 'Có lỗi xảy ra khi tạo bài tập');
      }
    } catch (error) {
      console.error('❌ Create assignment error:', error);
      toast({
        title: "Lỗi tạo bài tập",
        description: error instanceof Error ? error.message : 'Có lỗi không xác định',
        variant: "destructive"
      });
    }
  }, [assignmentData, canProceed, toast, autoSave, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-3 mb-6 p-4 bg-white rounded-lg shadow-sm border">
          <Button 
            variant="ghost" 
            onClick={handleExit}
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <Home className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">Dashboard</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Bài tập</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-blue-600">Tạo mới</span>
          
          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="ml-auto flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Có thay đổi chưa lưu</span>
            </div>
          )}
        </nav>

        {/* Exit Confirmation Dialog */}
        {showExitDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                <h3 className="text-lg font-semibold">Xác nhận thoát</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Bạn có thay đổi chưa được lưu. Nếu thoát bây giờ, những thay đổi này sẽ bị mất.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={cancelExit}>
                  Hủy
                </Button>
                <Button 
                  variant="outline" 
                  onClick={confirmExit}
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  Thoát không lưu
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tạo Bài Tập Mới
          </h1>
          <p className="text-gray-600">
            Workflow đơn giản và trực quan để tạo bài tập hiệu quả
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => {
              const isActive = step.key === currentStep;
              const isCompleted = index < currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                    onClick={() => goToStep(step.key)}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <div className="ml-3 hidden md:block">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-gray-300 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Type Selection */}
            {currentStep === 'type' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Chọn Loại Bài Tập
                  </h2>
                  <p className="text-gray-600">
                    Lựa chọn phù hợp với mục tiêu giảng dạy của bạn
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Essay Option */}
                  <div
                    className={`p-8 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      assignmentData.type === 'ESSAY'
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateAssignmentType('ESSAY')}
                  >
                    <div className="text-center">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 text-green-600" />
                      <h3 className="text-xl font-bold mb-3 text-gray-900">Tự Luận</h3>
                      <p className="text-gray-600 mb-4">
                        Câu hỏi mở, học sinh trả lời bằng văn bản hoặc file
                      </p>
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Phát triển tư duy sáng tạo</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Đánh giá khả năng phân tích</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Upload file đề bài</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quiz Option */}
                  <div
                    className={`p-8 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      assignmentData.type === 'QUIZ'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateAssignmentType('QUIZ')}
                  >
                    <div className="text-center">
                      <Brain className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                      <h3 className="text-xl font-bold mb-3 text-gray-900">Trắc Nghiệm</h3>
                      <p className="text-gray-600 mb-4">
                        Câu hỏi có đáp án cố định, chấm điểm tự động
                      </p>
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          <span>Chấm điểm nhanh chóng</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          <span>Cài đặt bảo mật</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          <span>Thời gian làm bài</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 'basic' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Thông Tin Cơ Bản
                  </h2>
                  <p className="text-gray-600">
                    Điền thông tin chung cho bài tập của bạn
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title" className="text-base font-medium">
                      Tên bài tập <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={assignmentData.title}
                      onChange={(e) => updateBasicInfo('title', e.target.value)}
                      placeholder="Nhập tên bài tập..."
                      className="mt-2 text-base"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-medium">
                      Mô tả (tùy chọn)
                    </Label>
                    <Textarea
                      id="description"
                      value={assignmentData.description || ''}
                      onChange={(e) => updateBasicInfo('description', e.target.value)}
                      placeholder="Mô tả ngắn gọn về bài tập..."
                      className="mt-2 text-base"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-base font-medium">
                      Môn học (tùy chọn)
                    </Label>
                    <Input
                      id="subject"
                      value={assignmentData.subject || ''}
                      onChange={(e) => updateBasicInfo('subject', e.target.value)}
                      placeholder="Ví dụ: Toán, Văn, Anh..."
                      className="mt-2 text-base"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      💡 <strong>Gợi ý:</strong> Bạn có thể gán bài tập cho lớp học sau khi tạo xong.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Content */}
            {currentStep === 'content' && (
              <div>
                {assignmentData.type === 'ESSAY' ? (
                  <EssayContentBuilder
                    content={assignmentData.essayContent}
                    onContentChange={updateEssayContent}
                  />
                ) : (
                  <QuizContentBuilder
                    content={assignmentData.quizContent}
                    onContentChange={updateQuizContent}
                  />
                )}
              </div>
            )}

            {/* Step 4: Classrooms */}
            {currentStep === 'classrooms' && (
              <ClassroomSelector
                selectedClassrooms={assignmentData.classrooms || []}
                onClassroomsChange={updateClassrooms}
              />
            )}

            {/* Step 5: Preview & Validation */}
            {currentStep === 'preview' && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Xem Trước & Tạo Bài Tập
                  </h2>
                  <p className="text-gray-600">
                    Kiểm tra thông tin và tạo bài tập của bạn
                  </p>
                </div>

                {/* Basic Info Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Thông tin cơ bản
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Loại bài tập</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {assignmentData.type === 'ESSAY' ? (
                            <>
                              <BookOpen className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Tự luận</span>
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">Trắc nghiệm</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Tên bài tập</Label>
                        <p className="font-medium mt-1">{assignmentData.title}</p>
                      </div>
                      {assignmentData.subject && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Môn học</Label>
                          <p className="font-medium mt-1">{assignmentData.subject}</p>
                        </div>
                      )}
                      {assignmentData.description && (
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-600">Mô tả</Label>
                          <p className="mt-1">{assignmentData.description}</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-gray-600">Lớp học được giao</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(assignmentData.classrooms || []).length > 0 ? (
                            (assignmentData.classrooms || []).map((classroomId, index) => (
                              <Badge key={classroomId} variant="outline" className="bg-blue-100 text-blue-800">
                                Lớp {index + 1}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">Chưa chọn lớp học</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Nội dung bài tập
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {assignmentData.type === 'ESSAY' && assignmentData.essayContent ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Câu hỏi</Label>
                          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                            <p className="whitespace-pre-wrap">{assignmentData.essayContent.question}</p>
                          </div>
                        </div>
                        
                        {assignmentData.essayContent.attachments && assignmentData.essayContent.attachments.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">File đính kèm</Label>
                            <div className="mt-2 space-y-2">
                              {assignmentData.essayContent.attachments.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <FileText className="w-4 h-4" />
                                  <span className="text-sm">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Định dạng nộp</Label>
                            <p className="mt-1">{
                              assignmentData.essayContent.submissionFormat === 'TEXT' ? 'Văn bản' :
                              assignmentData.essayContent.submissionFormat === 'FILE' ? 'File' : 'Cả hai'
                            }</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Thời gian mở</Label>
                            <p className="mt-1">{assignmentData.essayContent.openAt?.toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Hạn nộp</Label>
                            <p className="mt-1">{assignmentData.essayContent.dueDate?.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ) : assignmentData.type === 'QUIZ' && assignmentData.quizContent ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Số câu hỏi</Label>
                            <p className="font-medium mt-1">{assignmentData.quizContent.questions.length}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Thời gian</Label>
                            <p className="font-medium mt-1">{assignmentData.quizContent.timeLimitMinutes} phút</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Số lần làm</Label>
                            <p className="font-medium mt-1">{assignmentData.quizContent.maxAttempts} lần</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Bảo mật</Label>
                            <p className="font-medium mt-1">
                              {Object.values(assignmentData.quizContent.antiCheatConfig || {}).filter(v => v === true).length} tính năng
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Thời gian mở</Label>
                            <p className="mt-1">{assignmentData.quizContent.openAt?.toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Thời gian đóng</Label>
                            <p className="mt-1">{assignmentData.quizContent.lockAt?.toLocaleString()}</p>
                          </div>
                        </div>

                        {assignmentData.quizContent.questions.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">Câu hỏi mẫu</Label>
                            <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                              <p className="font-medium">Câu 1: {assignmentData.quizContent.questions[0].content}</p>
                              <div className="mt-2 space-y-1">
                                {assignmentData.quizContent.questions[0].options.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                                      {opt.label}
                                    </span>
                                    <span className={opt.isCorrect ? 'font-medium text-green-600' : ''}>
                                      {opt.content}
                                    </span>
                                    {opt.isCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p>Chưa có nội dung bài tập</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Validation Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Trạng thái validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {assignmentData.title ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={assignmentData.title ? 'text-green-700' : 'text-red-700'}>
                          Tên bài tập
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {(assignmentData.type === 'ESSAY' && assignmentData.essayContent?.question) ||
                         (assignmentData.type === 'QUIZ' && assignmentData.quizContent?.questions.length) ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={
                          (assignmentData.type === 'ESSAY' && assignmentData.essayContent?.question) ||
                          (assignmentData.type === 'QUIZ' && assignmentData.quizContent?.questions.length)
                            ? 'text-green-700' : 'text-red-700'
                        }>
                          Nội dung bài tập
                        </span>
                      </div>

                      {assignmentData.type === 'ESSAY' && (
                        <div className="flex items-center gap-2">
                          {assignmentData.essayContent?.dueDate ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={assignmentData.essayContent?.dueDate ? 'text-green-700' : 'text-red-700'}>
                            Hạn nộp bài
                          </span>
                        </div>
                      )}

                      {assignmentData.type === 'QUIZ' && (
                        <div className="flex items-center gap-2">
                          {assignmentData.quizContent?.lockAt ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={assignmentData.quizContent?.lockAt ? 'text-green-700' : 'text-red-700'}>
                            Thời gian đóng bài
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Create Assignment Button */}
                <div className="text-center">
                  <Button
                    size="lg"
                    className="px-8 py-3 text-lg"
                    disabled={!canProceed()}
                    onClick={handleCreateAssignment}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Tạo Bài Tập
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={isFirstStep}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>

          <div className="text-sm text-gray-500">
            Bước {currentStepIndex + 1} / {steps.length}
          </div>

          <Button
            onClick={goNext}
            disabled={!canProceed() || isLastStep}
            className="flex items-center gap-2"
          >
            {isLastStep ? 'Tạo bài tập' : 'Tiếp theo'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
