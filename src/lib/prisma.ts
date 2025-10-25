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

// Trong môi trường development, sử dụng biến global để tránh tạo nhiều instances
declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

try {
  if (!globalThis.prisma) {
    console.log('Creating new Prisma Client instance...')
    globalThis.prisma = prismaClientSingleton()
  } else {
    console.log('Using existing Prisma Client instance...')
  }
} catch (error) {
  console.error('Error initializing Prisma Client:', error)
  throw error
}

export default globalThis.prisma
