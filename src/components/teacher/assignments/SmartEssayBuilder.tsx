"use client"

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookOpen, 
  Wand2, 
  FileText, 
  Users, 
  Lightbulb, 
  Target,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { 
  EssayQuestion, 
  EssayRubric, 
  AssignmentTemplate 
} from '@/types/assignment-builder'
import { logError } from '@/lib/assignment-builder/utils'

interface SmartEssayBuilderProps {
  essayQuestion: EssayQuestion
  onEssayQuestionChange: (question: EssayQuestion) => void
  className?: string
}

// Essay templates theo môn học
const ESSAY_TEMPLATES: AssignmentTemplate[] = [
  {
    id: 'literature_analysis',
    name: 'Phân tích tác phẩm văn học',
    description: 'Phân tích nhân vật, chủ đề, nghệ thuật trong tác phẩm',
    subject: 'Văn học',
    type: 'ESSAY',
    difficulty: 'MEDIUM',
    usage: 245,
    rating: 4.8,
    isPublic: true,
    content: {
      essayQuestion: {
        id: 'template_lit',
        content: 'Phân tích hình tượng [TÊN NHÂN VẬT] trong tác phẩm "[TÊN TÁC PHẨM]" của [TÁC GIẢ]. Nêu cảm nhận của em về [CHỦ ĐỀ CHÍNH].',
        type: 'LONG_ESSAY',
        wordLimit: { min: 500, max: 1000 }
      }
    }
  },
  {
    id: 'history_analysis',
    name: 'Phân tích sự kiện lịch sử',
    description: 'Phân tích nguyên nhân, diễn biến, ý nghĩa sự kiện',
    subject: 'Lịch sử',
    type: 'ESSAY',
    difficulty: 'MEDIUM',
    usage: 189,
    rating: 4.6,
    isPublic: true,
    content: {
      essayQuestion: {
        id: 'template_hist',
        content: 'Phân tích nguyên nhân, diễn biến và ý nghĩa lịch sử của [TÊN SỰ KIỆN]. Rút ra bài học gì cho thời đại ngày nay?',
        type: 'LONG_ESSAY',
        wordLimit: { min: 400, max: 800 }
      }
    }
  },
  {
    id: 'science_experiment',
    name: 'Báo cáo thí nghiệm khoa học',
    description: 'Mô tả quy trình, kết quả và kết luận thí nghiệm',
    subject: 'Khoa học',
    type: 'ESSAY',
    difficulty: 'EASY',
    usage: 156,
    rating: 4.5,
    isPublic: true,
    content: {
      essayQuestion: {
        id: 'template_sci',
        content: 'Viết báo cáo thí nghiệm "[TÊN THÍ NGHIỆM]". Bao gồm: mục đích, dụng cụ, các bước thực hiện, kết quả quan sát được và kết luận.',
        type: 'CASE_STUDY',
        wordLimit: { min: 300, max: 600 }
      }
    }
  },
  {
    id: 'english_essay',
    name: 'English Essay Writing',
    description: 'Argumentative or descriptive essay in English',
    subject: 'Tiếng Anh',
    type: 'ESSAY',
    difficulty: 'MEDIUM',
    usage: 203,
    rating: 4.7,
    isPublic: true,
    content: {
      essayQuestion: {
        id: 'template_eng',
        content: 'Write an essay about "[TOPIC]". Express your opinion with clear arguments and supporting examples. Use proper grammar and vocabulary.',
        type: 'LONG_ESSAY',
        wordLimit: { min: 250, max: 500 }
      }
    }
  },
  {
    id: 'creative_writing',
    name: 'Viết sáng tạo',
    description: 'Viết truyện ngắn, thơ hoặc tản văn',
    subject: 'Văn học',
    type: 'ESSAY',
    difficulty: 'EASY',
    usage: 178,
    rating: 4.9,
    isPublic: true,
    content: {
      essayQuestion: {
        id: 'template_creative',
        content: 'Viết một [LOẠI VĂN BẢN] về chủ đề "[CHỦ ĐỀ]". Thể hiện sự sáng tạo và cảm xúc cá nhân của em.',
        type: 'CREATIVE_WRITING',
        wordLimit: { min: 200, max: 500 }
      }
    }
  },
  {
    id: 'math_problem_solving',
    name: 'Giải quyết vấn đề toán học',
    description: 'Trình bày lời giải chi tiết bài toán',
    subject: 'Toán học',
    type: 'ESSAY',
    difficulty: 'HARD',
    usage: 134,
    rating: 4.4,
    isPublic: true,
    content: {
      essayQuestion: {
        id: 'template_math',
        content: 'Giải bài toán sau và trình bày lời giải chi tiết: [NỘI DUNG BÀI TOÁN]. Giải thích từng bước và nêu phương pháp sử dụng.',
        type: 'CASE_STUDY',
        wordLimit: { min: 200, max: 400 }
      }
    }
  }
]

