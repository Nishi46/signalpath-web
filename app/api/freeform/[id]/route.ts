import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { workspaceId } = await getAuthContext()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const res = await fetch(`${API_URL}/api/freeform/${encodeURIComponent(id)}`, {
    headers: internalHeaders({ 'X-Workspace-Id': workspaceId }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
