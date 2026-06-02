import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { accessToken, color } = await req.json()
  if (!accessToken || !color) return Response.json({ error: 'Missing fields' }, { status: 400 })

  const db = createAdminClient()
  const { data: { user } } = await db.auth.getUser(accessToken)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await db
    .from('profiles')
    .update({ character_color: color })
    .eq('id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
