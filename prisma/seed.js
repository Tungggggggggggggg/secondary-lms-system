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

  // Cleanup legacy example.com users to keep dataset clean (avoid FK issues by updating email instead of delete)
  const legacyUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@example.com' } },
    select: { id: true, email: true },
  });
  for (const u of legacyUsers) {
    const local = u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9.+_-]/g, '') || 'user';
    let newEmail = `${local}+legacy.${u.id.slice(-4)}@gmail.com`;
    try {
      await prisma.user.update({ where: { id: u.id }, data: { email: newEmail } });
    } catch (e) {
      // fallback with random suffix if unique constraint
      const rand = Math.random().toString(36).slice(2, 6);
      newEmail = `${local}+legacy.${rand}@gmail.com`;
      try { await prisma.user.update({ where: { id: u.id }, data: { email: newEmail } }); } catch {}
    }
  }

  // Only create default users if they don't exist (Gmail + tên Việt)
  const superAdmin = await upsertUser('superadmin.nguyenhoangnam@gmail.com', 'Nguyễn Hoàng Nam', 'SUPER_ADMIN');
  const admin = await upsertUser('admin.tranthilan@gmail.com', 'Trần Thị Lan', 'STAFF');
  const teacher = await upsertUser('giaovien.thanhha@gmail.com', 'Nguyễn Thị Thanh Hà', 'TEACHER');
  
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

  const SEED_MODE = process.env.SEED_MODE || '';
  if (SEED_MODE === 'reset-minimal') {
    const demoClasses = await prisma.classroom.findMany({ where: { code: '12A2-DEMO' }, select: { id: true } });
    for (const c of demoClasses) {
      const classId = c.id;
      await prisma.conversation.deleteMany({ where: { classId } });
      const clsStudents = await prisma.classroomStudent.findMany({ where: { classroomId: classId }, select: { studentId: true } });
      const studentIds = clsStudents.map((s) => s.studentId);
      const dms = await prisma.conversation.findMany({ where: { type: 'DM' }, include: { participants: true } });
      for (const dm of dms) {
        const ids = dm.participants.map((p) => p.userId);
        if (ids.length === 2 && ids.some((id) => studentIds.includes(id))) {
          await prisma.conversation.delete({ where: { id: dm.id } });
        }
      }
      await prisma.announcement.deleteMany({ where: { classroomId: classId } });
      const classroomCourses = await prisma.classroomCourse.findMany({ where: { classroomId: classId }, select: { courseId: true } });
      for (const cc of classroomCourses) {
        const courseId = cc.courseId;
        const assignments = await prisma.assignment.findMany({ where: { courseId }, select: { id: true } });
        const aIds = assignments.map((a) => a.id);
        if (aIds.length) {
          await prisma.submission.deleteMany({ where: { assignmentId: { in: aIds } } });
          await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: { in: aIds } } });
          await prisma.assignmentClassroom.deleteMany({ where: { classroomId: classId, assignmentId: { in: aIds } } });
          await prisma.assignment.deleteMany({ where: { id: { in: aIds } } });
        }
        await prisma.classroomCourse.deleteMany({ where: { classroomId: classId, courseId } });
        await prisma.lesson.deleteMany({ where: { courseId } });
        try { await prisma.course.delete({ where: { id: courseId } }); } catch {}
      }
      await prisma.classroomStudent.deleteMany({ where: { classroomId: classId } });
      try { await prisma.classroom.delete({ where: { id: classId } }); } catch {}
    }
    await prisma.auditLog.deleteMany({ where: { entityType: 'SYSTEM', entityId: 'seed', action: 'SEED_INIT' } });
  }

  // Minimal, clean dataset for UI coverage
  const teacher2 = teacher;

  // Ensure minimal 8 students and 8 parents
  const baseStudentNames = [
    'Nguyễn Gia Huy', 'Trần Khánh Ly', 'Phạm Minh Khang', 'Lê Thu Hà',
    'Đỗ Quang Khánh', 'Bùi Phương Anh', 'Hoàng Thảo My', 'Phan Ngọc Bích'
  ];
  const createdStudents = [];
  for (let i = 0; i < baseStudentNames.length; i++) {
    const name = baseStudentNames[i];
    const email = `${name.normalize('NFD').replace(/\p{Diacritic}/gu, '')}`
      .toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '.') + `.${i+1}@gmail.com`;
    const u = await upsertUser(email, name, 'STUDENT');
    createdStudents.push(u);
  }

  const baseParentNames = [
    'Nguyễn Thị Mai', 'Trần Văn Long', 'Lê Thu Trang', 'Phạm Minh Châu',
    'Đỗ Hải Nam', 'Bùi Thị Hồng', 'Hoàng Anh Dũng', 'Phan Thuý Vy'
  ];
  const createdParents = [];
  for (let i = 0; i < baseParentNames.length; i++) {
    const name = baseParentNames[i];
    const email = `${name.normalize('NFD').replace(/\p{Diacritic}/gu, '')}`
      .toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '.') + `.${i+1}@gmail.com`;
    const u = await upsertUser(email, name, 'PARENT');
    createdParents.push(u);
  }

  // Second classroom for teacher2
  let classroom2 = await prisma.classroom.findFirst({ where: { name: 'Lớp 12A2', teacherId: teacher2.id } });
  if (!classroom2) {
    classroom2 = await prisma.classroom.create({
      data: {
        name: 'Lớp 12A2',
        description: 'Lớp thử nghiệm 12A2',
        code: '12A2-DEMO',
        teacherId: teacher2.id,
        organizationId: org.id,
      },
    });
  }

  // Attach up to 8 students to classroom2 and link parents 1-1
  for (let i = 0; i < Math.min(8, createdStudents.length); i++) {
    const stu = createdStudents[i];
    const par = createdParents[i];
    if (!stu || !par) break;
    await prisma.classroomStudent.upsert({
      where: { classroomId_studentId: { classroomId: classroom2.id, studentId: stu.id } },
      update: {},
      create: { classroomId: classroom2.id, studentId: stu.id },
    });
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: par.id, studentId: stu.id } },
      update: {},
      create: { parentId: par.id, studentId: stu.id },
    });
  }

  // Course + lessons for classroom2
  let course2 = await prisma.course.findFirst({ where: { title: 'Toán 12 - Hàm số', authorId: teacher2.id } });
  if (!course2) {
    course2 = await prisma.course.create({
      data: {
        title: 'Toán 12 - Hàm số',
        description: 'Ôn tập giới hạn, đạo hàm và ứng dụng.',
        authorId: teacher2.id,
        organizationId: org.id,
      },
    });
    await prisma.classroomCourse.upsert({
      where: { classroomId_courseId: { classroomId: classroom2.id, courseId: course2.id } },
      update: {},
      create: { classroomId: classroom2.id, courseId: course2.id },
    });
    const lessonTitles = ['Giới hạn hàm số', 'Đạo hàm và vi phân', 'Ứng dụng đạo hàm'];
    for (let idx = 0; idx < lessonTitles.length; idx++) {
      await prisma.lesson.create({
        data: {
          title: lessonTitles[idx],
          content: `Nội dung bài ${idx + 1} về ${lessonTitles[idx].toLowerCase()}.`,
          order: idx + 1,
          courseId: course2.id,
        },
      });
    }
  }

  // Assignments: 1 Essay + 1 Quiz
  const essayTitle = 'Bài tập tự luận: Ứng dụng đạo hàm trong khảo sát hàm số';
  let essay = await prisma.assignment.findFirst({ where: { title: essayTitle, courseId: course2.id } });
  if (!essay) {
    essay = await prisma.assignment.create({
      data: {
        title: essayTitle,
        description: 'Trình bày đầy đủ các bước khảo sát và vẽ đồ thị hàm số bậc ba. Nêu ứng dụng thực tế.',
        dueDate: new Date(Date.now() + 5 * 86400000),
        authorId: teacher2.id,
        courseId: course2.id,
        type: 'ESSAY',
        organizationId: org.id,
      },
    });
    await prisma.assignmentClassroom.upsert({
      where: { classroomId_assignmentId: { classroomId: classroom2.id, assignmentId: essay.id } },
      update: {},
      create: { classroomId: classroom2.id, assignmentId: essay.id },
    });
  }

  const quizTitle = 'Trắc nghiệm giới hạn và đạo hàm (5 câu)';
  let quiz = await prisma.assignment.findFirst({ where: { title: quizTitle, courseId: course2.id } });
  if (!quiz) {
    quiz = await prisma.assignment.create({
      data: {
        title: quizTitle,
        description: 'Làm trên lớp, thời gian 15 phút.',
        dueDate: new Date(Date.now() + 3 * 86400000),
        authorId: teacher2.id,
        courseId: course2.id,
        type: 'QUIZ',
        organizationId: org.id,
      },
    });
    const qDefs = [
      { content: 'Giới hạn lim_{x->0} (sin x)/x bằng bao nhiêu?', type: 'SINGLE', options: [
        { label: 'A', content: '0', isCorrect: false },
        { label: 'B', content: '1', isCorrect: true },
        { label: 'C', content: 'Không tồn tại', isCorrect: false },
      ]},
      { content: 'Đạo hàm của x^2 là 2x.', type: 'TRUE_FALSE', options: [
        { label: 'A', content: 'Đúng', isCorrect: true },
        { label: 'B', content: 'Sai', isCorrect: false },
      ]},
      { content: 'Hàm số y = x^3 có đạo hàm tại mọi điểm.', type: 'TRUE_FALSE', options: [
        { label: 'A', content: 'Đúng', isCorrect: true },
        { label: 'B', content: 'Sai', isCorrect: false },
      ]},
      { content: 'Tính đạo hàm của y = 3x + 5.', type: 'SINGLE', options: [
        { label: 'A', content: '3', isCorrect: true },
        { label: 'B', content: '5', isCorrect: false },
        { label: 'C', content: '0', isCorrect: false },
      ]},
      { content: 'Khảo sát tính đơn điệu của y = x^2 trên R.', type: 'SINGLE', options: [
        { label: 'A', content: 'Đồng biến trên (0, +∞)', isCorrect: true },
        { label: 'B', content: 'Nghịch biến trên (0, +∞)', isCorrect: false },
        { label: 'C', content: 'Đồng biến trên (-∞, 0)', isCorrect: false },
      ]},
    ];
    for (let i = 0; i < qDefs.length; i++) {
      const q = await prisma.question.create({ data: { content: qDefs[i].content, type: qDefs[i].type, order: i + 1, assignmentId: quiz.id } });
      for (const opt of qDefs[i].options) {
        await prisma.option.create({ data: { label: opt.label, content: opt.content, isCorrect: opt.isCorrect, order: 1, questionId: q.id } });
      }
    }
    await prisma.assignmentClassroom.upsert({
      where: { classroomId_assignmentId: { classroomId: classroom2.id, assignmentId: quiz.id } },
      update: {},
      create: { classroomId: classroom2.id, assignmentId: quiz.id },
    });
  }

  // Minimal submissions (first 4 students submit essay)
  for (let i = 0; i < Math.min(4, createdStudents.length); i++) {
    const stu = createdStudents[i];
    const existing = await prisma.assignmentSubmission.findFirst({ where: { assignmentId: essay.id, studentId: stu.id } });
    if (!existing) {
      await prisma.assignmentSubmission.create({
        data: {
          assignmentId: essay.id,
          studentId: stu.id,
          content: 'Bài làm nộp dạng file PDF kèm thuyết minh ngắn.',
          grade: i % 2 === 0 ? 8.0 : 7.5,
          feedback: 'Bài làm tốt, trình bày rõ ràng.',
        },
      });
    }
  }

  // Announcements for classroom2
  const annContent = 'Tuần này kiểm tra 15 phút chương Giới hạn.';
  const existingAnn = await prisma.announcement.findFirst({ where: { classroomId: classroom2.id, content: annContent } });
  if (!existingAnn) {
    const ann = await prisma.announcement.create({ data: { classroomId: classroom2.id, authorId: teacher2.id, content: annContent, status: 'PENDING', organizationId: org.id } });
    await prisma.announcementComment.create({ data: { announcementId: ann.id, authorId: createdStudents[0]?.id || teacher2.id, content: 'Đã rõ ạ!' } });
  }

  // Chat: TRIAD + DM for classroom2
  const stu0 = createdStudents[0];
  const par0 = createdParents[0];
  if (stu0 && par0) {
    const triad = await prisma.conversation.findFirst({ where: { type: 'TRIAD', classId: classroom2.id, contextStudentId: stu0.id } });
    if (!triad) {
      await prisma.conversation.create({
        data: {
          type: 'TRIAD',
          createdById: teacher2.id,
          classId: classroom2.id,
          contextStudentId: stu0.id,
          participants: { create: [
            { userId: teacher2.id, roleInConv: 'TEACHER' },
            { userId: stu0.id, roleInConv: 'STUDENT' },
            { userId: par0.id, roleInConv: 'PARENT' },
          ]},
          messages: { create: [
            { senderId: teacher2.id, content: 'Chào anh/chị và em, đây là nhóm trao đổi về kết quả học tập.' },
            { senderId: par0.id, content: 'Cảm ơn cô, mong cô hỗ trợ thêm cho cháu.' },
            { senderId: stu0.id, content: 'Em sẽ cố gắng ạ.' },
          ]},
        },
      });
    }
  }
  const stu1 = createdStudents[1];
  if (stu1) {
    const dm = await prisma.conversation.findFirst({ where: { type: 'DM', participants: { some: { userId: teacher2.id } } } });
    if (!dm) {
      await prisma.conversation.create({
        data: {
          type: 'DM',
          createdById: teacher2.id,
          participants: { create: [
            { userId: teacher2.id, roleInConv: 'TEACHER' },
            { userId: stu1.id, roleInConv: 'STUDENT' },
          ]},
          messages: { create: [
            { senderId: teacher2.id, content: 'Chào em, có khó khăn gì trong phần đạo hàm không?' },
            { senderId: stu1.id, content: 'Dạ em đang xem lại ví dụ 2 ạ.' },
          ]},
        },
      });
    }
  }

  console.log('[SEED] Chat & minimal dataset seeded');

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


