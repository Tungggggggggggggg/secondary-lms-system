/**
 * Suspicious Behavior Detection System
 * Phát hiện và phân tích các hành vi nghi ngờ gian lận trong thi
 */

import { ExamSession, ExamEventLog } from '@/types/exam-system'
import { logExamEvent } from './session-manager'

/**
 * Loại hành vi nghi ngờ
 */
export type SuspiciousBehaviorType = 
  | 'EXCESSIVE_DISCONNECTS'     // Quá nhiều disconnect
  | 'RAPID_ANSWERS'            // Trả lời quá nhanh
  | 'PATTERN_ANSWERS'          // Pattern trả lời bất thường
  | 'TAB_SWITCHING'            // Chuyển tab liên tục
  | 'COPY_PASTE_ATTEMPTS'      // Cố gắng copy/paste
  | 'UNUSUAL_TIMING'           // Thời gian làm bài bất thường
  | 'BROWSER_MANIPULATION'     // Thao tác trình duyệt
  | 'NETWORK_ANOMALY'          // Bất thường mạng
  | 'DEVICE_SWITCHING'         // Đổi thiết bị
  | 'SIMULTANEOUS_SESSIONS'    // Nhiều phiên cùng lúc

/**
 * Mức độ nghi ngờ
 */
export type SuspicionLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * Suspicious Behavior Record
 */
export interface SuspiciousBehaviorRecord {
  id: string
  sessionId: string
  studentId: string
  behaviorType: SuspiciousBehaviorType
  suspicionLevel: SuspicionLevel
  detectedAt: Date
  description: string
  evidence: Record<string, any>
  confidence: number // 0-100
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  notes?: string
}

/**
 * Behavior Pattern
 */
export interface BehaviorPattern {
  type: SuspiciousBehaviorType
  indicators: string[]
  threshold: number
  weight: number
}

/**
 * Analysis Result
 */
export interface BehaviorAnalysisResult {
  overallSuspicionScore: number
  suspicionLevel: SuspicionLevel
  detectedBehaviors: SuspiciousBehaviorRecord[]
  recommendations: string[]
  riskFactors: string[]
}

/**
 * Suspicious Behavior Detector
 */
export class SuspiciousBehaviorDetector {
  private static records: Map<string, SuspiciousBehaviorRecord[]> = new Map()
  private static patterns: BehaviorPattern[] = [
    {
      type: 'EXCESSIVE_DISCONNECTS',
      indicators: ['disconnect_count > 3', 'disconnect_frequency < 300'],
      threshold: 3,
      weight: 25
    },
    {
      type: 'RAPID_ANSWERS',
      indicators: ['answer_time < 5', 'consecutive_rapid_answers > 3'],
      threshold: 5,
      weight: 20
    },
    {
      type: 'PATTERN_ANSWERS',
      indicators: ['sequential_pattern', 'repeated_pattern', 'all_same_option'],
      threshold: 0.8,
      weight: 30
    },
    {
      type: 'TAB_SWITCHING',
      indicators: ['tab_switch_count > 10', 'tab_switch_frequency < 60'],
      threshold: 10,
      weight: 15
    },
    {
      type: 'UNUSUAL_TIMING',
      indicators: ['completion_time_deviation > 2', 'question_time_variance > 3'],
      threshold: 2,
      weight: 20
    }
  ]

