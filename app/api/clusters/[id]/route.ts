import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceId } from '@/lib/get-workspace-id'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Ensure cluster belongs to the authenticated user's workspace
  const { data: cluster } = await supabaseAdmin
    .from('clusters')
    .select(
      `id, label, opportunity_score, signal_count, churn_signal_count, recent_signal_count, centroid, scored_at,
       human_brief, agent_spec, spec_generated_at, confidence, dimension_f, dimension_r, dimension_c,
       dimension_b, dimension_s, unique_orgs, unique_requesters`,
    )
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!cluster) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { data: signals } = await supabaseAdmin
    .from('signals')
    .select('id, text, churn_flag, created_at')
    .eq('cluster_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ cluster, signals: signals ?? [] })
}
