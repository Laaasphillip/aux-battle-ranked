'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Battle, SpotifyTrack } from '@/types'
import { createClient } from '@/lib/supabase/client'
import TrackCard from './TrackCard'
import VoteBar from './VoteBar'
import Timer from './Timer'

function getVoterId(): string {
  const key = 'auxbattle_voter_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export default function BattleRoom({ initialBattle }: { initialBattle: Battle }) {
  const router = useRouter()
  const [battle, setBattle] = useState<Battle>(initialBattle)
  const [myRole, setMyRole] = useState<'player1' | 'player2' | 'voter'>('voter')
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [trackLoading, setTrackLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hasVoted, setHasVoted] = useState(false)
  const [votedFor, setVotedFor] = useState<1 | 2 | null>(null)
  const [voteError, setVoteError] = useState('')
  const [copied, setCopied] = useState(false)
  const battleEndedRef = useRef(false)

  useEffect(() => {
    const role = localStorage.getItem(`auxbattle_role_${battle.code}`) as 'player1' | 'player2' | null
    if (role) setMyRole(role)

    const voted = localStorage.getItem(`auxbattle_voted_${battle.code}`)
    if (voted) {
      setHasVoted(true)
      setVotedFor(Number(voted) as 1 | 2)
    }
  }, [battle.code])

  // Realtime subscription
  useEffect(() => {
    const client = createClient()
    const channel = client
      .channel(`battle-${battle.code}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'battles', filter: `code=eq.${battle.code}` },
        (payload) => setBattle(payload.new as Battle)
      )
      .subscribe()

    return () => { client.removeChannel(channel) }
  }, [battle.code])

  // Timer
  useEffect(() => {
    if (battle.status !== 'live' || !battle.started_at) return

    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(battle.started_at!).getTime()) / 1000)
      const remaining = Math.max(0, battle.vote_duration - elapsed)
      setTimeLeft(remaining)

      if (remaining === 0 && !battleEndedRef.current) {
        battleEndedRef.current = true
        fetch('/api/battle/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: battle.code }),
        })
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [battle.status, battle.started_at, battle.vote_duration, battle.code])

  const resolveTrack = useCallback(async (url: string): Promise<SpotifyTrack | null> => {
    setTrackLoading(true)
    const res = await fetch('/api/spotify/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    setTrackLoading(false)
    if (!res.ok) return null
    const data = await res.json()
    return data.track
  }, [])

  async function handleSetTrack(url: string) {
    const track = await resolveTrack(url)
    if (!track) return

    const player = myRole === 'player1' ? 1 : 2
    await fetch('/api/battle/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: battle.code, player, track }),
    })
  }

  async function handleJoin() {
    if (!joinName.trim()) return
    setJoining(true)

    const res = await fetch('/api/battle/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: battle.code, playerName: joinName.trim() }),
    })

    if (res.ok) {
      localStorage.setItem(`auxbattle_role_${battle.code}`, 'player2')
      localStorage.setItem(`auxbattle_name_${battle.code}`, joinName.trim())
      setMyRole('player2')
    }
    setJoining(false)
  }

  async function handleStartBattle() {
    await fetch('/api/battle/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: battle.code }),
    })
  }

  async function handleVote(player: 1 | 2) {
    if (hasVoted) return
    const voterId = getVoterId()
    setVoteError('')

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: battle.code, votedFor: player, voterId }),
    })

    if (res.ok) {
      setHasVoted(true)
      setVotedFor(player)
      localStorage.setItem(`auxbattle_voted_${battle.code}`, String(player))
    } else {
      const data = await res.json()
      setVoteError(data.error)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isPlayer = myRole === 'player1' || myRole === 'player2'
  const totalVotes = battle.player1_votes + battle.player2_votes
  const winner =
    battle.status === 'finished'
      ? battle.player1_votes > battle.player2_votes
        ? 1
        : battle.player2_votes > battle.player1_votes
        ? 2
        : 0
      : null

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8">
        <button onClick={() => router.push('/')} className="text-[#444] hover:text-white text-sm transition-colors">
          ← Home
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[#444] text-xs">Code:</span>
          <span className="font-mono font-bold tracking-widest text-sm bg-[#111] border border-[#222] px-3 py-1 rounded-lg">
            {battle.code}
          </span>
          <button
            onClick={copyLink}
            className="text-xs text-[#666] hover:text-white border border-[#222] hover:border-[#444] px-3 py-1 rounded-lg transition-colors"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="w-full mb-6">
        {battle.status === 'waiting' && (
          <div className="bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-center text-xs text-[#666]">
            {battle.player2_name ? 'Both players connected — select your tracks' : 'Waiting for opponent to join…'}
          </div>
        )}
        {battle.status === 'ready' && (
          <div className="bg-[#111] border border-[#fbbf24]/30 rounded-xl px-4 py-3 text-center text-xs text-[#fbbf24]">
            Both tracks locked in
          </div>
        )}
        {battle.status === 'live' && (
          <div className="flex flex-col items-center gap-3 bg-[#111] border border-[#ef4444]/30 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ef4444]">Battle Live</p>
            <Timer seconds={timeLeft} total={battle.vote_duration} />
          </div>
        )}
        {battle.status === 'finished' && (
          <div className="bg-[#111] border border-[#fbbf24]/30 rounded-xl px-4 py-4 text-center">
            <p className="text-xs text-[#666] uppercase tracking-widest mb-1">Winner</p>
            <p className="text-2xl font-black">
              {winner === 0
                ? "It's a Tie!"
                : winner === 1
                ? battle.player1_name
                : battle.player2_name}
            </p>
            <p className="text-xs text-[#666] mt-1">{totalVotes} total votes</p>
          </div>
        )}
      </div>

      {/* Player 2 join prompt */}
      {!battle.player2_name && myRole === 'voter' && battle.status === 'waiting' && (
        <div className="w-full bg-[#111] border border-[#222] rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#666] mb-3">
            Join as Player 2
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={24}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#444] transition-colors"
            />
            <button
              onClick={handleJoin}
              disabled={!joinName.trim() || joining}
              className="bg-[#ef4444] text-white font-bold px-4 rounded-xl text-sm disabled:opacity-40 hover:bg-[#dc2626] transition-colors"
            >
              {joining ? '...' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {/* Track cards */}
      <div className="w-full flex gap-4 mb-6 items-start">
        <TrackCard
          track={battle.player1_track}
          player={1}
          playerName={battle.player1_name}
          isMe={myRole === 'player1'}
          onSetTrack={handleSetTrack}
          loading={trackLoading}
          disabled={battle.status !== 'waiting'}
          status={battle.status}
        />

        <div className="flex flex-col items-center justify-center pt-16 shrink-0">
          <span className="text-2xl font-black text-[#333]">VS</span>
        </div>

        <TrackCard
          track={battle.player2_track}
          player={2}
          playerName={battle.player2_name}
          isMe={myRole === 'player2'}
          onSetTrack={handleSetTrack}
          loading={trackLoading}
          disabled={battle.status !== 'waiting'}
          status={battle.status}
        />
      </div>

      {/* Vote bar */}
      {(battle.status === 'live' || battle.status === 'finished') && (
        <div className="w-full mb-6">
          <VoteBar
            p1Votes={battle.player1_votes}
            p2Votes={battle.player2_votes}
            p1Name={battle.player1_name}
            p2Name={battle.player2_name}
          />
        </div>
      )}

      {/* Vote buttons (voters only, while live) */}
      {battle.status === 'live' && !isPlayer && (
        <div className="w-full">
          {hasVoted ? (
            <div className="text-center text-sm text-[#666]">
              You voted for{' '}
              <span className="font-bold text-white">
                {votedFor === 1 ? battle.player1_name : battle.player2_name}
              </span>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleVote(1)}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
              >
                Vote {battle.player1_name ?? 'P1'}
              </button>
              <button
                onClick={() => handleVote(2)}
                className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-colors"
              >
                Vote {battle.player2_name ?? 'P2'}
              </button>
            </div>
          )}
          {voteError && <p className="text-[#ef4444] text-xs text-center mt-2">{voteError}</p>}
        </div>
      )}

      {/* Start button (player 1 only, when ready) */}
      {battle.status === 'ready' && myRole === 'player1' && (
        <button
          onClick={handleStartBattle}
          className="w-full bg-white text-black font-black py-4 rounded-xl text-sm uppercase tracking-widest hover:bg-[#eee] transition-colors"
        >
          Start Battle
        </button>
      )}

      {/* Player waiting message */}
      {battle.status === 'live' && isPlayer && (
        <div className="text-center text-xs text-[#444] uppercase tracking-wider">
          You are competing — sit back and watch the votes roll in
        </div>
      )}

      {/* New battle button */}
      {battle.status === 'finished' && (
        <button
          onClick={() => router.push('/')}
          className="w-full border border-[#222] hover:border-[#444] text-white font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-colors"
        >
          New Battle
        </button>
      )}
    </main>
  )
}