  /**
   * Phân tích hành vi của một session
   */
  static async analyzeBehavior(
    session: ExamSession,
    eventLogs: ExamEventLog[] = []
  ): Promise<BehaviorAnalysisResult> {
    const detectedBehaviors: SuspiciousBehaviorRecord[] = []
    let totalSuspicionScore = 0

    // Phân tích từng pattern
    for (const pattern of this.patterns) {
      const behaviorRecord = await this.detectPattern(session, pattern, eventLogs)
      if (behaviorRecord) {
        detectedBehaviors.push(behaviorRecord)
        totalSuspicionScore += pattern.weight * (behaviorRecord.confidence / 100)
      }
    }

    // Tính overall suspicion level
    const suspicionLevel = this.calculateSuspicionLevel(totalSuspicionScore)

    // Tạo recommendations
    const recommendations = this.generateRecommendations(detectedBehaviors, suspicionLevel)
    const riskFactors = this.identifyRiskFactors(session, detectedBehaviors)

    // Lưu records
    this.records.set(session.id, detectedBehaviors)

    // Log analysis result
    await logExamEvent(session.id, 'SUSPICIOUS_BEHAVIOR_DETECTED', {
      suspicionScore: totalSuspicionScore,
      suspicionLevel,
      behaviorCount: detectedBehaviors.length,
      behaviors: detectedBehaviors.map(b => b.behaviorType)
    }, suspicionLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING')

    return {
      overallSuspicionScore: Math.round(totalSuspicionScore),
      suspicionLevel,
      detectedBehaviors,
      recommendations,
      riskFactors
    }
  }

  /**
   * Phát hiện pattern cụ thể
   */
  private static async detectPattern(
    session: ExamSession,
    pattern: BehaviorPattern,
    eventLogs: ExamEventLog[]
  ): Promise<SuspiciousBehaviorRecord | null> {
    let confidence = 0
    const evidence: Record<string, any> = {}

    switch (pattern.type) {
      case 'EXCESSIVE_DISCONNECTS':
        confidence = this.analyzeDisconnectPattern(session, evidence)
        break
      case 'RAPID_ANSWERS':
        confidence = this.analyzeAnswerTimingPattern(session, eventLogs, evidence)
        break
      case 'PATTERN_ANSWERS':
        confidence = this.analyzeAnswerPattern(session, evidence)
        break
      case 'TAB_SWITCHING':
        confidence = this.analyzeTabSwitchingPattern(session, eventLogs, evidence)
        break
      case 'UNUSUAL_TIMING':
        confidence = this.analyzeTimingPattern(session, evidence)
        break
      default:
        return null
    }

    if (confidence < 50) return null // Threshold để tránh false positive

    const suspicionLevel = this.calculateBehaviorSuspicionLevel(confidence)
    
    return {
      id: `behavior_${session.id}_${pattern.type}_${Date.now()}`,
      sessionId: session.id,
      studentId: session.studentId,
      behaviorType: pattern.type,
      suspicionLevel,
      detectedAt: new Date(),
      description: this.generateBehaviorDescription(pattern.type, evidence),
      evidence,
      confidence,
      resolved: false
    }
  }

  /**
   * Phân tích pattern disconnect
   */
  private static analyzeDisconnectPattern(
    session: ExamSession,
    evidence: Record<string, any>
  ): number {
    const disconnectCount = session.disconnectCount
    const sessionDuration = Date.now() - session.startTime!.getTime()
    const disconnectFrequency = sessionDuration / (disconnectCount || 1)

    evidence.disconnectCount = disconnectCount
    evidence.disconnectFrequency = Math.round(disconnectFrequency / 1000) // seconds
    evidence.totalGraceTime = session.totalGraceTime

    // Tính confidence dựa trên số lần disconnect và tần suất
    let confidence = 0
    if (disconnectCount > 5) confidence += 40
    else if (disconnectCount > 3) confidence += 25
    else if (disconnectCount > 1) confidence += 10

    if (disconnectFrequency < 300000) confidence += 30 // < 5 phút giữa các disconnect
    if (session.totalGraceTime > 600) confidence += 20 // > 10 phút grace time

    return Math.min(confidence, 100)
  }

  /**
   * Phân tích pattern trả lời nhanh
   */
  private static analyzeAnswerTimingPattern(
    session: ExamSession,
    eventLogs: ExamEventLog[],
    evidence: Record<string, any>
  ): number {
    const answerEvents = eventLogs.filter(log => log.eventType === 'QUESTION_ANSWERED')
    if (answerEvents.length < 3) return 0

    const answerTimes: number[] = []
    let rapidAnswerCount = 0

    for (let i = 1; i < answerEvents.length; i++) {
      const timeDiff = answerEvents[i].timestamp.getTime() - answerEvents[i-1].timestamp.getTime()
      answerTimes.push(timeDiff)
      
      if (timeDiff < 5000) { // < 5 giây
        rapidAnswerCount++
      }
    }

    const averageAnswerTime = answerTimes.reduce((sum, time) => sum + time, 0) / answerTimes.length
    const rapidAnswerRatio = rapidAnswerCount / answerTimes.length

    evidence.rapidAnswerCount = rapidAnswerCount
    evidence.rapidAnswerRatio = Math.round(rapidAnswerRatio * 100)
    evidence.averageAnswerTime = Math.round(averageAnswerTime / 1000)

    let confidence = 0
    if (rapidAnswerRatio > 0.5) confidence += 50
    else if (rapidAnswerRatio > 0.3) confidence += 30
    
    if (averageAnswerTime < 10000) confidence += 30 // < 10 giây trung bình
    if (rapidAnswerCount > 5) confidence += 20

    return Math.min(confidence, 100)
  }

  /**
   * Phân tích pattern đáp án
   */
  private static analyzeAnswerPattern(
    session: ExamSession,
    evidence: Record<string, any>
  ): number {
    const answers = Object.values(session.answers).filter(answer => 
      typeof answer === 'string' && answer.length === 1
    ) as string[]

    if (answers.length < 5) return 0

    // Kiểm tra pattern tuần tự (A, B, C, D, A, B, C, D...)
    const sequentialPattern = this.detectSequentialPattern(answers)
    
    // Kiểm tra tất cả cùng đáp án
    const sameAnswerPattern = this.detectSameAnswerPattern(answers)
    
    // Kiểm tra pattern lặp lại
    const repeatingPattern = this.detectRepeatingPattern(answers)

    evidence.sequentialPattern = sequentialPattern
    evidence.sameAnswerPattern = sameAnswerPattern
    evidence.repeatingPattern = repeatingPattern
    evidence.totalAnswers = answers.length

    let confidence = 0
    if (sequentialPattern > 0.7) confidence += 40
    if (sameAnswerPattern > 0.8) confidence += 50
    if (repeatingPattern > 0.6) confidence += 35

    return Math.min(confidence, 100)
  }

  /**
   * Phân tích pattern chuyển tab
   */
  private static analyzeTabSwitchingPattern(
    session: ExamSession,
    eventLogs: ExamEventLog[],
    evidence: Record<string, any>
  ): number {
    const tabSwitchEvents = eventLogs.filter(log => 
      log.eventType === 'SESSION_PAUSED' && 
      JSON.parse(log.data).disconnectType === 'PAGE_HIDDEN'
    )

    const tabSwitchCount = tabSwitchEvents.length
    const sessionDuration = Date.now() - session.startTime!.getTime()
    const switchFrequency = sessionDuration / (tabSwitchCount || 1)

    evidence.tabSwitchCount = tabSwitchCount
    evidence.switchFrequency = Math.round(switchFrequency / 1000)

    let confidence = 0
    if (tabSwitchCount > 15) confidence += 50
    else if (tabSwitchCount > 10) confidence += 35
    else if (tabSwitchCount > 5) confidence += 20

    if (switchFrequency < 60000) confidence += 30 // < 1 phút giữa các lần switch

    return Math.min(confidence, 100)
  }

  /**
   * Phân tích pattern thời gian bất thường
   */
  private static analyzeTimingPattern(
    session: ExamSession,
    evidence: Record<string, any>
  ): number {
    const expectedDuration = session.questionOrder.length * 120000 // 2 phút/câu
    const actualDuration = Date.now() - session.startTime!.getTime()
    const completionRatio = (session.currentQuestionIndex + 1) / session.questionOrder.length

    const timeDeviation = Math.abs(actualDuration - expectedDuration) / expectedDuration
    const progressSpeed = completionRatio / (actualDuration / expectedDuration)

    evidence.expectedDuration = Math.round(expectedDuration / 1000)
    evidence.actualDuration = Math.round(actualDuration / 1000)
    evidence.timeDeviation = Math.round(timeDeviation * 100)
    evidence.progressSpeed = Math.round(progressSpeed * 100)

    let confidence = 0
    if (timeDeviation > 0.5) confidence += 30 // Chênh lệch > 50%
    if (progressSpeed > 2) confidence += 40 // Quá nhanh
    if (progressSpeed < 0.3) confidence += 25 // Quá chậm

    return Math.min(confidence, 100)
  }

  /**
   * Detect sequential pattern (A, B, C, D, A, B, C, D...)
   */
  private static detectSequentialPattern(answers: string[]): number {
    let sequentialCount = 0
    const options = ['A', 'B', 'C', 'D']
    
    for (let i = 0; i < answers.length; i++) {
      const expectedOption = options[i % options.length]
      if (answers[i] === expectedOption) {
        sequentialCount++
      }
    }
    
    return sequentialCount / answers.length
  }

  /**
   * Detect same answer pattern
   */
  private static detectSameAnswerPattern(answers: string[]): number {
    const answerCounts = answers.reduce((counts, answer) => {
      counts[answer] = (counts[answer] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const maxCount = Math.max(...Object.values(answerCounts))
    return maxCount / answers.length
  }

  /**
   * Detect repeating pattern
   */
  private static detectRepeatingPattern(answers: string[]): number {
    const patterns = ['AB', 'ABC', 'ABCD', 'AA', 'BB', 'CC', 'DD']
    let maxPatternRatio = 0

    for (const pattern of patterns) {
      let patternCount = 0
      for (let i = 0; i <= answers.length - pattern.length; i++) {
        const segment = answers.slice(i, i + pattern.length).join('')
        if (segment === pattern) {
          patternCount++
        }
      }
      
      const ratio = patternCount / (answers.length - pattern.length + 1)
      maxPatternRatio = Math.max(maxPatternRatio, ratio)
    }

    return maxPatternRatio
  }

  /**
   * Tính suspicion level từ score
   */
  private static calculateSuspicionLevel(score: number): SuspicionLevel {
    if (score >= 80) return 'CRITICAL'
    if (score >= 60) return 'HIGH'
    if (score >= 40) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Tính suspicion level cho behavior cụ thể
   */
  private static calculateBehaviorSuspicionLevel(confidence: number): SuspicionLevel {
    if (confidence >= 90) return 'CRITICAL'
    if (confidence >= 75) return 'HIGH'
    if (confidence >= 60) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Tạo mô tả cho behavior
   */
  private static generateBehaviorDescription(
    type: SuspiciousBehaviorType,
    evidence: Record<string, any>
  ): string {
    switch (type) {
      case 'EXCESSIVE_DISCONNECTS':
        return `Học sinh disconnect ${evidence.disconnectCount} lần với tần suất ${evidence.disconnectFrequency}s`
      case 'RAPID_ANSWERS':
        return `${evidence.rapidAnswerCount} câu trả lời nhanh (< 5s), tỷ lệ ${evidence.rapidAnswerRatio}%`
      case 'PATTERN_ANSWERS':
        return `Phát hiện pattern đáp án bất thường trong ${evidence.totalAnswers} câu trả lời`
      case 'TAB_SWITCHING':
        return `Chuyển tab ${evidence.tabSwitchCount} lần với tần suất ${evidence.switchFrequency}s`
      case 'UNUSUAL_TIMING':
        return `Thời gian làm bài chênh lệch ${evidence.timeDeviation}% so với dự kiến`
      default:
        return `Phát hiện hành vi nghi ngờ: ${type}`
    }
  }

  /**
   * Tạo recommendations
   */
  private static generateRecommendations(
    behaviors: SuspiciousBehaviorRecord[],
    suspicionLevel: SuspicionLevel
  ): string[] {
    const recommendations: string[] = []

    if (suspicionLevel === 'CRITICAL') {
      recommendations.push('Chấm dứt phiên thi ngay lập tức')
      recommendations.push('Yêu cầu học sinh làm lại bài thi dưới sự giám sát')
    } else if (suspicionLevel === 'HIGH') {
      recommendations.push('Giám sát chặt chẽ phiên thi')
      recommendations.push('Cân nhắc can thiệp trực tiếp')
    } else if (suspicionLevel === 'MEDIUM') {
      recommendations.push('Theo dõi thêm các hoạt động')
      recommendations.push('Ghi chú vào báo cáo thi')
    }

    // Specific recommendations based on behaviors
    behaviors.forEach(behavior => {
      switch (behavior.behaviorType) {
        case 'EXCESSIVE_DISCONNECTS':
          recommendations.push('Kiểm tra kết nối mạng của học sinh')
          break
        case 'RAPID_ANSWERS':
          recommendations.push('Xem xét thời gian trả lời từng câu')
          break
        case 'PATTERN_ANSWERS':
          recommendations.push('Kiểm tra chi tiết các đáp án đã chọn')
          break
      }
    })

    return [...new Set(recommendations)] // Remove duplicates
  }

  /**
   * Xác định risk factors
   */
  private static identifyRiskFactors(
    session: ExamSession,
    behaviors: SuspiciousBehaviorRecord[]
  ): string[] {
    const riskFactors: string[] = []

    if (session.disconnectCount > 0) {
      riskFactors.push(`${session.disconnectCount} lần disconnect`)
    }

    if (session.totalGraceTime > 300) {
      riskFactors.push(`${Math.floor(session.totalGraceTime / 60)} phút grace time`)
    }

    behaviors.forEach(behavior => {
      if (behavior.suspicionLevel === 'HIGH' || behavior.suspicionLevel === 'CRITICAL') {
        riskFactors.push(`${behavior.behaviorType} (${behavior.confidence}% confidence)`)
      }
    })

    return riskFactors
  }

  /**
   * Lấy lịch sử suspicious behaviors
   */
  static getSuspiciousBehaviors(sessionId: string): SuspiciousBehaviorRecord[] {
    return this.records.get(sessionId) || []
  }

  /**
   * Đánh dấu behavior đã được resolve
   */
  static async resolveBehavior(
    behaviorId: string,
    resolvedBy: string,
    notes: string
  ): Promise<boolean> {
    for (const behaviors of this.records.values()) {
      const behavior = behaviors.find(b => b.id === behaviorId)
      if (behavior) {
        behavior.resolved = true
        behavior.resolvedBy = resolvedBy
        behavior.resolvedAt = new Date()
        behavior.notes = notes
        return true
      }
    }
    return false
  }

  /**
   * Lấy thống kê suspicious behaviors
   */
  static getStatistics(): {
    totalBehaviors: number
    behaviorsByType: Record<SuspiciousBehaviorType, number>
    behaviorsByLevel: Record<SuspicionLevel, number>
    resolvedBehaviors: number
  } {
    const allBehaviors = Array.from(this.records.values()).flat()
    
    const behaviorsByType = allBehaviors.reduce((counts, behavior) => {
      counts[behavior.behaviorType] = (counts[behavior.behaviorType] || 0) + 1
      return counts
    }, {} as Record<SuspiciousBehaviorType, number>)

    const behaviorsByLevel = allBehaviors.reduce((counts, behavior) => {
      counts[behavior.suspicionLevel] = (counts[behavior.suspicionLevel] || 0) + 1
      return counts
    }, {} as Record<SuspicionLevel, number>)

    const resolvedBehaviors = allBehaviors.filter(b => b.resolved).length

    return {
      totalBehaviors: allBehaviors.length,
      behaviorsByType,
      behaviorsByLevel,
      resolvedBehaviors
    }
  }
}

/**
 * Utility functions
 */

/**
 * Format suspicion level cho UI
 */
export const formatSuspicionLevel = (level: SuspicionLevel): string => {
  const levels = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình', 
    HIGH: 'Cao',
    CRITICAL: 'Nghiêm trọng'
  }
  return levels[level]
}

/**
 * Get color cho suspicion level
 */
export const getSuspicionLevelColor = (level: SuspicionLevel): string => {
  const colors = {
    LOW: 'text-green-600 bg-green-100',
    MEDIUM: 'text-yellow-600 bg-yellow-100',
    HIGH: 'text-orange-600 bg-orange-100',
    CRITICAL: 'text-red-600 bg-red-100'
  }
  return colors[level]
}

export default SuspiciousBehaviorDetector
