import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subdomain = req.nextUrl.searchParams.get('subdomain') ?? ''
  if (!subdomain) {
    return NextResponse.json({ error: 'subdomain is required' }, { status: 400 })
  }

  const res = await fetch(
    `${API_URL}/auth/zendesk/init?workspace_id=${workspaceId}&subdomain=${encodeURIComponent(subdomain)}`,
    { headers: internalHeaders(), cache: 'no-store' },
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.detail ?? 'Zendesk OAuth init failed' },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
