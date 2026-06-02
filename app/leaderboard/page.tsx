import { createAdminClient } from '@/lib/supabase/server'
import { getRank } from '@/lib/ranks'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const db = createAdminClient()
  const { data: players } = await db
    .from('profiles')
    .select('username, wins, losses, elo')
    .order('elo', { ascending: false })
    .limit(50)

  const list = players ?? []

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      <div className="w-full flex items-center justify-between mb-8">
        <Link href="/" className="text-[#444] hover:text-white text-sm transition-colors">← Home</Link>
        <h1 className="font-black text-sm uppercase tracking-widest">Leaderboard</h1>
        <div className="w-12" />
      </div>

      {list.length === 0 ? (
        <p className="text-[#444] text-sm text-center mt-16">No players yet. Be the first!</p>
      ) : (
        <div className="w-full flex flex-col gap-2">
          {list.map((player, i) => {
            const rank = getRank(player.elo)
            const total = player.wins + player.losses
            const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0
            const medalColor = ['#fbbf24', '#9ca3af', '#c87941']

            return (
              <Link
                key={player.username}
                href={`/profile/${encodeURIComponent(player.username)}`}
                className="flex items-center gap-4 bg-[#111] border border-[#1e1e1e] hover:border-[#333] rounded-xl px-5 py-3.5 transition-colors"
              >
                {/* Position */}
                <span
                  className="text-sm font-black w-6 text-center tabular-nums shrink-0"
                  style={{ color: i < 3 ? medalColor[i] : '#333' }}
                >
                  {i + 1}
                </span>

                {/* Rank badge */}
                <div
                  className="px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest shrink-0"
                  style={{ background: rank.color, borderColor: rank.border, color: rank.text }}
                >
                  {rank.name}
                </div>

                {/* Username */}
                <span className="font-bold text-sm flex-1 truncate">{player.username}</span>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs shrink-0">
                  <span className="font-black text-white tabular-nums">{player.elo} <span className="text-[#333] font-normal">ELO</span></span>
                  <span className="text-[#444] hidden sm:inline">{player.wins}W {player.losses}L</span>
                  {total > 0 && <span className="text-[#333] hidden sm:inline">{winRate}%</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <p className="text-[#2a2a2a] text-xs mt-8">Always up to date</p>
    </main>
  )
}
