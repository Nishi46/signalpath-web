import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspace_id = searchParams.get('workspace_id') ?? ''
  const subdomain = searchParams.get('subdomain') ?? ''

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const res = await fetch(
    `${apiUrl}/auth/zendesk/init?workspace_id=${encodeURIComponent(workspace_id)}&subdomain=${encodeURIComponent(subdomain)}`
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
