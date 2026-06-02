export type BattleStatus = 'waiting' | 'ready' | 'live' | 'finished'

export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  album: string
  albumArt: string
  previewUrl: string | null
  spotifyUrl: string
  durationMs: number
  fullTrackUrl?: string | null
}

export interface Battle {
  id: string
  code: string
  status: BattleStatus
  player1_name: string | null
  player2_name: string | null
  player1_track: SpotifyTrack | null
  player2_track: SpotifyTrack | null
  player1_votes: number
  player2_votes: number
  vote_duration: number
  started_at: string | null
  ended_at: string | null
  created_at: string
}
