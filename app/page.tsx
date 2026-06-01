'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/AuthModal'
import { getRank } from '@/lib/ranks'

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2l4 5-4 5"/>
  </svg>
)

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState<string | null>(null)
  const [userWins, setUserWins] = useState(0)
  const [userElo, setUserElo] = useState(500)
  const [showAuth, setShowAuth] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [lobbyCount, setLobbyCount] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, wins, elo')
          .eq('id', session.user.id)
          .single()
        if (profile?.username) {
          setUsername(profile.username)
          setName(profile.username)
          setUserWins(profile.wins ?? 0)
          setUserElo(profile.elo ?? 500)
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
    setUserElo(500)
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

  const userRank = getRank(userElo)

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pt-14 pb-16 max-w-md mx-auto">

      {/* Hero */}
      <div className="w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[#111] border border-[#222] rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
            {lobbyCount === null ? '...' : lobbyCount === 0 ? 'No active battles' : `${lobbyCount} battle${lobbyCount === 1 ? '' : 's'} live now`}
          </span>
        </div>
        <h1 className="text-4xl font-black tracking-tight uppercase whitespace-nowrap mb-2">
          <span className="text-white">Aux </span>
          <span className="text-[#ef4444]">Battle </span>
          <span className="text-white">Ranked</span>
        </h1>
        <p className="text-[#444] text-sm">Drop your track. Let the crowd decide.</p>
      </div>

      {/* Nav rows */}
      <div className="w-full flex flex-col gap-2 mb-6">

        {/* Lobbies */}
        <Link
          href="/lobbies"
          className="group w-full flex items-center gap-4 bg-[#111] border border-[#222] hover:border-[#ef4444]/40 rounded-2xl px-5 py-4 transition-all duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 group-hover:bg-[#ef4444]/15 flex items-center justify-center shrink-0 text-[#ef4444] transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="2" width="10" height="14" rx="2"/>
              <path d="M13 9h4M15 7l2 2-2 2"/>
              <circle cx="8" cy="9" r="1.2" fill="currentColor" stroke="none"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-widest text-white">Lobbies</p>
            <p className="text-xs text-[#555] mt-0.5">
              {lobbyCount === null ? 'Loading...' : lobbyCount === 0 ? 'No active rooms' : `${lobbyCount} room${lobbyCount === 1 ? '' : 's'} open`}
            </p>
          </div>
          <span className="text-[#444] group-hover:text-[#ef4444] transition-colors">
            <ChevronRight />
          </span>
        </Link>

        {/* Leaderboard */}
        <Link
          href="/leaderboard"
          className="group w-full flex items-center gap-4 bg-[#111] border border-[#222] hover:border-[#ef4444]/40 rounded-2xl px-5 py-4 transition-all duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 group-hover:bg-[#ef4444]/15 flex items-center justify-center shrink-0 text-[#ef4444] transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="1" y="10" width="4.5" height="7" rx="1"/>
              <rect x="6.75" y="5" width="4.5" height="12" rx="1"/>
              <rect x="12.5" y="7" width="4.5" height="10" rx="1"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black uppercase tracking-widest text-white">Leaderboard</p>
            <p className="text-xs text-[#555] mt-0.5">See who&apos;s on top</p>
          </div>
          <span className="text-[#444] group-hover:text-[#ef4444] transition-colors">
            <ChevronRight />
          </span>
        </Link>

        {/* Account */}
        {!authChecked ? (
          <div className="w-full h-[66px] bg-[#111] border border-[#222] rounded-2xl" />
        ) : username ? (
          <div className="w-full flex items-center gap-4 bg-[#111] border border-[#222] rounded-2xl px-5 py-4">
            <Link href={`/profile/${encodeURIComponent(username)}`} className="flex items-center gap-4 flex-1 min-w-0 group">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center shrink-0 text-[#ef4444] group-hover:bg-[#ef4444]/20 transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <circle cx="9" cy="6" r="3.5"/>
                  <path d="M2 17c0-3.866 3.134-7 7-7s7 3.134 7 7H2z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black uppercase tracking-widest text-white truncate">{username}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                    style={{ background: userRank.color, borderColor: userRank.border, color: userRank.text }}
                  >
                    {userRank.name}
                  </span>
                  <span className="text-xs text-[#555]">{userElo} ELO</span>
                </div>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-bold uppercase tracking-wider text-[#444] hover:text-[#ef4444] transition-colors shrink-0"
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="group w-full flex items-center gap-4 bg-[#111] border border-[#222] hover:border-[#ef4444]/40 rounded-2xl px-5 py-4 transition-all duration-200 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 group-hover:bg-[#ef4444]/15 flex items-center justify-center shrink-0 text-[#ef4444] transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <circle cx="9" cy="6" r="3.5"/>
                <path d="M2 17c0-3.866 3.134-7 7-7s7 3.134 7 7H2z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black uppercase tracking-widest text-white">Sign In / Register</p>
              <p className="text-xs text-[#555] mt-0.5">Track your wins on the leaderboard</p>
            </div>
            <span className="text-[#444] group-hover:text-[#ef4444] transition-colors">
              <ChevronRight />
            </span>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="w-full flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-[#1a1a1a]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#333]">Play</span>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
      </div>

      {/* Create battle */}
      <div className="w-full rounded-2xl border border-[#1e1e1e] bg-[#0d0d0d] p-5 mb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" style={{ boxShadow: '0 0 6px #ef4444' }} />
          <p className="text-xs font-black uppercase tracking-widest">Start a Battle</p>
        </div>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => !username && setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createBattle()}
          maxLength={24}
          readOnly={!!username}
          className={`w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none transition-colors mb-3 ${
            username ? 'opacity-40 cursor-not-allowed' : 'focus:border-[#2a2a2a]'
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
      <div className="w-full rounded-2xl border border-[#1e1e1e] bg-[#0d0d0d] p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" style={{ boxShadow: '0 0 6px #3b82f6' }} />
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
            className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2a2a2a] transition-colors font-mono tracking-widest uppercase"
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
