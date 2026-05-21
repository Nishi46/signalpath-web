import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'

interface WorkspaceRow {
  github_installation_id: number | null
  github_connected_at: string | null
  github_issues_enabled: boolean | null
  github_issues_include_labels: string[] | null
  github_issues_exclude_labels: string[] | null
  github_issues_last_synced_at: string | null
}

interface InstallRow {
  account_login: string | null
  account_type: string | null
}

export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sb = getSupabaseAdmin()

  const { data: ws } = await sb
    .from('workspaces')
    .select(
      'github_installation_id, github_connected_at, ' +
      'github_issues_enabled, github_issues_include_labels, ' +
      'github_issues_exclude_labels, github_issues_last_synced_at'
    )
    .eq('id', workspaceId)
    .single() as { data: WorkspaceRow | null }

  if (!ws?.github_installation_id) {
    return NextResponse.json({
      account_login: null,
      account_type: null,
      connected_at: null,
      github_issues_enabled: false,
      github_issues_include_labels: ['bug', 'enhancement', 'feature-request'],
      github_issues_exclude_labels: ['wontfix', 'duplicate', 'invalid'],
      github_issues_last_synced_at: null,
    })
  }

  const { data: install } = await sb
    .from('github_installations')
    .select('account_login, account_type')
    .eq('installation_id', ws.github_installation_id)
    .maybeSingle() as { data: InstallRow | null }

  return NextResponse.json({
    account_login: install?.account_login ?? null,
    account_type: install?.account_type ?? null,
    connected_at: ws.github_connected_at ?? null,
    github_issues_enabled: ws.github_issues_enabled ?? false,
    github_issues_include_labels: ws.github_issues_include_labels ?? ['bug', 'enhancement', 'feature-request'],
    github_issues_exclude_labels: ws.github_issues_exclude_labels ?? ['wontfix', 'duplicate', 'invalid'],
    github_issues_last_synced_at: ws.github_issues_last_synced_at ?? null,
  })
}
