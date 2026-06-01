import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code, playerName, accessToken } = await request.json()

  if (!code || !playerName?.trim()) {
    return Response.json({ error: 'Code and player name are required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: battle } = await db
    .from('battles')
    .select('id, status, player2_name')
    .eq('code', code)
    .single()

  if (!battle) {
    return Response.json({ error: 'Battle not found' }, { status: 404 })
  }

  if (battle.player2_name) {
    return Response.json({ error: 'Battle already has two players' }, { status: 409 })
  }

  if (battle.status !== 'waiting') {
    return Response.json({ error: 'Battle has already started' }, { status: 409 })
  }

  let player2UserId: string | null = null
  if (accessToken) {
    const { data: { user } } = await db.auth.getUser(accessToken)
    if (user) player2UserId = user.id
  }

  const { error } = await db
    .from('battles')
    .update({ player2_name: playerName.trim(), player2_user_id: player2UserId })
    .eq('code', code)

  if (error) {
    return Response.json({ error: 'Failed to join battle' }, { status: 500 })
  }

  return Response.json({ success: true })
}
