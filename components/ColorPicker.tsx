'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const COLORS = [
  '#ef4444', '#f97316', '#fbbf24', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#a78bfa', '#34d399', '#fb923c',
]

export default function ColorPicker({ currentColor }: { currentColor: string }) {
  const [selected, setSelected] = useState(currentColor)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(color: string) {
    setSelected(color)
    setSaving(true)
    setSaved(false)

    // Persist locally so ChillRoom picks it up immediately
    localStorage.setItem('auxbattle_character_color', color)

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }

    await fetch('/api/profile/color', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: session.access_token, color }),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="w-full bg-[#111] border border-[#1e1e1e] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-widest">Character Color</p>
        {saving && <span className="text-[10px] text-[#444]">Saving...</span>}
        {saved && <span className="text-[10px] text-[#22c55e]">Saved</span>}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full border-2 border-white/20 shrink-0"
          style={{
            background: `radial-gradient(circle at 35% 35%, ${selected}ee, ${selected}99)`,
            boxShadow: `0 0 16px ${selected}60`,
          }}
        />
        <p className="text-xs text-[#555]">Your character in Chill Rooms</p>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => save(color)}
            className="aspect-square rounded-full transition-transform hover:scale-110 active:scale-95"
            style={{
              background: color,
              outline: selected === color ? `2px solid ${color}` : 'none',
              outlineOffset: '3px',
              boxShadow: selected === color ? `0 0 10px ${color}80` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}
