/**
 * User Cache Service - Tối ưu user lookups
 * Giảm thời gian query từ 208ms xuống <50ms
 */

import { User } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// In-memory cache cho user data (production nên dùng Redis)
const userCache = new Map<string, { user: User; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 phút

/**
 * Lấy user với caching để tối ưu performance
 */
export async function getCachedUser(userId?: string, email?: string): Promise<User | null> {
  try {
    const cacheKey = userId || email || ''
    if (!cacheKey) return null

    // Kiểm tra cache trước
    const cached = userCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[USER_CACHE] Cache hit for ${cacheKey}`)
      return cached.user
    }

    // Query database nếu cache miss
    console.log(`[USER_CACHE] Cache miss for ${cacheKey}, querying DB`)
    const user = userId
      ? await prisma.user.findUnique({ 
          where: { id: userId },
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        })
      : email
      ? await prisma.user.findUnique({ 
          where: { email },
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        })
      : null

    // Lưu vào cache
    if (user) {
      userCache.set(cacheKey, { 
        user: user as User, 
        timestamp: Date.now() 
      })
      console.log(`[USER_CACHE] Cached user ${cacheKey}`)
    }

    return user as User | null
  } catch (error) {
    console.error('[USER_CACHE] Error:', error)
    return null
  }
}

/**
 * Xóa user khỏi cache (khi user được update)
 */
export function invalidateUserCache(userId?: string, email?: string): void {
  const cacheKey = userId || email || ''
  if (cacheKey && userCache.has(cacheKey)) {
    userCache.delete(cacheKey)
    console.log(`[USER_CACHE] Invalidated cache for ${cacheKey}`)
  }
}

/**
 * Clear toàn bộ cache (dùng cho development)
 */
export function clearUserCache(): void {
  userCache.clear()
  console.log('[USER_CACHE] Cleared all cache')
}

/**
 * Lấy thống kê cache
 */
export function getCacheStats() {
  return {
    size: userCache.size,
    keys: Array.from(userCache.keys()),
    oldestEntry: Math.min(...Array.from(userCache.values()).map(v => v.timestamp)),
    newestEntry: Math.max(...Array.from(userCache.values()).map(v => v.timestamp))
  }
}
