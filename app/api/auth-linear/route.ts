import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    `${API_URL}/auth/linear/init?workspace_id=${encodeURIComponent(workspaceId)}`,
    { headers: internalHeaders() }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
