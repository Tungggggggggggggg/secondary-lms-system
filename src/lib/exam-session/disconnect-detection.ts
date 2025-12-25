/**
 * Disconnect Detection System
 * Phát hiện và xử lý các trường hợp disconnect của học sinh trong quá trình thi
 */

import { ExamSession, FallbackConfig } from '@/types/exam-system'
import { logExamEvent } from './session-manager'
import { GracePeriodManager, createGracePeriodFromDisconnect } from './grace-period'
import { personalTimerManager } from './personal-timer'
import { autoSaveManager } from './auto-save'

/**
 * Interface cho Disconnect Event
 */
export interface DisconnectEvent {
  sessionId: string
  studentId: string
  disconnectTime: Date
  reconnectTime?: Date
  disconnectType: DisconnectType
  duration?: number // milliseconds
  metadata: {
    userAgent: string
    networkStatus: 'online' | 'offline' | 'unknown'
    pageVisibility: 'visible' | 'hidden'
    connectionType?: string
    effectiveType?: string
    downlink?: number
    rtt?: number
  }
}

/**
 * Loại disconnect
 */
export type DisconnectType = 
  | 'NETWORK_OFFLINE'
  | 'PAGE_HIDDEN'
  | 'WINDOW_BLUR'
  | 'BROWSER_CLOSE'
  | 'TAB_SWITCH'
  | 'SYSTEM_SLEEP'
  | 'CONNECTION_LOST'
  | 'UNKNOWN'

/**
 * Disconnect Detection Manager
 */
export class DisconnectDetectionManager {
  private static activeDetectors: Map<string, DisconnectDetector> = new Map()
  private static globalListeners: Set<() => void> = new Set()

  /**
   * Bắt đầu detect disconnect cho session
   */
  static startDetection(
    session: ExamSession,
    fallbackConfig: FallbackConfig,
    callbacks: {
      onDisconnect?: (event: DisconnectEvent) => void
      onReconnect?: (event: DisconnectEvent) => void
      onSuspiciousActivity?: (activity: string) => void
    } = {}
  ): void {
    // Dừng detection cũ nếu có
    this.stopDetection(session.id)

    console.log(`[DISCONNECT] Bắt đầu detect disconnect cho session ${session.id}`)

    // Tạo detector mới
    const detector = new DisconnectDetector(session, fallbackConfig, callbacks)
    this.activeDetectors.set(session.id, detector)

    // Bắt đầu monitoring
    detector.start()
  }

  /**
   * Dừng detect disconnect
   */
  static stopDetection(sessionId: string): void {
    const detector = this.activeDetectors.get(sessionId)
    if (detector) {
      detector.stop()
      this.activeDetectors.delete(sessionId)
      console.log(`[DISCONNECT] Dừng detect disconnect cho session ${sessionId}`)
    }
  }

  /**
   * Lấy trạng thái connection hiện tại
   */
  static getConnectionStatus(sessionId: string): {
    isConnected: boolean
    lastDisconnectTime?: Date
    disconnectCount: number
    totalDisconnectDuration: number
  } {
    const detector = this.activeDetectors.get(sessionId)
    if (!detector) {
      return {
        isConnected: false,
        disconnectCount: 0,
        totalDisconnectDuration: 0
      }
    }

    return detector.getStatus()
  }

  /**
   * Dọn dẹp tất cả detectors
   */
  static cleanup(): void {
    for (const detector of this.activeDetectors.values()) {
      detector.stop()
    }
    this.activeDetectors.clear()

    // Clear global listeners
    this.globalListeners.forEach(cleanup => cleanup())
    this.globalListeners.clear()

    console.log('[DISCONNECT] Đã dọn dẹp tất cả disconnect detectors')
  }
}

/**
 * Disconnect Detector Class
 */
class DisconnectDetector {
  private session: ExamSession
  private fallbackConfig: FallbackConfig
  private callbacks: {
    onDisconnect?: (event: DisconnectEvent) => void
    onReconnect?: (event: DisconnectEvent) => void
    onSuspiciousActivity?: (activity: string) => void
  }

