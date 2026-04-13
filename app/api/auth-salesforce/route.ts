import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

/**
 * GET /api/auth-salesforce?sandbox=true|false
 * Returns a Salesforce OAuth redirect URL for the authenticated workspace.
 * sandbox=true uses test.salesforce.com (for Salesforce sandbox orgs).
 */
export async function GET(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sandbox = req.nextUrl.searchParams.get('sandbox') === 'true'
  const url = `${API_URL}/auth/salesforce/init?workspace_id=${workspaceId}&sandbox=${sandbox}`

  const res = await fetch(url, {
    headers: internalHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.detail ?? 'Salesforce OAuth init failed' },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
