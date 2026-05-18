import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clusterId } = await params

  const res = await fetch(
    `${API_URL}/clusters/${encodeURIComponent(clusterId)}/plans?workspace_id=${encodeURIComponent(workspaceId)}`,
    { headers: internalHeaders() },
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clusterId } = await params

  const res = await fetch(
    `${API_URL}/clusters/${encodeURIComponent(clusterId)}/plans`,
    {
      method: 'POST',
      headers: internalHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ workspace_id: workspaceId }),
    },
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
