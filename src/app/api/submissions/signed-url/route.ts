import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";

const querySchema = z
    .object({
        path: z.string().min(1).max(1024),
    })
    .strict();

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) return errorResponse(401, "Unauthorized");
        if (user.role !== "STUDENT") return errorResponse(403, "Forbidden");

        const url = new URL(req.url);
        const parsedQuery = querySchema.safeParse({
            path: url.searchParams.get("path") ?? "",
        });
        if (!parsedQuery.success) {
            return errorResponse(400, "Dữ liệu không hợp lệ", {
                details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
        }

        const { path } = parsedQuery.data;

        if (path.includes("..") || path.includes("\\")) {
            return errorResponse(400, "Invalid path");
        }

        // Students may only request URLs under their own submission directory
        // submissions/{assignmentId}/{studentId}/...
        const parts = path.split("/");
        if (parts.length < 4 || parts[0] !== "submissions" || parts[2] !== user.id) {
            return errorResponse(403, "Forbidden");
        }

        if (!supabaseAdmin) {
            return errorResponse(500, "Supabase admin client is not available");
        }
        const admin = supabaseAdmin;
        const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
        if (error || !data?.signedUrl) {
            return errorResponse(500, "Failed to create signed url");
        }
        return NextResponse.json({ success: true, data: { url: data.signedUrl } });
    } catch (error: unknown) {
        console.error("[ERROR] [GET] /api/submissions/signed-url", error);
        return errorResponse(500, "Internal server error");
    }
}


