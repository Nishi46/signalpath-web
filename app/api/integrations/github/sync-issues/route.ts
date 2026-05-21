import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * POST /api/integrations/github/sync-issues
 * Trigger a manual sync of GitHub Issues as signals for this workspace.
 */
export async function POST() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(`${API_URL}/integrations/github/sync-issues`, {
    method: 'POST',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ workspace_id: workspaceId }),
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data.detail ?? 'Failed to queue issue sync' },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}
