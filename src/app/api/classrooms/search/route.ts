import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

// Accent-insensitive normalize (fallback if DB unaccent not enabled). Kept minimal for server-side comparisons where needed.
function normalizeVi(input?: string) {
    return (input ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

interface ClassroomSearchRow {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date | string;
    teacher: {
        fullname: string | null;
    } | null;
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const authUser = await getAuthenticatedUser(req);
        if (!authUser) {
            return errorResponse(401, "Unauthorized");
        }
        if (authUser.role !== "STUDENT") {
            return errorResponse(403, "Forbidden - STUDENT role required");
        }

        const userId = authUser.id;

        const q = url.searchParams.get("q") ?? undefined;
        const qStr = (q ?? "").trim();
        // const subject = url.searchParams.get("subject") ?? undefined; // Classroom không có trường subject
        const teacher = url.searchParams.get("teacher") ?? undefined;
        // const grade = url.searchParams.get("grade") ?? undefined; // Classroom không có trường grade
        const _visibility = url.searchParams.get("visibility") as
            | "PUBLIC"
            | "JOINABLE"
            | null;
        const sort = (url.searchParams.get("sort") as "relevance" | "newest" | null) ?? "relevance";
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "12", 10) || 12, 50);
        const cursor = url.searchParams.get("cursor") ?? undefined;

        const normalizedQ = normalizeVi(q);
        if (normalizedQ.length < 2) {
            return NextResponse.json({ items: [], nextCursor: undefined });
        }

        // Build Prisma where clause
        const where: any = {
            isActive: true,
            // Exclude classes the student already joined
            students: { none: { studentId: userId } },
            OR: [
                { name: { contains: qStr, mode: "insensitive" } },
                { description: { contains: qStr, mode: "insensitive" } },
                { teacher: { fullname: { contains: qStr, mode: "insensitive" } } },
            ],
        };

        if (teacher) {
            where.teacher = { fullname: { contains: teacher, mode: "insensitive" } };
        }

        // Order
        const orderBy =
            sort === "newest"
                ? [{ createdAt: "desc" as const }, { id: "desc" as const }]
                : [{ createdAt: "desc" as const }, { id: "desc" as const }];

        // Pagination with cursor on id
        const classes = await prisma.classroom.findMany({
            where,
            orderBy,
            take: limit + 1,
            select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
                teacher: { select: { fullname: true } },
            },
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }) as ClassroomSearchRow[];

        let nextCursor: string | undefined = undefined;
        if (classes.length > limit) {
            const nextItem = classes.pop();
            nextCursor = nextItem?.id;
        }

        const items = classes.map((c: ClassroomSearchRow) => ({
            id: c.id,
            name: c.name,
            teacherName: c.teacher?.fullname ?? "",
            createdAt:
                c.createdAt instanceof Date
                    ? c.createdAt.toISOString()
                    : String(c.createdAt),
            joined: false,
        }));

        return NextResponse.json({ items, nextCursor });
    } catch (err) {
        console.error("/api/classrooms/search error", err);
        return errorResponse(500, "Internal server error");
    }
}


