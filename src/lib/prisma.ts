import { PrismaClient } from '@prisma/client'

// PrismaClient được khởi tạo với cấu hình tối ưu cho production
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'info', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  })

  // Log queries để debug
  client.$on('query', (e: { query: string; duration: number }) => {
    console.log('Query: ' + e.query)
    console.log('Duration: ' + e.duration + 'ms')
  })

  return client
}

// Global để tránh multiple instances ở dev
declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

// Bảo đảm luôn có instance và kiểu không undefined
let _prisma: ReturnType<typeof prismaClientSingleton>
if (!globalThis.prisma) {
  console.log('Creating new Prisma Client instance...')
  _prisma = prismaClientSingleton()
  globalThis.prisma = _prisma
} else {
  console.log('Using existing Prisma Client instance...')
  _prisma = globalThis.prisma
}

export const prisma = _prisma
export default prisma
