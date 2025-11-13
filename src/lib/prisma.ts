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
    // OPTIMIZE: Connection pooling configuration
    // Note: Connection pooling được quản lý bởi DATABASE_URL
    // Với Supabase, connection pooling được xử lý tự động
    // Đảm bảo DATABASE_URL sử dụng connection pooler nếu có (ví dụ: ?pgbouncer=true)
  })

  // Log slow queries để debug performance issues (chỉ trong development)
  if (isDevelopment) {
    client.$on('query', (e: { query: string; duration: number; params: string }) => {
      // Chỉ log queries rất chậm (> 1000ms) để tránh spam logs
      if (e.duration > 1000) {
        console.log(`[SLOW QUERY] Duration: ${e.duration}ms`)
        console.log(`[SLOW QUERY] Query: ${e.query.substring(0, 150)}...`)
      }
    })
  }

  return client
}

// Global để tránh multiple instances
// OPTIMIZE: Singleton pattern để tránh tạo nhiều Prisma Client instances
// Trong Next.js:
// - Development: hot reload có thể tạo nhiều instances nếu không có global cache
// - Production: serverless functions có thể share process, global giúp reuse instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

// Bảo đảm luôn có instance và kiểu không undefined
// Sử dụng globalThis để hoạt động trong cả Node.js và browser environments
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

let _prisma: ReturnType<typeof prismaClientSingleton>

if (!globalForPrisma.prisma) {
  // Tạo instance mới mà không log để giảm noise
  _prisma = prismaClientSingleton()
  globalForPrisma.prisma = _prisma
} else {
  // Sử dụng instance đã có
  _prisma = globalForPrisma.prisma
}

// OPTIMIZE: Disconnect khi app shutdown (chủ yếu cho development)
if (process.env.NODE_ENV === 'development') {
  process.on('beforeExit', async () => {
    await _prisma.$disconnect()
  })
}

export const prisma = _prisma
export default prisma
