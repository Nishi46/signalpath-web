import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'

/**
 * Get workspace_id from the authenticated user's session (server-side).
 * Returns null if no session or no workspace_id in app_metadata.
 */
export async function getWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))
        },
      },
    },
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return session.user?.app_metadata?.workspace_id ?? null
}
