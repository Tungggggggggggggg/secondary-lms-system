"use client"

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, 
  Brain, 
  Clock, 
  Eye, 
  Save, 
  Send,
  ArrowLeft,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

// Import Smart Components
import SmartQuizBuilder from './SmartQuizBuilder'
import SmartEssayBuilder from './SmartEssayBuilder'
import SmartTimeManager from './SmartTimeManager'
import AssignToClassModal from './AssignToClassModal'

// Import Types
import { 
  AssignmentData,
  QuizQuestion,
  EssayQuestion,
  TimeSettings,
  ValidationState
} from '@/types/assignment-builder'
import { 
  validateAllQuestions,
  validateTimeSettings,
  logError
} from '@/lib/assignment-builder/utils'
import { 
  autoFixTimeSettings
} from '@/lib/assignment-builder/debug'
import { formatDateTimeForAPI, logDateTimeOperation } from '@/lib/datetime-utils'

export default function SmartAssignmentBuilder() {
  const router = useRouter()
  const { toast } = useToast()

  // Core assignment data
  const [assignmentData, setAssignmentData] = useState<AssignmentData>({
    title: '',
    description: '',
    type: 'ESSAY',
    timeSettings: {
      dueDate: '',
      openAt: '',
      lockAt: '',
      timeLimitMinutes: ''
    },
    essayQuestion: {
      id: 'essay_default',
      content: '',
      type: 'LONG_ESSAY'
    },
    quizQuestions: []
  })

  // UI State
  const [currentStep, setCurrentStep] = useState<'type' | 'content' | 'time' | 'preview'>('type')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationState>({
    isValid: false,
    fieldErrors: {},
    globalErrors: [],
    warnings: []
  })
  const [autoFixApplied, setAutoFixApplied] = useState(false)

  // Update assignment type
  const updateAssignmentType = useCallback((type: 'ESSAY' | 'QUIZ') => {
    setAssignmentData(prev => ({ ...prev, type }))
    setCurrentStep('content')
  }, [])

  // Update basic info
  const updateBasicInfo = useCallback((field: 'title' | 'description', value: string) => {
    setAssignmentData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Update quiz questions
  const updateQuizQuestions = useCallback((questions: QuizQuestion[]) => {
    setAssignmentData(prev => ({ ...prev, quizQuestions: questions }))
  }, [])

  // Update essay question
  const updateEssayQuestion = useCallback((question: EssayQuestion) => {
    setAssignmentData(prev => ({ ...prev, essayQuestion: question }))
  }, [])

  // Update time settings
  const updateTimeSettings = useCallback((timeSettings: TimeSettings) => {
    setAssignmentData(prev => ({ ...prev, timeSettings }))
  }, [])

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic validation
    if (!assignmentData.title.trim()) {
      errors.push('Tiêu đề bài tập không được để trống')
    }

    // Content validation
    if (assignmentData.type === 'QUIZ') {
      const quizValidation = validateAllQuestions(assignmentData.quizQuestions || [])
      if (!quizValidation.isValid) {
        errors.push(...quizValidation.globalErrors)
        warnings.push(...quizValidation.warnings)
      }
    } else {
      if (!assignmentData.essayQuestion?.content.trim()) {
        errors.push('Nội dung câu hỏi tự luận không được để trống')
      }
    }

    // Validate time settings với auto-fix
    let timeSettings = assignmentData.timeSettings
    
    // Thử auto-fix nếu có lỗi thời gian (chỉ chạy một lần)
    const initialTimeValidation = validateTimeSettings(timeSettings)
    if (!initialTimeValidation.isValid && !autoFixApplied) {
      // Auto-fix time settings (với flag để tránh infinite loop)
      const fixedTimeSettings = autoFixTimeSettings(timeSettings, false)
      const fixedValidation = validateTimeSettings(fixedTimeSettings)
      
      if (fixedValidation.isValid) {
        // Cập nhật time settings đã fix
        setAssignmentData(prev => ({ ...prev, timeSettings: fixedTimeSettings }))
        setAutoFixApplied(true) // Đánh dấu đã auto-fix
        timeSettings = fixedTimeSettings
        
        toast({
          title: "Đã tự động sửa thời gian",
          description: "Hệ thống đã điều chỉnh thời gian cho phù hợp",
        })
      } else {
        errors.push(...fixedValidation.errors)
        warnings.push(...fixedValidation.warnings)
      }
    } else {
      // Validate thông thường
      const timeValidation = validateTimeSettings(timeSettings)
      if (!timeValidation.isValid) {
        errors.push(...timeValidation.errors)
        warnings.push(...timeValidation.warnings)
      }
    }

    const newValidation: ValidationState = {
      isValid: errors.length === 0,
      fieldErrors: {},
      globalErrors: errors,
      warnings
    }

    setValidation(newValidation)
    
    return newValidation.isValid
  }, [assignmentData, toast, autoFixApplied])

  // Submit assignment
  const submitAssignment = useCallback(async () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Lỗi validation",
        description: "Vui lòng kiểm tra lại thông tin bài tập",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Format datetime cho API với proper timezone
      const formattedDueDate = formatDateTimeForAPI(assignmentData.timeSettings.dueDate)
      const formattedOpenAt = formatDateTimeForAPI(assignmentData.timeSettings.openAt || '')
      const formattedLockAt = formatDateTimeForAPI(assignmentData.timeSettings.lockAt || '')
      
      // Tạo request payload
      const requestPayload = {
        title: assignmentData.title,
        description: assignmentData.description || null,
        type: assignmentData.type,
        dueDate: formattedDueDate || null,
        openAt: formattedOpenAt || null,
        lockAt: formattedLockAt || null,
        timeLimitMinutes: assignmentData.timeSettings.timeLimitMinutes 
          ? parseInt(assignmentData.timeSettings.timeLimitMinutes) 
          : null,
        questions: assignmentData.type === 'QUIZ' 
          ? assignmentData.quizQuestions?.map((q, index) => ({
              content: q.content,
              type: q.type,
              order: index + 1,
              options: q.options
            }))
          : null
      }

      // Log payload để debug
      console.log('🚀 [SUBMIT] Request payload:', JSON.stringify(requestPayload, null, 2))

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      })

      const result = await response.json()
      
      // Log response để debug
      console.log('📥 [SUBMIT] API Response:', {
        status: response.status,
        statusText: response.statusText,
        result: result
      })

      if (result.success) {
        setCreatedAssignmentId(result.data?.id)
        setShowAssignModal(true)
        
        toast({
          title: "Tạo bài tập thành công",
          description: "Bài tập đã được tạo và sẵn sàng assign vào lớp"
        })
      } else {
        // Log chi tiết lỗi
        console.error('❌ [SUBMIT] API Error:', {
          status: response.status,
          message: result.message,
          errors: result.errors,
          receivedData: result.receivedData
        })
        
        throw new Error(result.message || 'Có lỗi xảy ra khi tạo bài tập')
      }
    } catch (error) {
      logError(error as Error, 'SmartAssignmentBuilder.submitAssignment')
      toast({
        title: "Lỗi tạo bài tập",
        description: error instanceof Error ? error.message : 'Có lỗi không xác định',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [assignmentData, validateCurrentStep, toast])

  // Auto-validate khi dữ liệu thay đổi
  useEffect(() => {
    // Debounce validation để tránh validate quá nhiều
    const timeoutId = setTimeout(() => {
      validateCurrentStep()
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [assignmentData, validateCurrentStep])

  // Navigation helpers
  const goToStep = useCallback((step: typeof currentStep) => {
    setCurrentStep(step)
  }, [])

  const canProceedToNextStep = useCallback((): boolean => {
    switch (currentStep) {
      case 'type':
        return true
      case 'content':
        if (assignmentData.type === 'QUIZ') {
          return (assignmentData.quizQuestions?.length || 0) > 0
        }
        return !!assignmentData.essayQuestion?.content.trim()
      case 'time':
        return !!assignmentData.timeSettings.dueDate
      default:
        return true
    }
  }, [currentStep, assignmentData])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Smart Assignment Builder
                </h1>
                <p className="text-sm text-gray-500">
                  Tạo bài tập thông minh với AI và templates
                </p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-4">
              {[
                { key: 'type', label: 'Loại bài tập', icon: Brain },
                { key: 'content', label: 'Nội dung', icon: BookOpen },
                { key: 'time', label: 'Thời gian', icon: Clock },
                { key: 'preview', label: 'Xem trước', icon: Eye }
              ].map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    currentStep === key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => goToStep(key as typeof currentStep)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Thông Tin Cơ Bản</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tiêu đề bài tập *
                  </label>
                  <input
                    type="text"
                    value={assignmentData.title}
                    onChange={(e) => updateBasicInfo('title', e.target.value)}
                    placeholder="Nhập tiêu đề bài tập..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Mô tả bài tập
                  </label>
                  <textarea
                    value={assignmentData.description}
                    onChange={(e) => updateBasicInfo('description', e.target.value)}
                    placeholder="Mô tả chi tiết về bài tập..."
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Step Content */}
            {currentStep === 'type' && (
              <Card>
                <CardHeader>
                  <CardTitle>Chọn Loại Bài Tập</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                      className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                        assignmentData.type === 'ESSAY'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => updateAssignmentType('ESSAY')}
                    >
                      <div className="text-center">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-green-600" />
                        <h3 className="text-lg font-semibold mb-2">Tự Luận</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Câu hỏi mở, học sinh trả lời bằng văn bản hoặc file
                        </p>
                        <div className="text-xs text-gray-500">
                          ✓ Phát triển tư duy sáng tạo<br/>
                          ✓ Đánh giá khả năng phân tích<br/>
                          ✓ Linh hoạt trong trả lời
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                        assignmentData.type === 'QUIZ'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => updateAssignmentType('QUIZ')}
                    >
                      <div className="text-center">
                        <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                        <h3 className="text-lg font-semibold mb-2">Trắc Nghiệm</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Câu hỏi có đáp án cố định, chấm điểm tự động
                        </p>
                        <div className="text-xs text-gray-500">
                          ✓ Chấm điểm nhanh chóng<br/>
                          ✓ Đánh giá kiến thức cụ thể<br/>
                          ✓ Phù hợp kiểm tra định kỳ
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'content' && assignmentData.type === 'QUIZ' && (
              <SmartQuizBuilder
                questions={assignmentData.quizQuestions || []}
                onQuestionsChange={updateQuizQuestions}
              />
            )}

            {currentStep === 'content' && assignmentData.type === 'ESSAY' && assignmentData.essayQuestion && (
              <SmartEssayBuilder
                essayQuestion={assignmentData.essayQuestion}
                onEssayQuestionChange={updateEssayQuestion}
              />
            )}

            {currentStep === 'time' && (
              <SmartTimeManager
                timeSettings={assignmentData.timeSettings}
                onTimeSettingsChange={updateTimeSettings}
              />
            )}

            {currentStep === 'preview' && (
              <PreviewSection assignmentData={assignmentData} />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thao Tác Nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => goToStep('content')}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!assignmentData.type}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Chỉnh sửa nội dung
                </Button>
                <Button
                  onClick={() => goToStep('time')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Thiết lập thời gian
                </Button>
                <Button
                  onClick={() => goToStep('preview')}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!canProceedToNextStep()}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Xem trước
                </Button>
              </CardContent>
            </Card>

            {/* Validation Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Trạng Thái
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validation.isValid ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Sẵn sàng tạo bài tập</span>
                    </div>
                    {validation.warnings.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                        <p className="text-xs font-medium text-yellow-800 mb-1">Cảnh báo:</p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {validation.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">Có lỗi cần sửa</span>
                    </div>
                    
                    {validation.globalErrors.length > 0 && (
                      <div className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                        <p className="text-xs font-medium text-red-800 mb-2">Lỗi cần khắc phục:</p>
                        <ul className="text-xs text-red-700 space-y-1">
                          {validation.globalErrors.map((error, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {validation.warnings.length > 0 && (
                      <div className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                        <p className="text-xs font-medium text-yellow-800 mb-1">Cảnh báo:</p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {validation.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <Button
                      size="default"
                      variant="outline"
                      onClick={validateCurrentStep}
                      className="w-full text-xs"
                    >
                      🔄 Kiểm tra lại
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  onClick={submitAssignment}
                  disabled={!validation.isValid || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Save className="w-4 h-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Tạo bài tập
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Assign to Class Modal */}
      {showAssignModal && createdAssignmentId && (
        <AssignToClassModal
          assignmentId={createdAssignmentId}
          assignmentTitle={assignmentData.title}
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false)
            router.push('/dashboard/teacher/assignments')
          }}
          showSkipOption={true}
        />
      )}
    </div>
  )
}

