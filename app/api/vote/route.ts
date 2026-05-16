import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code, votedFor, voterId }: { code: string; votedFor: 1 | 2; voterId: string } =
    await request.json()

  if (!code || !votedFor || !voterId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: battle } = await db
    .from('battles')
    .select('id, status')
    .eq('code', code)
    .single()

  if (!battle) {
    return Response.json({ error: 'Battle not found' }, { status: 404 })
  }

  if (battle.status !== 'live') {
    return Response.json({ error: 'Battle is not live' }, { status: 409 })
  }

  const { error: voteError } = await db.from('votes').insert({
    battle_id: battle.id,
    voter_id: voterId,
    voted_for: votedFor,
  })

  if (voteError) {
    if (voteError.code === '23505') {
      return Response.json({ error: 'Already voted' }, { status: 409 })
    }
    return Response.json({ error: 'Failed to record vote' }, { status: 500 })
  }

  await db.rpc('increment_votes', { p_battle_id: battle.id, p_player: votedFor })

  return Response.json({ success: true })
}
