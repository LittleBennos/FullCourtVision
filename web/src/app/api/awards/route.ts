import { NextRequest, NextResponse } from "next/server";
import { getSeasonAwards } from "@/lib/data";

export async function GET(request: NextRequest) {
  const seasonName = request.nextUrl.searchParams.get("season");
  if (!seasonName) {
    return NextResponse.json({ error: "season parameter required" }, { status: 400 });
  }
  const awards = await getSeasonAwards(seasonName);
  return NextResponse.json(awards);
}
