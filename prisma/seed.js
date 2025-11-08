/*
  Seed dữ liệu mẫu cho LMS
  - Tạo người dùng: SUPER_ADMIN, ADMIN, TEACHER, STUDENT, PARENT (chỉ nếu chưa có)
  - Lấy dữ liệu users thật từ database Prisma
  - Tạo Organization mặc định và gán SUPER_ADMIN, ADMIN làm thành viên
  - Tạo lớp, khóa học, bài tập, thông báo và bình luận ở trạng thái PENDING
  - Tạo parent-student relationships từ dữ liệu users thật trong database
*/

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function upsertUser(email, fullname, role) {
  const passwordHash = await bcrypt.hash('123456', 10);
  return prisma.user.upsert({
    where: { email },
    update: { fullname, role },
    create: { email, fullname, role, password: passwordHash },
  });
}

async function main() {
  console.log('[SEED] Start');

  // Get real users from database (PARENT and STUDENT roles)
  const existingParents = await prisma.user.findMany({
    where: { role: 'PARENT' },
    select: { id: true, email: true, fullname: true },
  });

  const existingStudents = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, email: true, fullname: true },
  });

  console.log(`[SEED] Found ${existingParents.length} parents and ${existingStudents.length} students in database`);

  // Only create default users if they don't exist
  const superAdmin = await upsertUser('superadmin@example.com', 'Super Admin', 'SUPER_ADMIN');
  const admin = await upsertUser('admin@example.com', 'Org Admin', 'ADMIN');
  const teacher = await upsertUser('teacher@example.com', 'Alice Teacher', 'TEACHER');
  
  // Organization default
  const org = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: { name: 'Default Organization' },
    create: { id: 'default-org', name: 'Default Organization' },
  });

  // Members
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: superAdmin.id } },
    update: {},
    create: { organizationId: org.id, userId: superAdmin.id, roleInOrg: 'OWNER' },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: admin.id } },
    update: {},
    create: { organizationId: org.id, userId: admin.id, roleInOrg: 'ADMIN' },
  });

  // Classroom by teacher (only if teacher exists and no classroom exists)
  const existingClassroom = await prisma.classroom.findFirst({
    where: { teacherId: teacher.id },
  });

  let classroom = existingClassroom;
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        name: 'Lớp 12A1',
        description: 'Lớp thử nghiệm',
        code: 'A1-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        teacherId: teacher.id,
        organizationId: org.id,
      },
    });

    // Add students to classroom (use real students from database)
    if (existingStudents.length > 0) {
      for (const student of existingStudents.slice(0, 5)) { // Add first 5 students
        try {
          await prisma.classroomStudent.upsert({
            where: {
              classroomId_studentId: {
                classroomId: classroom.id,
                studentId: student.id,
              },
            },
            update: {},
            create: {
              classroomId: classroom.id,
              studentId: student.id,
            },
          });
        } catch (error) {
          // Skip if already exists
        }
      }
    }
  }

  // Course by teacher (only create if doesn't exist)
  let course = await prisma.course.findFirst({
    where: { authorId: teacher.id, title: 'Toán 12 - Hàm số' },
  });

  if (!course && classroom) {
    course = await prisma.course.create({
      data: {
        title: 'Toán 12 - Hàm số',
        description: 'Chuyên đề hàm số',
        authorId: teacher.id,
        organizationId: org.id,
      },
    });

    // Link classroom - course
    await prisma.classroomCourse.upsert({
      where: {
        classroomId_courseId: {
          classroomId: classroom.id,
          courseId: course.id,
        },
      },
      update: {},
      create: { classroomId: classroom.id, courseId: course.id },
    });

    // Assignment and link
    const assignment = await prisma.assignment.create({
      data: {
        title: 'Bài tập hàm số tuần 1',
        description: 'Giải các bài toán về đạo hàm',
        dueDate: new Date(Date.now() + 7 * 86400000),
        authorId: teacher.id,
        courseId: course.id,
        type: 'ESSAY',
        organizationId: org.id,
      },
    });
    
    await prisma.assignmentClassroom.upsert({
      where: {
        classroomId_assignmentId: {
          classroomId: classroom.id,
          assignmentId: assignment.id,
        },
      },
      update: {},
      create: { classroomId: classroom.id, assignmentId: assignment.id },
    });

    // Announcement (PENDING to test moderation) - only if we have students
    const studentsForAnnouncement = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true },
      take: 1,
    });

    if (studentsForAnnouncement.length > 0) {
      const ann = await prisma.announcement.create({
        data: {
          classroomId: classroom.id,
          authorId: teacher.id,
          content: 'Thông báo chờ duyệt: tuần này kiểm tra 15p.',
          status: 'PENDING',
          organizationId: org.id,
        },
      });

      // Comment (PENDING) - use first student from database
      await prisma.announcementComment.create({
        data: {
          announcementId: ann.id,
          authorId: studentsForAnnouncement[0].id,
          content: 'Em đã nhận thông báo ạ!',
          status: 'PENDING',
        },
      });
    }
  }

  // Create parent-student relationships from real data in database
  console.log('[SEED] Creating parent-student relationships...');
  
  // Get fresh data after potential user creation
  const allParents = await prisma.user.findMany({
    where: { role: 'PARENT' },
    select: { id: true, email: true, fullname: true },
  });

  const allStudents = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, email: true, fullname: true },
  });

  // Create relationships: match parents with students
  // Each parent can have multiple students, each student can have multiple parents
  const relationshipsCreated = [];
  
  if (allParents.length > 0 && allStudents.length > 0) {
    // Create relationships: assign students to parents in a round-robin fashion
    for (let i = 0; i < Math.min(allStudents.length, allParents.length * 2); i++) {
      const student = allStudents[i % allStudents.length];
      const parent = allParents[Math.floor(i / 2) % allParents.length];
      
      try {
        // Check if relationship already exists
        const existing = await prisma.parentStudent.findUnique({
          where: {
            parentId_studentId: {
              parentId: parent.id,
              studentId: student.id,
            },
          },
        });

        if (!existing) {
          const relationship = await prisma.parentStudent.create({
            data: {
              parentId: parent.id,
              studentId: student.id,
            },
          });
          relationshipsCreated.push({
            parent: parent.fullname,
            student: student.fullname,
          });
        }
      } catch (error) {
        // Skip if relationship already exists or other error
        if (!error.message?.includes('Unique constraint')) {
          console.error(`[SEED] Error creating relationship: ${error.message}`);
        }
      }
    }
    
    console.log(`[SEED] Created ${relationshipsCreated.length} parent-student relationships`);
    relationshipsCreated.forEach(rel => {
      console.log(`[SEED]   - ${rel.parent} <-> ${rel.student}`);
    });
  } else {
    console.log('[SEED] No parents or students found to create relationships');
  }

  // Some audit logs
  await prisma.auditLog.createMany({
    data: [
      { actorId: superAdmin.id, action: 'SEED_INIT', entityType: 'SYSTEM', entityId: 'seed' },
      { actorId: admin.id, action: 'ORG_MEMBER_ADD', entityType: 'ORGANIZATION', entityId: org.id },
    ],
  });

  console.log('[SEED] Done');
}

main()
  .catch((e) => {
    console.error('[SEED] Error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


