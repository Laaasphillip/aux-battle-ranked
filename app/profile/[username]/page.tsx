import { createAdminClient } from '@/lib/supabase/server'
import { getRank, RANKS } from '@/lib/ranks'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProfileColorSection from '@/components/ProfileColorSection'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles')
    .select('username, wins, losses, elo, character_color')
    .eq('username', decodeURIComponent(username))
    .single()

  if (!profile) notFound()

  const rank = getRank(profile.elo)
  const total = profile.wins + profile.losses
  const winRate = total > 0 ? Math.round((profile.wins / total) * 100) : 0
  const rankIdx = RANKS.findIndex(r => r.name === rank.name)
  const nextRankElo = RANKS[rankIdx + 1]?.min ?? null
  const eloToNext = nextRankElo ? nextRankElo - profile.elo : null
  const rankProgress = nextRankElo
    ? Math.min(100, ((profile.elo - rank.min) / (nextRankElo - rank.min)) * 100)
    : 100

  const characterColor = profile.character_color ?? '#ef4444'

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 max-w-md mx-auto">
      <div className="w-full flex items-center justify-between mb-10">
        <Link href="/" className="text-[#444] hover:text-white text-sm transition-colors">← Home</Link>
        <Link href="/leaderboard" className="text-[#444] hover:text-white text-xs uppercase tracking-widest transition-colors">Leaderboard</Link>
      </div>

      {/* Character preview + rank */}
      <div className="w-full flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-full mb-4"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${characterColor}ee, ${characterColor}99)`,
            border: '3px solid rgba(255,255,255,0.15)',
            boxShadow: `0 0 24px ${characterColor}60`,
          }}
        />
        <div
          className="px-5 py-2 rounded-xl border text-xs font-black uppercase tracking-widest mb-3"
          style={{ background: rank.color, borderColor: rank.border, color: rank.text }}
        >
          {rank.name}
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1">{profile.username}</h1>
        <p className="text-2xl font-black text-white">{profile.elo} <span className="text-sm font-bold text-[#444] uppercase tracking-widest">ELO</span></p>
      </div>

      {/* Rank progress */}
      <div className="w-full bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black uppercase tracking-widest text-white">{rank.name}</p>
          {eloToNext !== null
            ? <p className="text-xs text-[#444]">{eloToNext} ELO to next rank</p>
            : <p className="text-xs text-[#ef4444] font-bold uppercase tracking-widest">Max Rank</p>
          }
        </div>
        <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${rankProgress}%`, background: rank.text }} />
        </div>
      </div>

      {/* Stats */}
      <div className="w-full grid grid-cols-3 gap-3 mb-3">
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 flex flex-col items-center gap-1">
          <p className="text-2xl font-black text-white">{profile.wins}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">Wins</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 flex flex-col items-center gap-1">
          <p className="text-2xl font-black text-white">{profile.losses}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">Losses</p>
        </div>
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 flex flex-col items-center gap-1">
          <p className="text-2xl font-black text-white">{winRate}%</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#444]">Win Rate</p>
        </div>
      </div>

      <div className="w-full bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-[#444]">Total Battles</p>
        <p className="text-sm font-black text-white">{total}</p>
      </div>

      {/* Color picker — client-side auth check handles visibility */}
      <ProfileColorSection profileUsername={profile.username} currentColor={characterColor} />
    </main>
  )
}
