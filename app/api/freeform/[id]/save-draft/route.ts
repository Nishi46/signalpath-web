import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/get-workspace-id'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { workspaceId } = await getAuthContext()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  if (typeof body.human_brief !== 'string') {
    return NextResponse.json({ error: 'human_brief required' }, { status: 422 })
  }

  // Verify workspace ownership before writing
  const { data: existing } = await supabaseAdmin
    .from('freeform_specs')
    .select('workspace_id')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.workspace_id !== workspaceId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabaseAdmin
    .from('freeform_specs')
    .update({
      human_brief: body.human_brief.slice(0, 100_000),
      updated_at:  new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
