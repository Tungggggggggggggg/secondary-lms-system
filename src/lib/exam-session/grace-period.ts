/**
 * Grace Period System
 * Quản lý thời gian gia hạn tự động khi học sinh disconnect
 */

import { ExamSession, FallbackConfig, ExamEventLog } from '@/types/exam-system'
import { logExamEvent } from './session-manager'

/**
 * Interface cho Grace Period Request
 */
export interface GracePeriodRequest {
  sessionId: string
  studentId: string
  reason: GracePeriodReason
  requestedSeconds: number
  autoApprove: boolean
  metadata: {
    disconnectTime: Date
    reconnectTime: Date
    networkInfo?: string
    userAgent?: string
    ipAddress?: string
  }
}

/**
 * Lý do yêu cầu grace period
 */
export type GracePeriodReason = 
  | 'DISCONNECT_DETECTED'
  | 'NETWORK_ISSUE'
  | 'BROWSER_CRASH'
  | 'SYSTEM_ERROR'
  | 'TEACHER_INTERVENTION'
  | 'TECHNICAL_DIFFICULTY'

/**
 * Trạng thái grace period request
 */
export type GracePeriodStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'AUTO_APPROVED'

/**
 * Grace Period Record
 */
export interface GracePeriodRecord {
  id: string
  sessionId: string
  studentId: string
  teacherId?: string
  reason: GracePeriodReason
  status: GracePeriodStatus
  requestedSeconds: number
  approvedSeconds: number
  requestTime: Date
  approvalTime?: Date
  expiryTime: Date
  metadata: Record<string, any>
  notes?: string
}

/**
 * Grace Period Manager
 */
export class GracePeriodManager {
  private static records: Map<string, GracePeriodRecord> = new Map()
  private static pendingRequests: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Yêu cầu grace period
   */
  static async requestGracePeriod(
    session: ExamSession,
    request: GracePeriodRequest,
    fallbackConfig: FallbackConfig
  ): Promise<{
    success: boolean
    gracePeriodId?: string
    approvedSeconds?: number
    message: string
  }> {
    try {
      // Validate request
      const validation = this.validateGracePeriodRequest(session, request, fallbackConfig)
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors.join(', ')
        }
      }

      // Tạo grace period record
      const gracePeriodId = `grace_${session.id}_${Date.now()}`
      const now = new Date()
      
      // Tính toán thời gian gia hạn thực tế
      const maxAllowedSeconds = this.calculateMaxAllowedGracePeriod(session, fallbackConfig)
      const approvedSeconds = Math.min(request.requestedSeconds, maxAllowedSeconds)

      const record: GracePeriodRecord = {
        id: gracePeriodId,
        sessionId: session.id,
        studentId: session.studentId,
        reason: request.reason,
        status: request.autoApprove ? 'AUTO_APPROVED' : 'PENDING',
        requestedSeconds: request.requestedSeconds,
        approvedSeconds: request.autoApprove ? approvedSeconds : 0,
        requestTime: now,
        approvalTime: request.autoApprove ? now : undefined,
        expiryTime: new Date(now.getTime() + 5 * 60 * 1000), // 5 phút để xử lý
        metadata: request.metadata,
        notes: `Auto-generated grace period for ${request.reason}`
      }

      // Lưu record
      this.records.set(gracePeriodId, record)

      // Log sự kiện
      await logExamEvent(session.id, 'GRACE_PERIOD_ADDED', {
        gracePeriodId,
        reason: request.reason,
        requestedSeconds: request.requestedSeconds,
        approvedSeconds: record.approvedSeconds,
        autoApprove: request.autoApprove,
        disconnectDuration: request.metadata.reconnectTime.getTime() - request.metadata.disconnectTime.getTime()
      })

