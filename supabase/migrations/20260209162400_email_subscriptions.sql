-- Create email_subscriptions table for weekly digest feature
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  player_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  team_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (subscribe)
CREATE POLICY "Allow anonymous insert" ON email_subscriptions
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anonymous select by email (check status)
CREATE POLICY "Allow anonymous select" ON email_subscriptions
  FOR SELECT TO anon USING (true);

-- Allow anonymous delete (unsubscribe)
CREATE POLICY "Allow anonymous delete" ON email_subscriptions
  FOR DELETE TO anon USING (true);

-- Allow anonymous update (update player_ids/team_ids)
CREATE POLICY "Allow anonymous update" ON email_subscriptions
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Service role has full access by default
