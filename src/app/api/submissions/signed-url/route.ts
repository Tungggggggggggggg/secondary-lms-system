import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "lms-submissions";

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser(req, UserRole.STUDENT);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const path = url.searchParams.get("path");
        if (!path) {
            return NextResponse.json({ success: false, message: "path is required" }, { status: 400 });
        }

        // Students may only request URLs under their own submission directory
        // submissions/{assignmentId}/{studentId}/...
        const parts = path.split("/");
        if (parts.length < 4 || parts[0] !== "submissions" || parts[2] !== user.id) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ success: false, message: "Supabase admin client is not available" }, { status: 500 });
        }
        const admin = supabaseAdmin;
        const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
        if (error || !data?.signedUrl) {
            return NextResponse.json({ success: false, message: "Failed to create signed url" }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: { url: data.signedUrl } });
    } catch (error) {
        console.error("[ERROR] [GET] /api/submissions/signed-url", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}


