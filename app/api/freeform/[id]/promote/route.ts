import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { workspaceId, userId } = await getAuthContext()
  if (!workspaceId || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const res = await fetch(`${API_URL}/api/freeform/${encodeURIComponent(id)}/promote`, {
    method: 'POST',
    headers: internalHeaders({
      'X-Workspace-Id': workspaceId,
      'X-User-Id':      userId,
    }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
