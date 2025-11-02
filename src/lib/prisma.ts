import { PrismaClient } from '@prisma/client'

// PrismaClient được khởi tạo với cấu hình tối ưu cho production
const prismaClientSingleton = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const client = new PrismaClient({
    // Optimize logging: Chỉ log queries trong development, log errors trong production
    log: isDevelopment
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ]
      : [
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ],
    // Connection pooling configuration
    // Note: Connection pooling được quản lý bởi DATABASE_URL (có thể dùng connection pooler như PgBouncer)
    // Trong Next.js serverless, mỗi request có thể tạo Prisma Client mới, nên cần singleton pattern
  })

  // Log slow queries để debug performance issues (chỉ trong development)
  if (isDevelopment) {
    client.$on('query', (e: { query: string; duration: number; params: string }) => {
      // Chỉ log queries chậm (> 100ms) để tránh spam logs
      if (e.duration > 100) {
        console.log(`[SLOW QUERY] Duration: ${e.duration}ms`)
        console.log(`[SLOW QUERY] Query: ${e.query}`)
      }
    })
  }

  return client
}

// Global để tránh multiple instances ở dev
declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

// Bảo đảm luôn có instance và kiểu không undefined
// OPTIMIZE: Singleton pattern để tránh tạo nhiều Prisma Client instances
// Trong Next.js development, hot reload có thể tạo nhiều instances nếu không có global cache
let _prisma: ReturnType<typeof prismaClientSingleton>

if (!globalThis.prisma) {
  // Chỉ log trong development để tránh spam logs trong production
  if (process.env.NODE_ENV === 'development') {
    console.log('[PRISMA] Creating new Prisma Client instance...')
  }
  _prisma = prismaClientSingleton()
  globalThis.prisma = _prisma
} else {
  // Sử dụng instance đã có
  _prisma = globalThis.prisma
}

export const prisma = _prisma
export default prisma
