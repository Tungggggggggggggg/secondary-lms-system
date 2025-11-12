/**
 * Performance Monitoring cho Smart Assignment Builder
 * Theo dõi hiệu suất và user experience
 */

import { BuilderMetrics, UserAction } from '@/types/assignment-builder'

class AssignmentBuilderPerformance {
  private metrics: BuilderMetrics
  private startTime: number

  constructor() {
    this.startTime = Date.now()
    this.metrics = {
      startTime: this.startTime,
      stepsCompleted: [],
      errorsEncountered: [],
      timeSpentPerStep: {},
      userActions: []
    }
  }

  /**
   * Bắt đầu theo dõi một step
   */
  startStep(stepName: string): void {
    try {
      this.metrics.timeSpentPerStep[stepName] = Date.now()
      this.logUserAction('step_start', 'navigation', { step: stepName })
    } catch (error) {
      console.error('[AssignmentBuilderPerformance] Error starting step:', error)
    }
  }

  /**
   * Kết thúc theo dõi một step
   */
  completeStep(stepName: string): void {
    try {
      const startTime = this.metrics.timeSpentPerStep[stepName]
      if (startTime) {
        this.metrics.timeSpentPerStep[stepName] = Date.now() - startTime
        this.metrics.stepsCompleted.push(stepName)
        this.logUserAction('step_complete', 'navigation', { 
          step: stepName, 
          duration: this.metrics.timeSpentPerStep[stepName] 
        })
      }
    } catch (error) {
      console.error('[AssignmentBuilderPerformance] Error completing step:', error)
    }
  }

  /**
   * Log user action
   */
  logUserAction(action: string, component: string, data?: any): void {
    try {
      const userAction: UserAction = {
        timestamp: Date.now(),
        action,
        component,
        data
      }
      
      this.metrics.userActions.push(userAction)

      // Giới hạn số lượng actions để tránh memory leak
      if (this.metrics.userActions.length > 1000) {
        this.metrics.userActions = this.metrics.userActions.slice(-500)
      }
    } catch (error) {
      console.error('[AssignmentBuilderPerformance] Error logging user action:', error)
    }
  }

  /**
   * Log error
   */
  logError(error: string, context?: any): void {
    try {
      this.metrics.errorsEncountered.push(`${error} - ${JSON.stringify(context)} - ${Date.now()}`)
      
      this.logUserAction('error_encountered', 'system', { error, context })
    } catch (err) {
      console.error('[AssignmentBuilderPerformance] Error logging error:', err)
    }
  }

  /**
   * Kết thúc session và gửi metrics
   */
  async endSession(): Promise<void> {
    try {
      this.metrics.endTime = Date.now()
      
      // Tính toán thống kê
      const sessionDuration = this.metrics.endTime - this.metrics.startTime
      const totalSteps = this.metrics.stepsCompleted.length
      const totalErrors = this.metrics.errorsEncountered.length
      const totalActions = this.metrics.userActions.length

      const summary = {
        sessionDuration,
        totalSteps,
        totalErrors,
        totalActions,
        averageTimePerStep: totalSteps > 0 ? sessionDuration / totalSteps : 0,
        errorRate: totalActions > 0 ? totalErrors / totalActions : 0
      }

      // Log summary
      console.log('[AssignmentBuilderPerformance] Session Summary:', summary)

      // Gửi metrics lên server (nếu cần)
      if (process.env.NODE_ENV === 'production') {
        await this.sendMetricsToServer({
          ...this.metrics,
          summary
        })
      }
    } catch (error) {
      console.error('[AssignmentBuilderPerformance] Error ending session:', error)
    }
  }

