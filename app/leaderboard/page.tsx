import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 30

export default async function LeaderboardPage() {
  const db = createAdminClient()
  const { data: players } = await db
    .from('profiles')
    .select('username, wins, losses')
    .order('wins', { ascending: false })
    .limit(50)

  const list = players ?? []
  const rankColors = ['#fbbf24', '#9ca3af', '#cd7c2f']

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-2xl mx-auto">
      <div className="w-full flex items-center justify-between mb-8">
        <Link href="/" className="text-[#444] hover:text-white text-sm transition-colors">
          ← Home
        </Link>
        <h1 className="font-black text-sm uppercase tracking-widest">Leaderboard</h1>
        <div className="w-12" />
      </div>

      {list.length === 0 ? (
        <p className="text-[#444] text-sm text-center mt-16">
          No battles played yet. Be the first!
        </p>
      ) : (
        <div className="w-full flex flex-col gap-2">
          {list.map((player, i) => {
            const total = player.wins + player.losses
            const winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0
            const isTop3 = i < 3

            return (
              <div
                key={player.username}
                className="flex items-center gap-4 bg-[#111] border border-[#222] rounded-xl px-5 py-4"
                style={isTop3 ? { borderColor: `${rankColors[i]}40` } : {}}
              >
                <span
                  className="text-sm font-black w-6 text-center tabular-nums shrink-0"
                  style={{ color: isTop3 ? rankColors[i] : '#444' }}
                >
                  {i + 1}
                </span>
                <span className="font-bold text-sm flex-1 truncate">{player.username}</span>
                <div className="flex items-center gap-4 text-xs shrink-0">
                  <span>
                    <span className="text-white font-bold">{player.wins}</span>
                    <span className="text-[#3b82f6] ml-0.5">W</span>
                  </span>
                  <span>
                    <span className="text-white font-bold">{player.losses}</span>
                    <span className="text-[#ef4444] ml-0.5">L</span>
                  </span>
                  {total > 0 && (
                    <span className="text-[#555] hidden sm:inline">{winRate}%</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[#333] text-xs mt-8">Refreshes every 30s</p>
    </main>
  )
}
