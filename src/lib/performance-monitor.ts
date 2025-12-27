/**
 * Performance Monitoring Utility
 * Theo dõi và báo cáo hiệu suất API endpoints
 */

interface PerformanceMetric {
  endpoint: string
  method: string
  duration: number
  timestamp: Date
  userId?: string
  success: boolean
  statusCode?: number
  error?: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private readonly MAX_METRICS = 1000 // Giữ tối đa 1000 metrics

  /**
   * Ghi lại metric performance
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Giữ chỉ MAX_METRICS records gần nhất
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }

    // Log slow queries (>500ms)
    if (metric.duration > 500) {
      console.warn(`[SLOW_API] ${metric.method} ${metric.endpoint} took ${metric.duration}ms`)
    }

    // Log very slow queries (>1000ms)
    if (metric.duration > 1000) {
      console.error(`[VERY_SLOW_API] ${metric.method} ${metric.endpoint} took ${metric.duration}ms`, {
        userId: metric.userId,
        error: metric.error
      })
    }
  }

  /**
   * Lấy thống kê performance
   */
  getStats(timeRangeMinutes = 60) {
    const cutoff = new Date(Date.now() - timeRangeMinutes * 60 * 1000)
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff)

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        topSlowEndpoints: []
      }
    }

    const totalRequests = recentMetrics.length
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
    const slowRequests = recentMetrics.filter(m => m.duration > 500).length
    const errors = recentMetrics.filter(m => !m.success).length
    const errorRate = (errors / totalRequests) * 100

    const sortedDurations = [...recentMetrics.map(m => m.duration)].sort((a, b) => a - b)

    const percentile = (values: number[], p: number): number => {
      if (values.length === 0) return 0
      const idx = Math.min(values.length - 1, Math.max(0, Math.floor(p * (values.length - 1))))
      return values[idx]
    }

    const p50 = percentile(sortedDurations, 0.5)
    const p95 = percentile(sortedDurations, 0.95)
    const p99 = percentile(sortedDurations, 0.99)

    // Top slow endpoints
    const endpointStats = new Map<string, { count: number; totalDuration: number; maxDuration: number }>()
    
    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`
      const existing = endpointStats.get(key) || { count: 0, totalDuration: 0, maxDuration: 0 }
      
      existing.count++
      existing.totalDuration += metric.duration
      existing.maxDuration = Math.max(existing.maxDuration, metric.duration)
      
      endpointStats.set(key, existing)
    })

    const topSlowEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageDuration: Math.round(stats.totalDuration / stats.count),
        maxDuration: stats.maxDuration,
        requestCount: stats.count
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10)

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      topSlowEndpoints
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = []
    console.log('[PERFORMANCE_MONITOR] Cleared all metrics')
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(timeRangeMinutes = 60) {
    const cutoff = new Date(Date.now() - timeRangeMinutes * 60 * 1000)
    return this.metrics.filter(m => m.timestamp >= cutoff)
  }
}

const globalForPerformanceMonitor = globalThis as unknown as {
  __eduversePerformanceMonitor?: PerformanceMonitor
}

export const performanceMonitor =
  globalForPerformanceMonitor.__eduversePerformanceMonitor ?? new PerformanceMonitor()

globalForPerformanceMonitor.__eduversePerformanceMonitor = performanceMonitor

/**
 * Middleware wrapper để tự động track performance
 */
export function withPerformanceTracking<T extends any[], R>(
  endpoint: string,
  method: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    let success = true
    let error: string | undefined
    let statusCode: number | undefined
    let result: R | undefined

    try {
      result = await fn(...args)
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - startTime

      const responseLike = result as unknown as { status?: number } | undefined
      if (responseLike && typeof responseLike.status === 'number') {
        statusCode = responseLike.status
        success = statusCode < 400
        if (!success && !error) error = `HTTP ${statusCode}`
      }
      
      performanceMonitor.recordMetric({
        endpoint,
        method,
        duration,
        timestamp: new Date(),
        success,
        statusCode,
        error
      })
    }
  }
}

/**
 * API endpoint để lấy performance stats
 */
export function getPerformanceStats(timeRangeMinutes?: number) {
  return performanceMonitor.getStats(timeRangeMinutes)
}
