/**
 * Exam Interface Component
 * Giao diện thi cho học sinh với timer, progress bar, single question view
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Save,
  Info
} from 'lucide-react'
import { ExamSession, AntiCheatConfig, EXAM_CONSTANTS } from '@/types/exam-system'
import { ShuffledQuestion } from '@/lib/exam-session/question-shuffle'
import { personalTimerManager, formatTime } from '@/lib/exam-session/personal-timer'
import { autoSaveManager } from '@/lib/exam-session/auto-save'
import { logExamEvent } from '@/lib/exam-session/session-manager'

interface ExamInterfaceProps {
  session: ExamSession
  questions: ShuffledQuestion[]
  onAnswerChange: (questionId: string, answer: string | string[]) => void
  onSubmit: () => void
  onSaveProgress: () => void
  className?: string
}

export default function ExamInterface({
  session,
  questions,
  onAnswerChange,
  onSubmit,
  onSaveProgress,
  className = ''
}: ExamInterfaceProps) {
  // States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(session.currentQuestionIndex)
  const [timeRemaining, setTimeRemaining] = useState(session.timeRemaining)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [lastSaveTime, setLastSaveTime] = useState<Date>(new Date())

  // Refs
  const examContainerRef = useRef<HTMLDivElement>(null)

  // Current question
  const currentQuestion = questions[currentQuestionIndex]
  const antiCheatConfig: AntiCheatConfig = (() => {
    const raw: unknown = session.antiCheatConfig as unknown
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as AntiCheatConfig
      } catch {
        return EXAM_CONSTANTS.DEFAULT_ANTI_CHEAT_CONFIG
      }
    }
    if (raw && typeof raw === 'object') {
      return raw as AntiCheatConfig
    }
    return EXAM_CONSTANTS.DEFAULT_ANTI_CHEAT_CONFIG
  })()

  // Helper functions
  const showTimeWarning = (message: string) => {
    setWarningMessage(message)
    setShowWarningDialog(true)
    setTimeout(() => setShowWarningDialog(false), 3000)
  }

  const handleTimeExpired = useCallback(() => {
    showTimeWarning('Hết thời gian! Bài thi sẽ được nộp tự động.')
    setTimeout(() => {
      onSubmit()
    }, 2000)
  }, [onSubmit])

  // Progress calculation
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const answeredCount = Object.keys(session.answers).length

  // Timer setup
  useEffect(() => {
    // Khởi tạo timer
    personalTimerManager.createTimer(
      session.id,
      session.studentId,
      Math.ceil(timeRemaining / 60),
      {
        onTick: (remaining) => {
          setTimeRemaining(remaining)
        },
        onWarning: (remaining) => {
          if (remaining === 300) { // 5 phút
            showTimeWarning('Còn 5 phút để hoàn thành bài thi!')
          } else if (remaining === 60) { // 1 phút
            showTimeWarning('Còn 1 phút để hoàn thành bài thi!')
          } else if (remaining === 10) { // 10 giây
            showTimeWarning('Còn 10 giây!')
          }
        },
        onExpired: () => {
          handleTimeExpired()
        }
      }
    )

    personalTimerManager.startTimer(session.id)

    return () => {
      personalTimerManager.removeTimer(session.id)
    }
  }, [session.id, session.studentId, timeRemaining, handleTimeExpired])

  // Auto-save setup
  useEffect(() => {
    autoSaveManager.startAutoSave(session.id, () => ({
      session: {
        ...session,
        currentQuestionIndex,
        timeRemaining,
        updatedAt: new Date()
      },
      uiState: {
        scrollPosition: window.scrollY,
        isReviewing: false
      }
    }))

    return () => {
      autoSaveManager.stopAutoSave(session.id)
    }
  }, [session, currentQuestionIndex, timeRemaining])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Anti-cheat: Fullscreen detection
  useEffect(() => {
    if (!antiCheatConfig.requireFullscreen) return

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullscreen(isCurrentlyFullscreen)
      
      if (!isCurrentlyFullscreen && antiCheatConfig.requireFullscreen) {
        showTimeWarning('Vui lòng quay lại chế độ toàn màn hình!')
        void logExamEvent(session.id, 'FULLSCREEN_EXIT', {
          reason: 'fullscreen_exit',
          timestamp: new Date().toISOString(),
        }, 'WARNING')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    // Request fullscreen on mount
    if (examContainerRef.current && !document.fullscreenElement) {
      examContainerRef.current.requestFullscreen().catch(console.error)
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [antiCheatConfig.requireFullscreen])

  // Anti-cheat: Tab switch detection
  useEffect(() => {
    if (!antiCheatConfig.detectTabSwitch) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1)
        showTimeWarning('Phát hiện chuyển tab! Vui lòng tập trung vào bài thi.')
        void logExamEvent(session.id, 'TAB_SWITCH_DETECTED', {
          source: 'visibilitychange',
          timestamp: new Date().toISOString(),
        }, 'WARNING')
      }
    }

    const handleBlur = () => {
      if (antiCheatConfig.detectTabSwitch) {
        showTimeWarning('Vui lòng không chuyển sang ứng dụng khác!')
        void logExamEvent(session.id, 'TAB_SWITCH_DETECTED', {
          source: 'window_blur',
          timestamp: new Date().toISOString(),
        }, 'WARNING')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [antiCheatConfig.detectTabSwitch])

  // Anti-cheat: Disable copy/paste
  useEffect(() => {
    if (!antiCheatConfig.disableCopyPaste) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X
      if (e.ctrlKey && ['c', 'v', 'a', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        showTimeWarning('Không được phép sao chép/dán trong bài thi!')
        void logExamEvent(session.id, 'COPY_PASTE_ATTEMPT', {
          key: e.key,
          ctrl: e.ctrlKey,
          timestamp: new Date().toISOString(),
        }, 'WARNING')
      }
      
      // Disable F12, Ctrl+Shift+I (Developer tools)
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault()
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      void logExamEvent(session.id, 'COPY_PASTE_ATTEMPT', {
        source: 'contextmenu',
        timestamp: new Date().toISOString(),
      }, 'WARNING')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [antiCheatConfig.disableCopyPaste])

  

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return

    let newAnswer: string | string[]
    
    if (currentQuestion.type === 'MULTIPLE') {
      const currentAnswers = (session.answers[currentQuestion.id] as string[]) || []
      if (currentAnswers.includes(answer)) {
        newAnswer = currentAnswers.filter(a => a !== answer)
      } else {
        newAnswer = [...currentAnswers, answer]
      }
    } else {
      newAnswer = answer
    }

    onAnswerChange(currentQuestion.id, newAnswer)
  }

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      // Trong single question mode, không cho phép quay lại
      if (antiCheatConfig.singleQuestionMode && index < currentQuestionIndex) {
        showTimeWarning('Không thể quay lại câu hỏi trước đó!')
        return
      }
      
      setCurrentQuestionIndex(index)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (!antiCheatConfig.singleQuestionMode && currentQuestionIndex > 0) {
      navigateToQuestion(currentQuestionIndex - 1)
    }
  }

  const handleManualSave = async () => {
    await onSaveProgress()
    setLastSaveTime(new Date())
    showTimeWarning('Đã lưu tiến độ thành công!')
  }

  const getTimeColor = () => {
    if (timeRemaining <= 60) return 'text-red-600' // < 1 phút
    if (timeRemaining <= 300) return 'text-orange-600' // < 5 phút
    return 'text-green-600'
  }

  const isQuestionAnswered = (questionId: string) => {
    const answer = session.answers[questionId]
    if (Array.isArray(answer)) {
      return answer.length > 0
    }
    return !!answer
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Không tìm thấy câu hỏi</h3>
          <p className="text-gray-600">Vui lòng liên hệ giáo viên để được hỗ trợ.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={examContainerRef} className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Timer */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${getTimeColor()}`} />
                <span className={`font-mono text-lg font-semibold ${getTimeColor()}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Câu {currentQuestionIndex + 1}/{questions.length}
              </div>
              <div className="text-sm text-gray-600">
                Đã trả lời: {answeredCount}/{questions.length}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={handleManualSave}
                className="flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                Lưu
              </Button>
              
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
                size="default"
              >
                Nộp bài
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Tiến độ: {Math.round(progress)}%</span>
              <span>Lưu lần cuối: {lastSaveTime.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Câu {currentQuestionIndex + 1}: {currentQuestion.type === 'MULTIPLE' ? 'Nhiều lựa chọn' : 'Một lựa chọn'}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {isQuestionAnswered(currentQuestion.id) ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Đã trả lời
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Chưa trả lời
                  </Badge>
                )}
                
                {antiCheatConfig.timePerQuestion && (
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {antiCheatConfig.timePerQuestion}s
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Question Content */}
            <div className="prose max-w-none">
              <div 
                className="text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: currentQuestion.content }}
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.shuffledOptions.map((option) => {
                const isSelected = currentQuestion.type === 'MULTIPLE'
                  ? ((session.answers[currentQuestion.id] as string[]) || []).includes(option.shuffledLabel)
                  : session.answers[currentQuestion.id] === option.shuffledLabel

                return (
                  <div
                    key={option.shuffledLabel}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleAnswerSelect(option.shuffledLabel)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          currentQuestion.type === 'MULTIPLE' ? (
                            <CheckCircle className="w-3 h-3 text-white" />
                          ) : (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{option.shuffledLabel}.</span>
                        </div>
                        <div 
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: option.content }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Question Explanation (if available and answered) */}
            {currentQuestion.explanation && isQuestionAnswered(currentQuestion.id) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Giải thích:</strong> {currentQuestion.explanation}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0 || antiCheatConfig.singleQuestionMode}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Câu trước
          </Button>

          {/* Question Navigator (if not single question mode) */}
          {!antiCheatConfig.singleQuestionMode && (
            <div className="flex items-center gap-1 max-w-md overflow-x-auto">
              {questions.map((_, index) => (
                <Button
                  key={index}
                  variant={index === currentQuestionIndex ? "default" : "outline"}
                  size="default"
                  onClick={() => navigateToQuestion(index)}
                  className={`min-w-[40px] h-8 ${
                    isQuestionAnswered(questions[index].id) 
                      ? 'bg-green-100 border-green-300 text-green-800' 
                      : ''
                  }`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          )}

          <Button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className="flex items-center gap-2"
          >
            Câu tiếp
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent onClose={() => setShowSubmitDialog(false)}>
          <DialogHeader>
            <DialogTitle>Xác nhận nộp bài</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn nộp bài thi? Sau khi nộp bạn sẽ không thể thay đổi đáp án.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Tổng câu hỏi:</span> {questions.length}
              </div>
              <div>
                <span className="font-medium">Đã trả lời:</span> {answeredCount}
              </div>
              <div>
                <span className="font-medium">Chưa trả lời:</span> {questions.length - answeredCount}
              </div>
              <div>
                <span className="font-medium">Thời gian còn lại:</span> {formatTime(timeRemaining)}
              </div>
            </div>

            {answeredCount < questions.length && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Bạn còn {questions.length - answeredCount} câu chưa trả lời. 
                  Bạn có muốn tiếp tục nộp bài không?
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Hủy
              </Button>
              <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-700">
                Xác nhận nộp bài
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-md" onClose={() => setShowWarningDialog(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Cảnh báo
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p>{warningMessage}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Anti-cheat indicators */}
      {(antiCheatConfig.detectTabSwitch || antiCheatConfig.requireFullscreen) && (
        <div className="fixed bottom-4 right-4 space-y-2">
          {antiCheatConfig.detectTabSwitch && tabSwitchCount > 0 && (
            <Badge variant="destructive" className="block">
              Chuyển tab: {tabSwitchCount} lần
            </Badge>
          )}
          
          {antiCheatConfig.requireFullscreen && (
            <Badge variant={isFullscreen ? "default" : "destructive"} className="block">
              {isFullscreen ? (
                <><Eye className="w-3 h-3 mr-1" /> Fullscreen</>
              ) : (
                <><EyeOff className="w-3 h-3 mr-1" /> Thoát fullscreen</>
              )}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