  // State tracking
  private isConnected: boolean = true
  private lastDisconnectTime?: Date
  private disconnectCount: number = 0
  private totalDisconnectDuration: number = 0
  private currentDisconnectEvent?: DisconnectEvent

  // Event listeners cleanup functions
  private cleanupFunctions: (() => void)[] = []

  // Heartbeat mechanism
  private heartbeatInterval?: NodeJS.Timeout
  private lastHeartbeat: Date = new Date()
  private readonly HEARTBEAT_INTERVAL = 5000 // 5 seconds
  private readonly HEARTBEAT_TIMEOUT = 15000 // 15 seconds

  constructor(
    session: ExamSession,
    fallbackConfig: FallbackConfig,
    callbacks: {
      onDisconnect?: (event: DisconnectEvent) => void
      onReconnect?: (event: DisconnectEvent) => void
      onSuspiciousActivity?: (activity: string) => void
    }
  ) {
    this.session = session
    this.fallbackConfig = fallbackConfig
    this.callbacks = callbacks
    this.disconnectCount = session.disconnectCount
  }

  /**
   * Bắt đầu monitoring
   */
  start(): void {
    this.setupNetworkDetection()
    this.setupVisibilityDetection()
    this.setupFocusDetection()
    this.setupBeforeUnloadDetection()
    this.setupHeartbeat()
    this.setupConnectionMonitoring()
  }

  /**
   * Dừng monitoring
   */
  stop(): void {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Cleanup all event listeners
    this.cleanupFunctions.forEach(cleanup => cleanup())
    this.cleanupFunctions = []
  }

  /**
   * Lấy trạng thái hiện tại
   */
  getStatus(): {
    isConnected: boolean
    lastDisconnectTime?: Date
    disconnectCount: number
    totalDisconnectDuration: number
  } {
    return {
      isConnected: this.isConnected,
      lastDisconnectTime: this.lastDisconnectTime,
      disconnectCount: this.disconnectCount,
      totalDisconnectDuration: this.totalDisconnectDuration
    }
  }

