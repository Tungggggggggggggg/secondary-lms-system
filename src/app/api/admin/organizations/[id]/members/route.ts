import { NextResponse } from "next/server";

/**
 * GET /api/admin/organizations/[id]/members
 *
 * Input:
 * - params.id: string
 * - query: { search?: string; cursor?: string; limit?: number }
 *
 * Output:
 * - success true + members list + nextCursor
 *
 * Side effects:
 * - Read DB
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: true, message: "Endpoint đã bị gỡ bỏ", details: null },
    { status: 410 }
  );
}

/**
 * POST /api/admin/organizations/[id]/members
 *
 * Input:
 * - params.id: string
 * - body: { userId: string; roleInOrg?: 'OWNER'|'ADMIN'|'TEACHER'|'STUDENT'|'PARENT' | null }
 *
 * Output:
 * - success true + upserted membership
 *
 * Side effects:
 * - Upsert DB
 * - Write audit log
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: true, message: "Endpoint đã bị gỡ bỏ", details: null },
    { status: 410 }
  );
}

/**
 * DELETE /api/admin/organizations/[id]/members
 *
 * Input:
 * - params.id: string
 * - body: { userId: string }
 *
 * Output:
 * - success true + removed (organizationId, userId)
 *
 * Side effects:
 * - Delete DB
 * - Write audit log
 */
export async function DELETE() {
  return NextResponse.json(
    { success: false, error: true, message: "Endpoint đã bị gỡ bỏ", details: null },
    { status: 410 }
  );
}