// Preview Section Component
interface PreviewSectionProps {
  assignmentData: AssignmentData
}

const PreviewSection: React.FC<PreviewSectionProps> = ({ assignmentData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Xem Trước Bài Tập</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assignment Preview */}
        <div className="p-6 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-bold mb-2">{assignmentData.title}</h3>
          {assignmentData.description && (
            <p className="text-gray-600 mb-4">{assignmentData.description}</p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Loại:</span>
              <p>{assignmentData.type === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận'}</p>
            </div>
            <div>
              <span className="font-medium">Hạn nộp:</span>
              <p>{assignmentData.timeSettings.dueDate 
                ? new Date(assignmentData.timeSettings.dueDate).toLocaleString('vi-VN')
                : 'Chưa thiết lập'
              }</p>
            </div>
            <div>
              <span className="font-medium">Thời gian:</span>
              <p>{assignmentData.timeSettings.timeLimitMinutes 
                ? `${assignmentData.timeSettings.timeLimitMinutes} phút`
                : 'Không giới hạn'
              }</p>
            </div>
            <div>
              <span className="font-medium">Câu hỏi:</span>
              <p>{assignmentData.type === 'QUIZ' 
                ? `${assignmentData.quizQuestions?.length || 0} câu`
                : '1 câu tự luận'
              }</p>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        {assignmentData.type === 'ESSAY' && assignmentData.essayQuestion && (
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Câu hỏi tự luận:</h4>
            <p className="text-gray-700">{assignmentData.essayQuestion.content}</p>
          </div>
        )}

        {assignmentData.type === 'QUIZ' && (
          <div className="space-y-4">
            <h4 className="font-medium">Câu hỏi trắc nghiệm:</h4>
            {assignmentData.quizQuestions?.slice(0, 3).map((q, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <p className="font-medium mb-2">Câu {index + 1}: {q.content}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {q.options.map((opt, optIndex) => (
                    <div 
                      key={optIndex}
                      className={`p-2 rounded ${opt.isCorrect ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}
                    >
                      {opt.label}. {opt.content}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(assignmentData.quizQuestions?.length || 0) > 3 && (
              <p className="text-sm text-gray-500 text-center">
                ... và {(assignmentData.quizQuestions?.length || 0) - 3} câu khác
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
