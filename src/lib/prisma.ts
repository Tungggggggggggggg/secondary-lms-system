import { PrismaClient } from '@prisma/client'

// PrismaClient được khởi tạo với cấu hình tối ưu cho production
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
  })
}

// Trong môi trường development, sử dụng biến global để tránh tạo nhiều instances
declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

// Chỉ lưu instance trong biến global trong development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
