-- Run this in your Supabase SQL editor

create table if not exists battles (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  status text default 'waiting' check (status in ('waiting', 'ready', 'live', 'finished')),
  player1_name text,
  player2_name text,
  player1_track jsonb,
  player2_track jsonb,
  player1_votes int default 0,
  player2_votes int default 0,
  vote_duration int default 30,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists votes (
  id uuid default gen_random_uuid() primary key,
  battle_id uuid references battles(id) on delete cascade not null,
  voter_id text not null,
  voted_for int not null check (voted_for in (1, 2)),
  created_at timestamptz default now(),
  unique(battle_id, voter_id)
);

alter table battles enable row level security;
alter table votes enable row level security;

create policy "battles_select" on battles for select using (true);
create policy "battles_insert" on battles for insert with check (true);
create policy "battles_update" on battles for update using (true);

create policy "votes_select" on votes for select using (true);
create policy "votes_insert" on votes for insert with check (true);

alter publication supabase_realtime add table battles;
alter publication supabase_realtime add table votes;

create or replace function increment_votes(p_battle_id uuid, p_player int)
returns void as $$
begin
  if p_player = 1 then
    update battles set player1_votes = player1_votes + 1 where id = p_battle_id;
  else
    update battles set player2_votes = player2_votes + 1 where id = p_battle_id;
  end if;
end;
$$ language plpgsql security definer;
