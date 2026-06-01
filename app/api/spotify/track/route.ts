import { parseSpotifyTrackId, getTrack } from '@/lib/spotify'
import { parseSoundCloudUrl, getSoundCloudTrack } from '@/lib/soundcloud'

export async function POST(request: Request) {
  const { url } = await request.json()

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 })
  }

  const spotifyId = parseSpotifyTrackId(url)
  if (spotifyId) {
    const track = await getTrack(spotifyId)
    if (!track) return Response.json({ error: 'Track not found' }, { status: 404 })
    return Response.json({ track })
  }

  const scUrl = parseSoundCloudUrl(url)
  if (scUrl) {
    const track = await getSoundCloudTrack(scUrl)
    if (!track) return Response.json({ error: 'SoundCloud track not found' }, { status: 404 })
    return Response.json({ track })
  }

  return Response.json({ error: 'Invalid Spotify or SoundCloud URL' }, { status: 400 })
}
