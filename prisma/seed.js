/*
  Seed dữ liệu mẫu cho LMS
  - Tạo người dùng: SUPER_ADMIN, ADMIN, TEACHER, STUDENT, PARENT
  - Tạo Organization mặc định và gán SUPER_ADMIN, ADMIN làm thành viên
  - Tạo lớp, khóa học, bài tập, thông báo và bình luận ở trạng thái PENDING
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

  // Users
  const superAdmin = await upsertUser('superadmin@example.com', 'Super Admin', 'SUPER_ADMIN');
  const admin = await upsertUser('admin@example.com', 'Org Admin', 'ADMIN');
  const teacher = await upsertUser('teacher@example.com', 'Alice Teacher', 'TEACHER');
  const student = await upsertUser('student@example.com', 'Bob Student', 'STUDENT');
  const parent = await upsertUser('parent@example.com', 'Paula Parent', 'PARENT');

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

  // Classroom by teacher
  const classroom = await prisma.classroom.create({
    data: {
      name: 'Lớp 12A1',
      description: 'Lớp thử nghiệm',
      code: 'A1-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      teacherId: teacher.id,
      organizationId: org.id,
    },
  });

  // Add student to classroom
  await prisma.classroomStudent.create({
    data: { classroomId: classroom.id, studentId: student.id },
  });

  // Course by teacher
  const course = await prisma.course.create({
    data: {
      title: 'Toán 12 - Hàm số',
      description: 'Chuyên đề hàm số',
      authorId: teacher.id,
      organizationId: org.id,
    },
  });

  // Link classroom - course
  await prisma.classroomCourse.create({
    data: { classroomId: classroom.id, courseId: course.id },
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
  await prisma.assignmentClassroom.create({
    data: { classroomId: classroom.id, assignmentId: assignment.id },
  });

  // Announcement (PENDING to test moderation)
  const ann = await prisma.announcement.create({
    data: {
      classroomId: classroom.id,
      authorId: teacher.id,
      content: 'Thông báo chờ duyệt: tuần này kiểm tra 15p.',
      status: 'PENDING',
      organizationId: org.id,
    },
  });

  // Comment (PENDING)
  await prisma.announcementComment.create({
    data: {
      announcementId: ann.id,
      authorId: student.id,
      content: 'Em đã nhận thông báo ạ!',
      status: 'PENDING',
    },
  });

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


