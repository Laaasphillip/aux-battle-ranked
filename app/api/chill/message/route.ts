import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { roomId, username, content } = await req.json()
  if (!roomId || !username || !content?.trim()) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('chill_messages')
    .insert({ room_id: roomId, username, content: content.trim() })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
