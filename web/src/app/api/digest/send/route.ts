import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DIGEST_API_KEY = process.env.DIGEST_API_KEY || "fcv-digest-key-2026";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

type PlayerGame = {
  player_name: string;
  player_id: string;
  team_name: string;
  games_played: number;
  total_points: number;
  ppg: number;
  one_point: number;
  two_point: number;
  three_point: number;
};

function generateEmailHTML(
  email: string,
  playerStats: PlayerGame[],
  siteUrl: string
): string {
  const playerRows = playerStats
    .map(
      (p) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155;">
          <a href="${siteUrl}/players/${p.player_id}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">${p.player_name}</a>
          <div style="color: #94a3b8; font-size: 13px; margin-top: 2px;">${p.team_name}</div>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: center; color: #e2e8f0;">${p.games_played}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: center; color: #60a5fa; font-weight: 700; font-size: 18px;">${p.ppg}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: center; color: #e2e8f0;">${p.total_points}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #334155; text-align: center; color: #e2e8f0;">
          <span style="color: #94a3b8;">${p.one_point}</span> /
          <span style="color: #e2e8f0;">${p.two_point}</span> /
          <span style="color: #60a5fa;">${p.three_point}</span>
        </td>
      </tr>`
    )
    .join("");

  const noPlayers =
    playerStats.length === 0
      ? `<tr><td colspan="5" style="padding: 24px; text-align: center; color: #94a3b8;">No recent stats found for your followed players.</td></tr>`
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="text-align: center; padding: 32px 0; border-bottom: 1px solid #1e293b;">
      <h1 style="margin: 0; color: #60a5fa; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🏀 FullCourtVision</h1>
      <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Weekly Digest</p>
    </div>

    <!-- Greeting -->
    <div style="padding: 24px 0;">
      <p style="color: #e2e8f0; font-size: 16px; margin: 0;">Here's your weekly roundup of player stats from your favourites.</p>
    </div>

    <!-- Stats Table -->
    <div style="background: #0f172a; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #1e293b;">
            <th style="padding: 12px 16px; text-align: left; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Player</th>
            <th style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">GP</th>
            <th style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">PPG</th>
            <th style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
            <th style="padding: 12px 16px; text-align: center; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">1/2/3PT</th>
          </tr>
        </thead>
        <tbody>
          ${playerRows}${noPlayers}
        </tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align: center; padding: 32px 0;">
      <a href="${siteUrl}/favourites" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Your Favourites</a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #1e293b; padding: 24px 0; text-align: center;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        You're receiving this because you subscribed at FullCourtVision.
        <br><a href="${siteUrl}/api/digest/subscribe?email=${encodeURIComponent(email)}&action=unsubscribe" style="color: #60a5fa; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  // Simple API key auth
  const apiKey =
    req.headers.get("x-api-key") ||
    req.nextUrl.searchParams.get("key");

  if (apiKey !== DIGEST_API_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Fetch all subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from("email_subscriptions")
    .select("*")
    .eq("verified", true);

  if (subError) return json({ error: subError.message }, 500);
  if (!subscriptions || subscriptions.length === 0) {
    return json({ message: "No active subscriptions", sent: 0 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fullcourtvision.com";
  const results: { email: string; players: number; status: string }[] = [];

  for (const sub of subscriptions) {
    const playerIds: string[] = sub.player_ids || [];

    if (playerIds.length === 0) {
      results.push({ email: sub.email, players: 0, status: "skipped_no_players" });
      continue;
    }

    // Query player stats for their followed players
    const { data: stats } = await supabase
      .from("player_stats")
      .select(`
        player_id, team_name, games_played, total_points,
        one_point, two_point, three_point,
        players!inner(first_name, last_name)
      `)
      .in("player_id", playerIds);

    const playerStats: PlayerGame[] = (stats || []).map((s: any) => ({
      player_id: s.player_id,
      player_name: `${s.players.first_name} ${s.players.last_name}`,
      team_name: s.team_name || "Unknown",
      games_played: s.games_played || 0,
      total_points: s.total_points || 0,
      ppg: s.games_played > 0 ? Math.round((s.total_points / s.games_played) * 10) / 10 : 0,
      one_point: s.one_point || 0,
      two_point: s.two_point || 0,
      three_point: s.three_point || 0,
    }));

    // Deduplicate by player_id, keeping highest total_points entry
    const bestByPlayer = new Map<string, PlayerGame>();
    for (const p of playerStats) {
      const existing = bestByPlayer.get(p.player_id);
      if (!existing || p.total_points > existing.total_points) {
        bestByPlayer.set(p.player_id, p);
      }
    }

    const dedupedStats = Array.from(bestByPlayer.values()).sort(
      (a, b) => b.ppg - a.ppg
    );

    const emailHTML = generateEmailHTML(sub.email, dedupedStats, siteUrl);

    // Log the email content (no email service configured)
    console.log(`\n${"=".repeat(60)}`);
    console.log(`DIGEST EMAIL for: ${sub.email}`);
    console.log(`Players tracked: ${dedupedStats.length}`);
    console.log(`${"=".repeat(60)}`);
    console.log(emailHTML);
    console.log(`${"=".repeat(60)}\n`);

    results.push({
      email: sub.email,
      players: dedupedStats.length,
      status: "logged",
    });
  }

  return json({
    message: `Processed ${results.length} subscriptions`,
    sent: results.length,
    results,
  });
}
