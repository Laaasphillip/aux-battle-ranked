'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onClose: () => void
  onAuth: (username: string) => void
}

export default function AuthModal({ onClose, onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    if (mode === 'register') {
      const trimmed = username.trim()
      if (trimmed.length < 3) {
        setError('Username must be at least 3 characters')
        setLoading(false)
        return
      }

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: trimmed } },
      })

      if (err) { setError(err.message); setLoading(false); return }
      if (!data.session) {
        setError('Check your email to confirm your account, then log in.')
        setLoading(false)
        return
      }
      onAuth(trimmed)
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .single()

      onAuth(profile?.username ?? data.user.email?.split('@')[0] ?? 'Player')
    }

    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-[#222] rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-sm uppercase tracking-widest">
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="text-[#444] hover:text-white text-xs transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Username (shown on leaderboard)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={24}
              required
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#444] transition-colors"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#444] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            required
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#444] transition-colors"
          />

          {error && <p className="text-[#ef4444] text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm uppercase tracking-wider disabled:opacity-40 hover:bg-[#eee] transition-colors mt-1"
          >
            {loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
          className="w-full mt-4 text-xs text-[#444] hover:text-white transition-colors"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}
