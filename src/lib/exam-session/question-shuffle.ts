/**
 * Question Shuffle System
 * Hệ thống xáo câu hỏi và đáp án với seed-based randomization
 * Đảm bảo mỗi học sinh có thứ tự khác nhau nhưng consistent
 */

import { QuizQuestion, QuizOption } from '@/types/assignment-builder'
import { AntiCheatConfig } from '@/types/exam-system'

/**
 * Interface cho Shuffled Question
 */
export interface ShuffledQuestion extends QuizQuestion {
  originalIndex: number
  shuffledOptions: ShuffledOption[]
}

/**
 * Interface cho Shuffled Option
 */
export interface ShuffledOption extends QuizOption {
  originalLabel: string
  shuffledLabel: string
}

/**
 * Seeded Random Number Generator
 * Sử dụng Linear Congruential Generator (LCG) để tạo số ngẫu nhiên deterministic
 */
class SeededRandom {
  private seed: number

  constructor(seed: string | number) {
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed)
    } else {
      this.seed = seed
    }
    
    // Đảm bảo seed không bằng 0
    if (this.seed === 0) {
      this.seed = 1
    }
  }

  /**
   * Hash string thành number
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Tạo số ngẫu nhiên tiếp theo (0-1)
   */
  next(): number {
    // LCG formula: (a * seed + c) % m
    // Sử dụng constants từ Numerical Recipes
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32)
    return this.seed / Math.pow(2, 32)
  }

  /**
   * Tạo số nguyên ngẫu nhiên trong khoảng [min, max)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min
  }

  /**
   * Shuffle array sử dụng Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array]
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled
  }
}

/**
 * Question Shuffle Manager
 */
export class QuestionShuffleManager {
  /**
   * Tạo seed cho học sinh dựa trên studentId và assignmentId
   */
  static generateStudentSeed(studentId: string, assignmentId: string): string {
    return `${studentId}-${assignmentId}-${Date.now().toString(36)}`
  }

  /**
   * Tạo seed deterministic (không thay đổi theo thời gian)
   */
  static generateDeterministicSeed(studentId: string, assignmentId: string): string {
    return `${studentId}-${assignmentId}`
  }

  /**
   * Xáo câu hỏi theo cấu hình anti-cheat
   */
  static shuffleQuestions(
    questions: QuizQuestion[],
    studentId: string,
    assignmentId: string,
    antiCheatConfig: AntiCheatConfig
  ): ShuffledQuestion[] {
    // Tạo seed deterministic
    const seed = this.generateDeterministicSeed(studentId, assignmentId)
    const rng = new SeededRandom(seed)

    let shuffledQuestions: ShuffledQuestion[] = questions.map((question, index) => ({
      ...question,
      originalIndex: index,
      shuffledOptions: [] as ShuffledOption[]
    }))

    // Xáo thứ tự câu hỏi nếu được bật
    if (antiCheatConfig.shuffleQuestions) {
      shuffledQuestions = rng.shuffle(shuffledQuestions)
      console.log(`[SHUFFLE] Đã xáo ${shuffledQuestions.length} câu hỏi cho student ${studentId}`)
    }

    // Xáo thứ tự đáp án cho từng câu hỏi
    shuffledQuestions.forEach((question, questionIndex) => {
      question.shuffledOptions = this.shuffleOptions(
        question.options,
        seed + `-q${questionIndex}`, // Seed riêng cho từng câu
        antiCheatConfig.shuffleOptions
      )
    })

    return shuffledQuestions
  }

  /**
   * Xáo đáp án của một câu hỏi
   */
  static shuffleOptions(
    options: QuizOption[],
    seed: string,
    shouldShuffle: boolean
  ): ShuffledOption[] {
    const rng = new SeededRandom(seed)
    
    // Tạo labels mới (A, B, C, D, ...)
    const labels = this.generateOptionLabels(options.length)
    
    let shuffledOptions = options.map((option, index) => ({
      ...option,
      originalLabel: option.label,
      shuffledLabel: labels[index]
    }))

    // Xáo thứ tự nếu được bật
    if (shouldShuffle) {
      shuffledOptions = rng.shuffle(shuffledOptions)
      
      // Gán lại labels theo thứ tự mới
      shuffledOptions.forEach((option, index) => {
        option.shuffledLabel = labels[index]
      })
    }

    return shuffledOptions
  }

  /**
   * Tạo labels cho đáp án (A, B, C, D, ...)
   */
  static generateOptionLabels(count: number): string[] {
    const labels = []
    for (let i = 0; i < count; i++) {
      labels.push(String.fromCharCode(65 + i)) // A, B, C, D, ...
    }
    return labels
  }

