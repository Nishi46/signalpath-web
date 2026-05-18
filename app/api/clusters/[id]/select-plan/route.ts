import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clusterId } = await params
  const body = await req.json().catch(() => ({}))
  const planId = body.plan_id as string | undefined

  if (!planId) {
    return NextResponse.json({ error: 'plan_id required' }, { status: 400 })
  }

  const res = await fetch(
    `${API_URL}/clusters/${encodeURIComponent(clusterId)}/select-plan`,
    {
      method: 'POST',
      headers: internalHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ plan_id: planId }),
    },
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
