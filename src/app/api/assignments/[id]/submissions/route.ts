import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

/**
 * GET /api/assignments/[id]/submissions
 * Lấy danh sách submissions cho assignment (teacher view)
 * OPTIMIZED: Filter (graded/ungraded/all), search, pagination
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    console.log(`[${requestId}] [GET] /api/assignments/[id]/submissions - Bắt đầu xử lý request`);
    console.log(`[${requestId}] Params:`, params);
    console.log(`[${requestId}] URL:`, req.url);

    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) {
      console.log(`[${requestId}] Unauthorized - No user found`);
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    console.log(`[${requestId}] AssignmentId: "${assignmentId}", UserId: "${user.id}"`);

    // Validation assignmentId
    if (!assignmentId || assignmentId === "undefined" || assignmentId === "null") {
      console.error(`[${requestId}] Invalid assignmentId: "${assignmentId}"`);
      return NextResponse.json(
        { success: false, message: "Invalid assignment ID" },
        { status: 400 }
      );
    }

    // Kiểm tra teacher có sở hữu assignment không
    console.log(`[${requestId}] Checking if teacher owns assignment...`);
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    console.log(`[${requestId}] Teacher owns assignment: ${isOwner}`);
    
    if (!isOwner) {
      console.log(`[${requestId}] Forbidden - Teacher ${user.id} does not own assignment ${assignmentId}`);
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your assignment" },
        { status: 403 }
      );
    }

    // Parse query params
    const url = req.url ? new URL(req.url, "http://localhost") : null;
    const status = url?.searchParams.get("status"); // "all" | "graded" | "ungraded"
    const search = url?.searchParams.get("search"); // Search theo tên học sinh
    const page = url?.searchParams.get("page")
      ? Number(url.searchParams.get("page"))
      : 1;
    const limit = url?.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : 50;
    const skip = (page - 1) * limit;

    // Xây dựng where clause
    const whereClause: any = {
      assignmentId,
    };

    // Filter theo status (graded/ungraded)
    if (status === "graded") {
      whereClause.grade = { not: null };
    } else if (status === "ungraded") {
      whereClause.grade = null;
    }

    // Search theo tên học sinh
    if (search && search.trim()) {
      whereClause.student = {
        OR: [
          { fullname: { contains: search.trim(), mode: "insensitive" } },
          { email: { contains: search.trim(), mode: "insensitive" } },
        ],
      };
    }

    // Fetch text-based submissions (old model)
    const textSubs = await prisma.assignmentSubmission.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        attempt: true,
        studentId: true,
        student: { select: { id: true, fullname: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    interface TextSubmissionRow {
      id: string;
      content: string;
      grade: number | null;
      feedback: string | null;
      submittedAt: Date;
      attempt: number | null;
      studentId: string;
      student: {
        id: string;
        fullname: string | null;
        email: string;
      };
    }

    // Fetch file-based submissions (new model)
    const fileSubsRaw = await prisma.submission.findMany({
      where: { assignmentId },
      select: {
        id: true,
        createdAt: true,
        studentId: true,
        _count: { select: { files: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    interface FileSubmissionRow {
      id: string;
      createdAt: Date;
      studentId: string;
      _count: {
        files: number;
      };
    }

    interface StudentRow {
      id: string;
      fullname: string | null;
      email: string;
    }

    // Fetch student info for file-based subs
    const studentIds = Array.from(
      new Set(
        (fileSubsRaw as FileSubmissionRow[]).map(
          (s: FileSubmissionRow) => s.studentId,
        ),
      ),
    );
    const students: StudentRow[] = studentIds.length
      ? ((await prisma.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, fullname: true, email: true },
        })) as StudentRow[])
      : [];
    const studentMap = new Map<string, StudentRow>(
      students.map((u: StudentRow) => [u.id, u] as const),
    );

    // fetch existing grades for file-based submissions from assignmentSubmission table
    interface FileGradeRow {
      studentId: string;
      grade: number | null;
      feedback: string | null;
    }

    const fileGrades: FileGradeRow[] = studentIds.length
      ? ((await prisma.assignmentSubmission.findMany({
          where: { assignmentId, studentId: { in: studentIds } },
          select: { studentId: true, grade: true, feedback: true },
        })) as FileGradeRow[])
      : [];
    const fileGradeMap = new Map<string, { grade: number | null; feedback: string | null }>(
      fileGrades.map((g: FileGradeRow) => [g.studentId, { grade: g.grade, feedback: g.feedback }]),
    );

    // Build set of studentIds that submitted via files
    const fileStudentIds = new Set(
      (fileSubsRaw as FileSubmissionRow[]).map(
        (s: FileSubmissionRow) => s.studentId,
      ),
    );

    // Filter out text submissions that are only placeholders for grading file-based submissions
    const filteredTextSubs = (textSubs as TextSubmissionRow[]).filter(
      (s: TextSubmissionRow) => {
        const isPlaceholder =
          (!s.content || s.content.trim() === "") &&
          fileStudentIds.has(s.studentId);
        return !isPlaceholder;
      },
    );

    const merged = [
      ...filteredTextSubs.map((s: TextSubmissionRow) => ({
        id: s.id,
        content: s.content,
        grade: s.grade,
        feedback: s.feedback,
        submittedAt: s.submittedAt.toISOString(),
        attempt: s.attempt,
        student: s.student,
        isFileSubmission: false,
        filesCount: 0,
      })),
      ...((fileSubsRaw as FileSubmissionRow[]).map(
        (s: FileSubmissionRow) => ({
          id: s.id,
          content: `Nộp file (${s._count.files} tệp)` ,
          grade: fileGradeMap.get(s.studentId)?.grade ?? null,
          feedback: fileGradeMap.get(s.studentId)?.feedback ?? null,
          submittedAt: s.createdAt.toISOString(),
          attempt: 1,
          student:
            studentMap.get(s.studentId) ||
            ({ id: s.studentId, fullname: "", email: "" } as StudentRow),
          isFileSubmission: true,
          filesCount: s._count.files,
        }),
      )),
    ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    // Apply optional filters to merged results
    const filtered = merged.filter((item) => {
      let ok = true;
      if (status === "graded") ok = ok && item.grade !== null;
      if (status === "ungraded") ok = ok && item.grade === null;
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        ok = ok && ((item.student.fullname || "").toLowerCase().includes(q) || (item.student.email || "").toLowerCase().includes(q));
      }
      return ok;
    });

    const total = filtered.length;
    const pageMerged = filtered.slice(skip, skip + limit);

    console.log(
      `[INFO] [GET] /api/assignments/${assignmentId}/submissions - Found ${pageMerged.length} submissions (total: ${total}, page: ${page})`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          submissions: pageMerged,
          total,
          page,
          limit,
          hasMore: skip + pageMerged.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/assignments/[id]/submissions - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

