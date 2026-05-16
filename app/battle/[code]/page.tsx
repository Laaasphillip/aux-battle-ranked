import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Battle } from '@/types'
import BattleRoom from '@/components/BattleRoom'

export default async function BattlePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const db = createAdminClient()

  const { data } = await db
    .from('battles')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!data) notFound()

  return <BattleRoom initialBattle={data as Battle} />
}
