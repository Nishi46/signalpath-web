import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'

/**
 * POST /api/github-disconnect
 * Soft-disconnects GitHub from this workspace by clearing the installation reference.
 * Does NOT uninstall the GitHub App from the user's GitHub account — they must do that
 * themselves at github.com/settings/installations.
 */
export async function POST() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await getSupabaseAdmin()
    .from('workspaces')
    .update({
      github_installation_id: null,
      github_connected_at: null,
    })
    .eq('id', workspaceId)

  return NextResponse.json({ ok: true })
}
