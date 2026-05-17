import { createAdminClient } from '@/lib/supabase/server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: Request) {
  const { playerName } = await request.json()

  if (!playerName?.trim()) {
    return Response.json({ error: 'Player name is required' }, { status: 400 })
  }

  const db = createAdminClient()

  let code = generateCode()
  let attempts = 0

  while (attempts < 5) {
    const { error } = await db.from('battles').insert({
      code,
      player1_name: playerName.trim(),
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
