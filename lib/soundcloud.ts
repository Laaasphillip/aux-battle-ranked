async function getDeezerPreview(trackName: string, artist: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${trackName} ${artist.split(',')[0].trim()}`)
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=5`)
    if (!res.ok) return null
    const data = await res.json()
    const match = (data.data ?? []).find((t: { preview: string }) => t.preview)
    return match?.preview ?? null
  } catch {
    return null
  }
}

export function parseSoundCloudUrl(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (!url.hostname.endsWith('soundcloud.com')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    // Need artist + track slug; reject profiles, playlists, likes, etc.
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

    const title: string = data.title ?? ''
    const artist: string = data.author_name ?? ''
    const albumArt: string = data.thumbnail_url ?? ''

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
    }
  } catch {
    return null
  }
}
