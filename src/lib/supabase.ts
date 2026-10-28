import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchWithTimeout } from '@/utils/fetchWithTimeout'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY environment değişkenleri tanımlı değil. .env.example dosyasından .env oluşturun.'
  )
}

// Oturum yenileme dahil hiçbir istek asılı kalmaz (bkz. fetchWithTimeout)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
})
