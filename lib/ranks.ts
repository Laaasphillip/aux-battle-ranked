export interface Rank {
  name: string
  min: number
  color: string   // badge background
  border: string  // badge border
  text: string    // badge text
}

export const RANKS: Rank[] = [
  { name: 'Bronze',   min: 0,    color: '#1a0e06', border: '#7c4a1e', text: '#c87941' },
  { name: 'Silver',   min: 500,  color: '#111',    border: '#444',    text: '#9ca3af' },
  { name: 'Gold',     min: 700,  color: '#1a1400', border: '#7c6400', text: '#fbbf24' },
  { name: 'Platinum', min: 900,  color: '#001418', border: '#006070', text: '#67e8f9' },
  { name: 'Diamond',  min: 1100, color: '#0a0818', border: '#4c3f9e', text: '#818cf8' },
  { name: 'Elite',    min: 1300, color: '#180505', border: '#7a1010', text: '#ef4444' },
]

export function getRank(elo: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (elo >= RANKS[i].min) return RANKS[i]
  }
  return RANKS[0]
}
