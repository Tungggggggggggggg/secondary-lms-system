/**
 * Auto-grade utility cho quiz assignments
 * Tự động chấm điểm dựa trên đáp án đúng đã được lưu trong database
 */

import { prisma } from '@/lib/prisma'

/**
 * Interface cho câu trả lời của học sinh
 */
interface QuizAnswer {
  questionId: string
  selectedOptions: string[] // Array của option IDs được chọn
}

/**
 * Interface cho quiz submission
 */
interface QuizSubmission {
  assignmentId: string
  studentId: string
  answers: QuizAnswer[]
}

/**
 * Interface cho kết quả auto-grade
 */
interface AutoGradeResult {
  grade: number // Điểm từ 0-10
  feedback: string // Feedback tự động
  correctCount: number // Số câu đúng
  totalQuestions: number // Tổng số câu
  autoGraded: boolean // Đánh dấu là tự động chấm
  gradedAt: Date // Thời gian chấm
  detailedResults?: QuestionResult[] // Chi tiết từng câu (optional)
}

/**
 * Interface cho kết quả từng câu hỏi
 */
interface QuestionResult {
  questionId: string
  questionContent: string
  studentAnswer: string[]
  correctAnswer: string[]
  isCorrect: boolean
  questionType: 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL_BLANK'
  score?: number
}

/**
 * Hàm chính để auto-grade quiz
 */
