import { NextResponse } from "next/server";

/**
 * GET /api/admin/organizations/[id]
 *
 * Input (params):
 * - id: string
 *
 * Output:
 * - success true + organization detail (kèm _count)
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
 * PATCH /api/admin/organizations/[id]
 *
 * Input:
 * - params.id: string
 * - body: { name?: string; slug?: string | null; status?: 'ACTIVE' | 'INACTIVE' }
 *
 * Output:
 * - success true + updated organization
 *
 * Side effects:
 * - Update DB
 * - Write audit log
 */
export async function PATCH() {
  return NextResponse.json(
    { success: false, error: true, message: "Endpoint đã bị gỡ bỏ", details: null },
    { status: 410 }
  );
}
