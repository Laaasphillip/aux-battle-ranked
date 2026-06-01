import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/client'
import ChillRoom from '@/components/ChillRoom'
import { notFound } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

async function getServerUsername(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/^﻿/, '').trim()
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.replace(/^﻿/, '').trim()
    const supabase = createBrowserClient(url, key, {
      cookies: { getAll: () => cookieStore.getAll() },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const db = createAdminClient()
    const { data } = await db.from('profiles').select('username').eq('id', user.id).single()
    return data?.username ?? null
  } catch {
    return null
  }
}

export default async function ChillRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  const { data: room } = await db
    .from('chill_rooms')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!room) notFound()

  const { data: queueData } = await db
    .from('chill_queue')
    .select('*')
    .eq('room_id', id)
    .neq('status', 'finished')
    .order('created_at', { ascending: true })

  const { data: messagesData } = await db
    .from('chill_messages')
    .select('*')
    .eq('room_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  const serverUsername = await getServerUsername()

  return (
    <ChillRoom
      room={room}
      initialQueue={queueData ?? []}
      initialMessages={messagesData ?? []}
      serverUsername={serverUsername}
    />
  )
}