// AI suggestions cho câu hỏi
const AI_SUGGESTIONS = [
  "Phân tích tác động của công nghệ đến đời sống học sinh hiện đại",
  "So sánh và đối chiếu hai phương pháp học tập khác nhau",
  "Đánh giá vai trò của giáo dục trong phát triển xã hội",
  "Mô tả một trải nghiệm học tập đáng nhớ và bài học rút ra",
  "Thảo luận về tầm quan trọng của kỹ năng mềm trong thế kỷ 21",
  "Phân tích ảnh hưởng của môi trường đến quá trình học tập"
]

// Default rubric
const DEFAULT_RUBRIC: EssayRubric = {
  totalPoints: 100,
  criteria: [
    {
      id: 'content',
      name: 'Nội dung',
      description: 'Độ chính xác, đầy đủ và sâu sắc của nội dung',
      weight: 40,
      levels: [
        { score: 4, description: 'Xuất sắc - Nội dung chính xác, đầy đủ, sâu sắc' },
        { score: 3, description: 'Tốt - Nội dung chính xác, khá đầy đủ' },
        { score: 2, description: 'Đạt - Nội dung cơ bản đúng' },
        { score: 1, description: 'Chưa đạt - Nội dung thiếu hoặc sai' }
      ]
    },
    {
      id: 'structure',
      name: 'Cấu trúc',
      description: 'Tổ chức bài viết logic, mạch lạc',
      weight: 30,
      levels: [
        { score: 4, description: 'Xuất sắc - Cấu trúc rõ ràng, logic' },
        { score: 3, description: 'Tốt - Cấu trúc khá rõ ràng' },
        { score: 2, description: 'Đạt - Cấu trúc cơ bản' },
        { score: 1, description: 'Chưa đạt - Cấu trúc lộn xộn' }
      ]
    },
    {
      id: 'language',
      name: 'Ngôn ngữ',
      description: 'Chính xác ngữ pháp, phong phú từ vựng',
      weight: 20,
      levels: [
        { score: 4, description: 'Xuất sắc - Ngôn ngữ chính xác, phong phú' },
        { score: 3, description: 'Tốt - Ngôn ngữ khá chính xác' },
        { score: 2, description: 'Đạt - Ngôn ngữ cơ bản đúng' },
        { score: 1, description: 'Chưa đạt - Nhiều lỗi ngôn ngữ' }
      ]
    },
    {
      id: 'creativity',
      name: 'Sáng tạo',
      description: 'Ý tưởng độc đáo, cách tiếp cận mới',
      weight: 10,
      levels: [
        { score: 4, description: 'Xuất sắc - Rất sáng tạo, độc đáo' },
        { score: 3, description: 'Tốt - Có sáng tạo' },
        { score: 2, description: 'Đạt - Ít sáng tạo' },
        { score: 1, description: 'Chưa đạt - Không sáng tạo' }
      ]
    }
  ]
}

