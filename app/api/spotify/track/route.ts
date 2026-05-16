import { parseSpotifyTrackId, getTrack } from '@/lib/spotify'

export async function POST(request: Request) {
  const { url } = await request.json()

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 })
  }

  const trackId = parseSpotifyTrackId(url)
  if (!trackId) {
    return Response.json({ error: 'Invalid Spotify track URL' }, { status: 400 })
  }

  const track = await getTrack(trackId)
  if (!track) {
    return Response.json({ error: 'Track not found' }, { status: 404 })
  }

  return Response.json({ track })
}
