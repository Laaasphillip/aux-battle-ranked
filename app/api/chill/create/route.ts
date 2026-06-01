import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { name, createdBy } = await req.json()
  if (!name?.trim()) return Response.json({ error: 'Name required' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('chill_rooms')
    .insert({ name: name.trim(), created_by: createdBy ?? null })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ id: data.id })
}
