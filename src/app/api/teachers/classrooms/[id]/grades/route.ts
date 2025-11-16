import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

// GET: Danh sách submissions/grades của lớp cho giáo viên (newest-first, filter, search)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const classroomId = params.id;
    if (!classroomId) {
      return NextResponse.json(
        { success: false, message: "classroomId is required", requestId },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    const owns = await isTeacherOfClassroom(user.id, classroomId);
    if (!owns) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your classroom", requestId },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "all") as "all" | "graded" | "ungraded";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    // Lấy assignmentIds của lớp
    const ac = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });
    const assignmentIds = Array.from(new Set(ac.map((x) => x.assignmentId)));
    if (assignmentIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], statistics: { total: 0, graded: 0 }, requestId },
        { status: 200 }
      );
    }

    // Lấy danh sách học sinh trong lớp
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      include: {
        student: { select: { id: true, fullname: true, email: true } },
      },
    });

    const studentIds = classroomStudents.map((cs) => cs.studentId);
    if (studentIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], statistics: { total: 0, graded: 0 }, requestId },
        { status: 200 }
      );
    }

    // Lấy thông tin assignments
    const assignments = await prisma.assignment.findMany({
      where: { id: { in: assignmentIds } },
      select: { id: true, title: true, type: true, dueDate: true },
    });
    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

    // Lấy tất cả submissions (để lấy attempt mới nhất của mỗi cặp student-assignment)
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        studentId: { in: studentIds },
      },
      include: {
        assignment: { select: { id: true } },
        student: { select: { id: true, fullname: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Giữ lại submission mới nhất cho mỗi (student, assignment)
    const latestMap = new Map<string, (typeof submissions)[number]>();
    for (const s of submissions) {
      const key = `${s.student.id}-${s.assignment.id}`;
      if (!latestMap.has(key)) {
        latestMap.set(key, s);
      }
    }
    const latestSubmissions = Array.from(latestMap.values());

    const submissionRows = latestSubmissions.map((s) => {
      const assignment = assignmentMap.get(s.assignment.id);
      return {
        id: s.id,
        student: {
          id: s.student.id,
          fullname: s.student.fullname,
          email: s.student.email,
        },
        assignment: {
          id: assignment?.id ?? s.assignment.id,
          title: assignment?.title ?? "",
          type: assignment?.type ?? "ESSAY",
          dueDate: assignment?.dueDate?.toISOString() || null,
        },
        grade: s.grade,
        feedback: s.feedback,
        submittedAt: s.submittedAt.toISOString() as string | null,
        status: s.grade !== null ? "graded" : "submitted",
      };
    });

    // Tạo các bản ghi ảo điểm 0 cho (student, assignment) chưa có submission
    const existingKeys = new Set(
      latestSubmissions.map((s) => `${s.student.id}-${s.assignment.id}`)
    );

    const now = new Date();
    const virtualRows = classroomStudents.flatMap((cs) =>
      assignmentIds
        .filter((assignmentId) => !existingKeys.has(`${cs.studentId}-${assignmentId}`))
        .map((assignmentId) => {
          const assignment = assignmentMap.get(assignmentId);
          const isPastDue =
            assignment?.dueDate !== null &&
            assignment?.dueDate !== undefined &&
            assignment.dueDate < now;

          return {
            id: `virtual-${cs.studentId}-${assignmentId}`,
            student: {
              id: cs.student.id,
              fullname: cs.student.fullname,
              email: cs.student.email,
            },
            assignment: {
              id: assignmentId,
              title: assignment?.title ?? "",
              type: assignment?.type ?? "ESSAY",
              dueDate: assignment?.dueDate
                ? assignment.dueDate.toISOString()
                : null,
            },
            grade: isPastDue ? 0 : null,
            feedback: null as string | null,
            submittedAt: null as string | null,
            status: isPastDue ? "graded" : "submitted",
          };
        })
    );

    // Gộp rows thật + ảo
    let allRows = [...submissionRows, ...virtualRows];

    // Lọc theo status
    if (status === "graded") {
      allRows = allRows.filter((r) => r.grade !== null);
    } else if (status === "ungraded") {
      allRows = allRows.filter((r) => r.grade === null);
    }

    // Lọc theo search
    if (search) {
      const q = search.toLowerCase();
      allRows = allRows.filter(
        (d) =>
          d.student.fullname.toLowerCase().includes(q) ||
          d.student.email.toLowerCase().includes(q) ||
          d.assignment.title.toLowerCase().includes(q)
      );
    }

    // Tổng và số đã chấm
    const total = allRows.length;
    const graded = allRows.filter((d) => d.grade !== null).length;

    // Sort newest-first theo submittedAt (null sẽ xuống cuối, dùng dueDate fallback)
    allRows.sort((a, b) => {
      const aTime = a.submittedAt
        ? new Date(a.submittedAt).getTime()
        : a.assignment.dueDate
        ? new Date(a.assignment.dueDate).getTime()
        : 0;
      const bTime = b.submittedAt
        ? new Date(b.submittedAt).getTime()
        : b.assignment.dueDate
        ? new Date(b.assignment.dueDate).getTime()
        : 0;
      return bTime - aTime;
    });

    // Pagination in-memory
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageRows = allRows.slice(start, end);

    const res = NextResponse.json(
      {
        success: true,
        data: pageRows,
        statistics: { total, graded },
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        requestId,
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "public, max-age=10, s-maxage=30, stale-while-revalidate=60");
    return res;
  } catch (error) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/grades {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


