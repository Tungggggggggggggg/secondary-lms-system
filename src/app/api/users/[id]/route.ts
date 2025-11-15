import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx?.params?.id;
  if (!id) return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });
  return NextResponse.json({ success: true, data: { id }, message: "Not implemented" }, { status: 501 });
}

