import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * POST /api/clusters/[id]/push-github-issue
 * Create a GitHub Issue from the cluster's agent_spec.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clusterId } = await params
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(`${API_URL}/clusters/${clusterId}/push-to-github-issue`, {
    method: 'POST',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ workspace_id: workspaceId }),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to create GitHub issue' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}
