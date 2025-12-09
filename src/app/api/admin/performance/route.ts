import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { isStaffRole } from "@/lib/rbac"
import { getCachedUser, getCacheStats } from '@/lib/user-cache'
import { getPerformanceStats } from '@/lib/performance-monitor'

/**
 * GET /api/admin/performance
 * Lấy thống kê performance của hệ thống - CHỈ ADMIN
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 })
    }

    const user = await getCachedUser(
      session.user.id || undefined, 
      session.user.email || undefined
    )

    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Admin only' 
      }, { status: 403 })
    }

    const url = new URL(req.url)
    const timeRange = parseInt(url.searchParams.get('timeRange') || '60') // Default 60 minutes

    // Lấy performance stats
    const performanceStats = getPerformanceStats(timeRange)
    
    // Lấy cache stats
    const cacheStats = getCacheStats()

    // System stats
    const systemStats = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: {
        performance: performanceStats,
        cache: cacheStats,
        system: systemStats,
        timeRangeMinutes: timeRange
      }
    }, { status: 200 })

  } catch (error) {
    console.error('[ADMIN PERFORMANCE GET] Error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
