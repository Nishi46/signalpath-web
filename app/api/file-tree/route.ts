import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

export async function POST(req: Request) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const fileTree = String(body.file_tree ?? '').slice(0, 10_000)

  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/file-tree`, {
    method: 'POST',
    headers: { ...internalHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_tree: fileTree }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to save file tree' }, { status: res.status })
  }

  return NextResponse.json({ ok: true })
}
