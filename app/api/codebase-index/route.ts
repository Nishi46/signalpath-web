import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'


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
 * DELETE /api/codebase-index
 * Cancels an in-progress index for the given repo.
 */
export async function DELETE(req: Request) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.repo_full_name) {
    return NextResponse.json({ error: 'repo_full_name is required' }, { status: 400 })
  }

  const res = await fetch(`${API_URL}/api/codebase/index`, {
    method: 'DELETE',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ workspace_id: workspaceId, repo_full_name: body.repo_full_name }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: data.detail ?? 'Failed to cancel indexing' },
      { status: res.status },
    )
  }

  return NextResponse.json({ cancelled: true })
}

/**
 * GET /api/codebase-index
 * Without ?repo=: returns all indexed repos for the workspace (used by freeform indicator).
 * With ?repo=owner/name: returns status for that specific repo (used during indexing polling).
 */
export async function GET(req: Request) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const repoFilter = searchParams.get('repo')

  let query = getSupabaseAdmin()
    .from('workspace_codebase_index')
    .select('repo_full_name, indexing_status, indexing_error, last_indexed_at, index_stats')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (repoFilter) {
    // Targeted poll for a specific repo being indexed
    const { data } = await query.eq('repo_full_name', repoFilter).limit(1).maybeSingle()
    if (!data) return NextResponse.json({ status: 'none' })
    return NextResponse.json({
      status: data.indexing_status,
      repo: data.repo_full_name,
      error: data.indexing_error ?? null,
      last_indexed_at: data.last_indexed_at ?? null,
      stats: data.index_stats ?? null,
    })
  }

  // Return all repos
  const { data } = await query
  if (!data || data.length === 0) return NextResponse.json({ repos: [] })

  return NextResponse.json({
    repos: data.map(r => ({
      status: r.indexing_status,
      repo: r.repo_full_name,
      error: r.indexing_error ?? null,
      last_indexed_at: r.last_indexed_at ?? null,
      stats: r.index_stats ?? null,
    })),
  })
}
