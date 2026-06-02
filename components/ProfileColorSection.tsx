'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ColorPicker from './ColorPicker'

export default function ProfileColorSection({
  profileUsername,
  currentColor,
}: {
  profileUsername: string
  currentColor: string
}) {
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single()
      if (data?.username === profileUsername) setIsOwner(true)
    })
  }, [profileUsername])

  if (!isOwner) return null
  return <ColorPicker currentColor={currentColor} />
}
