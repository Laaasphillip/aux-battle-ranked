import { createAdminClient } from '@/lib/supabase/server'
import { parseSpotifyTrackId, getTrack } from '@/lib/spotify'
import { parseSoundCloudUrl, getSoundCloudTrack } from '@/lib/soundcloud'

export async function POST(req: Request) {
  const { roomId, url, username, userId, scMeta } = await req.json()
  if (!roomId || !url || !username) {
    return Response.json({ error: 'Missing fields' }, { status: 400 })
  }

  let track = null
  const spotifyId = parseSpotifyTrackId(url)
  if (spotifyId) {
    track = await getTrack(spotifyId)
  } else {
    const scUrl = parseSoundCloudUrl(url)
    if (scUrl) track = await getSoundCloudTrack(scUrl, scMeta)
  }

  if (!track) return Response.json({ error: 'Could not resolve track. Paste a Spotify or SoundCloud link.' }, { status: 400 })

  const db = createAdminClient()

  const { data: playing } = await db
    .from('chill_queue')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'playing')
    .maybeSingle()

  const status = playing ? 'waiting' : 'playing'
  const startedAt = playing ? null : new Date().toISOString()

  const { error } = await db.from('chill_queue').insert({
    room_id: roomId,
    track,
    queued_by: username,
    user_id: userId ?? null,
    status,
    started_at: startedAt,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
