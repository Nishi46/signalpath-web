import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceId } from '@/lib/get-workspace-id'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { cluster_id, action } = body

  if (!cluster_id || !action) {
    return NextResponse.json({ error: 'cluster_id and action required' }, { status: 400 })
  }

  if (!['approve', 'skip', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve, skip, or dismiss' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('feedback')
    .insert({ workspace_id: workspaceId, cluster_id, action })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
