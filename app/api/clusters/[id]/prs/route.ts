import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'

const MIN_RELEVANCE_DEFAULT = 0.30
const LIMIT_DEFAULT = 10
const LIMIT_MAX = 50

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clusterId } = await params

  // Parse + clamp query params — never trust caller values
  const sp = req.nextUrl.searchParams
  const minRelevance = Math.max(0, Math.min(1, parseFloat(sp.get('min_relevance') ?? String(MIN_RELEVANCE_DEFAULT))))
  const limit = Math.max(1, Math.min(LIMIT_MAX, parseInt(sp.get('limit') ?? String(LIMIT_DEFAULT), 10)))

  const sb = getSupabaseAdmin()

  // Verify cluster belongs to this workspace before touching the cache table
  const { data: cluster } = await sb
    .from('clusters')
    .select('id')
    .eq('id', clusterId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!cluster) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
  }

  // Fetch relevant PRs for this specific cluster
  const { data: prs, error: prsError } = await sb
    .from('github_pr_cache')
    .select('pr_number, pr_title, pr_state, author_login, merged_at, created_at, html_url, head_branch, relevance_score')
    .eq('workspace_id', workspaceId)
    .eq('cluster_id', clusterId)
    .gte('relevance_score', minRelevance)
    .order('relevance_score', { ascending: false })
    .limit(limit)

  if (prsError) {
    console.error('[/api/clusters/[id]/prs] Supabase error:', prsError.message)
    return NextResponse.json({ error: 'Failed to load PR feed' }, { status: 500 })
  }

  // Workspace metadata for display (repo name + last sync time)
  const { data: ws } = await sb
    .from('workspaces')
    .select('github_repo, github_last_sync')
    .eq('id', workspaceId)
    .single()

  return NextResponse.json({
    prs: prs ?? [],
    repo_full_name: ws?.github_repo ?? null,
    last_synced_at: ws?.github_last_sync ?? null,
    total: (prs ?? []).length,
  })
}
