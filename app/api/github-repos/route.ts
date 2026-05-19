import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * GET /api/github-repos
 * Returns repositories accessible to the workspace's GitHub App installation.
 */
export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${API_URL}/auth/github/repos?workspace_id=${workspaceId}`,
    { headers: internalHeaders(), cache: 'no-store' },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.detail ?? 'Failed to fetch repositories' },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
