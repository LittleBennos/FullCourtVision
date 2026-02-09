import { GamesTable } from "@/components/games-table";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata = {
  title: "Game Log — FullCourtVision",
  description: "Browse recent basketball games with scores, venues, and match details across Victoria's competitions.",
};

export const revalidate = 3600;

export default async function GamesPage() {
  // Just get the count for the header — table handles its own data fetching
  const { count } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Game Log</h1>
      <p className="text-muted-foreground mb-6">
        {(count || 0).toLocaleString()} games recorded across all competitions
      </p>
      <GamesTable />
    </div>
  );
}