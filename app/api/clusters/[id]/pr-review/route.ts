import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * GET /api/clusters/[id]/pr-review
 * Feature 9: Engineer Context Panel.
 * Returns PR files, reviews, tasks with evidence mapping, and top signals.
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
    `${API_URL}/clusters/${clusterId}/pr-review?workspace_id=${workspaceId}`,
    { headers: internalHeaders(), cache: 'no-store' },
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to fetch PR review data' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}
