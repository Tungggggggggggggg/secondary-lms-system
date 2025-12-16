import { NextResponse } from "next/server";

/**
 * GET /api/admin/organizations
 *
 * Input (query):
 * - search?: string
 * - cursor?: string
 * - limit?: number
 *
 * Output:
 * - success true + danh sách organizations + nextCursor
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
 * POST /api/admin/organizations
 *
 * Input (body):
 * - name: string
 * - slug?: string | null
 *
 * Output:
 * - success true + created organization
 *
 * Side effects:
 * - Insert DB
 * - Write audit log
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: true, message: "Endpoint đã bị gỡ bỏ", details: null },
    { status: 410 }
  );
}
