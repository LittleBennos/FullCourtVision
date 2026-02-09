import { json, OPTIONS } from "../helpers";
import { supabase } from "@/lib/supabase";

export { OPTIONS };

export async function GET() {
  const { data, error: dbError } = await supabase
    .from("games")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (dbError || !data) {
    return json({ error: "Could not fetch data freshness" }, 500);
  }

  return json({ lastGameDate: data.date });
}
