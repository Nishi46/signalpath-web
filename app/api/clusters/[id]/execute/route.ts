import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * POST /api/clusters/[id]/execute
 * Start agent execution (build this feature) for a cluster.
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

  const res = await fetch(`${API_URL}/clusters/${clusterId}/execute`, {
    method: 'POST',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ workspace_id: workspaceId }),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to start agent execution' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}

/**
 * GET /api/clusters/[id]/execute
 * Poll agent run status and per-task breakdown.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clusterId } = await params
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${API_URL}/clusters/${clusterId}/execute/status?workspace_id=${workspaceId}`,
    { headers: internalHeaders(), cache: 'no-store' },
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to fetch execution status' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}
