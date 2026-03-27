import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subdomain = req.nextUrl.searchParams.get('subdomain') ?? ''

  const res = await fetch(
    `${API_URL}/auth/zendesk/init?workspace_id=${encodeURIComponent(workspaceId)}&subdomain=${encodeURIComponent(subdomain)}`,
    { headers: internalHeaders() }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
