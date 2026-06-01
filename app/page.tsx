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
  const [showAuth, setShowAuth] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single()
        if (profile?.username) {
          setUsername(profile.username)
          setName(profile.username)
        }
      }
      setAuthChecked(true)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUsername(null)
    setName('')
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

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

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
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/lobbies" className="text-xs text-[#666] hover:text-white transition-colors uppercase tracking-widest">
              Lobbies
            </Link>
            <Link href="/leaderboard" className="text-xs text-[#666] hover:text-white transition-colors uppercase tracking-widest">
              Leaderboard
            </Link>
          </div>
          {authChecked && (
            username ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#666]">{username}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-[#444] hover:text-white transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-xs text-[#666] hover:text-white transition-colors"
              >
                Log in / Register
              </button>
            )
          )}
        </div>

        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight uppercase mb-2">
            Aux Battle
            <span className="text-[#ef4444]"> Ranked</span>
          </h1>
          <p className="text-[#666] text-sm">Drop your track. Let the crowd decide.</p>
        </div>

        {/* Create battle */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#666] mb-4">
            Start a Battle
          </p>
          {!username && authChecked && (
            <p className="text-[#555] text-xs mb-3">
              <button onClick={() => setShowAuth(true)} className="text-[#fbbf24] hover:underline">
                Log in
              </button>{' '}
              to track your wins on the leaderboard
            </p>
          )}
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createBattle()}
            maxLength={24}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#444] transition-colors mb-3"
          />
          <button
            onClick={createBattle}
            disabled={!name.trim() || loading}
            className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm uppercase tracking-wider disabled:opacity-30 hover:bg-[#eee] transition-colors"
          >
            {loading ? 'Creating...' : 'Create Battle'}
          </button>
          {error && <p className="text-[#ef4444] text-xs mt-2 text-center">{error}</p>}
        </div>

        {/* Join battle */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#666] mb-4">
            Join with Code
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter battle code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinBattle()}
              maxLength={6}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#444] transition-colors font-mono tracking-widest uppercase"
            />
            <button
              onClick={joinBattle}
              disabled={joinCode.trim().length < 6}
              className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-white font-bold px-5 rounded-xl text-sm disabled:opacity-30 transition-colors"
            >
              Join
            </button>
          </div>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuthSuccess} />}
    </main>
  )
}