  /**
   * Setup network connection detection
   */
  private setupNetworkDetection(): void {
    const handleOnline = () => {
      if (!this.isConnected) {
        this.handleReconnect('NETWORK_OFFLINE')
      }
    }

    const handleOffline = () => {
      if (this.isConnected) {
        this.handleDisconnect('NETWORK_OFFLINE')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    this.cleanupFunctions.push(() => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })

    // Initial check
    if (!navigator.onLine && this.isConnected) {
      this.handleDisconnect('NETWORK_OFFLINE')
    }
  }

  /**
   * Setup page visibility detection
   */
  private setupVisibilityDetection(): void {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (this.isConnected) {
          this.handleDisconnect('PAGE_HIDDEN')
        }
      } else {
        if (!this.isConnected && this.currentDisconnectEvent?.disconnectType === 'PAGE_HIDDEN') {
          this.handleReconnect('PAGE_HIDDEN')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    this.cleanupFunctions.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
  }

  /**
   * Setup window focus detection
   */
  private setupFocusDetection(): void {
    const handleBlur = () => {
      if (this.isConnected) {
        this.handleDisconnect('WINDOW_BLUR')
      }
    }

    const handleFocus = () => {
      if (!this.isConnected && this.currentDisconnectEvent?.disconnectType === 'WINDOW_BLUR') {
        this.handleReconnect('WINDOW_BLUR')
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    this.cleanupFunctions.push(() => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    })
  }

  /**
   * Setup beforeunload detection
   */
  private setupBeforeUnloadDetection(): void {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Log potential browser close
      this.handleDisconnect('BROWSER_CLOSE')
      
      // Show warning message
      const message = 'Bạn có chắc chắn muốn rời khỏi trang? Bài thi của bạn có thể bị mất.'
      e.preventDefault()
      e.returnValue = message
      return message
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    this.cleanupFunctions.push(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    })
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat()
    }, this.HEARTBEAT_INTERVAL)

    // Check for missed heartbeats
    setInterval(() => {
      const now = new Date()
      const timeSinceLastHeartbeat = now.getTime() - this.lastHeartbeat.getTime()
      
      if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT && this.isConnected) {
        this.handleDisconnect('CONNECTION_LOST')
      }
    }, this.HEARTBEAT_TIMEOUT / 2)
  }

  /**
   * Setup connection quality monitoring
   */
  private setupConnectionMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      const handleConnectionChange = () => {
        const effectiveType = connection.effectiveType
        const downlink = connection.downlink
        
        // Detect poor connection
        if (effectiveType === 'slow-2g' || downlink < 0.5) {
          this.callbacks.onSuspiciousActivity?.('Poor network connection detected')
        }
      }

      connection.addEventListener('change', handleConnectionChange)

      this.cleanupFunctions.push(() => {
        connection.removeEventListener('change', handleConnectionChange)
      })
    }
  }

  /**
   * Send heartbeat to server
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      // TODO: Implement actual server heartbeat
      // Tạm thời simulate với setTimeout
      await new Promise(resolve => setTimeout(resolve, 100))
      
      this.lastHeartbeat = new Date()
      
      // If we were disconnected and heartbeat succeeds, reconnect
      if (!this.isConnected && this.currentDisconnectEvent?.disconnectType === 'CONNECTION_LOST') {
        this.handleReconnect('CONNECTION_LOST')
      }
      
    } catch (error) {
      console.error('[DISCONNECT] Heartbeat failed:', error)
      
      if (this.isConnected) {
        this.handleDisconnect('CONNECTION_LOST')
      }
    }
  }

  /**
   * Handle disconnect event
   */
  private async handleDisconnect(type: DisconnectType): Promise<void> {
    if (!this.isConnected) return // Already disconnected

    const now = new Date()
    this.isConnected = false
    this.lastDisconnectTime = now
    this.disconnectCount++

    // Create disconnect event
    const disconnectEvent: DisconnectEvent = {
      sessionId: this.session.id,
      studentId: this.session.studentId,
      disconnectTime: now,
      disconnectType: type,
      metadata: this.getConnectionMetadata()
    }

    this.currentDisconnectEvent = disconnectEvent

    console.log(`[DISCONNECT] Phát hiện disconnect: ${type} cho session ${this.session.id}`)

    // Pause timer
    personalTimerManager.pauseTimer(this.session.id)

    // Trigger auto-save
    await autoSaveManager.saveNow(this.session.id, this.session)

    // Log event
    await logExamEvent(this.session.id, 'SESSION_PAUSED', {
      disconnectType: type,
      disconnectTime: now.toISOString(),
      disconnectCount: this.disconnectCount,
      metadata: disconnectEvent.metadata
    }, 'WARNING')

    // Callback
    this.callbacks.onDisconnect?.(disconnectEvent)

    // Check for suspicious activity
    this.checkSuspiciousActivity(type)
  }

  /**
   * Handle reconnect event
   */
  private async handleReconnect(type: DisconnectType): Promise<void> {
    if (this.isConnected || !this.currentDisconnectEvent) return // Already connected

    const now = new Date()
    const disconnectDuration = now.getTime() - this.currentDisconnectEvent.disconnectTime.getTime()
    
    this.isConnected = true
    this.totalDisconnectDuration += disconnectDuration

    // Update disconnect event
    this.currentDisconnectEvent.reconnectTime = now
    this.currentDisconnectEvent.duration = disconnectDuration

    console.log(`[DISCONNECT] Phát hiện reconnect: ${type} cho session ${this.session.id}, duration: ${disconnectDuration}ms`)

    // Log event
    await logExamEvent(this.session.id, 'SESSION_RESUMED', {
      reconnectTime: now.toISOString(),
      disconnectDuration,
      totalDisconnectDuration: this.totalDisconnectDuration,
      disconnectType: type
    })

    // Request grace period if needed
    if (disconnectDuration > 5000) { // > 5 seconds
      const gracePeriodRequest = createGracePeriodFromDisconnect(
        this.session,
        this.currentDisconnectEvent.disconnectTime,
        now,
        this.fallbackConfig
      )

      const result = await GracePeriodManager.requestGracePeriod(
        this.session,
        gracePeriodRequest,
        this.fallbackConfig
      )

      if (result.success && result.approvedSeconds) {
        // Resume timer with grace time
        personalTimerManager.resumeTimer(this.session.id, result.approvedSeconds)
      } else {
        // Resume timer without grace time
        personalTimerManager.resumeTimer(this.session.id)
      }
    } else {
      // Short disconnect, resume without grace time
      personalTimerManager.resumeTimer(this.session.id)
    }

    // Callback
    this.callbacks.onReconnect?.(this.currentDisconnectEvent)

    // Clear current disconnect event
    this.currentDisconnectEvent = undefined
  }

  /**
   * Get connection metadata
   */
  private getConnectionMetadata(): DisconnectEvent['metadata'] {
    const connection = (navigator as any).connection

    return {
      userAgent: navigator.userAgent,
      networkStatus: navigator.onLine ? 'online' : 'offline',
      pageVisibility: document.hidden ? 'hidden' : 'visible',
      connectionType: connection?.type,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private checkSuspiciousActivity(type: DisconnectType): void {
    // Too many disconnects
    if (this.disconnectCount > this.fallbackConfig.maxReconnects) {
      this.callbacks.onSuspiciousActivity?.(`Quá nhiều lần disconnect: ${this.disconnectCount}`)
    }

    // Frequent tab switching
    if (type === 'PAGE_HIDDEN' || type === 'WINDOW_BLUR') {
      const recentDisconnects = this.getRecentDisconnectCount(60000) // Last 1 minute
      if (recentDisconnects > 3) {
        this.callbacks.onSuspiciousActivity?.('Chuyển tab/window quá thường xuyên')
      }
    }

    // Long disconnect duration
    if (this.currentDisconnectEvent) {
      const duration = Date.now() - this.currentDisconnectEvent.disconnectTime.getTime()
      if (duration > 5 * 60 * 1000) { // > 5 minutes
        this.callbacks.onSuspiciousActivity?.('Disconnect quá lâu')
      }
    }
  }

  /**
   * Get recent disconnect count
   */
  private getRecentDisconnectCount(timeWindowMs: number): number {
    // TODO: Implement actual tracking of recent disconnects
    // Tạm thời return 0
    return 0
  }
}

/**
 * Utility functions
 */

/**
 * Format disconnect duration
 */
export const formatDisconnectDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Get disconnect type description
 */
export const getDisconnectTypeDescription = (type: DisconnectType): string => {
  const descriptions = {
    NETWORK_OFFLINE: 'Mất kết nối mạng',
    PAGE_HIDDEN: 'Chuyển tab/ẩn trang',
    WINDOW_BLUR: 'Chuyển cửa sổ',
    BROWSER_CLOSE: 'Đóng trình duyệt',
    TAB_SWITCH: 'Chuyển tab',
    SYSTEM_SLEEP: 'Máy tính ngủ',
    CONNECTION_LOST: 'Mất kết nối server',
    UNKNOWN: 'Không xác định'
  }

  return descriptions[type] || 'Không xác định'
}

/**
 * Check if disconnect type is suspicious
 */
export const isSuspiciousDisconnect = (type: DisconnectType, duration: number): boolean => {
  // Very short disconnects might be intentional tab switching
  if (duration < 1000 && (type === 'PAGE_HIDDEN' || type === 'WINDOW_BLUR')) {
    return true
  }

  // Browser close during exam is suspicious
  if (type === 'BROWSER_CLOSE') {
    return true
  }

  // Very long disconnects are suspicious
  if (duration > 10 * 60 * 1000) { // > 10 minutes
    return true
  }

  return false
}

/**
 * Calculate disconnect severity score
 */
export const calculateDisconnectSeverity = (
  disconnectCount: number,
  totalDuration: number,
  suspiciousEvents: number
): number => {
  let score = 0

  // Disconnect count penalty
  score += disconnectCount * 10

  // Duration penalty (per minute)
  score += Math.floor(totalDuration / (60 * 1000)) * 2

  // Suspicious events penalty
  score += suspiciousEvents * 20

  return Math.min(score, 100) // Cap at 100
}

export default DisconnectDetectionManager
