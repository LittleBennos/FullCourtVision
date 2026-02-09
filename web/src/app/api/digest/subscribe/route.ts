import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// GET — check subscription status by email
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return json({ error: "Email required" }, 400);

  const { data, error } = await supabase
    .from("email_subscriptions")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ subscribed: false });

  return json({ subscribed: true, subscription: data });
}

// POST — create or update subscription
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, player_ids = [], team_ids = [] } = body;

    if (!email || typeof email !== "string") {
      return json({ error: "Valid email required" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return json({ error: "Invalid email format" }, 400);
    }

    // Upsert subscription
    const { data, error } = await supabase
      .from("email_subscriptions")
      .upsert(
        {
          email: normalizedEmail,
          player_ids,
          team_ids,
          frequency: "weekly",
          verified: true,
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);

    return json({ success: true, subscription: data });
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
}

// DELETE — unsubscribe
export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return json({ error: "Email required" }, 400);

  const { error } = await supabase
    .from("email_subscriptions")
    .delete()
    .eq("email", email.toLowerCase());

  if (error) return json({ error: error.message }, 500);

  return json({ success: true });
}
