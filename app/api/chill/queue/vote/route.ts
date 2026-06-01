import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { entryId, voterId } = await req.json()
  if (!entryId || !voterId) return Response.json({ error: 'Missing fields' }, { status: 400 })

  const db = createAdminClient()

  const { data: entry } = await db
    .from('chill_queue')
    .select('skip_votes, skip_voter_ids')
    .eq('id', entryId)
    .single()

  if (!entry) return Response.json({ error: 'Not found' }, { status: 404 })
  if (entry.skip_voter_ids.includes(voterId)) {
    return Response.json({ error: 'Already voted', votes: entry.skip_votes }, { status: 409 })
  }

  const newVotes = entry.skip_votes + 1
  const newVoters = [...entry.skip_voter_ids, voterId]

  await db
    .from('chill_queue')
    .update({ skip_votes: newVotes, skip_voter_ids: newVoters })
    .eq('id', entryId)

  return Response.json({ votes: newVotes, shouldSkip: newVotes >= 3 })
}
