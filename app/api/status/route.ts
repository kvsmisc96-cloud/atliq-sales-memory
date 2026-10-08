import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ai: aiEnabled() });
}
