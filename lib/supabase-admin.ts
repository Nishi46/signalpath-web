/**
 * Lazy Supabase admin client factory.
 *
 * Call getSupabaseAdmin() inside request handlers — never at module top-level.
 * Top-level createClient() calls throw during `next build` because env vars
 * are not injected until runtime.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
    }
    _client = createClient(url, key)
  }
  return _client
}
