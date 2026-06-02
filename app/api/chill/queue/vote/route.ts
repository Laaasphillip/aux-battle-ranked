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
    return Response.json({ alreadyVoted: true, votes: entry.skip_votes, shouldSkip: false })
  }

  const newVotes = entry.skip_votes + 1
  const newVoters = [...entry.skip_voter_ids, voterId]

  // Optimistic lock: only update if skip_votes hasn't changed since we read it.
  // Prevents two simultaneous votes from both being counted as if the other didn't happen.
  const { data: updated } = await db
    .from('chill_queue')
    .update({ skip_votes: newVotes, skip_voter_ids: newVoters })
    .eq('id', entryId)
    .eq('skip_votes', entry.skip_votes)
    .select('skip_votes')
    .maybeSingle()

  if (!updated) {
    // Concurrent vote landed first — re-read and return current count
    const { data: current } = await db
      .from('chill_queue')
      .select('skip_votes')
      .eq('id', entryId)
      .single()
    const votes = current?.skip_votes ?? newVotes
    return Response.json({ votes, shouldSkip: votes >= 3 })
  }

  return Response.json({ votes: updated.skip_votes, shouldSkip: updated.skip_votes >= 3 })
}
