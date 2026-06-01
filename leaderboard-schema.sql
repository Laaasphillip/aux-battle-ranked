-- Run this entire file in Supabase: SQL Editor → paste → Run
-- After running, also go to: Authentication → Providers → Email → turn off "Confirm email"

CREATE TABLE profiles (
  id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  wins     INT NOT NULL DEFAULT 0,
  losses   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);

ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS player1_user_id UUID,
  ADD COLUMN IF NOT EXISTS player2_user_id UUID;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username')
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION increment_wins(p_user_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE profiles SET wins = wins + 1 WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION increment_losses(p_user_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE profiles SET losses = losses + 1 WHERE id = p_user_id;
$$;
