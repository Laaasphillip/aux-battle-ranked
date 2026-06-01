-- Run this in Supabase SQL Editor

-- Add elo column (default 500 = starting elo)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS elo INT NOT NULL DEFAULT 500;

-- Replace old increment RPCs with new ones that handle elo too
DROP FUNCTION IF EXISTS increment_wins(UUID);
DROP FUNCTION IF EXISTS increment_losses(UUID);

CREATE OR REPLACE FUNCTION apply_win(p_user_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE profiles SET wins = wins + 1, elo = elo + 10 WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION apply_loss(p_user_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE profiles SET losses = losses + 1, elo = GREATEST(0, elo - 10) WHERE id = p_user_id;
$$;
