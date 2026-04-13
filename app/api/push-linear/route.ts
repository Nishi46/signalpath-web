import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  let res: Response
  try {
    res = await fetch(`${API_URL}/push/linear`, {
      method: 'POST',
      headers: internalHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...body, workspace_id: workspaceId }),
    })
  } catch {
    return NextResponse.json({ detail: 'Could not reach backend. Please try again.' }, { status: 503 })
  }

  const data = await res.json().catch(() => ({ detail: 'Unexpected backend response.' }))
  return NextResponse.json(data, { status: res.status })
}
