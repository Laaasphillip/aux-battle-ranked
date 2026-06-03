'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { SpotifyTrack } from '@/types'

interface Player {
  id: string
  username: string
  color: string
  x: number
  y: number
}

interface QueueEntry {
  id: string
  track: SpotifyTrack
  queued_by: string
  user_id: string | null
  status: string
  skip_votes: number
  skip_voter_ids: string[]
  started_at: string | null
  created_at: string
}

interface Message {
  id: string
  username: string
  content: string
  created_at: string
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#fbbf24']

function colorFor(str: string): string {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

function getVisitorId(): string {
  const key = 'auxbattle_visitor_id'
  let id = localStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id) }
  return id
}

// ─── Isometric room constants ────────────────────────────────────────────────
const COLS = 8
const ROWS = 6
const TW   = 52
const TH   = 26
const WH   = 44   // wall height above floor in SVG units
const ISO_VB_W = 400
const ISO_VB_H = 310
const OX = 175    // back-corner origin x
const OY = 68     // back-corner origin y (wall space = WH + padding above)

function isoPos(col: number, row: number, ox: number, oy: number) {
  return { x: (col - row) * TW / 2 + ox, y: (col + row) * TH / 2 + oy }
}

function screenToTile(sx: number, sy: number, ox: number, oy: number) {
  const ix = sx - ox, iy = sy - oy
  const col = (ix / (TW / 2) + iy / (TH / 2)) / 2
  const row = (iy / (TH / 2) - ix / (TW / 2)) / 2
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.round(col))),
    row: Math.max(0, Math.min(ROWS - 1, Math.round(row))),
  }
}

function tileScreenPos(col: number, row: number) {
  const iso = isoPos(col + 0.5, row + 0.5, OX, OY)
  return {
    left: `${(iso.x / ISO_VB_W) * 100}%`,
    top:  `${(iso.y / ISO_VB_H) * 100}%`,
  }
}

