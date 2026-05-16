'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createBattle() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/battle/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: name.trim() }),
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
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tight uppercase mb-2">
            Aux Battle
            <span className="text-[#ef4444]"> Ranked</span>
          </h1>
          <p className="text-[#666] text-sm">Drop your track. Let the crowd decide.</p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#666] mb-4">
            Start a Battle
          </p>
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
    </main>
  )
}
