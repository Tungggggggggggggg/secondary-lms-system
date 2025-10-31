import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Accent-insensitive normalize (fallback if DB unaccent not enabled). Kept minimal for server-side comparisons where needed.
function normalizeVi(input?: string) {
    return (input ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== "STUDENT") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id as string;

        const q = url.searchParams.get("q") ?? undefined;
        const subject = url.searchParams.get("subject") ?? undefined;
        const teacher = url.searchParams.get("teacher") ?? undefined;
        const grade = url.searchParams.get("grade") ?? undefined;
        const visibility = url.searchParams.get("visibility") as
            | "PUBLIC"
            | "JOINABLE"
            | null;
        const sort = (url.searchParams.get("sort") as "relevance" | "newest" | null) ?? "relevance";
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "12", 10) || 12, 50);
        const cursor = url.searchParams.get("cursor") ?? undefined;

        // Build Prisma where clause
        const where: any = {
            isArchived: false,
            // Exclude classes the student already joined
            enrollments: { none: { studentId: userId } },
        };

        if (q) {
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { subject: { contains: q, mode: "insensitive" } },
                { teacher: { name: { contains: q, mode: "insensitive" } } },
            ];
        }
        if (subject) {
            where.subject = { contains: subject, mode: "insensitive" };
        }
        if (teacher) {
            where.teacher = { name: { contains: teacher, mode: "insensitive" } };
        }
        if (grade) {
            // Assuming classroom has grade or gradeLevel as string/enum; adjust field name if needed
            where.grade = { equals: grade };
        }
        if (visibility === "JOINABLE") {
            where.isJoinable = true;
        }

        // Order
        const orderBy =
            sort === "newest"
                ? [{ createdAt: "desc" as const }, { id: "desc" as const }]
                : [{ createdAt: "desc" as const }, { id: "desc" as const }];

        // Pagination with cursor on id
        const queryArgs: any = {
            where,
            orderBy,
            take: limit + 1,
            include: {
                teacher: { select: { name: true } },
            },
        };
        if (cursor) {
            queryArgs.cursor = { id: cursor };
            queryArgs.skip = 1;
        }

        const classes = await prisma.classroom.findMany(queryArgs);

        let nextCursor: string | undefined = undefined;
        if (classes.length > limit) {
            const nextItem = classes.pop();
            nextCursor = nextItem?.id;
        }

        const items = classes.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            subject: c.subject ?? undefined,
            teacherName: c.teacher?.name ?? "",
            createdAt: c.createdAt.toISOString?.() ?? String(c.createdAt),
            joined: false,
        }));

        return NextResponse.json({ items, nextCursor });
    } catch (err) {
        console.error("/api/classrooms/search error", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}


