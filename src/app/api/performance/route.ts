import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { errorResponse } from "@/lib/api-utils";
import { getPerformanceStats, performanceMonitor } from "@/lib/performance-monitor";

function parseTimeRangeMinutes(value: string | null): number {
  const n = value ? Number(value) : 60;
  if (!Number.isFinite(n) || n <= 0) return 60;
  return Math.min(Math.max(Math.floor(n), 1), 24 * 60);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const { searchParams } = new URL(req.url);
    const timeRangeMinutes = parseTimeRangeMinutes(searchParams.get("timeRangeMinutes"));

    const stats = getPerformanceStats(timeRangeMinutes);
    const metrics = performanceMonitor.exportMetrics(timeRangeMinutes);

    return NextResponse.json({
      success: true,
      data: {
        timeRangeMinutes,
        stats,
        metrics,
      },
    });
  } catch (error) {
    console.error("[API /api/performance] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    performanceMonitor.clearMetrics();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /api/performance] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