// ─── Habbo-style pixel avatar ─────────────────────────────────────────────────
function HabboAvatar({ color, name, isMe }: { color: string; name: string; isMe: boolean }) {
  const bd = '1.5px solid rgba(0,0,0,0.55)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: `drop-shadow(0 6px 10px ${color}55)` }}>
      {/* Hair */}
      <div style={{ width: 22, height: 7, background: color, border: bd, borderBottom: 'none', borderRadius: '4px 4px 0 0', marginBottom: -1 }} />
      {/* Head */}
      <div style={{ width: 20, height: 16, background: '#fdd0a0', border: bd, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 5, left: 2, width: 4, height: 4, background: '#1a1a30' }} />
        <div style={{ position: 'absolute', top: 5, right: 2, width: 4, height: 4, background: '#1a1a30' }} />
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 8, height: 2, background: 'rgba(180,80,60,0.45)', borderRadius: '0 0 3px 3px' }} />
      </div>
      {/* Torso */}
      <div style={{ width: 24, height: 18, background: color, border: bd, borderTop: 'none', position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: 7, background: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(0,0,0,0.12)' }} />
      </div>
      {/* Legs */}
      <div style={{ display: 'flex', gap: 2 }}>
        <div style={{ width: 9, height: 12, background: '#18182e', border: bd, borderTop: 'none' }} />
        <div style={{ width: 9, height: 12, background: '#18182e', border: bd, borderTop: 'none' }} />
      </div>
      {/* Shoes */}
      <div style={{ display: 'flex', gap: 2, marginTop: 1 }}>
        <div style={{ width: 11, height: 5, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 3px 0 0' }} />
        <div style={{ width: 11, height: 5, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '3px 0 0 0' }} />
      </div>
      {/* Name badge */}
      <div style={{
        marginTop: 5, background: isMe ? color : 'rgba(6,6,6,0.9)',
        border: `1px solid ${isMe ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
        padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
        boxShadow: isMe ? `0 0 12px ${color}80` : 'none',
      }}>
        <span style={{ fontSize: 9, color: '#fff', fontWeight: 900, fontFamily: 'ui-monospace,monospace', letterSpacing: '0.5px' }}>
          {name}
        </span>
      </div>
    </div>
  )
}

// ─── Isometric room SVG ───────────────────────────────────────────────────────
function IsoRoom() {
  const floor: React.ReactNode[] = []
  const leftWall: React.ReactNode[] = []
  const rightWall: React.ReactNode[] = []

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tl = isoPos(col,   row,   OX, OY)
      const tr = isoPos(col+1, row,   OX, OY)
      const br = isoPos(col+1, row+1, OX, OY)
      const bl = isoPos(col,   row+1, OX, OY)
      const pts = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`
      const isLight = (col + row) % 2 === 0
      const isDance = col >= 2 && col <= 5 && row >= 1 && row <= 4
      const fill = isDance
        ? (isLight ? '#23204a' : '#1a1840')
        : (isLight ? '#1b1e3c' : '#131526')
      floor.push(<polygon key={`t${col}-${row}`} points={pts} fill={fill} stroke='#1e2248' strokeWidth='0.8' />)
    }
  }

  for (let row = 0; row < ROWS; row++) {
    const a = isoPos(0, row,   OX, OY)
    const b = isoPos(0, row+1, OX, OY)
    leftWall.push(
      <polygon key={`lw${row}`}
        points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y - WH} ${a.x},${a.y - WH}`}
        fill='#181b38' stroke='#1e2248' strokeWidth='0.8' />
    )
  }

  for (let col = 0; col < COLS; col++) {
    const a = isoPos(col,   0, OX, OY)
    const b = isoPos(col+1, 0, OX, OY)
    rightWall.push(
      <polygon key={`rw${col}`}
        points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y - WH} ${a.x},${a.y - WH}`}
        fill='#12152c' stroke='#1e2248' strokeWidth='0.8' />
    )
  }

  const corner   = isoPos(0,    0,    OX, OY)
  const leftBot  = isoPos(0,    ROWS, OX, OY)
  const rightBot = isoPos(COLS, 0,    OX, OY)

  return (
    <svg viewBox={`0 0 ${ISO_VB_W} ${ISO_VB_H}`} width="100%" height="100%"
      preserveAspectRatio="none" style={{ display: 'block', position: 'absolute', inset: 0 }}>
      {leftWall}
      {rightWall}
      {floor}
      {/* Wall top highlight lines */}
      <line x1={corner.x}   y1={corner.y - WH}   x2={leftBot.x}  y2={leftBot.y - WH}  stroke='#3a3d72' strokeWidth='1.5' />
      <line x1={corner.x}   y1={corner.y - WH}   x2={rightBot.x} y2={rightBot.y - WH} stroke='#3a3d72' strokeWidth='1.5' />
      {/* Wall base corner lines */}
      <line x1={leftBot.x}  y1={leftBot.y - WH}  x2={leftBot.x}  y2={leftBot.y}       stroke='#3a3d72' strokeWidth='1' />
      <line x1={rightBot.x} y1={rightBot.y - WH} x2={rightBot.x} y2={rightBot.y}      stroke='#3a3d72' strokeWidth='1' />
    </svg>
  )
}

export default function ChillRoom({
  room,
  initialQueue,
  initialMessages,
  serverUsername,
}: {
  room: { id: string; name: string }
  initialQueue: QueueEntry[]
  initialMessages: Message[]
  serverUsername: string | null
}) {
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [myPos, setMyPos] = useState({ x: 50, y: 50 })
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [chatInput, setChatInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [audioReady, setAudioReady] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [myName, setMyName] = useState(serverUsername ?? '')
  const [nameInput, setNameInput] = useState('')
  // Initialized synchronously from localStorage so they never change after mount —
  // this prevents the channel effect from re-running and recreating the realtime
  // connection (which was dropping presence/chat for everyone in the room).
  const [myId] = useState(() => typeof window !== 'undefined' ? getVisitorId() : '')
  const [myColor, setMyColor] = useState(() => {
    if (typeof window === 'undefined') return COLORS[0]
    const id = getVisitorId()
    const loggedInAs = localStorage.getItem('auxbattle_username')
    if (loggedInAs) return localStorage.getItem('auxbattle_character_color') ?? colorFor(id)
    return colorFor(id)
  })
  const [addError, setAddError] = useState('')
  const [volume, setVolume] = useState(0.75)
  const [clickTarget, setClickTarget] = useState<{ x: number; y: number; t: number } | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scWidgetRef = useRef<HTMLIFrameElement | null>(null)
  const ytWidgetRef = useRef<HTMLIFrameElement | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const playerCountRef = useRef(0)
  const presenceReadyRef = useRef(false) // true after first presence sync fires

  const currentSong = queue.find(q => q.status === 'playing') ?? null
  const waitingQueue = queue.filter(q => q.status === 'waiting')

  const isSCTrack = !!(currentSong?.track.fullTrackUrl?.includes('soundcloud.com'))
  const isYTTrack = !!(currentSong?.track.fullTrackUrl?.includes('youtube.com'))
  const isSpotifyTrack = !!(currentSong?.track.spotifyUrl?.includes('open.spotify.com'))

  // Restore guest display name from localStorage
  useEffect(() => {
    if (!serverUsername) {
      const stored = localStorage.getItem('auxbattle_chill_name')
      if (stored) setMyName(stored)
    }
  }, [serverUsername])

  // Supabase realtime
  useEffect(() => {
    if (!myId || !myName) return
    const supabase = createClient()
    const channel = supabase.channel(`chill-${room.id}`, {
      config: { presence: { key: myId } },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ username: string; color: string; x: number; y: number }>()
      presenceReadyRef.current = true
      playerCountRef.current = Object.keys(state).length
      const next: Record<string, Player> = {}
      for (const [key, list] of Object.entries(state)) {
        const p = list[0]
        next[key] = { id: key, username: p.username, color: p.color, x: p.x ?? 50, y: p.y ?? 50 }
      }
      setPlayers(next)
    })

    channel.on('broadcast', { event: 'move' }, ({ payload }) => {
      setPlayers(prev => ({ ...prev, [payload.id]: { ...prev[payload.id], ...payload } }))
    })

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chill_queue', filter: `room_id=eq.${room.id}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setQueue(prev => [...prev, payload.new as QueueEntry])
        } else if (payload.eventType === 'UPDATE') {
          setQueue(prev => prev.map(e => e.id === (payload.new as QueueEntry).id ? payload.new as QueueEntry : e))
        }
      }
    )

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chill_messages', filter: `room_id=eq.${room.id}` },
      (payload) => {
        setMessages(prev => [...prev.slice(-99), payload.new as Message])
      }
    )

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ username: myName, color: myColor, x: 50, y: 50 })

        // Re-sync queue AND messages on every (re)connect so nothing is missed
        const [queueRes, msgRes] = await Promise.all([
          supabase
            .from('chill_queue')
            .select('*')
            .eq('room_id', room.id)
            .neq('status', 'finished')
            .order('created_at', { ascending: true }),
          supabase
            .from('chill_messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: true })
            .limit(100),
        ])
        if (queueRes.data) setQueue(queueRes.data as QueueEntry[])
        if (msgRes.data) setMessages(msgRes.data as Message[])
      }

      // Auto-recover from channel errors by recreating after a short delay
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setTimeout(() => {
          supabase.removeChannel(channel)
          channel.subscribe()
        }, 3000)
      }
    })

    return () => { supabase.removeChannel(channel) }
  }, [myId, myName, room.id]) // myColor intentionally excluded — stable after sync init

  // Poll queue + messages every 5 s — realtime postgres_changes can silently miss events,
  // so polling is the reliable fallback that keeps state accurate.
  useEffect(() => {
    const supabase = createClient()
    const sync = async () => {
      const [q, m] = await Promise.all([
        supabase
          .from('chill_queue')
          .select('*')
          .eq('room_id', room.id)
          .neq('status', 'finished')
          .order('created_at', { ascending: true }),
        supabase
          .from('chill_messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true })
          .limit(100),
      ])
      if (q.data) setQueue(q.data as QueueEntry[])
      if (m.data) setMessages(m.data as Message[])
    }
    const id = setInterval(sync, 5000)
    return () => clearInterval(id)
  }, [room.id])

  // Delete room when we are the last player — fires on tab close and internal navigation
  useEffect(() => {
    if (!myId) return

    const deleteIfEmpty = () => {
      // Only delete if presence has synced at least once — prevents deleting the room
      // before the first sync fires (when playerCountRef is still 0) if the component
      // unmounts during initial connection (e.g. page error, fast navigation).
      if (presenceReadyRef.current && playerCountRef.current <= 1) {
        const blob = new Blob(
          [JSON.stringify({ roomId: room.id })],
          { type: 'application/json' }
        )
        navigator.sendBeacon('/api/chill/delete', blob)
      }
    }

    window.addEventListener('beforeunload', deleteIfEmpty)
    return () => {
      window.removeEventListener('beforeunload', deleteIfEmpty)
      deleteIfEmpty() // also runs on internal Next.js navigation (component unmount)
    }
  }, [myId, room.id])

  // Deezer preview audio — handles Spotify tracks (30s auto-advance) and any track
  // without a direct SC URL. SC tracks use the widget below instead.
  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null

    if (!audioReady || !currentSong || isSCTrack || isYTTrack) return

    const songId = currentSong.id
    const roomId = room.id

    if (!currentSong.track.previewUrl) {
      const t = setTimeout(() => {
        fetch('/api/chill/queue/next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, currentId: songId }),
        })
      }, 500)
      return () => clearTimeout(t)
    }

    const audio = new Audio(currentSong.track.previewUrl)
    audio.volume = volume

    const advance = () => {
      fetch('/api/chill/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, currentId: songId }),
      })
    }

    audio.addEventListener('canplaythrough', () => {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }, { once: true })
    audio.onended = advance
    audio.load()
    audioRef.current = audio

    return () => {
      audio.onended = null
      audio.pause()
    }
  }, [currentSong?.id, audioReady, isSCTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  // SoundCloud widget — full track playback for direct SC links
  useEffect(() => {
    if (!audioReady || !currentSong || !isSCTrack) return

    const songId = currentSong.id
    const roomId = room.id
    const iframe = scWidgetRef.current
    if (!iframe) return

    let advanced = false
    const advance = () => {
      if (advanced) return
      advanced = true
      fetch('/api/chill/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, currentId: songId }),
      })
    }

    const timer = setTimeout(() => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ method: 'addEventListener', value: 'finish' }),
        'https://w.soundcloud.com'
      )
      iframe.contentWindow?.postMessage(
        JSON.stringify({ method: 'setVolume', value: Math.round(volume * 100) }),
        'https://w.soundcloud.com'
      )
      iframe.contentWindow?.postMessage(
        JSON.stringify({ method: 'seekTo', value: 0 }),
        'https://w.soundcloud.com'
      )
      iframe.contentWindow?.postMessage(
        JSON.stringify({ method: 'play' }),
        'https://w.soundcloud.com'
      )
    }, 1500)

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://w.soundcloud.com') return
      try {
        const data = JSON.parse(e.data as string)
        if (data.method === 'finish') advance()
      } catch { /* ignore non-JSON messages */ }
    }

    window.addEventListener('message', onMessage)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      iframe.contentWindow?.postMessage(
        JSON.stringify({ method: 'pause' }),
        'https://w.soundcloud.com'
      )
    }
  }, [currentSong?.id, audioReady, isSCTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  // YouTube widget — full track playback for Spotify links via YouTube search
  useEffect(() => {
    if (!audioReady || !currentSong || !isYTTrack) return

    const songId = currentSong.id
    const roomId = room.id
    const durationMs = currentSong.track.durationMs ?? 0
    let advanced = false

    const advance = () => {
      if (advanced) return
      advanced = true
      fetch('/api/chill/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, currentId: songId }),
      })
    }

    // Primary: duration-based timer using Spotify's exact track length
    const timer = durationMs > 10000
      ? setTimeout(advance, durationMs - 3000)
      : setTimeout(advance, 30000)

    // Secondary: YouTube IFrame API end-of-video event (state 0 = ended)
    const onMessage = (e: MessageEvent) => {
      if (!e.origin.includes('youtube.com')) return
      try {
        const data = JSON.parse(e.data as string)
        if (data.event === 'onStateChange' && data.info === 0) advance()
      } catch { /* non-JSON */ }
    }
    window.addEventListener('message', onMessage)

    // Play + set volume after iframe loads
    const playTimer = setTimeout(() => {
      ytWidgetRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(volume * 100)] }),
        'https://www.youtube.com'
      )
      ytWidgetRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        'https://www.youtube.com'
      )
    }, 2000)

    return () => {
      clearTimeout(timer)
      clearTimeout(playTimer)
      window.removeEventListener('message', onMessage)
      advanced = true
      ytWidgetRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }),
        'https://www.youtube.com'
      )
    }
  }, [currentSong?.id, audioReady, isYTTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Deezer audio element
    if (audioRef.current) audioRef.current.volume = volume

    // SC widget (0–100 scale)
    scWidgetRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: 'setVolume', value: Math.round(volume * 100) }),
      'https://w.soundcloud.com'
    )

    // YouTube widget (0–100 scale)
    ytWidgetRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(volume * 100)] }),
      'https://www.youtube.com'
    )
  }, [volume])

  function handleWorldClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    // Map click to SVG viewBox space (preserveAspectRatio="none" → direct linear mapping)
    const svgX = (e.clientX - rect.left) / rect.width  * ISO_VB_W
    const svgY = (e.clientY - rect.top)  / rect.height * ISO_VB_H
    const { col, row } = screenToTile(svgX, svgY, OX, OY)
    const x = (col / (COLS - 1)) * 100
    const y = (row / (ROWS - 1)) * 100
    setMyPos({ x, y })
    setClickTarget({ x, y, t: Date.now() })
    channelRef.current?.track({ username: myName, color: myColor, x, y })
    channelRef.current?.send({ type: 'broadcast', event: 'move', payload: { id: myId, username: myName, color: myColor, x, y } })
  }

  async function sendMessage() {
    if (!chatInput.trim() || !myName) return
    const content = chatInput.trim()
    setChatInput('')
    await fetch('/api/chill/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, username: myName, content }),
    })
  }

  async function addToQueue() {
    if (!urlInput.trim() || !myName || resolving) return
    setResolving(true)
    setAddError('')

    // Fetch SC metadata via our own API (avoids CORS + lets server use browser UA)
    let scMeta: { title?: string; artist?: string; albumArt?: string } | undefined
    const trimmed = urlInput.trim()
    if (trimmed.includes('soundcloud.com')) {
      try {
        const oe = await fetch(`/api/sc/metadata?url=${encodeURIComponent(trimmed)}`)
        if (oe.ok) {
          const d = await oe.json()
          let title: string = d.title ?? ''
          let artist: string = d.author_name ?? ''
          if (title.includes(' - ')) {
            const [a, ...rest] = title.split(' - ')
            artist = a.trim()
            title = rest.join(' - ').trim()
          }
          if (title) scMeta = { title, artist, albumArt: d.thumbnail_url ?? '' }
        }
      } catch { /* fall through — server will derive from URL slug */ }
    }

    const res = await fetch('/api/chill/queue/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, url: trimmed, username: myName, userId: null, scMeta }),
    })
    setResolving(false)
    if (res.ok) {
      setUrlInput('')
    } else {
      const d = await res.json()
      setAddError(d.error ?? 'Failed to add song')
    }
  }

  async function voteSkip() {
    if (!currentSong || !myId) return
    const res = await fetch('/api/chill/queue/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: currentSong.id, voterId: myId }),
    })
    const data = await res.json()
    if (res.ok && data.shouldSkip) {
      await fetch('/api/chill/queue/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, currentId: currentSong.id }),
      })
    }
  }

  async function forceSkip() {
    if (!currentSong) return
    await fetch('/api/chill/queue/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, currentId: currentSong.id }),
    })
  }

  function enableAudio() {
    const p = new Audio(); p.volume = 0; p.play().catch(() => {}); p.pause()
    setAudioReady(true)
  }

  const playerCount = Object.keys(players).length

  // Name prompt
  if (!myName) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0a]">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 w-full max-w-sm">
          <p className="text-xs font-black uppercase tracking-widest mb-1">Enter Your Name</p>
          <p className="text-xs text-[#444] mb-4">Displayed to others in the room</p>
          <input
            type="text"
            placeholder="Your name"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && nameInput.trim()) {
                localStorage.setItem('auxbattle_chill_name', nameInput.trim())
                setMyName(nameInput.trim())
              }
            }}
            maxLength={24}
            autoFocus
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#333] mb-3"
          />
          <button
            onClick={() => {
              if (!nameInput.trim()) return
              localStorage.setItem('auxbattle_chill_name', nameInput.trim())
              setMyName(nameInput.trim())
            }}
            disabled={!nameInput.trim()}
            className="w-full bg-white text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest disabled:opacity-30 hover:bg-[#eee] transition-colors"
          >
            Enter Room →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a] shrink-0">
        <Link href="/chill" className="text-[#444] hover:text-white text-xs transition-colors">← Rooms</Link>
        <div className="flex items-center gap-3">
          <p className="text-xs font-black uppercase tracking-widest">{room.name}</p>
          <span className="text-[10px] text-[#333]">·</span>
          <span className="text-[10px] text-[#444]">{playerCount} online</span>
        </div>
        <div className="flex items-center gap-3">
          {audioReady && (
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 14 14" fill={volume === 0 ? '#333' : '#555'}>
                <path d="M2 5h2.5L8 2v10L4.5 9H2a1 1 0 01-1-1V6a1 1 0 011-1z"/>
                {volume > 0 && <path d="M9.5 6a2.5 2.5 0 010 2" stroke="#555" strokeWidth="1.2" fill="none" strokeLinecap="round"/>}
                {volume > 0.5 && <path d="M11.5 4.5a5 5 0 010 5" stroke="#555" strokeWidth="1.2" fill="none" strokeLinecap="round"/>}
              </svg>
              <input
                type="range" min="0" max="100" value={Math.round(volume * 100)}
                onChange={e => setVolume(Number(e.target.value) / 100)}
                className="w-16 h-1 rounded-full outline-none cursor-pointer appearance-none"
                style={{ background: `linear-gradient(to right, #666 ${volume * 100}%, #2a2a2a ${volume * 100}%)` }}
              />
            </div>
          )}
          <div className="w-2 h-2 rounded-full" style={{ background: myColor }} />
          <span className="text-xs text-[#555]">{myName}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Habbo-style isometric world */}
        <div className="flex-1 relative overflow-hidden" style={{ minWidth: 0, background: '#0d0e1f' }}>
          {!audioReady && (
            <button
              onClick={enableAudio}
              className="absolute top-3 left-3 z-20 bg-[#111] border border-[#fbbf24]/40 text-[#fbbf24] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Tap to enable sound
            </button>
          )}
          <div
            className="w-full h-full cursor-crosshair select-none relative overflow-hidden"
            onClick={handleWorldClick}
          >
            {/* Isometric room */}
            <IsoRoom />

            {/* Click tile ripple */}
            {clickTarget && (() => {
              const col = Math.round((clickTarget.x / 100) * (COLS - 1))
              const row = Math.round((clickTarget.y / 100) * (ROWS - 1))
              const pos = tileScreenPos(col, row)
              return (
                <div key={clickTarget.t} className="absolute pointer-events-none"
                  style={{ left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)', zIndex: 3 }}>
                  <div className="animate-ping" style={{ width: 44, height: 22, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.22)' }} />
                </div>
              )
            })()}

            {/* Other players */}
            {Object.values(players).filter(p => p.id !== myId).map(player => {
              const col = Math.round((player.x / 100) * (COLS - 1))
              const row = Math.round((player.y / 100) * (ROWS - 1))
              const pos = tileScreenPos(col, row)
              return (
                <div key={player.id} className="absolute pointer-events-none"
                  style={{
                    left: pos.left, top: pos.top,
                    transform: 'translate(-50%, -100%)',
                    transition: 'left 0.35s ease, top 0.35s ease',
                    zIndex: 5 + col + row,
                  }}>
                  <HabboAvatar color={player.color} name={player.username} isMe={false} />
                </div>
              )
            })}

            {/* My character */}
            {myId && (() => {
              const col = Math.round((myPos.x / 100) * (COLS - 1))
              const row = Math.round((myPos.y / 100) * (ROWS - 1))
              const pos = tileScreenPos(col, row)
              return (
                <div className="absolute pointer-events-none"
                  style={{
                    left: pos.left, top: pos.top,
                    transform: 'translate(-50%, -100%)',
                    transition: 'left 0.18s ease, top 0.18s ease',
                    zIndex: 20 + col + row,
                  }}>
                  <HabboAvatar color={myColor} name={myName} isMe />
                </div>
              )
            })()}
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-[#22254a] pointer-events-none select-none">
            Click to move
          </p>
        </div>

        {/* Right panel */}
        <div className="w-72 flex flex-col border-l border-[#1a1a1a] shrink-0 overflow-hidden">

          {/* Now playing */}
          <div className="p-4 border-b border-[#1a1a1a] shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#333] mb-2">Now Playing</p>
            {currentSong ? (
              <>
                <p className="text-xs font-bold text-white truncate">{currentSong.track.name}</p>
                <p className="text-[10px] text-[#555] truncate mb-0.5">{currentSong.track.artist}</p>
                <p className="text-[9px] text-[#333]">by {currentSong.queued_by}</p>
                {/* Spotify embed — click to play full track (Premium) or 30s preview */}
                {isSpotifyTrack && currentSong && (
                  <iframe
                    key={currentSong.id}
                    src={`https://open.spotify.com/embed/track/${currentSong.track.id}?utm_source=generator&theme=0`}
                    className="mt-2.5 rounded-xl overflow-hidden w-full"
                    style={{ height: 80, border: 'none' }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                )}

                <div className="flex gap-2 mt-2.5">
                  {currentSong.queued_by === myName ? (
                    <button
                      onClick={forceSkip}
                      className="flex-1 text-[10px] font-bold uppercase tracking-wider border border-[#222] hover:border-[#444] rounded-lg py-1.5 text-[#555] hover:text-white transition-colors"
                    >
                      Skip my song
                    </button>
                  ) : currentSong.skip_voter_ids.includes(myId) ? (
                    <p className="text-[10px] text-[#333] italic pt-1">Voted to skip ({currentSong.skip_votes}/3)</p>
                  ) : (
                    <button
                      onClick={voteSkip}
                      className="flex-1 text-[10px] font-bold uppercase tracking-wider border border-[#222] hover:border-[#444] rounded-lg py-1.5 text-[#555] hover:text-white transition-colors"
                    >
                      Vote skip ({currentSong.skip_votes}/3)
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-[#333] italic">Nothing playing — add a song below</p>
            )}
          </div>

          {/* Queue */}
          <div className="p-4 border-b border-[#1a1a1a] shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#333] mb-2">
              Queue {waitingQueue.length > 0 && `(${waitingQueue.length})`}
            </p>
            {waitingQueue.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-3 max-h-20 overflow-y-auto">
                {waitingQueue.map((entry, i) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <span className="text-[9px] text-[#2a2a2a] w-3 shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-[#888] truncate">{entry.track.name}</p>
                      <p className="text-[9px] text-[#333] truncate">{entry.queued_by}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Spotify or SoundCloud URL"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setAddError('') }}
                onKeyDown={e => e.key === 'Enter' && addToQueue()}
                className="flex-1 min-w-0 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-1.5 text-[10px] outline-none focus:border-[#2a2a2a] transition-colors"
              />
              <button
                onClick={addToQueue}
                disabled={!urlInput.trim() || resolving}
                className="bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-30 text-white font-black text-xs px-3 rounded-lg transition-colors shrink-0"
              >
                {resolving ? '…' : '+'}
              </button>
            </div>
            {addError && <p className="text-[#ef4444] text-[9px] mt-1">{addError}</p>}
          </div>

          {/* Chat */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-3 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#333]">Chat</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1.5">
              {messages.map(msg => (
                <div key={msg.id}>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: colorFor(msg.username) }}
                  >
                    {msg.username}
                  </span>
                  <span className="text-[10px] text-[#555]">: </span>
                  <span className="text-[10px] text-[#999]">{msg.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-[#1a1a1a] shrink-0">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Say something..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  maxLength={200}
                  className="flex-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-[#2a2a2a] transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-30 border border-[#222] text-white font-bold text-xs px-3 rounded-lg transition-colors shrink-0"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden SoundCloud widget — full track playback for SC links */}
      {/* Hidden SoundCloud widget */}
      {currentSong && isSCTrack && currentSong.track.fullTrackUrl && (
        <iframe
          key={currentSong.id}
          ref={scWidgetRef}
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(currentSong.track.fullTrackUrl)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&buying=false&liking=false&download=false&sharing=false`}
          allow="autoplay"
          aria-hidden
          style={{ position: 'fixed', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Hidden YouTube widget — full track via search (Spotify links) */}
      {currentSong && isYTTrack && currentSong.track.fullTrackUrl && (
        <iframe
          key={currentSong.id}
          ref={ytWidgetRef}
          src={currentSong.track.fullTrackUrl}
          allow="autoplay; encrypted-media"
          aria-hidden
          style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      )}
    </div>
  )
}
