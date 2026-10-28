import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { fetchWithTimeout } from '@/utils/fetchWithTimeout'
import { hasApiProxy, SUPABASE_PROXY_PATH } from '@/constants/site'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY environment değişkenleri tanımlı değil. .env.example dosyasından .env oluşturun.'
  )
}

// Bazı internet bağlantıları supabase.co'ya ulaşamıyor (berberin dükkânı dahil);
// güncel adreste istekler sitenin kendi adresi üzerinden iletilir (worker/index.ts).
const clientUrl = hasApiProxy(window.location.host)
  ? `${window.location.origin}${SUPABASE_PROXY_PATH}`
  : supabaseUrl

// Oturum anahtarı adresten türetildiği için sabitlenir: aracıya geçişte
// kayıtlı oturumlar kaybolmaz.
const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

// Oturum yenileme dahil hiçbir istek asılı kalmaz (bkz. fetchWithTimeout)
export const supabase = createClient<Database>(clientUrl, supabaseAnonKey, {
  auth: { storageKey: AUTH_STORAGE_KEY },
  global: { fetch: fetchWithTimeout },
})
