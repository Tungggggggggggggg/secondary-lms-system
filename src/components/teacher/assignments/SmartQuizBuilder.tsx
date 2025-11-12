"use client"

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileText, Wand2, Copy, Download, Plus, Trash2, Check, X, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { 
  QuizQuestion, 
  QuizImportResult,
  ValidationState 
} from '@/types/assignment-builder'
import { 
  createNewQuizQuestion,
  createMultipleQuestions,
  duplicateQuestion,
  validateAllQuestions,
  parseBulkQuestions,
  debounce,
  logError
} from '@/lib/assignment-builder/utils'

interface SmartQuizBuilderProps {
  questions: QuizQuestion[]
  onQuestionsChange: (questions: QuizQuestion[]) => void
  className?: string
}

export default function SmartQuizBuilder({ 
  questions, 
  onQuestionsChange, 
  className = '' 
}: SmartQuizBuilderProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State management
  const [bulkText, setBulkText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [validation, setValidation] = useState<ValidationState>({
    isValid: true,
    fieldErrors: {},
    globalErrors: [],
    warnings: []
  })

  // Debounced validation
  const debouncedValidation = useCallback(
    debounce((questions: QuizQuestion[]) => {
      try {
        const result = validateAllQuestions(questions)
        setValidation(result)
      } catch (error) {
        logError(error as Error, 'SmartQuizBuilder.debouncedValidation')
      }
    }, 500),
    []
  )

  // Effect để validate khi questions thay đổi
  React.useEffect(() => {
    debouncedValidation(questions)
  }, [questions, debouncedValidation])

  // Thêm câu hỏi đơn lẻ
  const addSingleQuestion = useCallback(() => {
    try {
      const newQuestion = createNewQuizQuestion(questions.length)
      onQuestionsChange([...questions, newQuestion])
      
      toast({
        title: "Thêm thành công",
        description: "Đã thêm 1 câu hỏi mới"
      })
    } catch (error) {
      logError(error as Error, 'SmartQuizBuilder.addSingleQuestion')
      toast({
        title: "Lỗi",
        description: "Không thể thêm câu hỏi",
        variant: "destructive"
      })
    }
  }, [questions, onQuestionsChange, toast])

  // Thêm nhiều câu hỏi cùng lúc
  const addMultipleQuestions = useCallback((count: number) => {
    try {
      const newQuestions = createMultipleQuestions(count, questions.length)
      onQuestionsChange([...questions, ...newQuestions])
      
      toast({
        title: "Thêm thành công",
        description: `Đã thêm ${count} câu hỏi mới`
      })
    } catch (error) {
      logError(error as Error, 'SmartQuizBuilder.addMultipleQuestions', { count })
      toast({
        title: "Lỗi",
        description: "Không thể thêm câu hỏi",
        variant: "destructive"
      })
    }
  }, [questions, onQuestionsChange, toast])

  // Xử lý bulk import
  const processBulkText = useCallback(async () => {
    if (!bulkText.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung để import",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    
    try {
      const result: QuizImportResult = parseBulkQuestions(bulkText, {
        format: 'pipe_separated',
        hasHeaders: false
      })

      if (result.success && result.questions.length > 0) {
        onQuestionsChange([...questions, ...result.questions])
        setBulkText('')
        
        toast({
          title: "Import thành công",
          description: `Đã thêm ${result.questions.length} câu hỏi từ text`
        })

        // Hiển thị warnings nếu có
        if (result.warnings.length > 0) {
          setTimeout(() => {
            toast({
              title: "Lưu ý",
              description: result.warnings.join(', '),
              variant: "default"
            })
          }, 1000)
        }
      } else {
        toast({
          title: "Lỗi import",
          description: result.errors.join(', '),
          variant: "destructive"
        })
      }
    } catch (error) {
      logError(error as Error, 'SmartQuizBuilder.processBulkText')
      toast({
        title: "Lỗi xử lý",
        description: "Có lỗi khi xử lý text. Vui lòng kiểm tra format.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }, [bulkText, questions, onQuestionsChange, toast])

  // Import từ file
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        setBulkText(text)
        toast({
          title: "File đã được tải",
          description: "Vui lòng kiểm tra và nhấn Import"
        })
      } catch (error) {
        logError(error as Error, 'SmartQuizBuilder.handleFileImport')
        toast({
          title: "Lỗi đọc file",
          description: "Không thể đọc file. Vui lòng thử lại.",
          variant: "destructive"
        })
      }
    }
    reader.readAsText(file)
  }, [toast])

  // Export template
  const exportTemplate = useCallback(() => {
    try {
      const template = `# Template Import Câu Hỏi Trắc Nghiệm

## Format: Câu hỏi|A. Đáp án|B. Đáp án|C. Đáp án|D. Đáp án|Đáp án đúng

## Ví dụ:
Thủ đô của Việt Nam là gì?|A. Hồ Chí Minh|B. Hà Nội|C. Đà Nẵng|D. Cần Thơ|B
2 + 2 = ?|A. 3|B. 4|C. 5|D. 6|B
Ai là tác giả của "Truyện Kiều"?|A. Nguyễn Du|B. Hồ Xuân Hương|C. Nguyễn Trãi|D. Lý Thái Tổ|A
`

      const blob = new Blob([template], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quiz-template.txt'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Tải thành công",
        description: "Template đã được tải xuống"
      })
    } catch (error) {
      logError(error as Error, 'SmartQuizBuilder.exportTemplate')
      toast({
        title: "Lỗi",
        description: "Không thể tải template",
        variant: "destructive"
      })
    }
  }, [toast])

  // Duplicate câu hỏi
  const duplicateQuestionHandler = useCallback((index: number) => {
    try {
      const questionToDuplicate = questions[index]
      const duplicated = duplicateQuestion(questionToDuplicate)
      const newQuestions = [...questions]
      newQuestions.splice(index + 1, 0, duplicated)
      onQuestionsChange(newQuestions)

      toast({
        title: "Sao chép thành công",
        description: "Đã tạo bản sao câu hỏi"
      })
    } catch (error) {
      logError(error as Error, 'SmartQuizBuilder.duplicateQuestionHandler', { index })
      toast({
        title: "Lỗi",
        description: "Không thể sao chép câu hỏi",
        variant: "destructive"
      })
    }
  }, [questions, onQuestionsChange, toast])

  // Xóa câu hỏi
  const removeQuestion = useCallback((index: number) => {
    try {
      const newQuestions = questions.filter((_, i) => i !== index)
      onQuestionsChange(newQuestions)

      toast({
        title: "Xóa thành công",
        description: "Đã xóa câu hỏi"
      })
    } catch (error) {
      logError(error as Error, 'SmartQuizBuilder.removeQuestion', { index })
      toast({
        title: "Lỗi",
        description: "Không thể xóa câu hỏi",
        variant: "destructive"
      })
    }
  }, [questions, onQuestionsChange, toast])

  // Update câu hỏi
  const updateQuestion = useCallback((index: number, updatedQuestion: QuizQuestion) => {
    try {
      const newQuestions = [...questions]
      newQuestions[index] = updatedQuestion
      onQuestionsChange(newQuestions)
    } catch (error) {
      logError(error as Error, 'SmartQuizBuilder.updateQuestion', { index })
    }
  }, [questions, onQuestionsChange])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Smart Quiz Builder Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-600" />
            Smart Quiz Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick">Thêm Nhanh</TabsTrigger>
              <TabsTrigger value="bulk">Import Text</TabsTrigger>
              <TabsTrigger value="file">Import File</TabsTrigger>
            </TabsList>

            {/* Quick Add Tab */}
            <TabsContent value="quick" className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={addSingleQuestion} 
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Thêm 1 câu
                </Button>
                {[5, 10, 20, 30].map(count => (
                  <Button 
                    key={count}
                    onClick={() => addMultipleQuestions(count)} 
                    variant="outline"
                  >
                    Thêm {count} câu
                  </Button>
                ))}
              </div>
            </TabsContent>

            {/* Bulk Import Tab */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Nhập câu hỏi (mỗi dòng 1 câu)
                  </label>
                  <Button 
                    onClick={exportTemplate} 
                    variant="outline" 
                    size="default"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Tải Template
                  </Button>
                </div>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Ví dụ:
Thủ đô của Việt Nam là gì?|A. Hồ Chí Minh|B. Hà Nội|C. Đà Nẵng|D. Cần Thơ|B
2 + 2 = ?|A. 3|B. 4|C. 5|D. 6|B"
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  onClick={processBulkText} 
                  disabled={!bulkText.trim() || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? 'Đang xử lý...' : 'Import Câu Hỏi'}
                </Button>
              </div>
            </TabsContent>

            {/* File Import Tab */}
            <TabsContent value="file" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">
                  Kéo thả file hoặc click để chọn file .txt, .csv
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Chọn File
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Questions Summary */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Tổng: <span className="text-blue-600 font-bold">{questions.length} câu hỏi</span>
            </span>
            <span className="text-sm text-gray-600">
              Hoàn thành: {questions.filter(q => 
                q.content.trim() && q.options.some(opt => opt.isCorrect)
              ).length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => onQuestionsChange([])} 
              variant="outline" 
              size="default"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa tất cả
            </Button>
          </div>
        </div>
      )}

      {/* Validation Status */}
      {!validation.isValid && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            Cần kiểm tra lại:
          </div>
          <ul className="text-sm text-red-600 space-y-1">
            {validation.globalErrors.map((error, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            Lưu ý:
          </div>
          <ul className="text-sm text-yellow-600 space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onUpdate={(updatedQuestion) => updateQuestion(index, updatedQuestion)}
            onDuplicate={() => duplicateQuestionHandler(index)}
            onRemove={() => removeQuestion(index)}
            hasError={!!validation.fieldErrors[`question_${index}`]}
            errorMessage={validation.fieldErrors[`question_${index}`]}
          />
        ))}
      </div>

      {/* Add More Button */}
      {questions.length > 0 && (
        <div className="text-center">
          <Button 
            onClick={addSingleQuestion} 
            variant="outline" 
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm câu hỏi mới
          </Button>
        </div>
      )}
    </div>
  )
}

// Question Card Component
interface QuestionCardProps {
  question: QuizQuestion
  index: number
  onUpdate: (question: QuizQuestion) => void
  onDuplicate: () => void
  onRemove: () => void
  hasError: boolean
  errorMessage?: string
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  onUpdate,
  onDuplicate,
  onRemove,
  hasError,
  errorMessage
}) => {
  const updateQuestionContent = useCallback((content: string) => {
    onUpdate({ ...question, content })
  }, [question, onUpdate])

  const updateQuestionType = useCallback((type: 'SINGLE' | 'MULTIPLE') => {
    const updatedOptions = question.options.map(opt => ({ ...opt, isCorrect: false }))
    onUpdate({ ...question, type, options: updatedOptions })
  }, [question, onUpdate])

  const updateOption = useCallback((optionIndex: number, content: string) => {
    const newOptions = [...question.options]
    newOptions[optionIndex] = { ...newOptions[optionIndex], content }
    onUpdate({ ...question, options: newOptions })
  }, [question, onUpdate])

  const toggleCorrectAnswer = useCallback((optionIndex: number) => {
    const newOptions = [...question.options]
    
    if (question.type === 'SINGLE') {
      // Single choice: uncheck others
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === optionIndex
      })
    } else {
      // Multiple choice: toggle this option
      newOptions[optionIndex].isCorrect = !newOptions[optionIndex].isCorrect
    }
    
    onUpdate({ ...question, options: newOptions })
  }, [question, onUpdate])

  return (
    <Card className={`relative ${hasError ? 'border-red-300 bg-red-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-sm">
              {index + 1}
            </span>
            <select
              value={question.type}
              onChange={(e) => updateQuestionType(e.target.value as 'SINGLE' | 'MULTIPLE')}
              className="px-3 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="SINGLE">Chọn 1 đáp án</option>
              <option value="MULTIPLE">Chọn nhiều đáp án</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onDuplicate}
              variant="outline"
              size="default"
              title="Sao chép câu hỏi"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              onClick={onRemove}
              variant="outline"
              size="default"
              className="text-red-600 hover:text-red-700"
              title="Xóa câu hỏi"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Question Content */}
        <textarea
          value={question.content}
          onChange={(e) => updateQuestionContent(e.target.value)}
          placeholder="Nhập nội dung câu hỏi..."
          rows={2}
          className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {question.options.map((option, optIndex) => (
            <div 
              key={optIndex} 
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-sm font-medium">
                  {option.label}
                </span>
                <button
                  onClick={() => toggleCorrectAnswer(optIndex)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    option.isCorrect 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  title={option.isCorrect ? 'Đáp án đúng' : 'Chọn làm đáp án đúng'}
                >
                  {option.isCorrect && <Check className="w-3 h-3" />}
                </button>
              </div>
              <input
                value={option.content}
                onChange={(e) => updateOption(optIndex, e.target.value)}
                placeholder={`Đáp án ${option.label}`}
                className="flex-1 px-2 py-1 border-0 outline-none bg-transparent focus:bg-white focus:border focus:border-blue-300 rounded"
              />
            </div>
          ))}
        </div>

        {/* Error Message */}
        {hasError && errorMessage && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <X className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        {/* Validation Status */}
        {question.content && !question.options.some(opt => opt.isCorrect) && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            Chưa chọn đáp án đúng
          </div>
        )}
      </CardContent>
    </Card>
  )
}
