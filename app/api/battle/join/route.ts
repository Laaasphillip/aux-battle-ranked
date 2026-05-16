import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code, playerName } = await request.json()

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

  const { error } = await db
    .from('battles')
    .update({ player2_name: playerName.trim() })
    .eq('code', code)

  if (error) {
    return Response.json({ error: 'Failed to join battle' }, { status: 500 })
  }

  return Response.json({ success: true })
}
