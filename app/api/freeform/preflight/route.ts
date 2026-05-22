import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(req: NextRequest) {
  const { workspaceId } = await getAuthContext()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length < 10) {
    return NextResponse.json({ error: 'Description must be at least 10 characters' }, { status: 422 })
  }

  const payload: Record<string, string | null> = {
    description:           description.slice(0, 2000),
    tech_stack_override:   typeof body.tech_stack_override === 'string' ? body.tech_stack_override.slice(0, 500) : null,
    complexity_constraint: ['S', 'M', 'L'].includes(body.complexity_constraint) ? body.complexity_constraint : null,
    target_audience:       typeof body.target_audience === 'string' ? body.target_audience.slice(0, 200) : null,
  }

  const res = await fetch(`${API_URL}/api/freeform/preflight`, {
    method: 'POST',
    headers: internalHeaders({
      'Content-Type':   'application/json',
      'X-Workspace-Id': workspaceId,
    }),
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
