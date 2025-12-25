/**
 * Advanced Question Randomization System
 * Thuật toán randomization nâng cao với nhiều chiến lược khác nhau
 */

import { QuizQuestion, QuizOption } from '@/types/assignment-builder'
import { AntiCheatConfig } from '@/types/exam-system'
import { ShuffledQuestion as BaseShuffledQuestion, ShuffledOption } from './question-shuffle'

/**
 * Enhanced Shuffled Question with metadata
 */
export interface ShuffledQuestion extends BaseShuffledQuestion {
  metadata: QuestionMetadata
  shuffledIndex?: number
}

/**
 * Randomization Strategy
 */
export type RandomizationStrategy = 
  | 'SIMPLE_SHUFFLE'      // Xáo đơn giản
  | 'DIFFICULTY_BALANCED' // Cân bằng theo độ khó
  | 'CATEGORY_GROUPED'    // Nhóm theo chủ đề
  | 'ADAPTIVE_ORDER'      // Thứ tự thích ứng
  | 'WEIGHTED_RANDOM'     // Random có trọng số

/**
 * Randomization Config
 */
export interface RandomizationConfig {
  strategy: RandomizationStrategy
  seed: string
  preserveQuestionGroups: boolean
  maintainDifficultyProgression: boolean
  balanceCategories: boolean
  weightByImportance: boolean
  customWeights?: Record<string, number>
}

/**
 * Question Metadata for Advanced Randomization
 */
export interface QuestionMetadata {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  category: string
  importance: number // 1-10
  estimatedTime: number // seconds
  prerequisites: string[] // IDs of questions that should come before
  tags: string[]
}

/**
 * Enhanced Question with Metadata
 */
export interface EnhancedQuestion extends QuizQuestion {
  metadata: QuestionMetadata
  originalIndex: number
  shuffledIndex?: number
  groupId?: string
}

/**
 * Randomization Result
 */
export interface RandomizationResult {
  questions: ShuffledQuestion[]
  metadata: {
    strategy: RandomizationStrategy
    seed: string
    difficultyDistribution: Record<string, number>
    categoryDistribution: Record<string, number>
    averageEstimatedTime: number
    qualityScore: number // 0-100
  }
  warnings: string[]
}

/**
 * Advanced Randomization Engine
 */
export class AdvancedRandomizationEngine {
  private rng: SeededRandom
  private config: RandomizationConfig

  constructor(config: RandomizationConfig) {
    this.config = config
    this.rng = new SeededRandom(config.seed)
  }

  /**
   * Randomize questions với strategy được chọn
   */
  randomizeQuestions(
    questions: QuizQuestion[],
    antiCheatConfig: AntiCheatConfig
  ): RandomizationResult {
    // Convert to enhanced questions
    const enhancedQuestions = this.enhanceQuestions(questions)
    
    // Apply randomization strategy
    let randomizedQuestions: EnhancedQuestion[]
    
    switch (this.config.strategy) {
      case 'SIMPLE_SHUFFLE':
        randomizedQuestions = this.simpleShuffleStrategy(enhancedQuestions)
        break
      case 'DIFFICULTY_BALANCED':
        randomizedQuestions = this.difficultyBalancedStrategy(enhancedQuestions)
        break
      case 'CATEGORY_GROUPED':
        randomizedQuestions = this.categoryGroupedStrategy(enhancedQuestions)
        break
      case 'ADAPTIVE_ORDER':
        randomizedQuestions = this.adaptiveOrderStrategy(enhancedQuestions)
        break
      case 'WEIGHTED_RANDOM':
        randomizedQuestions = this.weightedRandomStrategy(enhancedQuestions)
        break
      default:
        randomizedQuestions = this.simpleShuffleStrategy(enhancedQuestions)
    }

    // Apply option shuffling
    const shuffledQuestions = this.shuffleOptions(randomizedQuestions, antiCheatConfig)

    // Calculate metadata
    const metadata = this.calculateMetadata(shuffledQuestions)

    // Validate result
    const warnings = this.validateResult(shuffledQuestions)

    return {
      questions: shuffledQuestions,
      metadata,
      warnings
    }
  }

  /**
   * Enhance questions with metadata
   */
  private enhanceQuestions(questions: QuizQuestion[]): EnhancedQuestion[] {
    return questions.map((question, index) => ({
      ...question,
      originalIndex: index,
      metadata: this.extractOrGenerateMetadata(question, index)
    }))
  }

