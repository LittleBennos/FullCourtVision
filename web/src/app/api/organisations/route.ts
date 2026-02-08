import { createClient } from "@supabase/supabase-js";
import { json, error, OPTIONS } from "../helpers";

export { OPTIONS };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data, error: dbError } = await supabase
    .from("organisations")
    .select("id, name, type, suburb, state, website")
    .order("name");

  if (dbError) return error(dbError.message, 500);

  return json({ data: data || [] });
}