  /**
   * Chuyển đổi đáp án từ shuffled label về original label
   */
  static convertShuffledAnswerToOriginal(
    shuffledAnswer: string | string[],
    shuffledOptions: ShuffledOption[]
  ): string | string[] {
    if (Array.isArray(shuffledAnswer)) {
      return shuffledAnswer.map(answer => 
        this.convertSingleAnswerToOriginal(answer, shuffledOptions)
      )
    } else {
      return this.convertSingleAnswerToOriginal(shuffledAnswer, shuffledOptions)
    }
  }

  /**
   * Chuyển đổi một đáp án từ shuffled về original
   */
  private static convertSingleAnswerToOriginal(
    shuffledAnswer: string,
    shuffledOptions: ShuffledOption[]
  ): string {
    const option = shuffledOptions.find(opt => opt.shuffledLabel === shuffledAnswer)
    return option?.originalLabel || shuffledAnswer
  }

  /**
   * Chuyển đổi đáp án từ original label sang shuffled label
   */
  static convertOriginalAnswerToShuffled(
    originalAnswer: string | string[],
    shuffledOptions: ShuffledOption[]
  ): string | string[] {
    if (Array.isArray(originalAnswer)) {
      return originalAnswer.map(answer => 
        this.convertSingleAnswerToShuffled(answer, shuffledOptions)
      )
    } else {
      return this.convertSingleAnswerToShuffled(originalAnswer, shuffledOptions)
    }
  }

  /**
   * Chuyển đổi một đáp án từ original sang shuffled
   */
  private static convertSingleAnswerToShuffled(
    originalAnswer: string,
    shuffledOptions: ShuffledOption[]
  ): string {
    const option = shuffledOptions.find(opt => opt.originalLabel === originalAnswer)
    return option?.shuffledLabel || originalAnswer
  }

  /**
   * Tạo mapping giữa original và shuffled question order
   */
  static createQuestionOrderMapping(
    originalQuestions: QuizQuestion[],
    shuffledQuestions: ShuffledQuestion[]
  ): {
    originalToShuffled: Map<number, number>
    shuffledToOriginal: Map<number, number>
  } {
    const originalToShuffled = new Map<number, number>()
    const shuffledToOriginal = new Map<number, number>()

    shuffledQuestions.forEach((shuffledQuestion, shuffledIndex) => {
      const originalIndex = shuffledQuestion.originalIndex
      originalToShuffled.set(originalIndex, shuffledIndex)
      shuffledToOriginal.set(shuffledIndex, originalIndex)
    })

    return { originalToShuffled, shuffledToOriginal }
  }

  /**
   * Validate shuffled questions
   */
  static validateShuffledQuestions(
    originalQuestions: QuizQuestion[],
    shuffledQuestions: ShuffledQuestion[]
  ): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Kiểm tra số lượng câu hỏi
    if (originalQuestions.length !== shuffledQuestions.length) {
      errors.push('Số lượng câu hỏi không khớp')
    }

    // Kiểm tra tất cả câu hỏi gốc có mặt
    const originalIds = new Set(originalQuestions.map(q => q.id))
    const shuffledIds = new Set(shuffledQuestions.map(q => q.id))
    
    for (const id of originalIds) {
      if (!shuffledIds.has(id)) {
        errors.push(`Thiếu câu hỏi ID: ${id}`)
      }
    }