  /**
   * Extract or generate metadata for question
   */
  private extractOrGenerateMetadata(question: QuizQuestion, index: number): QuestionMetadata {
    // Try to extract from existing metadata
    const existingMetadata = (question as any).metadata

    if (existingMetadata) {
      return {
        difficulty: existingMetadata.difficulty || this.inferDifficulty(question),
        category: existingMetadata.category || 'General',
        importance: existingMetadata.importance || 5,
        estimatedTime: existingMetadata.estimatedTime || this.estimateTime(question),
        prerequisites: existingMetadata.prerequisites || [],
        tags: existingMetadata.tags || []
      }
    }

    // Generate metadata
    return {
      difficulty: this.inferDifficulty(question),
      category: this.inferCategory(question),
      importance: 5, // Default importance
      estimatedTime: this.estimateTime(question),
      prerequisites: [],
      tags: this.extractTags(question)
    }
  }

  /**
   * Infer difficulty from question content
   */
  private inferDifficulty(question: QuizQuestion): 'EASY' | 'MEDIUM' | 'HARD' {
    const content = question.content.toLowerCase()
    const options = question.options.length

    // Simple heuristics
    if (content.includes('phân tích') || content.includes('so sánh') || options > 4) {
      return 'HARD'
    } else if (content.includes('giải thích') || content.includes('tại sao') || options === 4) {
      return 'MEDIUM'
    } else {
      return 'EASY'
    }
  }

  /**
   * Infer category from question content
   */
  private inferCategory(question: QuizQuestion): string {
    const content = question.content.toLowerCase()
    
    // Simple keyword matching
    if (content.includes('toán') || content.includes('tính')) return 'Math'
    if (content.includes('lịch sử') || content.includes('năm')) return 'History'
    if (content.includes('văn học') || content.includes('thơ')) return 'Literature'
    if (content.includes('khoa học') || content.includes('thí nghiệm')) return 'Science'
    
    return 'General'
  }

  /**
   * Estimate time needed for question
   */
  private estimateTime(question: QuizQuestion): number {
    const contentLength = question.content.length
    const optionCount = question.options.length
    const hasExplanation = !!question.explanation

    // Base time: 30 seconds
    let time = 30

    // Add time based on content length
    time += Math.floor(contentLength / 100) * 10

    // Add time based on option count
    time += optionCount * 5

    // Add time if has explanation
    if (hasExplanation) time += 15

    return Math.min(time, 300) // Cap at 5 minutes
  }

  /**
   * Extract tags from question
   */
  private extractTags(question: QuizQuestion): string[] {
    const tags: string[] = []
    const content = question.content.toLowerCase()

    // Extract common tags
    if (content.includes('định nghĩa')) tags.push('definition')
    if (content.includes('ví dụ')) tags.push('example')
    if (content.includes('công thức')) tags.push('formula')
    if (content.includes('so sánh')) tags.push('comparison')

    return tags
  }

  /**
   * Simple shuffle strategy
   */
  private simpleShuffleStrategy(questions: EnhancedQuestion[]): EnhancedQuestion[] {
    return this.rng.shuffle([...questions])
  }

  /**
   * Difficulty balanced strategy
   */
  private difficultyBalancedStrategy(questions: EnhancedQuestion[]): EnhancedQuestion[] {
    // Group by difficulty
    const easy = questions.filter(q => q.metadata.difficulty === 'EASY')
    const medium = questions.filter(q => q.metadata.difficulty === 'MEDIUM')
    const hard = questions.filter(q => q.metadata.difficulty === 'HARD')

    // Shuffle each group
    const shuffledEasy = this.rng.shuffle(easy)
    const shuffledMedium = this.rng.shuffle(medium)
    const shuffledHard = this.rng.shuffle(hard)

    // Interleave difficulties
    const result: EnhancedQuestion[] = []
    const maxLength = Math.max(shuffledEasy.length, shuffledMedium.length, shuffledHard.length)

    for (let i = 0; i < maxLength; i++) {
      if (i < shuffledEasy.length) result.push(shuffledEasy[i])
      if (i < shuffledMedium.length) result.push(shuffledMedium[i])
      if (i < shuffledHard.length) result.push(shuffledHard[i])
    }

    return result
  }

  /**
   * Category grouped strategy
   */
  private categoryGroupedStrategy(questions: EnhancedQuestion[]): EnhancedQuestion[] {
    // Group by category
    const categories = new Map<string, EnhancedQuestion[]>()
    
    questions.forEach(question => {
      const category = question.metadata.category
      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)!.push(question)
    })

    // Shuffle within each category
    const result: EnhancedQuestion[] = []
    const categoryNames = this.rng.shuffle(Array.from(categories.keys()))

    categoryNames.forEach(category => {
      const categoryQuestions = this.rng.shuffle(categories.get(category)!)
      result.push(...categoryQuestions)
    })

