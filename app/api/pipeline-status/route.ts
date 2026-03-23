import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'

export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const res = await fetch(`${apiUrl}/pipeline/status/${workspaceId}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
