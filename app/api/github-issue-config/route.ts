import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * GET /api/github-issue-config
 * Return GitHub Issues ingestion config (enabled flag, include/exclude labels).
 */
export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${API_URL}/integrations/github/issue-config?workspace_id=${workspaceId}`,
    { headers: internalHeaders(), cache: 'no-store' },
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to fetch config' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}

/**
 * PUT /api/github-issue-config
 * Update GitHub Issues ingestion config.
 * Body: { enabled, include_labels, exclude_labels }
 */
export async function PUT(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const res = await fetch(`${API_URL}/integrations/github/issue-config`, {
    method: 'PUT',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      workspace_id: workspaceId,
      github_issues_enabled: Boolean(body.enabled),
      include_labels: Array.isArray(body.include_labels) ? body.include_labels : [],
      exclude_labels: Array.isArray(body.exclude_labels) ? body.exclude_labels : [],
    }),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to update config' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}
