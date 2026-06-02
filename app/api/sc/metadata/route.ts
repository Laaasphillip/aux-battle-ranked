export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://soundcloud.com/',
          'Origin': 'https://soundcloud.com',
        },
        signal: controller.signal,
      }
    )
    clearTimeout(t)

    if (!res.ok) return Response.json({ error: `oEmbed ${res.status}` }, { status: res.status })
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
