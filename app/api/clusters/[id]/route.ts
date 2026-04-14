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
  const { data: cluster, error: clusterError } = await supabaseAdmin
    .from('clusters')
    .select(
      `id, label, opportunity_score, signal_count, churn_signal_count, recent_signal_count, centroid, scored_at,
       human_brief, agent_spec, spec_generated_at, confidence, dimension_f, dimension_r, dimension_c,
       dimension_b, dimension_s, dimension_v, unique_orgs, unique_requesters, revenue_at_risk_usd,
       scoring_model, ml_review_needed`,
    )
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (clusterError) {
    console.error('[/api/clusters/[id]] Supabase error:', clusterError.message, 'id:', id)
    return NextResponse.json({ error: 'query failed', detail: clusterError.message }, { status: 500 })
  }

  if (!cluster) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { data: signals } = await supabaseAdmin
    .from('signals')
    .select('id, text, churn_flag, created_at')
    .eq('cluster_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 5.3: Include last 12 score history rows (ascending = oldest first for sparkline)
  const { data: scoreHistory } = await supabaseAdmin
    .from('cluster_score_history')
    .select(
      'id, score, scoring_model, revenue_source, dimension_b, dimension_s, dimension_c, ' +
      'dimension_r, dimension_f, dimension_v, scored_at',
    )
    .eq('cluster_id', id)
    .eq('workspace_id', workspaceId)
    .order('scored_at', { ascending: true })
    .limit(12)

  return NextResponse.json({ cluster, signals: signals ?? [], score_history: scoreHistory ?? [] })
}