    return result
  }

  /**
   * Adaptive order strategy
   */
  private adaptiveOrderStrategy(questions: EnhancedQuestion[]): EnhancedQuestion[] {
    // Start with easy questions, gradually increase difficulty
    const sorted = [...questions].sort((a, b) => {
      const difficultyOrder = { 'EASY': 1, 'MEDIUM': 2, 'HARD': 3 }
      const diffA = difficultyOrder[a.metadata.difficulty]
      const diffB = difficultyOrder[b.metadata.difficulty]
      
      if (diffA !== diffB) return diffA - diffB
      
      // Within same difficulty, randomize
      return this.rng.next() - 0.5
    })

    return sorted
  }

  /**
   * Weighted random strategy
   */
  private weightedRandomStrategy(questions: EnhancedQuestion[]): EnhancedQuestion[] {
    const weights = questions.map(q => {
      let weight = q.metadata.importance
      
      // Apply custom weights if available
      if (this.config.customWeights) {
        const customWeight = this.config.customWeights[q.id]
        if (customWeight !== undefined) {
          weight = customWeight
        }
      }
      
      return weight
    })

    return this.weightedShuffle(questions, weights)
  }

  /**
   * Weighted shuffle implementation
   */
  private weightedShuffle<T>(items: T[], weights: number[]): T[] {
    const result: T[] = []
    const remaining = [...items]
    const remainingWeights = [...weights]

    while (remaining.length > 0) {
      const totalWeight = remainingWeights.reduce((sum, w) => sum + w, 0)
      let random = this.rng.next() * totalWeight
      
      let selectedIndex = 0
      for (let i = 0; i < remainingWeights.length; i++) {
        random -= remainingWeights[i]
        if (random <= 0) {
          selectedIndex = i
          break
        }
      }

      result.push(remaining[selectedIndex])
      remaining.splice(selectedIndex, 1)
      remainingWeights.splice(selectedIndex, 1)
    }

    return result
  }

  /**
   * Shuffle options for each question
   */
  private shuffleOptions(
    questions: EnhancedQuestion[],
    antiCheatConfig: AntiCheatConfig
  ): ShuffledQuestion[] {
    return questions.map((question, index) => {
      const shuffledOptions = this.shuffleQuestionOptions(
        question.options,
        `${this.config.seed}-q${index}`,
        antiCheatConfig.shuffleOptions
      )

      return {
        ...question,
        shuffledOptions,
        shuffledIndex: index
      }
    })
  }

  /**
   * Shuffle options for a single question
   */
  private shuffleQuestionOptions(
    options: QuizOption[],
    seed: string,
    shouldShuffle: boolean
  ): ShuffledOption[] {
    const optionRng = new SeededRandom(seed)
    const labels = this.generateOptionLabels(options.length)
    
    let shuffledOptions = options.map((option, index) => ({
      ...option,
      originalLabel: option.label,
      shuffledLabel: labels[index]
    }))

    if (shouldShuffle) {
      shuffledOptions = optionRng.shuffle(shuffledOptions)
      
      // Reassign labels after shuffle
      shuffledOptions.forEach((option, index) => {
        option.shuffledLabel = labels[index]
      })
    }

    return shuffledOptions
  }

  /**
   * Generate option labels
   */
  private generateOptionLabels(count: number): string[] {
    const labels = []
    for (let i = 0; i < count; i++) {
      labels.push(String.fromCharCode(65 + i)) // A, B, C, D, ...
    }
    return labels
  }

  /**
   * Calculate result metadata
   */
  private calculateMetadata(questions: ShuffledQuestion[]): RandomizationResult['metadata'] {
    const difficultyDistribution: Record<string, number> = {}
    const categoryDistribution: Record<string, number> = {}
    let totalEstimatedTime = 0

    questions.forEach(question => {
      const difficulty = question.metadata.difficulty
      const category = question.metadata.category
      
      difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] || 0) + 1
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1
      totalEstimatedTime += question.metadata.estimatedTime
    })

    const averageEstimatedTime = totalEstimatedTime / questions.length
    const qualityScore = this.calculateQualityScore(questions)

    return {
      strategy: this.config.strategy,
      seed: this.config.seed,
      difficultyDistribution,
      categoryDistribution,
      averageEstimatedTime,
      qualityScore
    }
  }

  /**
   * Calculate quality score of randomization
   */
  private calculateQualityScore(questions: ShuffledQuestion[]): number {
    let score = 100

    // Check difficulty progression
    const difficultyProgression = this.checkDifficultyProgression(questions)
    score -= (1 - difficultyProgression) * 20

    // Check category balance
    const categoryBalance = this.checkCategoryBalance(questions)
    score -= (1 - categoryBalance) * 15

    // Check time distribution
    const timeDistribution = this.checkTimeDistribution(questions)
    score -= (1 - timeDistribution) * 15

    return Math.max(0, Math.round(score))
  }

  /**
   * Check difficulty progression quality
   */
  private checkDifficultyProgression(questions: ShuffledQuestion[]): number {
    if (questions.length < 3) return 1

    const difficultyValues = { 'EASY': 1, 'MEDIUM': 2, 'HARD': 3 }
    let progressionScore = 0
    let totalTransitions = 0

    for (let i = 1; i < questions.length; i++) {
      const prevDiff = difficultyValues[questions[i-1].metadata.difficulty]
      const currDiff = difficultyValues[questions[i].metadata.difficulty]
      
      // Prefer gradual increase or same level
      if (currDiff >= prevDiff) {
        progressionScore += 1
      } else if (currDiff === prevDiff - 1) {
        progressionScore += 0.5
      }
      
      totalTransitions += 1
    }

    return totalTransitions > 0 ? progressionScore / totalTransitions : 1
  }

  /**
   * Check category balance quality
   */
  private checkCategoryBalance(questions: ShuffledQuestion[]): number {
    const categories = new Set(questions.map(q => q.metadata.category))
    const categoryCount = categories.size
    
    if (categoryCount <= 1) return 1

    const idealDistribution = questions.length / categoryCount
    let balanceScore = 0

    categories.forEach(category => {
      const count = questions.filter(q => q.metadata.category === category).length
      const deviation = Math.abs(count - idealDistribution) / idealDistribution
      balanceScore += Math.max(0, 1 - deviation)
    })

    return balanceScore / categoryCount
  }

  /**
   * Check time distribution quality
   */
  private checkTimeDistribution(questions: ShuffledQuestion[]): number {
    const times = questions.map(q => q.metadata.estimatedTime)
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
    
    let varianceScore = 0
    times.forEach(time => {
      const deviation = Math.abs(time - avgTime) / avgTime
      varianceScore += Math.max(0, 1 - deviation)
    })

    return varianceScore / times.length
  }

  /**
   * Validate randomization result
   */
  private validateResult(questions: ShuffledQuestion[]): string[] {
    const warnings: string[] = []

    // Check for empty result
    if (questions.length === 0) {
      warnings.push('Không có câu hỏi nào được randomize')
      return warnings
    }

    // Check difficulty distribution
    const difficulties = questions.map(q => q.metadata.difficulty)
    const uniqueDifficulties = new Set(difficulties)
    
    if (uniqueDifficulties.size === 1) {
      warnings.push('Tất cả câu hỏi có cùng độ khó')
    }

    // Check category distribution
    const categories = questions.map(q => q.metadata.category)
    const uniqueCategories = new Set(categories)
    
    if (uniqueCategories.size === 1) {
      warnings.push('Tất cả câu hỏi thuộc cùng một chủ đề')
    }

    // Check time distribution
    const times = questions.map(q => q.metadata.estimatedTime)
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length
    const maxTime = Math.max(...times)
    const minTime = Math.min(...times)
    
    if (maxTime - minTime > avgTime * 2) {
      warnings.push('Thời gian làm bài giữa các câu chênh lệch quá lớn')
    }

    return warnings
  }
}

