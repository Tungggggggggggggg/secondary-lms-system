/**
 * Bulk Classroom Creation Wizard
 * Component wizard 5 bước để tạo lớp học hàng loạt với UX tối ưu
 */

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress"; // Không sử dụng
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  Circle, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle,
  Users,
  BookOpen,
  Upload,
  Eye,
  Sparkles
} from "lucide-react";
import { gsap } from "gsap";
import { BulkClassroomInput, BulkClassroomResult } from "@/types/bulk-operations";
import { useToast } from "@/hooks/use-toast";

// Import step components
import ClassroomInfoStep from "./steps/ClassroomInfoStep";
import TeacherSelectionStep from "./steps/TeacherSelectionStep";
import StudentInputStep from "./steps/StudentInputStep";
import PreviewStep from "./steps/PreviewStep";
// import CompletionStep from "./steps/CompletionStep";

const CompletionStep = ({ data, operationId }: any) => (
  <div className="text-center p-8">
    <div className="mb-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-semibold text-green-600 mb-2">Tạo lớp học thành công!</h3>
      <p className="text-gray-600">Lớp học đã được tạo và học sinh đã được thêm vào hệ thống.</p>
    </div>
    
    <div className="bg-gray-50 rounded-lg p-4 mb-6">
      <h4 className="font-medium mb-2">Thông tin lớp học:</h4>
      <p><strong>Tên lớp:</strong> {data?.name || 'N/A'}</p>
   
      <p><strong>Số học sinh:</strong> {data?.students?.length || 0}</p>
    </div>

    <div className="flex gap-4 justify-center">
      <Button 
        onClick={() => {
          console.log('Navigating to classrooms...');
          window.location.href = '/dashboard/admin/classrooms';
        }}
        className="px-6 py-2 bg-blue-500 text-white hover:bg-blue-600"
      >
        Xem danh sách lớp học
      </Button>
      <Button 
        variant="outline"
        onClick={() => {
          console.log('Reloading page...');
          window.location.reload();
        }}
        className="px-6 py-2"
      >
        Tạo lớp học khác
      </Button>
    </div>
  </div>
);

// ============================================
// Types & Interfaces
// ============================================

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isActive: boolean;
  hasError: boolean;
}

export interface WizardData extends BulkClassroomInput {
  // Thêm các field UI-specific
  useExistingTeacher: boolean;
  autoGeneratePasswords: boolean;
  sendWelcomeEmails: boolean;
  createParentLinks: boolean;
}

interface BulkClassroomWizardProps {
  onComplete?: (result: BulkClassroomResult) => void;
  onCancel?: () => void;
  initialData?: Partial<WizardData>;
}

// ============================================
// Main Wizard Component
// ============================================

