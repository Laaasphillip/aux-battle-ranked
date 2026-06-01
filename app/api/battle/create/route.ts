import { createAdminClient } from '@/lib/supabase/server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: Request) {
  const { playerName, accessToken } = await request.json()

  if (!playerName?.trim()) {
    return Response.json({ error: 'Player name is required' }, { status: 400 })
  }

  const db = createAdminClient()

  // Expire abandoned waiting battles older than 30 minutes
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  await db
    .from('battles')
    .update({ status: 'finished', ended_at: new Date().toISOString() })
    .eq('status', 'waiting')
    .lt('created_at', staleThreshold)

  let player1UserId: string | null = null
  if (accessToken) {
    const { data: { user } } = await db.auth.getUser(accessToken)
    if (user) player1UserId = user.id
  }

  let code = generateCode()
  let attempts = 0

  while (attempts < 5) {
    const { error } = await db.from('battles').insert({
      code,
      player1_name: playerName.trim(),
      player1_user_id: player1UserId,
      vote_duration: 70,
    })

    if (!error) break
    if (error.code !== '23505') {
      console.error('Supabase insert error:', JSON.stringify(error))
      return Response.json({ error: 'Failed to create battle', detail: error.message }, { status: 500 })
    }

    code = generateCode()
    attempts++
  }

  return Response.json({ code })
}
