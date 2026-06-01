'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { BattleStatus } from '@/types'

interface Lobby {
  code: string
  status: BattleStatus
  player1_name: string | null
  player2_name: string | null
  created_at: string
}

const STATUS_LABEL: Record<BattleStatus, string> = {
  waiting: 'Open',
  ready: 'Ready',
  live: 'Live',
  finished: 'Done',
}

const STATUS_COLOR: Record<BattleStatus, string> = {
  waiting: '#22c55e',
  ready: '#fbbf24',
  live: '#ef4444',
  finished: '#444',
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function LobbiesPage() {
  const router = useRouter()
  const [lobbies, setLobbies] = useState<Lobby[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch — all non-finished battles, newest first
    supabase
      .from('battles')
      .select('code, status, player1_name, player2_name, created_at')
      .neq('status', 'finished')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLobbies((data as Lobby[]) ?? [])
        setLoading(false)
      })

    // Realtime — reflect new battles and status changes instantly
    const channel = supabase
      .channel('lobbies-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const b = payload.new as Lobby
            if (b.status !== 'finished') {
              setLobbies(prev => [b, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const b = payload.new as Lobby
            if (b.status === 'finished') {
              setLobbies(prev => prev.filter(l => l.code !== b.code))
            } else {
              setLobbies(prev => prev.map(l => l.code === b.code ? b : l))
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      <div className="w-full flex items-center justify-between mb-8">
        <Link href="/" className="text-[#444] hover:text-white text-sm transition-colors">
          ← Home
        </Link>
        <h1 className="font-black text-sm uppercase tracking-widest">Active Lobbies</h1>
        <div className="w-12" />
      </div>

      {loading ? (
        <p className="text-[#444] text-sm mt-16">Loading...</p>
      ) : lobbies.length === 0 ? (
        <div className="text-center mt-16">
          <p className="text-[#444] text-sm mb-6">No active lobbies right now.</p>
          <Link
            href="/"
            className="text-xs font-bold text-white border border-[#222] hover:border-[#444] px-5 py-2.5 rounded-xl transition-colors uppercase tracking-wider"
          >
            Start one
          </Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-3">
          {lobbies.map(lobby => (
            <div
              key={lobby.code}
              className="w-full bg-[#111] border border-[#222] rounded-xl px-5 py-4 flex items-center gap-4"
            >
              {/* Live status dot */}
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: STATUS_COLOR[lobby.status],
                  boxShadow: `0 0 6px ${STATUS_COLOR[lobby.status]}`,
                }}
              />

              {/* Players + status */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {lobby.player1_name ?? '?'}
                  <span className="text-[#444] font-normal"> vs </span>
                  {lobby.player2_name
                    ? lobby.player2_name
                    : <span className="text-[#555] font-normal italic">waiting...</span>
                  }
                </p>
                <p className="text-xs text-[#444] mt-0.5">
                  <span
                    className="font-semibold uppercase tracking-wider mr-2"
                    style={{ color: STATUS_COLOR[lobby.status] }}
                  >
                    {STATUS_LABEL[lobby.status]}
                  </span>
                  {timeAgo(lobby.created_at)}
                </p>
              </div>

              {/* Code + action button */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs text-[#444] hidden sm:inline">{lobby.code}</span>
                <button
                  onClick={() => router.push(`/battle/${lobby.code}`)}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-white transition-colors uppercase tracking-wider"
                >
                  {lobby.status === 'waiting' ? 'Join' : 'Watch'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[#333] text-xs mt-8">Updates live</p>
    </main>
  )
}
