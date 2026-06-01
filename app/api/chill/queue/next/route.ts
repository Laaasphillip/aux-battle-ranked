import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { roomId, currentId } = await req.json()
  if (!roomId || !currentId) return Response.json({ error: 'Missing fields' }, { status: 400 })

  const db = createAdminClient()

  // Atomically mark current song as finished (only if still playing — prevents double-advance)
  const { data: updated } = await db
    .from('chill_queue')
    .update({ status: 'finished' })
    .eq('id', currentId)
    .eq('status', 'playing')
    .select('id')

  if (!updated || updated.length === 0) return Response.json({ success: true }) // already finished, no-op

  // Advance to next waiting song
  const { data: next } = await db
    .from('chill_queue')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (next) {
    await db
      .from('chill_queue')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', next.id)
  }

  return Response.json({ success: true })
}
