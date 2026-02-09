import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const { data } = await supabase
    .from("grades")
    .select(`
      id, name, type,
      seasons!inner(name, competitions!inner(name))
    `)
    .ilike("name", `%${q}%`)
    .limit(15);

  const results = (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    season_name: g.seasons?.name || "",
    competition_name: g.seasons?.competitions?.name || "",
  }));

  return NextResponse.json(results);
}
