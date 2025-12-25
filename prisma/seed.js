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

const SEED_USERS = String(process.env.SEED_USERS || '').toLowerCase() === '1' || String(process.env.SEED_USERS || '').toLowerCase() === 'true';
const SEED_CLEANUP_LEGACY_USERS = String(process.env.SEED_CLEANUP_LEGACY_USERS || '').toLowerCase() === '1' || String(process.env.SEED_CLEANUP_LEGACY_USERS || '').toLowerCase() === 'true';
const SEED_DRY_RUN = String(process.env.SEED_DRY_RUN || '').toLowerCase() === '1' || String(process.env.SEED_DRY_RUN || '').toLowerCase() === 'true';

function safeDbInfo(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const u = new URL(databaseUrl);
    const db = (u.pathname || '/').replace(/^\//, '') || '(no-db)';
    const port = u.port ? `:${u.port}` : '';
    return `${u.hostname}${port}/${db}`;
  } catch {
    return '(invalid DATABASE_URL)';
  }
}

async function pickFirstUserByRole(role) {
  return prisma.user.findFirst({
    where: { role },
    orderBy: { createdAt: 'asc' },
  });
}

async function upsertUser(email, fullname, role) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (
      SEED_USERS &&
      existing.role === role &&
      (existing.roleSelectedAt === null || existing.roleSelectedAt === undefined)
    ) {
      try {
        return await prisma.user.update({
          where: { id: existing.id },
          data: { roleSelectedAt: new Date() },
        });
      } catch {
        return existing;
      }
    }
    return existing;
  }
  if (!SEED_USERS) {
    throw new Error(`[SEED] Missing user ${email}. Set SEED_USERS=1 to allow creating seed users.`);
  }
  const passwordHash = await bcrypt.hash('123456', 10);
  return prisma.user.create({
    data: { email, fullname, role, password: passwordHash, roleSelectedAt: new Date() },
  });
}

async function upsertSystemSetting(key, value) {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
    select: { key: true },
  });
}

async function mergeNotificationSetting(userId, itemsToPrepend) {
  const key = `notifications:${userId}`;
  const existing = await prisma.systemSetting.findUnique({ where: { key }, select: { value: true } });
  const current = Array.isArray(existing?.value) ? existing.value : [];
  const dedupeKeys = new Set(
    itemsToPrepend
      .map((x) => (x && typeof x === 'object' && x !== null ? x.dedupeKey : undefined))
      .filter((x) => typeof x === 'string' && x.length > 0)
  );
  const filtered = dedupeKeys.size
    ? current.filter((x) => {
        if (!x || typeof x !== 'object') return true;
        const dk = x.dedupeKey;
        return !(typeof dk === 'string' && dedupeKeys.has(dk));
      })
    : current;
  const next = [...itemsToPrepend, ...filtered].slice(0, 200);
  await upsertSystemSetting(key, next);
}

