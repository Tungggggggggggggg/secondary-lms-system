/**
 * Performance Test Script
 * Test các queries để verify indexes hoạt động
 */

import { prisma } from '@/lib/prisma'

export async function testPerformanceIndexes() {
  console.log('🚀 Testing Performance Indexes...')
  
  // Test 1: Assignment list query (should use authorId+createdAt index)
  console.time('assignments_query')
  const assignments = await prisma.assignment.findMany({
    where: { 
      authorId: 'test_user_id' 
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { submissions: true } }
    }
  })
  console.timeEnd('assignments_query') // Should be <50ms with index
  
  // Test 2: Dashboard stats query (should use assignmentId+grade index)
  console.time('stats_query')
  const stats = await prisma.assignmentSubmission.aggregate({
    where: {
      assignment: {
        authorId: 'test_user_id'
      },
      grade: { not: null }
    },
    _count: { id: true },
    _avg: { grade: true }
  })
  console.timeEnd('stats_query') // Should be <100ms with index
  
  // Test 3: Teacher classrooms (should use teacherId+isActive index)
  console.time('classrooms_query')
  const classrooms = await prisma.classroom.findMany({
    where: {
      teacherId: 'test_user_id',
      isActive: true
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } }
    }
  })
  console.timeEnd('classrooms_query') // Should be <30ms with index
  
  // Test 4: User login (should use email index)
  console.time('user_login_query')
  const user = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
    select: {
      id: true,
      email: true,
      role: true
    }
  })
  console.timeEnd('user_login_query') // Should be <20ms with index
  
  console.log('✅ Performance tests completed!')
  
  return {
    assignmentsCount: assignments.length,
    statsCount: stats._count.id,
    classroomsCount: classrooms.length,
    userFound: !!user
  }
}

// Uncomment to run test
// testPerformanceIndexes().then(console.log)
