import { NextResponse } from 'next/server'

// Zendesk now uses OAuth via /api/auth-zendesk — this endpoint is no longer active.
export async function POST() {
  return NextResponse.json(
    { error: 'Zendesk API token auth is disabled. Use OAuth via /api/auth-zendesk.' },
    { status: 410 },
  )
}

export async function GET() {
  return NextResponse.json(
    { error: 'Zendesk API token auth is disabled. Use OAuth via /api/auth-zendesk.' },
    { status: 410 },
  )
}