export default function SmartEssayBuilder({ 
  essayQuestion, 
  onEssayQuestionChange, 
  className = '' 
}: SmartEssayBuilderProps) {
  const { toast } = useToast()
  
  // State management
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplate | null>(null)
  const [currentSuggestion, setCurrentSuggestion] = useState(0)
  const [showRubricBuilder, setShowRubricBuilder] = useState(false)

  // Apply template
  const applyTemplate = useCallback((template: AssignmentTemplate) => {
    try {
      if (template.content.essayQuestion) {
        const newQuestion: EssayQuestion = {
          ...template.content.essayQuestion,
          id: `essay_${Date.now()}`,
          rubric: DEFAULT_RUBRIC
        }
        
        setSelectedTemplate(template)
        onEssayQuestionChange(newQuestion)
        
        toast({
          title: "Áp dụng template thành công",
          description: `Đã sử dụng template "${template.name}"`
        })
      }
    } catch (error) {
      logError(error as Error, 'SmartEssayBuilder.applyTemplate', { template })
      toast({
        title: "Lỗi",
        description: "Không thể áp dụng template",
        variant: "destructive"
      })
    }
  }, [onEssayQuestionChange, toast])

  // Apply AI suggestion
  const applySuggestion = useCallback((suggestion: string) => {
    try {
      const newQuestion: EssayQuestion = {
        ...essayQuestion,
        content: suggestion,
        type: 'LONG_ESSAY',
        wordLimit: { min: 300, max: 600 }
      }
      
      onEssayQuestionChange(newQuestion)
      
      toast({
        title: "Áp dụng gợi ý thành công",
        description: "Đã sử dụng gợi ý AI"
      })
    } catch (error) {
      logError(error as Error, 'SmartEssayBuilder.applySuggestion', { suggestion })
    }
  }, [essayQuestion, onEssayQuestionChange, toast])

  // Get next suggestion
  const getNextSuggestion = useCallback(() => {
    setCurrentSuggestion((prev) => (prev + 1) % AI_SUGGESTIONS.length)
  }, [])

  // Update question content
  const updateContent = useCallback((content: string) => {
    onEssayQuestionChange({ ...essayQuestion, content })
  }, [essayQuestion, onEssayQuestionChange])

  // Update question type
  const updateType = useCallback((type: EssayQuestion['type']) => {
    onEssayQuestionChange({ ...essayQuestion, type })
  }, [essayQuestion, onEssayQuestionChange])

  // Update word limit
  const updateWordLimit = useCallback((min?: number, max?: number) => {
    onEssayQuestionChange({ 
      ...essayQuestion, 
      wordLimit: { min, max } 
    })
  }, [essayQuestion, onEssayQuestionChange])

  // Get type icon
  const getTypeIcon = (type: EssayQuestion['type']) => {
    const iconMap = {
      SHORT_ANSWER: FileText,
      LONG_ESSAY: BookOpen,
      CASE_STUDY: Target,
      CREATIVE_WRITING: Sparkles
    }
    return iconMap[type] || FileText
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Smart Essay Builder Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-green-600" />
            Smart Essay Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="ai_suggest">AI Gợi Ý</TabsTrigger>
              <TabsTrigger value="manual">Tự Viết</TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ESSAY_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">
                            {template.subject}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {template.usage}
                          </span>
                          <span>⭐ {template.rating}</span>
                        </div>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* AI Suggestions Tab */}
            <TabsContent value="ai_suggest" className="space-y-4">
              <div className="p-6 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-700">AI Gợi Ý Câu Hỏi</h4>
                </div>
                
                <div className="bg-white p-4 rounded-lg border mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {AI_SUGGESTIONS[currentSuggestion]}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => applySuggestion(AI_SUGGESTIONS[currentSuggestion])}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Dùng gợi ý này
                  </Button>
                  <Button
                    onClick={getNextSuggestion}
                    variant="outline"
                  >
                    Gợi ý khác
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Manual Tab */}
            <TabsContent value="manual" className="space-y-4">
              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Sử dụng editor bên dưới để tự viết câu hỏi
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Essay Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loại Bài Tự Luận</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { type: 'SHORT_ANSWER' as const, name: 'Câu trả lời ngắn', desc: '100-300 từ' },
              { type: 'LONG_ESSAY' as const, name: 'Bài luận dài', desc: '500-1000 từ' },
              { type: 'CASE_STUDY' as const, name: 'Phân tích tình huống', desc: '300-600 từ' },
              { type: 'CREATIVE_WRITING' as const, name: 'Viết sáng tạo', desc: '200-500 từ' }
            ].map(({ type, name, desc }) => {
              const IconComponent = getTypeIcon(type)
              return (
                <div
                  key={type}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    essayQuestion.type === type
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateType(type)}
                >
                  <div className="text-center">
                    <IconComponent className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                    <h4 className="font-medium text-xs mb-1">{name}</h4>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Question Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nội Dung Câu Hỏi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={essayQuestion.content}
            onChange={(e) => updateContent(e.target.value)}
            placeholder="Nhập nội dung câu hỏi tự luận..."
            rows={6}
            className="w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          
          {/* Word Limit Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Số từ tối thiểu</label>
              <input
                type="number"
                min="0"
                placeholder="Ví dụ: 200"
                value={essayQuestion.wordLimit?.min || ''}
                onChange={(e) => updateWordLimit(
                  e.target.value ? parseInt(e.target.value) : undefined,
                  essayQuestion.wordLimit?.max
                )}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Số từ tối đa</label>
              <input
                type="number"
                min="0"
                placeholder="Ví dụ: 500"
                value={essayQuestion.wordLimit?.max || ''}
                onChange={(e) => updateWordLimit(
                  essayQuestion.wordLimit?.min,
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rubric Builder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tiêu Chí Chấm Điểm</CardTitle>
            <Button
              onClick={() => setShowRubricBuilder(!showRubricBuilder)}
              variant="outline"
            >
              {showRubricBuilder ? 'Ẩn' : 'Hiện'} Rubric
            </Button>
          </div>
        </CardHeader>
        {showRubricBuilder && (
          <CardContent>
            <div className="space-y-4">
              {DEFAULT_RUBRIC.criteria.map((criterion) => (
                <div key={criterion.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{criterion.name}</h4>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      {criterion.weight}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{criterion.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {criterion.levels.map((level) => (
                      <div key={level.score} className="text-xs p-2 bg-gray-50 rounded">
                        <span className="font-medium">{level.score} điểm:</span> {level.description}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Validation Status */}
      {essayQuestion.content.trim() ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
              <CheckCircle className="w-4 h-4" />
              Câu hỏi tự luận đã sẵn sàng
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm">
              <AlertCircle className="w-4 h-4" />
              Vui lòng nhập nội dung câu hỏi
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
