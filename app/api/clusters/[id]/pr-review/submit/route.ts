import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * POST /api/clusters/[id]/pr-review/submit
 * Feature 9: Submit a GitHub PR review (APPROVE, REQUEST_CHANGES, COMMENT).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clusterId } = await params
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  const res = await fetch(`${API_URL}/clusters/${clusterId}/pr-review/submit`, {
    method: 'POST',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ workspace_id: workspaceId, ...body }),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to submit review' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}
