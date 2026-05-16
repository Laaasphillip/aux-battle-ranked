import { createClient } from '@supabase/supabase-js'

const clean = (s: string) => s.replace(/^﻿/, '').trim()

export function createAdminClient() {
  return createClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY!)
  )
}
