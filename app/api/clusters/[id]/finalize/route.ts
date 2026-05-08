import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clusterId } = await params
  const body = await req.json().catch(() => ({}))

  const res = await fetch(
    `${API_URL}/clusters/${encodeURIComponent(clusterId)}/finalize`,
    {
      method: 'POST',
      headers: internalHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        workspace_id: workspaceId,
        human_brief: body.human_brief ?? '',
        agent_spec: body.agent_spec ?? null,
      }),
    },
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
