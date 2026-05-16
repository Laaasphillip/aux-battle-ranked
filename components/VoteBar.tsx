interface Props {
  p1Votes: number
  p2Votes: number
  p1Name: string | null
  p2Name: string | null
}

export default function VoteBar({ p1Votes, p2Votes, p1Name, p2Name }: Props) {
  const total = p1Votes + p2Votes
  const p1Pct = total === 0 ? 50 : Math.round((p1Votes / total) * 100)
  const p2Pct = 100 - p1Pct

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-bold mb-2">
        <span className="text-[#3b82f6]">{p1Name ?? 'P1'} — {p1Votes}</span>
        <span className="text-[#666] text-xs">{total} votes</span>
        <span className="text-[#ef4444]">{p2Votes} — {p2Name ?? 'P2'}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-[#1a1a1a] flex">
        <div
          className="h-full transition-all duration-500 rounded-l-full"
          style={{ width: `${p1Pct}%`, background: '#3b82f6' }}
        />
        <div
          className="h-full transition-all duration-500 rounded-r-full"
          style={{ width: `${p2Pct}%`, background: '#ef4444' }}
        />
      </div>
      <div className="flex justify-between text-xs text-[#444] mt-1">
        <span>{p1Pct}%</span>
        <span>{p2Pct}%</span>
      </div>
    </div>
  )
}
