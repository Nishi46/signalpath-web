import { NextRequest, NextResponse } from 'next/server'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const res = await fetch(`${API_URL}/accounts/signup`, {
    method: 'POST',
    headers: internalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
