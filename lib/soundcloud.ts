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

export async function getSoundCloudTrack(url: string) {
  try {
    const oEmbedRes = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`
    )
    if (!oEmbedRes.ok) return null
    const data = await oEmbedRes.json()

    let title: string = data.title ?? ''
    let artist: string = data.author_name ?? ''
    const albumArt: string = data.thumbnail_url ?? ''

    // SoundCloud titles often come as "Artist - Track Name" — split them for cleaner search
    if (title.includes(' - ')) {
      const [parsedArtist, ...rest] = title.split(' - ')
      artist = parsedArtist.trim()
      title = rest.join(' - ').trim()
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
  } catch {
    return null
  }
}
