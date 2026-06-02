'use client'

import { useEffect, useState } from 'react'
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
    const stored = localStorage.getItem('auxbattle_username')
    if (stored === profileUsername) setIsOwner(true)
  }, [profileUsername])

  if (!isOwner) return null
  return <ColorPicker currentColor={currentColor} />
}
