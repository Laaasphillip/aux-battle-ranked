import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { code } = await request.json()

  if (!code) {
    return Response.json({ error: 'Code is required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { error } = await db
    .from('battles')
    .update({ status: 'finished', ended_at: new Date().toISOString() })
    .eq('code', code)
    .eq('status', 'live')

  if (error) {
    return Response.json({ error: 'Failed to end battle' }, { status: 500 })
  }

  return Response.json({ success: true })
}
