import { createClient } from "@supabase/supabase-js";
import { json, error, OPTIONS } from "../../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data: seasons, error: dbError } = await supabase
    .from("seasons")
    .select("id, name")
    .order("name");

  if (dbError) return error(dbError.message, 500);

  // Deduplicate by name
  const seen = new Map<string, string>();
  for (const s of seasons || []) {
    if (!seen.has(s.name)) seen.set(s.name, s.id);
  }

  return json({
    seasons: Array.from(seen.entries()).map(([name, id]) => ({ id, name })),
  });
}
