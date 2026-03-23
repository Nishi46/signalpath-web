import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'

export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subdomain = req.nextUrl.searchParams.get('subdomain') ?? ''

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const res = await fetch(
    `${apiUrl}/auth/zendesk/init?workspace_id=${encodeURIComponent(workspaceId)}&subdomain=${encodeURIComponent(subdomain)}`
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
