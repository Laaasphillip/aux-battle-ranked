import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code } = await request.json()

  if (!code) {
    return Response.json({ error: 'Code is required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: battle } = await db
    .from('battles')
    .select('status, player1_track, player2_track')
    .eq('code', code)
    .single()

  if (!battle) {
    return Response.json({ error: 'Battle not found' }, { status: 404 })
  }

  if (battle.status !== 'ready') {
    return Response.json({ error: 'Battle is not ready to start' }, { status: 409 })
  }

  const { error } = await db
    .from('battles')
    .update({ status: 'live', started_at: new Date().toISOString() })
    .eq('code', code)

  if (error) {
    return Response.json({ error: 'Failed to start battle' }, { status: 500 })
  }

  return Response.json({ success: true })
}
