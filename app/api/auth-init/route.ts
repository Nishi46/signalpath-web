import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { subdomain, email, api_token } = body

  const res = await fetch(`${API_URL}/auth/zendesk/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...internalHeaders() },
    body: JSON.stringify({ workspace_id: workspaceId, subdomain, email, api_token }),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// Keep GET for any legacy redirects — return a clear error
export async function GET() {
  return NextResponse.json(
    { error: 'Zendesk now uses API token auth. Use POST with subdomain, email, and api_token.' },
    { status: 405 },
  )
}