/**
 * Seeded Random Number Generator (reused from question-shuffle.ts)
 */
class SeededRandom {
  private seed: number

  constructor(seed: string | number) {
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed)
    } else {
      this.seed = seed
    }
    
    if (this.seed === 0) {
      this.seed = 1
    }
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32)
    return this.seed / Math.pow(2, 32)
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array]
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return shuffled
  }
}

/**
 * Factory function to create randomization engine
 */
export const createRandomizationEngine = (
  strategy: RandomizationStrategy,
  seed: string,
  options: Partial<RandomizationConfig> = {}
): AdvancedRandomizationEngine => {
  const config: RandomizationConfig = {
    strategy,
    seed,
    preserveQuestionGroups: false,
    maintainDifficultyProgression: true,
    balanceCategories: true,
    weightByImportance: false,
    ...options
  }

  return new AdvancedRandomizationEngine(config)
}

/**
 * Utility function to get recommended strategy
 */
export const getRecommendedStrategy = (
  questionCount: number,
  hasCategories: boolean,
  hasDifficulties: boolean
): RandomizationStrategy => {
  if (questionCount < 5) {
    return 'SIMPLE_SHUFFLE'
  }

  if (hasDifficulties && hasCategories) {
    return 'ADAPTIVE_ORDER'
  }

  if (hasDifficulties) {
    return 'DIFFICULTY_BALANCED'
  }

  if (hasCategories) {
    return 'CATEGORY_GROUPED'
  }

  return 'SIMPLE_SHUFFLE'
}

export default AdvancedRandomizationEngine
