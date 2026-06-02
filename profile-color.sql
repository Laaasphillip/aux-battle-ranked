-- Run in Supabase SQL Editor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS character_color TEXT NOT NULL DEFAULT '#ef4444';
