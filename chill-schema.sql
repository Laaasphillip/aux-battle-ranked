-- Run this in Supabase SQL Editor
-- After running, go to Supabase Dashboard → Database → Replication
-- and enable Realtime for: chill_queue, chill_messages

CREATE TABLE chill_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chill_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chill_rooms(id) ON DELETE CASCADE,
  track JSONB NOT NULL,
  queued_by TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting',
  skip_votes INT NOT NULL DEFAULT 0,
  skip_voter_ids TEXT[] NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chill_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chill_rooms(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chill_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chill_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE chill_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chill_rooms_read"    ON chill_rooms    FOR SELECT USING (true);
CREATE POLICY "chill_queue_read"    ON chill_queue    FOR SELECT USING (true);
CREATE POLICY "chill_messages_read" ON chill_messages FOR SELECT USING (true);

ALTER TABLE chill_queue    REPLICA IDENTITY FULL;
ALTER TABLE chill_messages REPLICA IDENTITY FULL;
