'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Room {
  id: string
  name: string
  created_by: string | null
  created_at: string
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function ChillPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('chill_rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setRooms(data ?? []); setLoading(false) })
  }, [])

  async function createRoom() {
    if (!roomName.trim() || creating) return
    setCreating(true)
    const username = localStorage.getItem('auxbattle_chill_name') ?? undefined
    const res = await fetch('/api/chill/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: roomName.trim(), createdBy: username }),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) router.push(`/chill/${data.id}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-md mx-auto">
      <div className="w-full flex items-center justify-between mb-8">
        <Link href="/" className="text-[#444] hover:text-white text-sm transition-colors">← Home</Link>
        <h1 className="font-black text-sm uppercase tracking-widest">Chill Rooms</h1>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="text-xs font-bold uppercase tracking-wider text-[#ef4444] hover:text-white transition-colors"
        >
          + New
        </button>
      </div>

      {showCreate && (
        <div className="w-full bg-[#111] border border-[#222] rounded-2xl p-5 mb-4">
          <p className="text-xs font-black uppercase tracking-widest mb-3">Create a Room</p>
          <input
            type="text"
            placeholder="Room name"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createRoom()}
            maxLength={40}
            autoFocus
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2a2a2a] mb-3 transition-colors"
          />
          <button
            onClick={createRoom}
            disabled={!roomName.trim() || creating}
            className="w-full bg-white hover:bg-[#eee] text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest disabled:opacity-30 transition-colors"
          >
            {creating ? 'Creating...' : 'Create Room →'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-[#444] text-sm mt-16">Loading...</p>
      ) : rooms.length === 0 ? (
        <div className="text-center mt-16">
          <p className="text-[#444] text-sm mb-4">No rooms yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs font-bold text-white border border-[#222] hover:border-[#444] px-5 py-2.5 rounded-xl uppercase tracking-wider transition-colors"
          >
            Create the first one
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => router.push(`/chill/${room.id}`)}
              className="w-full flex items-center gap-4 bg-[#111] border border-[#1e1e1e] hover:border-[#ef4444]/30 rounded-xl px-5 py-4 transition-colors text-left group"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shrink-0" style={{ boxShadow: '0 0 6px #22c55e' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{room.name}</p>
                <p className="text-xs text-[#444] mt-0.5">
                  {room.created_by ? `by ${room.created_by} · ` : ''}{timeAgo(room.created_at)}
                </p>
              </div>
              <span className="text-[#333] group-hover:text-[#ef4444] transition-colors text-xs font-bold">Join →</span>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
