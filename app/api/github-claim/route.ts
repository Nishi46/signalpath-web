import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * POST /api/github-claim
 * Associates an already-installed GitHub App installation with this workspace.
 * Body: { installation_id: number }
 */
export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const installationId = Number(body.installation_id)
  if (!installationId || !Number.isInteger(installationId) || installationId <= 0) {
    return NextResponse.json({ error: 'Invalid installation_id' }, { status: 400 })
  }

  const res = await fetch(
    `${API_URL}/auth/github/claim?workspace_id=${workspaceId}&installation_id=${installationId}`,
    { method: 'POST', headers: internalHeaders(), cache: 'no-store' },
  )

  if (!res.ok) {
    const body2 = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: body2.detail ?? 'Failed to claim installation' },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
