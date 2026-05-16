let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
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
  return {
    id: data.id,
    name: data.name,
    artist: data.artists.map((a: { name: string }) => a.name).join(', '),
    album: data.album.name,
    albumArt: data.album.images[0]?.url ?? '',
    previewUrl: data.preview_url,
    spotifyUrl: data.external_urls.spotify,
    durationMs: data.duration_ms,
  }
}
