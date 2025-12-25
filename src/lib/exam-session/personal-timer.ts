/**
 * Personal Timer System
 * Quản lý timer cá nhân cho từng học sinh trong phiên thi
 */

import { ExamSession } from '@/types/exam-system'

/**
 * Interface cho Personal Timer
 */
export interface PersonalTimer {
  sessionId: string
  studentId: string
  startTime: Date
  durationSeconds: number
  timeRemaining: number
  isRunning: boolean
  isPaused: boolean
  pausedTime: number // Tổng thời gian đã pause
  lastUpdateTime: Date
  callbacks: {
    onTick?: (timeRemaining: number) => void
    onWarning?: (timeRemaining: number) => void
    onExpired?: () => void
    onPaused?: () => void
    onResumed?: () => void
  }
}

/**
 * Timer Manager - quản lý tất cả timer đang chạy
 */
class PersonalTimerManager {
  private timers: Map<string, PersonalTimer> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private readonly TICK_INTERVAL = 1000 // 1 giây

  /**
   * Tạo timer mới cho học sinh
   */
  createTimer(
    sessionId: string,
    studentId: string,
    durationMinutes: number,
    callbacks?: PersonalTimer['callbacks']
  ): PersonalTimer {
    const now = new Date()
    const durationSeconds = durationMinutes * 60

    const timer: PersonalTimer = {
      sessionId,
      studentId,
      startTime: now,
      durationSeconds,
      timeRemaining: durationSeconds,
      isRunning: false,
      isPaused: false,
      pausedTime: 0,
      lastUpdateTime: now,
      callbacks: callbacks || {}
    }

    this.timers.set(sessionId, timer)
    
    console.log(`[TIMER] Tạo timer cho session ${sessionId}: ${durationMinutes} phút`)
    
    return timer
  }

  /**
   * Bắt đầu timer
   */
  startTimer(sessionId: string): boolean {
    const timer = this.timers.get(sessionId)
    if (!timer) {
      console.error(`[TIMER] Không tìm thấy timer cho session ${sessionId}`)
      return false
    }

    if (timer.isRunning) {
      console.warn(`[TIMER] Timer ${sessionId} đã đang chạy`)
      return true
    }

    timer.isRunning = true
    timer.isPaused = false
    timer.lastUpdateTime = new Date()

    // Tạo interval để update timer
    const interval = setInterval(() => {
      this.updateTimer(sessionId)
    }, this.TICK_INTERVAL)

    this.intervals.set(sessionId, interval)
    
    console.log(`[TIMER] Bắt đầu timer ${sessionId}`)
    
    return true
  }

  /**
   * Tạm dừng timer
   */
  pauseTimer(sessionId: string): boolean {
    const timer = this.timers.get(sessionId)
    if (!timer) return false

    if (!timer.isRunning || timer.isPaused) {
      return true
    }

    // Cập nhật thời gian trước khi pause
    this.updateTimer(sessionId)
    
    timer.isPaused = true
    timer.isRunning = false

    // Dừng interval
    const interval = this.intervals.get(sessionId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(sessionId)
    }

    // Gọi callback
    timer.callbacks.onPaused?.()
    
    console.log(`[TIMER] Tạm dừng timer ${sessionId}, thời gian còn lại: ${timer.timeRemaining}s`)
    
    return true
  }

  /**
   * Tiếp tục timer sau khi pause
   */
  resumeTimer(sessionId: string, graceTimeSeconds: number = 0): boolean {
    const timer = this.timers.get(sessionId)
    if (!timer) return false

    if (timer.isRunning) {
      return true
    }

    // Thêm grace time
    if (graceTimeSeconds > 0) {
      timer.timeRemaining += graceTimeSeconds
      console.log(`[TIMER] Thêm ${graceTimeSeconds}s grace time cho timer ${sessionId}`)
    }

    timer.isRunning = true
    timer.isPaused = false
    timer.lastUpdateTime = new Date()

    // Tạo lại interval
    const interval = setInterval(() => {
      this.updateTimer(sessionId)
    }, this.TICK_INTERVAL)

    this.intervals.set(sessionId, interval)

    // Gọi callback
    timer.callbacks.onResumed?.()
    
    console.log(`[TIMER] Tiếp tục timer ${sessionId}`)
    
    return true
  }

  /**
   * Dừng timer hoàn toàn
   */
  stopTimer(sessionId: string): boolean {
    const timer = this.timers.get(sessionId)
    if (!timer) return false

    timer.isRunning = false
    timer.isPaused = false

    // Dừng interval
    const interval = this.intervals.get(sessionId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(sessionId)
    }

    console.log(`[TIMER] Dừng timer ${sessionId}`)
    
    return true
  }

  /**
   * Xóa timer
   */
  removeTimer(sessionId: string): boolean {
    this.stopTimer(sessionId)
    const removed = this.timers.delete(sessionId)
    
    if (removed) {
      console.log(`[TIMER] Xóa timer ${sessionId}`)
    }
    
    return removed
  }

