import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { roomId } = await req.json()
  if (!roomId) return Response.json({ error: 'Missing roomId' }, { status: 400 })

  const db = createAdminClient()
  await db.from('chill_rooms').delete().eq('id', roomId)
  return Response.json({ success: true })
}