  /**
   * Gửi metrics lên server
   */
  private async sendMetricsToServer(data: any): Promise<void> {
    try {
      await fetch('/api/analytics/assignment-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
    } catch (error) {
      console.error('[AssignmentBuilderPerformance] Error sending metrics:', error)
    }
  }

  /**
   * Lấy metrics hiện tại
   */
  getMetrics(): BuilderMetrics {
    return { ...this.metrics }
  }

  /**
   * Lấy thống kê performance
   */
  getPerformanceStats() {
    const currentTime = Date.now()
    const sessionDuration = currentTime - this.startTime
    const completedSteps = this.metrics.stepsCompleted.length
    const totalErrors = this.metrics.errorsEncountered.length
    const totalActions = this.metrics.userActions.length

    return {
      sessionDuration,
      completedSteps,
      totalErrors,
      totalActions,
      averageTimePerStep: completedSteps > 0 ? sessionDuration / completedSteps : 0,
      errorRate: totalActions > 0 ? totalErrors / totalActions : 0,
      isPerformant: sessionDuration < 300000 && totalErrors < 5, // < 5 phút và < 5 lỗi
      userEngagement: this.calculateUserEngagement()
    }
  }

  /**
   * Tính toán mức độ tương tác của user
   */
  private calculateUserEngagement(): 'low' | 'medium' | 'high' {
    const actions = this.metrics.userActions.length
    const sessionDuration = Date.now() - this.startTime
    const actionsPerMinute = actions / (sessionDuration / 60000)

    if (actionsPerMinute > 10) return 'high'
    if (actionsPerMinute > 5) return 'medium'
    return 'low'
  }
}

// Singleton instance
let performanceInstance: AssignmentBuilderPerformance | null = null

/**
 * Lấy instance của performance monitor
 */
export const getPerformanceMonitor = (): AssignmentBuilderPerformance => {
  if (!performanceInstance) {
    performanceInstance = new AssignmentBuilderPerformance()
  }
  return performanceInstance
}

/**
 * Reset performance monitor (dùng khi bắt đầu session mới)
 */
export const resetPerformanceMonitor = (): AssignmentBuilderPerformance => {
  performanceInstance = new AssignmentBuilderPerformance()
  return performanceInstance
}

/**
 * Hook để sử dụng performance monitoring trong React components
 */
export const useAssignmentBuilderPerformance = () => {
  const monitor = getPerformanceMonitor()

  return {
    startStep: (stepName: string) => monitor.startStep(stepName),
    completeStep: (stepName: string) => monitor.completeStep(stepName),
    logAction: (action: string, component: string, data?: any) => 
      monitor.logUserAction(action, component, data),
    logError: (error: string, context?: any) => monitor.logError(error, context),
    endSession: () => monitor.endSession(),
    getStats: () => monitor.getPerformanceStats()
  }
}

/**
 * Decorator để tự động track performance của functions
 */
export const trackPerformance = (
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) => {
  const method = descriptor.value

  descriptor.value = function (...args: any[]) {
    const monitor = getPerformanceMonitor()
    const startTime = Date.now()
    
    try {
      monitor.logUserAction('function_call', propertyName, { args })
      const result = method.apply(this, args)
      
      // Nếu là Promise, track async
      if (result && typeof result.then === 'function') {
        return result
          .then((res: any) => {
            monitor.logUserAction('function_success', propertyName, {
              duration: Date.now() - startTime
            })
            return res
          })
          .catch((error: any) => {
            monitor.logError(`Function ${propertyName} failed`, { error, args })
            throw error
          })
      }
      
      // Sync function
      monitor.logUserAction('function_success', propertyName, {
        duration: Date.now() - startTime
      })
      return result
    } catch (error) {
      monitor.logError(`Function ${propertyName} failed`, { error, args })
      throw error
    }
  }

  return descriptor
}

/**
 * Utility để measure performance của một block code
 */
export const measurePerformance = async <T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> => {
  const monitor = getPerformanceMonitor()
  const startTime = Date.now()
  
  try {
    monitor.logUserAction('measure_start', name)
    const result = await fn()
    monitor.logUserAction('measure_success', name, {
      duration: Date.now() - startTime
    })
    return result
  } catch (error) {
    monitor.logError(`Measurement ${name} failed`, { error })
    throw error
  }
}

/**
 * Thống kê performance cho admin dashboard
 */
export const getPerformanceReport = () => {
  const monitor = getPerformanceMonitor()
  const stats = monitor.getPerformanceStats()
  const metrics = monitor.getMetrics()

  return {
    overview: stats,
    stepBreakdown: Object.entries(metrics.timeSpentPerStep).map(([step, time]) => ({
      step,
      timeSpent: time,
      percentage: (time / stats.sessionDuration) * 100
    })),
    errorAnalysis: metrics.errorsEncountered.map((error, index) => ({
      id: index,
      errorString: error,
      timeFromStart: 'N/A' // Since errors are now strings, we can't extract timestamp
    })),
    userBehavior: {
      totalActions: metrics.userActions.length,
      actionTypes: metrics.userActions.reduce((acc, action) => {
        acc[action.action] = (acc[action.action] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      engagement: stats.userEngagement
    },
    recommendations: generatePerformanceRecommendations(stats, metrics)
  }
}

/**
 * Tạo recommendations dựa trên performance data
 */
const generatePerformanceRecommendations = (
  stats: any,
  metrics: BuilderMetrics
): string[] => {
  const recommendations: string[] = []

  if (stats.sessionDuration > 600000) { // > 10 phút
    recommendations.push('Session quá dài - cần tối ưu UX để giảm thời gian tạo bài tập')
  }

  if (stats.errorRate > 0.1) { // > 10% error rate
    recommendations.push('Tỷ lệ lỗi cao - cần cải thiện validation và error handling')
  }

  if (stats.averageTimePerStep > 120000) { // > 2 phút/step
    recommendations.push('Thời gian mỗi bước quá lâu - cần đơn giản hóa UI')
  }

  if (stats.userEngagement === 'low') {
    recommendations.push('User engagement thấp - cần thêm interactive elements')
  }

  const quizBuilderActions = metrics.userActions.filter(a => 
    a.component.includes('QuizBuilder')
  ).length
  
  if (quizBuilderActions > 50) {
    recommendations.push('User thao tác quá nhiều với Quiz Builder - cần cải thiện bulk operations')
  }

  return recommendations
}
