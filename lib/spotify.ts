let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const clientId = (process.env.SPOTIFY_CLIENT_ID ?? '').replace(/^﻿/, '').trim()
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET ?? '').replace(/^﻿/, '').trim()
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('Failed to get Spotify access token')

  const data = await res.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return tokenCache.token
}

// Deezer provides free 30s preview URLs with no auth required
async function getDeezerPreview(trackName: string, artist: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${trackName} ${artist.split(',')[0].trim()}`)
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=5`)
    if (!res.ok) return null
    const data = await res.json()
    const match = (data.data ?? []).find(
      (t: { preview: string }) => t.preview
    )
    return match?.preview ?? null
  } catch {
    return null
  }
}

export function parseSpotifyTrackId(input: string): string | null {
  const uriMatch = input.match(/spotify:track:([a-zA-Z0-9]+)/)
  if (uriMatch) return uriMatch[1]

  const urlMatch = input.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
  if (urlMatch) return urlMatch[1]

  return null
}

export async function getTrack(trackId: string) {
  const token = await getAccessToken()
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null

  const data = await res.json()
  const trackName = data.name
  const artist = data.artists.map((a: { name: string }) => a.name).join(', ')

  // Spotify deprecated preview_url for many tracks — fall back to Deezer
  let previewUrl: string | null = data.preview_url
  if (!previewUrl) {
    previewUrl = await getDeezerPreview(trackName, artist)
  }

  return {
    id: data.id,
    name: trackName,
    artist,
    album: data.album.name,
    albumArt: data.album.images[0]?.url ?? '',
    previewUrl,
    spotifyUrl: data.external_urls.spotify,
    durationMs: data.duration_ms,
  }
}