    // Kiểm tra options cho từng câu hỏi
    shuffledQuestions.forEach((shuffledQuestion, index) => {
      const originalQuestion = originalQuestions.find(q => q.id === shuffledQuestion.id)
      if (!originalQuestion) return

      if (originalQuestion.options.length !== shuffledQuestion.shuffledOptions.length) {
        errors.push(`Câu hỏi ${shuffledQuestion.id}: Số lượng đáp án không khớp`)
      }

      // Kiểm tra tất cả đáp án gốc có mặt
      const originalOptionContents = new Set(originalQuestion.options.map(opt => opt.content))
      const shuffledOptionContents = new Set(shuffledQuestion.shuffledOptions.map(opt => opt.content))
      
      for (const content of originalOptionContents) {
        if (!shuffledOptionContents.has(content)) {
          errors.push(`Câu hỏi ${shuffledQuestion.id}: Thiếu đáp án "${content}"`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Tạo preview của việc shuffle cho giáo viên
   */
  static createShufflePreview(
    questions: QuizQuestion[],
    antiCheatConfig: AntiCheatConfig,
    sampleStudentIds: string[],
    assignmentId: string
  ): {
    studentId: string
    shuffledQuestions: ShuffledQuestion[]
  }[] {
    return sampleStudentIds.map(studentId => ({
      studentId,
      shuffledQuestions: this.shuffleQuestions(
        questions,
        studentId,
        assignmentId,
        antiCheatConfig
      )
    }))
  }

  /**
   * Tính toán độ khác biệt giữa các bản shuffle
   */
  static calculateShuffleDiversity(
    previews: {
      studentId: string
      shuffledQuestions: ShuffledQuestion[]
    }[]
  ): {
    questionOrderDiversity: number // 0-1, 1 = hoàn toàn khác nhau
    optionOrderDiversity: number
    averageDifference: number
  } {
    if (previews.length < 2) {
      return {
        questionOrderDiversity: 0,
        optionOrderDiversity: 0,
        averageDifference: 0
      }
    }

    let totalQuestionDiff = 0
    let totalOptionDiff = 0
    let comparisons = 0

    // So sánh từng cặp
    for (let i = 0; i < previews.length; i++) {
      for (let j = i + 1; j < previews.length; j++) {
        const preview1 = previews[i]
        const preview2 = previews[j]

        // So sánh thứ tự câu hỏi
        const questionDiff = this.compareQuestionOrder(
          preview1.shuffledQuestions,
          preview2.shuffledQuestions
        )

        // So sánh thứ tự đáp án
        const optionDiff = this.compareOptionOrder(
          preview1.shuffledQuestions,
          preview2.shuffledQuestions
        )

        totalQuestionDiff += questionDiff
        totalOptionDiff += optionDiff
        comparisons++
      }
    }

    const questionOrderDiversity = totalQuestionDiff / comparisons
    const optionOrderDiversity = totalOptionDiff / comparisons
    const averageDifference = (questionOrderDiversity + optionOrderDiversity) / 2

    return {
      questionOrderDiversity,
      optionOrderDiversity,
      averageDifference
    }
  }

  /**
   * So sánh thứ tự câu hỏi giữa 2 bản shuffle
   */
  private static compareQuestionOrder(
    questions1: ShuffledQuestion[],
    questions2: ShuffledQuestion[]
  ): number {
    if (questions1.length !== questions2.length) return 1

    let differences = 0
    for (let i = 0; i < questions1.length; i++) {
      if (questions1[i].id !== questions2[i].id) {
        differences++
      }
    }

    return differences / questions1.length
  }

  /**
   * So sánh thứ tự đáp án giữa 2 bản shuffle
   */
  private static compareOptionOrder(
    questions1: ShuffledQuestion[],
    questions2: ShuffledQuestion[]
  ): number {
    if (questions1.length !== questions2.length) return 1

    let totalDifferences = 0
    let totalOptions = 0

    for (let i = 0; i < questions1.length; i++) {
      const q1 = questions1.find(q => q.id === questions1[i].id)
      const q2 = questions2.find(q => q.id === questions1[i].id)

      if (!q1 || !q2) continue

      const options1 = q1.shuffledOptions
      const options2 = q2.shuffledOptions

      if (options1.length !== options2.length) continue

      let differences = 0
      for (let j = 0; j < options1.length; j++) {
        if (options1[j].content !== options2[j].content) {
          differences++
        }
      }

      totalDifferences += differences
      totalOptions += options1.length
    }

    return totalOptions > 0 ? totalDifferences / totalOptions : 0
  }
}

/**
 * Utility functions
 */

/**
 * Tạo seed ngẫu nhiên cho testing
 */
export const generateRandomSeed = (): string => {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Kiểm tra xem 2 array có cùng elements không (bất kể thứ tự)
 */
export const hasSameElements = <T>(arr1: T[], arr2: T[]): boolean => {
  if (arr1.length !== arr2.length) return false
  
  const set1 = new Set(arr1)
  const set2 = new Set(arr2)
  
  if (set1.size !== set2.size) return false
  
  for (const item of set1) {
    if (!set2.has(item)) return false
  }
  
  return true
}

/**
 * Tính toán Kendall's Tau distance giữa 2 permutation
 */
export const calculateKendallTau = <T>(arr1: T[], arr2: T[]): number => {
  if (arr1.length !== arr2.length) return 1

  const n = arr1.length
  let inversions = 0

  // Tạo mapping từ element sang index
  const indexMap1 = new Map<T, number>()
  const indexMap2 = new Map<T, number>()

  arr1.forEach((item, index) => indexMap1.set(item, index))
  arr2.forEach((item, index) => indexMap2.set(item, index))

  // Đếm số inversion
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const item1 = arr1[i]
      const item2 = arr1[j]

      const pos1_in_arr2 = indexMap2.get(item1) || 0
      const pos2_in_arr2 = indexMap2.get(item2) || 0

      if (pos1_in_arr2 > pos2_in_arr2) {
        inversions++
      }
    }
  }

  // Normalize về [0, 1]
  const maxInversions = (n * (n - 1)) / 2
  return inversions / maxInversions
}

export default QuestionShuffleManager
