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

async function getChorusStartMs(trackId: string, durationMs: number): Promise<number> {
  try {
    const token = await getAccessToken()
    const res = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return Math.floor(durationMs * 0.33)

    const data = await res.json()
    const durationSec = durationMs / 1000
    const sections: Array<{ start: number; loudness: number }> = data.sections ?? []

    // Loudest section in the 20–65% range is typically the chorus
    const candidates = sections.filter(s => {
      const pos = s.start / durationSec
      return pos >= 0.2 && pos <= 0.65
    })

    if (!candidates.length) return Math.floor(durationMs * 0.33)
    const loudest = candidates.reduce((a, b) => (a.loudness > b.loudness ? a : b))
    return Math.floor(loudest.start * 1000)
  } catch {
    return Math.floor(durationMs * 0.33)
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
  const chorusStartMs = await getChorusStartMs(trackId, data.duration_ms)

  return {
    id: data.id,
    name: data.name,
    artist: data.artists.map((a: { name: string }) => a.name).join(', '),
    album: data.album.name,
    albumArt: data.album.images[0]?.url ?? '',
    previewUrl: data.preview_url,
    spotifyUrl: data.external_urls.spotify,
    durationMs: data.duration_ms,
    chorusStartMs,
  }
}