export default function BulkClassroomWizard({
  onComplete,
  onCancel,
  initialData
}: BulkClassroomWizardProps) {
  const { toast } = useToast();
  const wizardRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);

  // Wizard data state
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    description: '',
    icon: '📚',
    maxStudents: 30,
    code: '',
    teacherEmail: '',
    teacherData: undefined,
    students: [],
    organizationId: '',
    grade: '',
    subject: '',
    academicYear: new Date().getFullYear().toString(),
    
    // UI-specific fields
    useExistingTeacher: true,
    autoGeneratePasswords: true,
    sendWelcomeEmails: false,
    createParentLinks: true,
    
    ...initialData
  });

  // Steps configuration
  const steps: WizardStep[] = [
    {
      id: 1,
      title: "Thông tin lớp học",
      description: "Tên lớp, mô tả, cài đặt cơ bản",
      icon: <BookOpen className="h-5 w-5" />,
      isCompleted: false,
      isActive: currentStep === 1,
      hasError: false
    },
    {
      id: 2,
      title: "Chọn giáo viên",
      description: "Gán giáo viên hoặc tạo mới",
      icon: <Users className="h-5 w-5" />,
      isCompleted: false,
      isActive: currentStep === 2,
      hasError: false
    },
    {
      id: 3,
      title: "Thêm học sinh",
      description: "Upload CSV hoặc nhập thủ công",
      icon: <Upload className="h-5 w-5" />,
      isCompleted: false,
      isActive: currentStep === 3,
      hasError: false
    },
    {
      id: 4,
      title: "Xem trước",
      description: "Kiểm tra thông tin trước khi tạo",
      icon: <Eye className="h-5 w-5" />,
      isCompleted: false,
      isActive: currentStep === 4,
      hasError: false
    },
    {
      id: 5,
      title: "Hoàn thành",
      description: "Kết quả và thông tin đăng nhập",
      icon: <Sparkles className="h-5 w-5" />,
      isCompleted: false,
      isActive: currentStep === 5,
      hasError: false
    }
  ];

  // Animation effects
  useEffect(() => {
    if (wizardRef.current) {
      gsap.fromTo(wizardRef.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  useEffect(() => {
    // Animate step transition
    const stepContent = document.querySelector('.step-content');
    if (stepContent) {
      gsap.fromTo(stepContent,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [currentStep]);

  // ============================================
  // Event Handlers
  // ============================================

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return !!(wizardData.name && wizardData.name.trim().length >= 2);
      case 2:
        return !!(wizardData.useExistingTeacher ? wizardData.teacherEmail : wizardData.teacherData?.email);
      case 3:
        return wizardData.students.length > 0;
      case 4:
        return true; // Preview step không cần validate
      case 5:
        return true; // Completion step
      default:
        return false;
    }
  }, [currentStep, wizardData]);

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) {
      toast({
        title: "Thông tin chưa đầy đủ",
        description: "Vui lòng điền đầy đủ thông tin trước khi tiếp tục",
        variant: "destructive"
      });
      return;
    }

    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateCurrentStep, toast]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((stepId: number) => {
    // Chỉ cho phép click vào step đã hoàn thành hoặc step hiện tại
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Dữ liệu không hợp lệ",
        description: "Vui lòng kiểm tra lại thông tin",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[WIZARD] Submitting bulk classroom creation:', wizardData);

      // Chuẩn bị data để gửi API
      const submitData: BulkClassroomInput = {
        name: wizardData.name,
        description: wizardData.description,
        icon: wizardData.icon,
        maxStudents: wizardData.maxStudents,
        code: wizardData.code,
        teacherEmail: wizardData.useExistingTeacher ? wizardData.teacherEmail : undefined,
        teacherData: !wizardData.useExistingTeacher ? wizardData.teacherData : undefined,
        students: wizardData.students,
        organizationId: wizardData.organizationId,
        grade: wizardData.grade,
        subject: wizardData.subject,
        academicYear: wizardData.academicYear
      };

      // Gọi API
      const response = await fetch('/api/admin/bulk/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      
      console.log('[WIZARD] API Response:', { status: response.status, result });

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.errors?.join(', ') || 'Có lỗi xảy ra khi tạo lớp học';
        console.error('[WIZARD] API Error:', errorMsg, result);
        throw new Error(errorMsg);
      }

      console.log('[WIZARD] Bulk classroom creation successful:', result);

      // Lưu operation ID để tracking
      if (result.meta?.operationId) {
        setOperationId(result.meta.operationId);
      }

      // Chuyển sang step completion
      setCurrentStep(5);

      // Callback to parent
      if (onComplete) {
        onComplete(result.data);
      }

      toast({
        title: "Tạo lớp học thành công!",
        description: `Đã tạo lớp "${wizardData.name}" với ${result.data.summary.successCount} học sinh`,
        variant: "success"
      });

    } catch (error) {
      console.error('[WIZARD] Error creating bulk classroom:', error);
      
      toast({
        title: "Lỗi tạo lớp học",
        description: error instanceof Error ? error.message : 'Có lỗi không xác định',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [wizardData, validateCurrentStep, onComplete, toast]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // ============================================
  // Render Step Content
  // ============================================

  const renderStepContent = () => {
    const commonProps = {
      data: wizardData,
      onUpdate: updateWizardData,
      onNext: handleNext,
      onPrevious: handlePrevious
    };

    switch (currentStep) {
      case 1:
        return <ClassroomInfoStep {...commonProps} />;
      case 2:
        return <TeacherSelectionStep {...commonProps} />;
      case 3:
        return <StudentInputStep {...commonProps} />;
      case 4:
        return <PreviewStep {...commonProps} onSubmit={handleSubmit} isProcessing={isProcessing} />;
      case 5:
        return <CompletionStep data={wizardData} operationId={operationId} />;
      default:
        return null;
    }
  };

  // ============================================
  // Render
  // ============================================

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div ref={wizardRef} className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Tạo lớp học hàng loạt
        </h1>
        <p className="text-gray-600">
          Tạo lớp học mới với giáo viên và nhiều học sinh cùng lúc
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Bước {currentStep} / {steps.length}</span>
          <span>{Math.round(progress)}% hoàn thành</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-violet-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-col items-center space-y-2 cursor-pointer group"
                onClick={() => handleStepClick(step.id)}
              >
                {/* Step Icon */}
                <div className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200
                  ${step.isActive 
                    ? 'bg-violet-500 border-violet-500 text-white' 
                    : step.isCompleted 
                      ? 'bg-green-500 border-green-500 text-white'
                      : step.hasError
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-500 group-hover:border-violet-300'
                  }
                `}>
                  {step.isCompleted ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : step.hasError ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step Info */}
                <div className="text-center">
                  <p className={`text-sm font-medium ${
                    step.isActive ? 'text-violet-600' : 'text-gray-700'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 max-w-20">
                    {step.description}
                  </p>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className={`
                    absolute top-6 left-12 w-full h-0.5 -z-10
                    ${step.isCompleted ? 'bg-green-300' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="step-content">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? handleCancel : handlePrevious}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {currentStep === 1 ? 'Hủy' : 'Quay lại'}
              </Button>

              <div className="flex items-center gap-3">
                {currentStep === 4 && (
                  <Button
                    onClick={handleSubmit}
                    disabled={!validateCurrentStep() || isProcessing}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Tạo lớp học
                      </>
                    )}
                  </Button>
                )}

                {currentStep < 4 && (
                  <Button
                    onClick={handleNext}
                    disabled={!validateCurrentStep() || isProcessing}
                    className="flex items-center gap-2"
                  >
                    Tiếp tục
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