export async function autoGradeQuiz(
  submission: QuizSubmission, 
  includeDetails = false
): Promise<AutoGradeResult> {
  try {
    // 1. Lấy thông tin assignment và các câu hỏi với đáp án đúng
    const assignment = await prisma.assignment.findUnique({
      where: { id: submission.assignmentId },
      include: {
        questions: {
          include: {
            options: true
          },
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!assignment) {
      throw new Error('Assignment not found')
    }

    if (assignment.type !== 'QUIZ') {
      throw new Error('Assignment is not a quiz type')
    }

    if (assignment.questions.length === 0) {
      throw new Error('Quiz has no questions')
    }

    // 2. Validate student answers
    if (!submission.answers || submission.answers.length === 0) {
      throw new Error('No answers provided')
    }

    // 3. Tính điểm cho từng câu
    let correctCount = 0
    const totalQuestions = assignment.questions.length
    const detailedResults: QuestionResult[] = []

    // Penalty factor for MULTIPLE questions when selecting wrong options
    const penaltyAlpha = 0.5

    let scoreSum = 0 // sum of per-question scores in [0,1]

    for (const question of assignment.questions) {
      // Tìm câu trả lời của học sinh cho câu hỏi này
      const studentAnswer = submission.answers.find(
        answer => answer.questionId === question.id
      )

      // Lấy đáp án đúng từ database
      const correctOptions = question.options
        .filter(option => option.isCorrect)
        .map(option => option.id)
        .sort()

      // Lấy đáp án của học sinh (nếu có)
      const studentOptions = studentAnswer?.selectedOptions?.sort() || []

      // Tính điểm theo loại câu hỏi
      let qScore = 0
      let isCorrect = false

      if (question.type === 'SINGLE' || question.type === 'TRUE_FALSE') {
        isCorrect = arraysEqual(correctOptions, studentOptions)
        qScore = isCorrect ? 1 : 0
      } else if (question.type === 'MULTIPLE') {
        const correctSet = new Set(correctOptions)
        const selectedSet = new Set(studentOptions)
        let TP = 0, FP = 0
        // Đếm TP/FP
        selectedSet.forEach(id => {
          if (correctSet.has(id)) TP++
          else FP++
        })
        const T = correctOptions.length || 1
        const raw = (TP - penaltyAlpha * FP) / T
        qScore = Math.max(0, Math.min(1, raw))
        isCorrect = qScore === 1
      } else if (question.type === 'FILL_BLANK') {
        // Đánh đúng nếu có ít nhất một đáp án chấp nhận được
        isCorrect = (studentOptions.length > 0 && studentOptions.some(id => correctOptions.includes(id)))
        qScore = isCorrect ? 1 : 0
      } else {
        // Fallback an toàn
        isCorrect = arraysEqual(correctOptions, studentOptions)
        qScore = isCorrect ? 1 : 0
      }

      scoreSum += qScore
      if (isCorrect) correctCount++

      // Lưu chi tiết kết quả nếu được yêu cầu
      if (includeDetails) {
        detailedResults.push({
          questionId: question.id,
          questionContent: question.content,
          studentAnswer: studentOptions,
          correctAnswer: correctOptions,
          isCorrect,
          questionType: question.type as 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL_BLANK',
          score: Math.round(qScore * 1000) / 1000
        })
      }
    }

    // 4. Tính điểm tổng (thang điểm 10) theo tổng điểm từng câu (có thể fractional)
    const grade = totalQuestions > 0 
      ? Math.round(((scoreSum / totalQuestions) * 10) * 10) / 10 // 1 decimal
      : 0

    // 5. Tạo feedback tự động
    const percentage = totalQuestions > 0 
      ? Math.round((scoreSum / totalQuestions) * 100) 
      : 0

    let feedback = `🤖 Tự động chấm: ${Math.round(scoreSum * 100) / 100}/${totalQuestions} điểm câu (${percentage}%). `
    
    if (percentage >= 90) {
      feedback += "Xuất sắc! 🌟 Bạn đã nắm vững kiến thức rất tốt!"
    } else if (percentage >= 80) {
      feedback += "Rất tốt! 👍 Hãy tiếp tục phát huy!"
    } else if (percentage >= 70) {
      feedback += "Khá tốt! 💪 Còn một chút nữa là hoàn hảo!"
    } else if (percentage >= 50) {
      feedback += "Cần cố gắng thêm! 📚 Hãy ôn tập lại các phần chưa vững."
    } else {
      feedback += "Cần ôn tập lại kiến thức! 📖 Đừng nản lòng, hãy học thêm và thử lại!"
    }

    const result: AutoGradeResult = {
      grade,
      feedback,
      correctCount,
      totalQuestions,
      autoGraded: true,
      gradedAt: new Date()
    }

    if (includeDetails) {
      result.detailedResults = detailedResults
    }

    return result

  } catch (error) {
    console.error('[AUTO_GRADE_QUIZ] Error:', error)
    throw new Error(`Auto-grade failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Utility function để so sánh 2 arrays
 */
function arraysEqual(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) {
    return false
  }
  
  const sorted1 = [...arr1].sort()
  const sorted2 = [...arr2].sort()
  
  return sorted1.every((value, index) => value === sorted2[index])
}

/**
 * Hàm helper để validate quiz submission format
 */
export function validateQuizSubmission(submission: any): QuizSubmission {
  if (!submission.assignmentId || typeof submission.assignmentId !== 'string') {
    throw new Error('Invalid assignmentId')
  }

  if (!submission.studentId || typeof submission.studentId !== 'string') {
    throw new Error('Invalid studentId')
  }

  if (!Array.isArray(submission.answers)) {
    throw new Error('Answers must be an array')
  }

  // Validate từng answer
  for (const answer of submission.answers) {
    if (!answer.questionId || typeof answer.questionId !== 'string') {
      throw new Error('Invalid questionId in answer')
    }

    if (!Array.isArray(answer.selectedOptions)) {
      throw new Error('selectedOptions must be an array')
    }

    // Validate option IDs
    for (const optionId of answer.selectedOptions) {
      if (typeof optionId !== 'string') {
        throw new Error('Option ID must be string')
      }
    }
  }

  return submission as QuizSubmission
}

/**
 * Hàm helper để tạo feedback chi tiết cho từng câu
 */
export function generateDetailedFeedback(results: QuestionResult[]): string {
  let feedback = "\n\n📋 **Chi tiết từng câu:**\n"
  
  results.forEach((result, index) => {
    const questionNum = index + 1
    const status = result.isCorrect ? "✅" : "❌"
    
    feedback += `\n${status} **Câu ${questionNum}:** ${result.isCorrect ? "Đúng" : "Sai"}`
    
    if (!result.isCorrect) {
      feedback += `\n   - Bạn chọn: ${result.studentAnswer.length > 0 ? result.studentAnswer.join(", ") : "Không chọn"}`
      feedback += `\n   - Đáp án đúng: ${result.correctAnswer.join(", ")}`
    }
  })
  
  return feedback
}
