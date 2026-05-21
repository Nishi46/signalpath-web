import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { workspaceId } = await getAuthContext()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  if (typeof body.cluster_id !== 'string' || body.cluster_id.trim() === '') {
    return NextResponse.json({ error: 'cluster_id required' }, { status: 422 })
  }

  const res = await fetch(`${API_URL}/api/freeform/${encodeURIComponent(id)}/link-cluster`, {
    method: 'POST',
    headers: internalHeaders({
      'Content-Type':   'application/json',
      'X-Workspace-Id': workspaceId,
    }),
    body: JSON.stringify({ cluster_id: body.cluster_id }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
