import type { SpotifyTrack } from '@/types'
import Image from 'next/image'

interface Props {
  track: SpotifyTrack | null
  player: 1 | 2
  playerName: string | null
  isMe: boolean
  onSetTrack: (url: string) => void
  loading: boolean
  disabled: boolean
  highlighted?: boolean
}

export default function TrackCard({ track, player, playerName, isMe, onSetTrack, loading, disabled, highlighted }: Props) {
  const color = player === 1 ? '#3b82f6' : '#ef4444'
  const label = player === 1 ? 'P1' : 'P2'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('url') as HTMLInputElement
    if (input.value.trim()) onSetTrack(input.value.trim())
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-black px-2 py-0.5 rounded"
          style={{ background: color, color: '#fff' }}
        >
          {label}
        </span>
        <span className="font-bold text-sm truncate">{playerName ?? 'Waiting...'}</span>
      </div>

      {track ? (
        <div
          className="bg-[#111] border rounded-2xl overflow-hidden transition-all duration-500"
          style={{
            borderColor: highlighted ? color : '#222',
            boxShadow: highlighted ? `0 0 28px ${color}50` : 'none',
          }}
        >
          {track.albumArt && (
            <div className="relative w-full aspect-square">
              <Image
                src={track.albumArt}
                alt={track.album}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
          <div className="p-4">
            <p className="font-bold text-sm leading-tight line-clamp-2">{track.name}</p>
            <p className="text-[#666] text-xs mt-1 truncate">{track.artist}</p>
            <p className="text-[#444] text-xs truncate">{track.album}</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#222] rounded-2xl aspect-square flex flex-col items-center justify-center p-6 gap-2">
          <div className="w-16 h-16 rounded-full border-2 border-[#2a2a2a] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10,8 16,12 10,16" fill="#444" stroke="none" />
            </svg>
          </div>
          <p className="text-[#444] text-xs text-center">No track selected</p>
        </div>
      )}

      {isMe && !track && !disabled && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            name="url"
            type="text"
            placeholder="Paste Spotify or SoundCloud link..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#444] transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider disabled:opacity-40 transition-colors text-white"
            style={{ background: color }}
          >
            {loading ? 'Loading...' : 'Set Track'}
          </button>
        </form>
      )}
    </div>
  )
}
