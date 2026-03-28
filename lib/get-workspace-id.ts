import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'

export type AuthContext = {
  workspaceId: string | null
  userId: string | null
}

/**
 * Workspace + user id from the authenticated session (server-side).
 */
export async function getAuthContext(): Promise<AuthContext> {
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

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { workspaceId: null, userId: null }
  }
  return {
    workspaceId: user.app_metadata?.workspace_id ?? null,
    userId: user.id ?? null,
  }
}

/**
 * Get workspace_id from the authenticated user's session (server-side).
 * Returns null if no session or no workspace_id in app_metadata.
 */
export async function getWorkspaceId(): Promise<string | null> {
  const { workspaceId } = await getAuthContext()
  return workspaceId
}
