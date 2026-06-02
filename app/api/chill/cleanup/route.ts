import { createAdminClient } from '@/lib/supabase/server'

// Deletes chill rooms that have had no queue activity for 5+ minutes.
// Called from the /chill lobby page on every load.
export async function POST() {
  const db = createAdminClient()

  // Find rooms that have no queue entries created in the last 5 minutes
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: activeRoomIds } = await db
    .from('chill_queue')
    .select('room_id')
    .gte('created_at', cutoff)

  const activeIds = [...new Set((activeRoomIds ?? []).map(r => r.room_id))]

  if (activeIds.length > 0) {
    // Delete rooms that are NOT in the active set AND are older than 5 minutes
    await db
      .from('chill_rooms')
      .delete()
      .lt('created_at', cutoff)
      .not('id', 'in', `(${activeIds.map(id => `"${id}"`).join(',')})`)
  } else {
    // No active rooms at all — delete everything older than 5 minutes
    await db
      .from('chill_rooms')
      .delete()
      .lt('created_at', cutoff)
  }

  return Response.json({ ok: true })
}