async function main() {
  console.log('[SEED] Start');

  const dbInfo = safeDbInfo(process.env.DATABASE_URL);
  if (dbInfo) console.log(`[SEED] DB: ${dbInfo}`);

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

  const teacherCount = await prisma.user.count({ where: { role: 'TEACHER' } });
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  console.log(`[SEED] User counts: TEACHER=${teacherCount}, ADMIN=${adminCount}, STUDENT=${existingStudents.length}, PARENT=${existingParents.length}`);

  if (SEED_DRY_RUN) {
    console.log('[SEED] DRY_RUN enabled. Exiting without writing data.');
    return;
  }

  if (SEED_USERS && SEED_CLEANUP_LEGACY_USERS) {
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
  }

  let superAdmin;
  let admin;
  let teacher;

  if (SEED_USERS) {
    // Only create default users if they don't exist (Gmail + tên Việt)
    superAdmin = await upsertUser('superadmin.nguyenhoangnam@gmail.com', 'Nguyễn Hoàng Nam', 'TEACHER');
    admin = await upsertUser('admin.tranthilan@gmail.com', 'Trần Thị Lan', 'ADMIN');
    teacher = await upsertUser('giaovien.thanhha@gmail.com', 'Nguyễn Thị Thanh Hà', 'TEACHER');
  } else {
    teacher = await pickFirstUserByRole('TEACHER');
    admin = await pickFirstUserByRole('ADMIN');
    superAdmin = teacher;
  }

  if (!teacher) {
    throw new Error('[SEED] No TEACHER user found. Create one manually or re-run with SEED_USERS=1.');
  }
  if (!superAdmin) superAdmin = teacher;

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
  if (admin) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: admin.id } },
      update: {},
      create: { organizationId: org.id, userId: admin.id, roleInOrg: 'ADMIN' },
    });
  }

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
  }

  // Ensure teacher is a member of org
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: teacher.id } },
    update: {},
    create: { organizationId: org.id, userId: teacher.id, roleInOrg: 'TEACHER' },
  });

  // Add up to 5 existing students to classroom (no user mutation)
  if (existingStudents.length > 0) {
    for (const student of existingStudents.slice(0, 5)) {
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

  // Minimal, clean dataset for UI coverage
  const teacher2 = teacher;

  // Ensure minimal 8 students and 8 parents
  const baseStudentNames = [
    'Nguyễn Gia Huy', 'Trần Khánh Ly', 'Phạm Minh Khang', 'Lê Thu Hà',
    'Đỗ Quang Khánh', 'Bùi Phương Anh', 'Hoàng Thảo My', 'Phan Ngọc Bích'
  ];
  let createdStudents = [];
  if (SEED_USERS) {
    for (let i = 0; i < baseStudentNames.length; i++) {
      const name = baseStudentNames[i];
      const email = `${name.normalize('NFD').replace(/\p{Diacritic}/gu, '')}`
        .toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '.') + `.${i+1}@gmail.com`;
      const u = await upsertUser(email, name, 'STUDENT');
      createdStudents.push(u);
    }
  } else {
    createdStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });
  }

  const baseParentNames = [
    'Nguyễn Thị Mai', 'Trần Văn Long', 'Lê Thu Trang', 'Phạm Minh Châu',
    'Đỗ Hải Nam', 'Bùi Thị Hồng', 'Hoàng Anh Dũng', 'Phan Thuý Vy'
  ];
  let createdParents = [];
  if (SEED_USERS) {
    for (let i = 0; i < baseParentNames.length; i++) {
      const name = baseParentNames[i];
      const email = `${name.normalize('NFD').replace(/\p{Diacritic}/gu, '')}`
        .toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '.') + `.${i+1}@gmail.com`;
      const u = await upsertUser(email, name, 'PARENT');
      createdParents.push(u);
    }
  } else {
    createdParents = await prisma.user.findMany({
      where: { role: 'PARENT' },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });
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

  // Attach up to 8 students to classroom2 and link parents 1-1 (if both exist)
  for (let i = 0; i < Math.min(8, createdStudents.length, createdParents.length); i++) {
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
  }

  await prisma.classroomCourse.upsert({
    where: { classroomId_courseId: { classroomId: classroom2.id, courseId: course2.id } },
    update: {},
    create: { classroomId: classroom2.id, courseId: course2.id },
  });

  const lessonTitles = ['Giới hạn hàm số', 'Đạo hàm và vi phân', 'Ứng dụng đạo hàm'];
  const existingLessons = await prisma.lesson.findMany({ where: { courseId: course2.id }, select: { title: true } });
  const existingLessonTitles = new Set(existingLessons.map((l) => l.title));
  for (let idx = 0; idx < lessonTitles.length; idx++) {
    if (existingLessonTitles.has(lessonTitles[idx])) continue;
    await prisma.lesson.create({
      data: {
        title: lessonTitles[idx],
        content: `Nội dung bài ${idx + 1} về ${lessonTitles[idx].toLowerCase()}.`,
        order: idx + 1,
        courseId: course2.id,
      },
    });
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
  }
  await prisma.assignmentClassroom.upsert({
    where: { classroomId_assignmentId: { classroomId: classroom2.id, assignmentId: essay.id } },
    update: {},
    create: { classroomId: classroom2.id, assignmentId: essay.id },
  });

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
  }

  await prisma.assignmentClassroom.upsert({
    where: { classroomId_assignmentId: { classroomId: classroom2.id, assignmentId: quiz.id } },
    update: {},
    create: { classroomId: classroom2.id, assignmentId: quiz.id },
  });

  const quizQuestionCount = await prisma.question.count({ where: { assignmentId: quiz.id } });
  if (quizQuestionCount === 0) {
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
      for (let j = 0; j < qDefs[i].options.length; j++) {
        const opt = qDefs[i].options[j];
        await prisma.option.create({ data: { label: opt.label, content: opt.content, isCorrect: opt.isCorrect, order: j + 1, questionId: q.id } });
      }
    }
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

  // File-submission models (Submission + SubmissionFile) - DB-only placeholders
  if (createdStudents[0]) {
    const sub = await prisma.submission.findFirst({ where: { assignmentId: essay.id, studentId: createdStudents[0].id } });
    const submission = sub
      ? sub
      : await prisma.submission.create({ data: { assignmentId: essay.id, studentId: createdStudents[0].id, status: 'submitted' } });

    const hasFile = await prisma.submissionFile.findFirst({ where: { submissionId: submission.id } });
    if (!hasFile) {
      await prisma.submissionFile.create({
        data: {
          submissionId: submission.id,
          fileName: 'bai-lam-demo.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 120_000,
          storagePath: `submissions/${essay.id}/${createdStudents[0].id}/seed-demo.pdf`,
        },
      });
    }
  }

  // Announcements for classroom2
  const annContent = 'Tuần này kiểm tra 15 phút chương Giới hạn.';
  const existingAnn = await prisma.announcement.findFirst({ where: { classroomId: classroom2.id, content: annContent } });
  if (!existingAnn) {
    const ann = await prisma.announcement.create({
      data: {
        classroomId: classroom2.id,
        authorId: teacher2.id,
        content: annContent,
        status: 'PENDING',
        organizationId: org.id,
      },
    });
    if (createdStudents[0]) {
      await prisma.announcementComment.create({ data: { announcementId: ann.id, authorId: createdStudents[0].id, content: 'Đã rõ ạ!' } });
    }
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
          participants: {
            create: [
              { userId: teacher2.id, roleInConv: 'TEACHER' },
              { userId: stu0.id, roleInConv: 'STUDENT' },
              { userId: par0.id, roleInConv: 'PARENT' },
            ],
          },
          messages: {
            create: [
              { senderId: teacher2.id, content: 'Chào anh/chị và em, đây là nhóm trao đổi về kết quả học tập.' },
              { senderId: par0.id, content: 'Cảm ơn cô, mong cô hỗ trợ thêm cho cháu.' },
              { senderId: stu0.id, content: 'Em sẽ cố gắng ạ.' },
            ],
          },
        },
      });
    }
  }

  const stu1 = createdStudents[1];
  if (stu1) {
    const dm = await prisma.conversation.findFirst({
      where: { type: 'DM', participants: { some: { userId: teacher2.id } } },
      include: { participants: true },
    });
    const dmHasStu1 = dm && dm.participants.some((p) => p.userId === stu1.id);
    if (!dm || !dmHasStu1) {
      await prisma.conversation.create({
        data: {
          type: 'DM',
          createdById: teacher2.id,
          participants: {
            create: [
              { userId: teacher2.id, roleInConv: 'TEACHER' },
              { userId: stu1.id, roleInConv: 'STUDENT' },
            ],
          },
          messages: {
            create: [
              { senderId: teacher2.id, content: 'Chào em, có khó khăn gì trong phần đạo hàm không?' },
              { senderId: stu1.id, content: 'Dạ em đang xem lại ví dụ 2 ạ.' },
            ],
          },
        },
      });
    }
  }

  // Seed quiz attempt + exam events (anti-cheat coverage)
  if (quiz && createdStudents.length > 0) {
    const demoStudents = createdStudents.slice(0, 2);
    for (const stu of demoStudents) {
      await prisma.assignmentAttempt.upsert({
        where: { assignmentId_studentId_attemptNumber: { assignmentId: quiz.id, studentId: stu.id, attemptNumber: 1 } },
        update: {},
        create: {
          assignmentId: quiz.id,
          studentId: stu.id,
          attemptNumber: 1,
          shuffleSeed: Math.floor(Math.random() * 1000000),
          timeLimitMinutes: 15,
          status: 'FINISHED',
          endedAt: new Date(Date.now() - 2 * 60_000),
        },
      });

      const hasEvents = await prisma.examEvent.findFirst({
        where: { assignmentId: quiz.id, studentId: stu.id, attempt: 1 },
        select: { id: true },
      });
      if (!hasEvents) {
        const base = Date.now() - 10 * 60_000;
        const events = [
          { dt: 5_000, type: 'TAB_SWITCH', meta: { count: 1 } },
          { dt: 20_000, type: 'WINDOW_BLUR', meta: { count: 1 } },
          { dt: 35_000, type: 'COPY', meta: { count: 1 } },
          { dt: 55_000, type: 'PASTE', meta: { count: 1 } },
          { dt: 75_000, type: 'FULLSCREEN_EXIT', meta: { count: 1 } },
          { dt: 95_000, type: 'DEVTOOLS_OPEN', meta: { count: 1 } },
        ];
        await prisma.examEvent.createMany({
          data: events.map((e) => ({
            assignmentId: quiz.id,
            studentId: stu.id,
            attempt: 1,
            eventType: e.type,
            createdAt: new Date(base + e.dt),
            metadata: e.meta,
          })),
        });
      }
    }
  }

  // Seed notifications via system_settings (notificationRepo)
  {
    const nowIso = new Date().toISOString();
    const mk = (suffix) => `n_seed_${Date.now()}_${suffix}_${Math.random().toString(36).slice(2)}`;
    await mergeNotificationSetting(teacher2.id, [
      {
        id: mk('t1'),
        type: 'SYSTEM',
        title: 'Seed dữ liệu mẫu thành công',
        description: 'Dữ liệu demo đã được tạo để test UI nhanh.',
        createdAt: nowIso,
        read: false,
        severity: 'INFO',
        dedupeKey: 'seed:teacher:system_ok',
      },
      {
        id: mk('t2'),
        type: 'TEACHER_ANTI_CHEAT_ALERT',
        title: 'Cảnh báo thi (demo)',
        description: 'Có học sinh rời fullscreen / mở devtools (demo).',
        createdAt: nowIso,
        read: false,
        severity: 'WARNING',
        actionUrl: '/dashboard/teacher/exams/monitor',
        dedupeKey: 'seed:teacher:anti_cheat_alert',
      },
    ]);

    if (createdStudents[0]) {
      await mergeNotificationSetting(createdStudents[0].id, [
        {
          id: mk('s1'),
          type: 'STUDENT_ASSIGNMENT_DUE_24H',
          title: 'Nhắc hạn nộp (demo)',
          description: 'Bạn có bài sắp đến hạn, vui lòng kiểm tra.',
          createdAt: nowIso,
          read: false,
          severity: 'INFO',
          dedupeKey: 'seed:student:due_24h',
        },
      ]);
    }
    if (createdParents[0]) {
      await mergeNotificationSetting(createdParents[0].id, [
        {
          id: mk('p1'),
          type: 'PARENT_WEEKLY_SUMMARY',
          title: 'Tóm tắt tuần (demo)',
          description: 'Có báo cáo tiến độ học tập mới.',
          createdAt: nowIso,
          read: false,
          severity: 'INFO',
          actionUrl: '/dashboard/parent/progress',
          dedupeKey: 'seed:parent:weekly_summary',
        },
      ]);
    }
  }

  // Approved + pinned announcement sample
  {
    const approvedContent = 'Thông báo đã duyệt (demo): Lịch học bù chiều thứ 6.';
    const existed = await prisma.announcement.findFirst({ where: { classroomId: classroom2.id, content: approvedContent } });
    if (!existed) {
      const ann = await prisma.announcement.create({
        data: {
          classroomId: classroom2.id,
          authorId: teacher2.id,
          content: approvedContent,
          status: 'APPROVED',
          pinnedAt: new Date(),
          moderatedAt: new Date(),
          moderatedById: teacher2.id,
          organizationId: org.id,
        },
      });
      if (createdStudents[0]) {
        await prisma.announcementComment.create({
          data: {
            announcementId: ann.id,
            authorId: createdStudents[0].id,
            content: 'Dạ em cảm ơn cô ạ!',
            status: 'APPROVED',
          },
        });
      }
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


