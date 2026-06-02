async function getDeezerPreview(title: string, artist: string): Promise<string | null> {
  // Try multiple queries in order — best match first
  const queries = [
    `${title} ${artist.split(',')[0].trim()}`,
    title,
  ]
  for (const q of queries) {
    try {
      const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=10`)
      if (!res.ok) continue
      const data = await res.json()
      const match = (data.data ?? []).find((t: { preview: string }) => t.preview)
      if (match?.preview) return match.preview
    } catch {
      continue
    }
  }
  return null
}

export function parseSoundCloudUrl(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (!url.hostname.endsWith('soundcloud.com')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2 || parts[1] === 'sets' || parts[1] === 'likes' || parts[1] === 'following' || parts[1] === 'followers') return null
    return input.trim()
  } catch {
    return null
  }
}

export async function getSoundCloudTrack(
  url: string,
  clientMeta?: { title?: string; artist?: string; albumArt?: string }
) {
  let title = clientMeta?.title ?? ''
  let artist = clientMeta?.artist ?? ''
  let albumArt = clientMeta?.albumArt ?? ''

  // If the browser already fetched oEmbed metadata, use it directly
  if (!title) {
    // Derive from URL slug as fallback — SC oEmbed 403s from Vercel server IPs
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/').filter(Boolean)
      artist = parts[0] ?? 'SoundCloud'
      title = (parts[1] ?? 'Track')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    } catch {
      return null
    }
  }

  const previewUrl = await getDeezerPreview(title, artist)

  return {
    id: url,
    name: title,
    artist,
    album: 'SoundCloud',
    albumArt,
    previewUrl,
    spotifyUrl: url,
    durationMs: 0,
    fullTrackUrl: url,
  }
}
