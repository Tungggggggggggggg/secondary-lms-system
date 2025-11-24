import { NextRequest, NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/logging/request";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";

// GET /api/admin/view-as -> trả về trạng thái xem như Staff (từ cookie)
export const GET = withRequestLogging(async (req: NextRequest) => {
  const cookie = req.cookies.get("view-as-staff")?.value || null;
  const viewAsStaff = cookie === "1";
  return NextResponse.json({ success: true, viewAsStaff });
}, { action: "ADMIN_VIEW_AS_GET" });

// POST /api/admin/view-as { viewAsStaff: boolean } -> set cookie view-as-staff
export const POST = withRequestLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");
  if (user.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden");

  let body: { viewAsStaff?: boolean } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const next = !!body.viewAsStaff;

  const res = NextResponse.json({ success: true, viewAsStaff: next });
  if (next) {
    res.cookies.set("view-as-staff", "1", { path: "/", sameSite: "lax" });
  } else {
    res.cookies.set("view-as-staff", "", { path: "/", maxAge: 0, sameSite: "lax" });
  }
  return res;
}, { action: "ADMIN_VIEW_AS_SET" });
