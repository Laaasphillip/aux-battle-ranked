import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code } = await request.json()

  if (!code) {
    return Response.json({ error: 'Code is required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: battle } = await db
    .from('battles')
    .select('player1_votes, player2_votes, player1_user_id, player2_user_id')
    .eq('code', code)
    .eq('status', 'live')
    .single()

  const { error } = await db
    .from('battles')
    .update({ status: 'finished', ended_at: new Date().toISOString() })
    .eq('code', code)
    .eq('status', 'live')

  if (error) {
    return Response.json({ error: 'Failed to end battle' }, { status: 500 })
  }

  // Attribute wins/losses — skip on draw or if players aren't logged in
  if (battle) {
    const { player1_votes: p1v, player2_votes: p2v, player1_user_id: p1id, player2_user_id: p2id } = battle
    if (p1v !== p2v) {
      const winnerId = p1v > p2v ? p1id : p2id
      const loserId  = p1v > p2v ? p2id : p1id
      if (winnerId) await db.rpc('increment_wins',   { p_user_id: winnerId })
      if (loserId)  await db.rpc('increment_losses', { p_user_id: loserId })
    }
  }

  return Response.json({ success: true })
}