  /**
   * Cập nhật timer (được gọi mỗi giây)
   */
  private updateTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId)
    if (!timer || !timer.isRunning || timer.isPaused) {
      return
    }

    const now = new Date()
    const elapsedSeconds = Math.floor((now.getTime() - timer.lastUpdateTime.getTime()) / 1000)
    
    // Cập nhật thời gian còn lại
    timer.timeRemaining = Math.max(0, timer.timeRemaining - elapsedSeconds)
    timer.lastUpdateTime = now

    // Gọi callback tick
    timer.callbacks.onTick?.(timer.timeRemaining)

    // Kiểm tra cảnh báo thời gian
    this.checkWarnings(timer)

    // Kiểm tra hết thời gian
    if (timer.timeRemaining <= 0) {
      this.handleTimerExpired(sessionId)
    }
  }

  /**
   * Kiểm tra và gửi cảnh báo thời gian
   */
  private checkWarnings(timer: PersonalTimer): void {
    const remaining = timer.timeRemaining
    
    // Cảnh báo ở 5 phút, 1 phút, 30 giây, 10 giây
    const warningTimes = [300, 60, 30, 10] // seconds
    
    for (const warningTime of warningTimes) {
      if (remaining === warningTime) {
        timer.callbacks.onWarning?.(remaining)
        console.log(`[TIMER] Cảnh báo: Timer ${timer.sessionId} còn ${remaining}s`)
        break
      }
    }
  }

  /**
   * Xử lý khi timer hết thời gian
   */
  private handleTimerExpired(sessionId: string): void {
    const timer = this.timers.get(sessionId)
    if (!timer) return

    console.log(`[TIMER] Timer ${sessionId} đã hết thời gian`)

    // Dừng timer
    this.stopTimer(sessionId)

    // Gọi callback expired
    timer.callbacks.onExpired?.()
  }

  /**
   * Lấy thông tin timer
   */
  getTimer(sessionId: string): PersonalTimer | undefined {
    return this.timers.get(sessionId)
  }

  /**
   * Lấy thời gian còn lại (seconds)
   */
  getTimeRemaining(sessionId: string): number {
    const timer = this.timers.get(sessionId)
    return timer?.timeRemaining || 0
  }

  /**
   * Kiểm tra timer có đang chạy không
   */
  isTimerRunning(sessionId: string): boolean {
    const timer = this.timers.get(sessionId)
    return timer?.isRunning || false
  }

  /**
   * Thêm thời gian cho timer (grace period)
   */
  addTime(sessionId: string, additionalSeconds: number): boolean {
    const timer = this.timers.get(sessionId)
    if (!timer) return false

    timer.timeRemaining += additionalSeconds
    
    console.log(`[TIMER] Thêm ${additionalSeconds}s cho timer ${sessionId}, còn lại: ${timer.timeRemaining}s`)
    
    return true
  }

  /**
   * Lấy thống kê timer
   */
  getTimerStats(sessionId: string): {
    totalDuration: number
    timeElapsed: number
    timeRemaining: number
    pausedTime: number
    progressPercent: number
  } | null {
    const timer = this.timers.get(sessionId)
    if (!timer) return null

    const timeElapsed = timer.durationSeconds - timer.timeRemaining
    const progressPercent = Math.round((timeElapsed / timer.durationSeconds) * 100)

    return {
      totalDuration: timer.durationSeconds,
      timeElapsed,
      timeRemaining: timer.timeRemaining,
      pausedTime: timer.pausedTime,
      progressPercent
    }
  }

  /**
   * Lấy danh sách tất cả timer đang hoạt động
   */
  getActiveTimers(): PersonalTimer[] {
    return Array.from(this.timers.values()).filter(timer => timer.isRunning)
  }

  /**
   * Dọn dẹp tất cả timer
   */
  cleanup(): void {
    // Dừng tất cả interval
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    
    this.intervals.clear()
    this.timers.clear()
    
    console.log('[TIMER] Đã dọn dẹp tất cả timer')
  }
}

// Singleton instance
export const personalTimerManager = new PersonalTimerManager()

/**
 * Utility functions để format thời gian
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

export const formatTimeVerbose = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours} giờ`)
  if (minutes > 0) parts.push(`${minutes} phút`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs} giây`)

  return parts.join(' ')
}

/**
 * Hook để sử dụng personal timer trong React component
 */
export const usePersonalTimer = (sessionId: string) => {
  const timer = personalTimerManager.getTimer(sessionId)
  
  return {
    timer,
    timeRemaining: timer?.timeRemaining || 0,
    isRunning: timer?.isRunning || false,
    isPaused: timer?.isPaused || false,
    formattedTime: formatTime(timer?.timeRemaining || 0),
    stats: personalTimerManager.getTimerStats(sessionId),
    
    // Actions
    start: () => personalTimerManager.startTimer(sessionId),
    pause: () => personalTimerManager.pauseTimer(sessionId),
    resume: (graceTime?: number) => personalTimerManager.resumeTimer(sessionId, graceTime),
    stop: () => personalTimerManager.stopTimer(sessionId),
    addTime: (seconds: number) => personalTimerManager.addTime(sessionId, seconds)
  }
}

/**
 * Tạo timer từ exam session
 */
export const createTimerFromSession = (
  session: ExamSession,
  callbacks?: PersonalTimer['callbacks']
): PersonalTimer | null => {
  // Chỉ tạo timer cho PERSONAL timer type
  if (!session.timeRemaining || session.timeRemaining <= 0) {
    return null
  }

  const durationMinutes = Math.ceil(session.timeRemaining / 60)
  
  return personalTimerManager.createTimer(
    session.id,
    session.studentId,
    durationMinutes,
    callbacks
  )
}

/**
 * Sync timer với exam session
 */
export const syncTimerWithSession = (
  sessionId: string,
  session: ExamSession
): boolean => {
  const timer = personalTimerManager.getTimer(sessionId)
  if (!timer) return false

  // Cập nhật thời gian còn lại từ session
  timer.timeRemaining = session.timeRemaining
  
  return true
}
