import { createAdminClient } from '@/lib/supabase/server'
import type { SpotifyTrack } from '@/types'

export async function POST(request: Request) {
  const { code, player, track }: { code: string; player: 1 | 2; track: SpotifyTrack } =
    await request.json()

  if (!code || !player || !track) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createAdminClient()

  const field = player === 1 ? 'player1_track' : 'player2_track'
  const { data: updated, error } = await db
    .from('battles')
    .update({ [field]: track })
    .eq('code', code)
    .select('player1_track, player2_track')
    .single()

  if (error) {
    return Response.json({ error: 'Failed to set track' }, { status: 500 })
  }

  if (updated.player1_track && updated.player2_track) {
    await db.from('battles').update({ status: 'ready' }).eq('code', code)
  }

  return Response.json({ success: true })
}
