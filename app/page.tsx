'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/AuthModal'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState<string | null>(null)
  const [userWins, setUserWins] = useState(0)
  const [showAuth, setShowAuth] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [lobbyCount, setLobbyCount] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, wins')
          .eq('id', session.user.id)
          .single()
        if (profile?.username) {
          setUsername(profile.username)
          setName(profile.username)
          setUserWins(profile.wins ?? 0)
        }
      }
      setAuthChecked(true)
    })

    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    supabase
      .from('battles')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'finished')
      .gte('created_at', since)
      .then(({ count }) => setLobbyCount(count ?? 0))
  }, [])

  async function handleLogout() {
    await createClient().auth.signOut()
    setUsername(null)
    setName('')
    setUserWins(0)
  }

  function handleAuthSuccess(uname: string) {
    setUsername(uname)
    setName(uname)
    setShowAuth(false)
  }

  async function createBattle() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data: { session } } = await createClient().auth.getSession()

    const res = await fetch('/api/battle/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: name.trim(),
        accessToken: session?.access_token ?? null,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    localStorage.setItem(`auxbattle_role_${data.code}`, 'player1')
    localStorage.setItem(`auxbattle_name_${data.code}`, name.trim())
    router.push(`/battle/${data.code}`)
  }

  function joinBattle() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    router.push(`/battle/${code}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-12 pb-16 max-w-md mx-auto">

      {/* Hero */}
      <div className="w-full text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#111] border border-[#222] rounded-full px-4 py-1.5 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#666]">
            {lobbyCount === null ? '...' : lobbyCount === 0 ? 'No active battles' : `${lobbyCount} battle${lobbyCount === 1 ? '' : 's'} live now`}
          </span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mb-3">
          <span className="text-white">Aux</span>
          <span className="text-[#ef4444]"> Battle</span>
          <br />
          <span className="text-white">Ranked</span>
        </h1>
        <p className="text-[#444] text-sm">Drop your track. Let the crowd decide.</p>
      </div>

      {/* Feature cards */}
      <div className="w-full grid grid-cols-3 gap-3 mb-6">

        {/* Lobbies */}
        <Link href="/lobbies" className="group flex flex-col gap-3 rounded-2xl p-4 border transition-all duration-200 bg-[#0a130b] border-[#22c55e]/20 hover:border-[#22c55e]/60 hover:bg-[#0c1a0d]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-[#22c55e]/10 group-hover:bg-[#22c55e]/20 transition-colors">
            🎮
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#22c55e] mb-0.5">Lobbies</p>
            <p className="text-[11px] text-[#3d5e40] leading-tight">
              {lobbyCount === null ? '—' : `${lobbyCount} active`}
            </p>
          </div>
        </Link>

        {/* Leaderboard */}
        <Link href="/leaderboard" className="group flex flex-col gap-3 rounded-2xl p-4 border transition-all duration-200 bg-[#130f00] border-[#fbbf24]/20 hover:border-[#fbbf24]/60 hover:bg-[#1a1300]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-[#fbbf24]/10 group-hover:bg-[#fbbf24]/20 transition-colors">
            🏆
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#fbbf24] mb-0.5">Rankings</p>
            <p className="text-[11px] text-[#5e4d00] leading-tight">Top players</p>
          </div>
        </Link>

        {/* Account */}
        {!authChecked ? (
          <div className="flex flex-col gap-3 rounded-2xl p-4 border bg-[#111] border-[#1a1a1a]" />
        ) : username ? (
          <div className="flex flex-col gap-3 rounded-2xl p-4 border bg-[#0a0f1a] border-[#3b82f6]/20">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-[#3b82f6]/10">
              ⚡
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#3b82f6] mb-0.5 truncate">{username}</p>
              <p className="text-[11px] text-[#1e3a5e] leading-tight">{userWins}W</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="group flex flex-col gap-3 rounded-2xl p-4 border transition-all duration-200 bg-[#130a0a] border-[#ef4444]/20 hover:border-[#ef4444]/60 hover:bg-[#1a0c0c] text-left w-full"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl bg-[#ef4444]/10 group-hover:bg-[#ef4444]/20 transition-colors">
              🔥
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#ef4444] mb-0.5">Sign In</p>
              <p className="text-[11px] text-[#5e1a1a] leading-tight">Track wins</p>
            </div>
          </button>
        )}
      </div>

      {/* Logged-in strip */}
      {username && authChecked && (
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <p className="text-xs text-[#333]">
            Signed in as <span className="text-[#555]">{username}</span>
          </p>
          <button onClick={handleLogout} className="text-xs text-[#333] hover:text-[#666] transition-colors">
            Log out
          </button>
        </div>
      )}

      {/* Create battle */}
      <div className="w-full rounded-2xl border border-[#222] bg-[#0d0d0d] p-5 mb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" style={{ boxShadow: '0 0 8px #ef4444' }} />
          <p className="text-xs font-black uppercase tracking-widest">Start a Battle</p>
        </div>

        {!username && authChecked && (
          <p className="text-[#444] text-xs mb-3">
            <button onClick={() => setShowAuth(true)} className="text-[#fbbf24] hover:underline">Sign in</button>
            {' '}to track your wins on the leaderboard
          </p>
        )}

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => !username && setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createBattle()}
          maxLength={24}
          readOnly={!!username}
          className={`w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none transition-colors mb-3 ${
            username ? 'opacity-40 cursor-not-allowed' : 'focus:border-[#333]'
          }`}
        />
        <button
          onClick={createBattle}
          disabled={!name.trim() || loading}
          className="w-full bg-white hover:bg-[#eee] text-black font-black py-3.5 rounded-xl text-sm uppercase tracking-widest disabled:opacity-25 transition-colors"
        >
          {loading ? 'Creating...' : 'Create Battle →'}
        </button>
        {error && <p className="text-[#ef4444] text-xs mt-2 text-center">{error}</p>}
      </div>

      {/* Join with code */}
      <div className="w-full rounded-2xl border border-[#222] bg-[#0d0d0d] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" style={{ boxShadow: '0 0 8px #3b82f6' }} />
          <p className="text-xs font-black uppercase tracking-widest">Join with Code</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && joinBattle()}
            maxLength={6}
            className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#333] transition-colors font-mono tracking-widest uppercase"
          />
          <button
            onClick={joinBattle}
            disabled={joinCode.trim().length < 6}
            className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-25 text-white font-black px-5 rounded-xl text-sm uppercase tracking-wider transition-colors"
          >
            Join
          </button>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuthSuccess} />}
    </main>
  )
}
