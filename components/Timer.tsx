interface Props {
  seconds: number
  total: number
}

export default function Timer({ seconds, total }: Props) {
  const pct = total > 0 ? (seconds / total) * 100 : 0
  const isUrgent = seconds <= 10

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <span
        className="text-5xl font-black tabular-nums transition-colors"
        style={{ color: isUrgent ? '#ef4444' : '#ffffff' }}
      >
        {seconds}
      </span>
      <div className="w-full h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: isUrgent ? '#ef4444' : '#ffffff',
          }}
        />
      </div>
    </div>
  )
}
