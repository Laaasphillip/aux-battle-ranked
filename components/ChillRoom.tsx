'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
  const [myId, setMyId] = useState('')
  const [myColor, setMyColor] = useState(COLORS[0])
  const [addError, setAddError] = useState('')
  const [volume, setVolume] = useState(0.75)
  const [clickTarget, setClickTarget] = useState<{ x: number; y: number; t: number } | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const advancingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentSongRef = useRef<QueueEntry | null>(null)

  const currentSong = queue.find(q => q.status === 'playing') ?? null
  const waitingQueue = queue.filter(q => q.status === 'waiting')
  currentSongRef.current = currentSong

  // Init identity
  useEffect(() => {
    const id = getVisitorId()
    setMyId(id)
    setMyColor(colorFor(id))
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

    // Delete room when last player leaves
    channel.on('presence', { event: 'leave' }, () => {
      const state = channel.presenceState()
      if (Object.keys(state).length === 0) {
        fetch('/api/chill/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room.id }),
          keepalive: true,
        })
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ username: myName, color: myColor, x: 50, y: 50 })
      }
    })

    return () => { supabase.removeChannel(channel) }
  }, [myId, myName, myColor, room.id])

  // Audio sync
  const handleSongEnd = useCallback(async () => {
    const song = currentSongRef.current
    if (advancingRef.current || !song) return
    advancingRef.current = true
    await fetch('/api/chill/queue/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, currentId: song.id }),
    })
    advancingRef.current = false
  }, [room.id])

  useEffect(() => {
    if (!audioReady || !currentSong?.started_at || !currentSong.track.previewUrl) {
      audioRef.current?.pause()
      return
    }
    audioRef.current?.pause()

    const audio = new Audio(currentSong.track.previewUrl)
    audio.currentTime = 0
    audio.volume = volume
    audio.play().catch(() => {})
    audio.addEventListener('ended', handleSongEnd)
    audioRef.current = audio

    return () => {
      audio.removeEventListener('ended', handleSongEnd)
      audio.pause()
    }
  }, [currentSong?.id, audioReady, handleSongEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  function handleWorldClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(95, Math.max(5, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(93, Math.max(5, ((e.clientY - rect.top) / rect.height) * 100))
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
    const res = await fetch('/api/chill/queue/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, url: urlInput.trim(), username: myName, userId: null }),
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

        {/* 2D World */}
        <div className="flex-1 relative overflow-hidden" style={{ minWidth: 0 }}>
          {!audioReady && (
            <button
              onClick={enableAudio}
              className="absolute top-3 left-3 z-10 bg-[#111] border border-[#fbbf24]/40 text-[#fbbf24] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Tap to enable sound
            </button>
          )}
          <div
            className="w-full h-full cursor-crosshair select-none relative overflow-hidden"
            style={{ background: '#0c0c0e' }}
            onClick={handleWorldClick}
          >
            {/* Dot grid overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle, #1e1e22 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }} />

            {/* Ambient corner lights */}
            <div className="absolute pointer-events-none" style={{ left: '-8%', top: '-8%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)' }} />
            <div className="absolute pointer-events-none" style={{ right: '-8%', top: '-8%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />
            <div className="absolute pointer-events-none" style={{ left: '-8%', bottom: '-8%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)' }} />
            <div className="absolute pointer-events-none" style={{ right: '-8%', bottom: '-8%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />

            {/* Central dancefloor glow */}
            <div className="absolute pointer-events-none" style={{
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '30%', height: '30%',
              background: 'radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)',
              border: '1px solid rgba(255,255,255,0.02)',
              borderRadius: '50%',
            }} />

            {/* Click ripple */}
            {clickTarget && (
              <div key={clickTarget.t} className="absolute pointer-events-none"
                style={{ left: `${clickTarget.x}%`, top: `${clickTarget.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-8 h-8 rounded-full border border-white/25 animate-ping" />
              </div>
            )}

            {/* Other players (from presence) */}
            {Object.values(players).filter(p => p.id !== myId).map(player => (
              <div key={player.id} className="absolute pointer-events-none"
                style={{
                  left: `${player.x}%`, top: `${player.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.35s ease, top 0.35s ease',
                  zIndex: 5,
                }}>
                <div className="absolute inset-0 rounded-full" style={{ background: player.color, filter: 'blur(8px)', transform: 'scale(1.5)', opacity: 0.3 }} />
                <div className="w-11 h-11 rounded-full relative mx-auto"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${player.color}ee, ${player.color}99)`,
                    border: '2px solid rgba(255,255,255,0.12)',
                    boxShadow: `0 4px 14px ${player.color}50`,
                  }}>
                  <div className="absolute top-1.5 left-2 w-2 h-1.5 rounded-full bg-white/25" />
                </div>
                <div className="mt-1.5 px-1.5 py-0.5 rounded-md bg-black/70 mx-auto w-fit">
                  <p className="text-[9px] font-bold text-[#ccc] whitespace-nowrap">{player.username}</p>
                </div>
              </div>
            ))}

            {/* My character (from myPos — instant response) */}
            {myId && (
              <div className="absolute pointer-events-none"
                style={{
                  left: `${myPos.x}%`, top: `${myPos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 0.18s ease, top 0.18s ease',
                  zIndex: 10,
                }}>
                <div className="absolute inset-0 rounded-full" style={{ background: myColor, filter: 'blur(10px)', transform: 'scale(1.6)', opacity: 0.4 }} />
                <div className="w-11 h-11 rounded-full relative mx-auto"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${myColor}ff, ${myColor}bb)`,
                    border: '2px solid rgba(255,255,255,0.55)',
                    boxShadow: `0 4px 16px ${myColor}70`,
                  }}>
                  <div className="absolute top-1.5 left-2 w-2 h-1.5 rounded-full bg-white/35" />
                </div>
                <div className="mt-1.5 px-1.5 py-0.5 rounded-md bg-black/70 mx-auto w-fit">
                  <p className="text-[9px] font-bold text-white whitespace-nowrap">{myName} ▪</p>
                </div>
              </div>
            )}
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-[#1e1e1e] pointer-events-none select-none">
            Click anywhere to move
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
    </div>
  )
}
