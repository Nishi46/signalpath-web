import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/codebase-index
 * Triggers a full codebase index for the given repo.
 */
export async function POST(req: Request) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.repo_full_name) {
    return NextResponse.json({ error: 'repo_full_name is required' }, { status: 400 })
  }

  const res = await fetch(`${API_URL}/api/codebase/index`, {
    method: 'POST',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ workspace_id: workspaceId, repo_full_name: body.repo_full_name }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: data.detail ?? 'Failed to start indexing' },
      { status: res.status },
    )
  }

  return NextResponse.json({ queued: true })
}

/**
 * GET /api/codebase-index
 * Polls the indexing status for the workspace's connected repo.
 */
export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('workspace_codebase_index')
    .select('repo_full_name, indexing_status, indexing_error, last_indexed_at, index_stats')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ status: 'none' })
  }

  return NextResponse.json({
    status: data.indexing_status,
    repo: data.repo_full_name,
    error: data.indexing_error ?? null,
    last_indexed_at: data.last_indexed_at ?? null,
    stats: data.index_stats ?? null,
  })
}
