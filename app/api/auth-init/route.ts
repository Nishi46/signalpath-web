import { NextResponse } from 'next/server'

const gone = NextResponse.json(
  { error: 'Zendesk API token auth is disabled. Use OAuth via /api/auth-zendesk.' },
  { status: 410 },
)

export function POST() { return gone }
export function GET()  { return gone }