      if (request.autoApprove) {
        // Áp dụng grace period ngay lập tức
        await this.applyGracePeriod(session.id, gracePeriodId)
        
        return {
          success: true,
          gracePeriodId,
          approvedSeconds: record.approvedSeconds,
          message: `Đã tự động gia hạn ${approvedSeconds} giây`
        }
      } else {
        // Đợi teacher approval
        this.scheduleGracePeriodExpiry(gracePeriodId)
        
        return {
          success: true,
          gracePeriodId,
          message: 'Yêu cầu gia hạn đang chờ phê duyệt từ giáo viên'
        }
      }

    } catch (error) {
      console.error('[GRACE_PERIOD] Lỗi khi yêu cầu grace period:', error)
      
      await logExamEvent(session.id, 'GRACE_PERIOD_ADDED', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        reason: request.reason
      }, 'ERROR')

      return {
        success: false,
        message: 'Lỗi hệ thống khi yêu cầu gia hạn'
      }
    }
  }

  /**
   * Phê duyệt grace period (teacher action)
   */
  static async approveGracePeriod(
    gracePeriodId: string,
    teacherId: string,
    approvedSeconds?: number,
    notes?: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const record = this.records.get(gracePeriodId)
      if (!record) {
        return {
          success: false,
          message: 'Không tìm thấy yêu cầu gia hạn'
        }
      }

      if (record.status !== 'PENDING') {
        return {
          success: false,
          message: `Yêu cầu đã được xử lý với trạng thái: ${record.status}`
        }
      }

      // Cập nhật record
      record.status = 'APPROVED'
      record.teacherId = teacherId
      record.approvedSeconds = approvedSeconds || record.requestedSeconds
      record.approvalTime = new Date()
      record.notes = notes

      // Áp dụng grace period
      await this.applyGracePeriod(record.sessionId, gracePeriodId)

      // Clear pending timeout
      const timeout = this.pendingRequests.get(gracePeriodId)
      if (timeout) {
        clearTimeout(timeout)
        this.pendingRequests.delete(gracePeriodId)
      }

      // Log sự kiện
      await logExamEvent(record.sessionId, 'GRACE_PERIOD_ADDED', {
        gracePeriodId,
        teacherId,
        approvedSeconds: record.approvedSeconds,
        notes,
        action: 'APPROVED'
      })

      return {
        success: true,
        message: `Đã phê duyệt gia hạn ${record.approvedSeconds} giây`
      }

    } catch (error) {
      console.error('[GRACE_PERIOD] Lỗi khi phê duyệt grace period:', error)
      return {
        success: false,
        message: 'Lỗi hệ thống khi phê duyệt gia hạn'
      }
    }
  }

  /**
   * Từ chối grace period (teacher action)
   */
  static async rejectGracePeriod(
    gracePeriodId: string,
    teacherId: string,
    reason: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const record = this.records.get(gracePeriodId)
      if (!record) {
        return {
          success: false,
          message: 'Không tìm thấy yêu cầu gia hạn'
        }
      }

      if (record.status !== 'PENDING') {
        return {
          success: false,
          message: `Yêu cầu đã được xử lý với trạng thái: ${record.status}`
        }
      }

      // Cập nhật record
      record.status = 'REJECTED'
      record.teacherId = teacherId
      record.approvalTime = new Date()
      record.notes = reason

      // Clear pending timeout
      const timeout = this.pendingRequests.get(gracePeriodId)
      if (timeout) {
        clearTimeout(timeout)
        this.pendingRequests.delete(gracePeriodId)
      }

      // Log sự kiện
      await logExamEvent(record.sessionId, 'GRACE_PERIOD_ADDED', {
        gracePeriodId,
        teacherId,
        reason,
        action: 'REJECTED'
      })

      return {
        success: true,
        message: 'Đã từ chối yêu cầu gia hạn'
      }

    } catch (error) {
      console.error('[GRACE_PERIOD] Lỗi khi từ chối grace period:', error)
      return {
        success: false,
        message: 'Lỗi hệ thống khi từ chối gia hạn'
      }
    }
  }

  /**
   * Áp dụng grace period vào session
   */
  private static async applyGracePeriod(
    sessionId: string,
    gracePeriodId: string
  ): Promise<void> {
    const record = this.records.get(gracePeriodId)
    if (!record || record.approvedSeconds <= 0) {
      return
    }

    // TODO: Cập nhật session trong database
    // Tạm thời log để tracking
    console.log(`[GRACE_PERIOD] Áp dụng ${record.approvedSeconds}s cho session ${sessionId}`)

    // Log sự kiện áp dụng
    await logExamEvent(sessionId, 'GRACE_PERIOD_ADDED', {
      gracePeriodId,
      appliedSeconds: record.approvedSeconds,
      totalGraceTime: record.approvedSeconds, // TODO: Tính tổng từ session
      action: 'APPLIED'
    })
  }

  /**
   * Validate grace period request
   */
  private static validateGracePeriodRequest(
    session: ExamSession,
    request: GracePeriodRequest,
    fallbackConfig: FallbackConfig
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Kiểm tra session status
    if (!['IN_PROGRESS', 'PAUSED'].includes(session.status)) {
      errors.push('Chỉ có thể yêu cầu gia hạn khi đang làm bài hoặc tạm dừng')
    }

    // Kiểm tra số lần disconnect
    if (session.disconnectCount >= fallbackConfig.maxReconnects) {
      errors.push('Đã vượt quá số lần reconnect tối đa')
    }

    // Kiểm tra thời gian yêu cầu
    if (request.requestedSeconds <= 0) {
      errors.push('Thời gian gia hạn phải lớn hơn 0')
    }

    if (request.requestedSeconds > fallbackConfig.gracePeriodMinutes * 60) {
      warnings.push(`Thời gian yêu cầu vượt quá giới hạn (${fallbackConfig.gracePeriodMinutes} phút)`)
    }

    // Kiểm tra tổng grace time
    const maxTotalGraceTime = fallbackConfig.gracePeriodMinutes * 60 * 2 // Tối đa 2x grace period
    if (session.totalGraceTime + request.requestedSeconds > maxTotalGraceTime) {
      errors.push('Tổng thời gian gia hạn vượt quá giới hạn cho phép')
    }

    // Kiểm tra thời gian disconnect
    const disconnectDuration = request.metadata.reconnectTime.getTime() - request.metadata.disconnectTime.getTime()
    if (disconnectDuration > 30 * 60 * 1000) { // > 30 phút
      errors.push('Thời gian disconnect quá lâu')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Tính toán grace period tối đa được phép
   */
  private static calculateMaxAllowedGracePeriod(
    session: ExamSession,
    fallbackConfig: FallbackConfig
  ): number {
    const baseGracePeriod = fallbackConfig.gracePeriodMinutes * 60
    const remainingGraceQuota = (baseGracePeriod * 2) - session.totalGraceTime
    
    return Math.max(0, Math.min(baseGracePeriod, remainingGraceQuota))
  }

  /**
   * Lên lịch hết hạn grace period request
   */
  private static scheduleGracePeriodExpiry(gracePeriodId: string): void {
    const record = this.records.get(gracePeriodId)
    if (!record) return

    const timeout = setTimeout(async () => {
      const currentRecord = this.records.get(gracePeriodId)
      if (currentRecord && currentRecord.status === 'PENDING') {
        currentRecord.status = 'EXPIRED'
        
        await logExamEvent(currentRecord.sessionId, 'GRACE_PERIOD_ADDED', {
          gracePeriodId,
          action: 'EXPIRED',
          reason: 'No teacher response within time limit'
        })
      }
      
      this.pendingRequests.delete(gracePeriodId)
    }, record.expiryTime.getTime() - Date.now())

    this.pendingRequests.set(gracePeriodId, timeout)
  }

  /**
   * Lấy danh sách grace period records cho session
   */
  static getGracePeriodHistory(sessionId: string): GracePeriodRecord[] {
    return Array.from(this.records.values())
      .filter(record => record.sessionId === sessionId)
      .sort((a, b) => b.requestTime.getTime() - a.requestTime.getTime())
  }

  /**
   * Lấy danh sách pending requests cho teacher
   */
  static getPendingRequests(teacherId?: string): GracePeriodRecord[] {
    return Array.from(this.records.values())
      .filter(record => {
        if (record.status !== 'PENDING') return false
        if (teacherId && record.teacherId && record.teacherId !== teacherId) return false
        return true
      })
      .sort((a, b) => a.requestTime.getTime() - b.requestTime.getTime())
  }

  /**
   * Tính toán thống kê grace period
   */
  static getGracePeriodStats(sessionId?: string): {
    totalRequests: number
    approvedRequests: number
    rejectedRequests: number
    autoApprovedRequests: number
    totalSecondsGranted: number
    averageResponseTime: number // milliseconds
  } {
    const records = sessionId 
      ? Array.from(this.records.values()).filter(r => r.sessionId === sessionId)
      : Array.from(this.records.values())

    const totalRequests = records.length
    const approvedRequests = records.filter(r => r.status === 'APPROVED').length
    const rejectedRequests = records.filter(r => r.status === 'REJECTED').length
    const autoApprovedRequests = records.filter(r => r.status === 'AUTO_APPROVED').length
    
    const totalSecondsGranted = records
      .filter(r => ['APPROVED', 'AUTO_APPROVED'].includes(r.status))
      .reduce((sum, r) => sum + r.approvedSeconds, 0)

    const processedRecords = records.filter(r => r.approvalTime)
    const averageResponseTime = processedRecords.length > 0
      ? processedRecords.reduce((sum, r) => {
          return sum + (r.approvalTime!.getTime() - r.requestTime.getTime())
        }, 0) / processedRecords.length
      : 0

    return {
      totalRequests,
      approvedRequests,
      rejectedRequests,
      autoApprovedRequests,
      totalSecondsGranted,
      averageResponseTime
    }
  }

  /**
   * Dọn dẹp expired records
   */
  static cleanup(): void {
    const now = Date.now()
    const expiredIds: string[] = []

    for (const [id, record] of this.records.entries()) {
      // Xóa records cũ hơn 24 giờ
      if (now - record.requestTime.getTime() > 24 * 60 * 60 * 1000) {
        expiredIds.push(id)
      }
    }

    expiredIds.forEach(id => {
      this.records.delete(id)
      
      // Clear pending timeout nếu có
      const timeout = this.pendingRequests.get(id)
      if (timeout) {
        clearTimeout(timeout)
        this.pendingRequests.delete(id)
      }
    })

    if (expiredIds.length > 0) {
      console.log(`[GRACE_PERIOD] Đã dọn dẹp ${expiredIds.length} records cũ`)
    }
  }
}

/**
 * Utility functions
 */

/**
 * Tạo grace period request từ disconnect event
 */
export const createGracePeriodFromDisconnect = (
  session: ExamSession,
  disconnectTime: Date,
  reconnectTime: Date,
  fallbackConfig: FallbackConfig
): GracePeriodRequest => {
  const disconnectDuration = reconnectTime.getTime() - disconnectTime.getTime()
  const requestedSeconds = Math.min(
    fallbackConfig.gracePeriodMinutes * 60,
    Math.ceil(disconnectDuration / 1000)
  )

  return {
    sessionId: session.id,
    studentId: session.studentId,
    reason: 'DISCONNECT_DETECTED',
    requestedSeconds,
    autoApprove: fallbackConfig.autoApproveGrace,
    metadata: {
      disconnectTime,
      reconnectTime,
      userAgent: navigator.userAgent,
      networkInfo: navigator.onLine ? 'online' : 'offline'
    }
  }
}

/**
 * Format grace period duration
 */
export const formatGracePeriodDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} giây`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 
      ? `${minutes} phút ${remainingSeconds} giây`
      : `${minutes} phút`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours} giờ ${minutes} phút`
  }
}

/**
 * Kiểm tra xem có thể yêu cầu grace period không
 */
export const canRequestGracePeriod = (
  session: ExamSession,
  fallbackConfig: FallbackConfig
): {
  canRequest: boolean
  reason?: string
  maxAllowedSeconds?: number
} => {
  if (!['IN_PROGRESS', 'PAUSED'].includes(session.status)) {
    return {
      canRequest: false,
      reason: 'Session không ở trạng thái phù hợp'
    }
  }

  if (session.disconnectCount >= fallbackConfig.maxReconnects) {
    return {
      canRequest: false,
      reason: 'Đã vượt quá số lần reconnect tối đa'
    }
  }

  const maxTotalGraceTime = fallbackConfig.gracePeriodMinutes * 60 * 2
  if (session.totalGraceTime >= maxTotalGraceTime) {
    return {
      canRequest: false,
      reason: 'Đã sử dụng hết quota grace time'
    }
  }

  const maxAllowedSeconds = Math.min(
    fallbackConfig.gracePeriodMinutes * 60,
    maxTotalGraceTime - session.totalGraceTime
  )

  return {
    canRequest: true,
    maxAllowedSeconds
  }
}

export default GracePeriodManager
