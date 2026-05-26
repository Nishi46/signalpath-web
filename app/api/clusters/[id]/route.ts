import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'


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
  const { data: cluster, error: clusterError } = await getSupabaseAdmin()
    .from('clusters')
    .select(
      `id, label, opportunity_score, signal_count, churn_signal_count, recent_signal_count, centroid, scored_at,
       human_brief, agent_spec, spec_generated_at, confidence, dimension_f, dimension_r, dimension_c,
       dimension_b, dimension_s, dimension_v, unique_orgs, unique_requesters, revenue_at_risk_usd,
       scoring_model, ml_review_needed, pm_rating, selected_plan_id, plans_generated_at,
       pr_url, pr_number, pr_branch, pr_repo_full_name, shipped_at, status, merged_by, pr_merge_sha,
       github_issue_url, agent_spec_validation`,
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

  const [{ data: signals }, { data: scoreHistory }, { data: freeformRows }] = await Promise.all([
    getSupabaseAdmin()
      .from('signals')
      .select('id, text, churn_flag, created_at')
      .eq('cluster_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    getSupabaseAdmin()
      .from('cluster_score_history')
      .select(
        'id, score, scoring_model, revenue_source, dimension_b, dimension_s, dimension_c, ' +
        'dimension_r, dimension_f, dimension_v, scored_at',
      )
      .eq('cluster_id', id)
      .eq('workspace_id', workspaceId)
      .order('scored_at', { ascending: true })
      .limit(12),
    getSupabaseAdmin()
      .from('freeform_specs')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source', 'promoted')
      .eq('linked_cluster_id', id)
      .limit(1),
  ])

  const is_freeform = (freeformRows ?? []).length > 0

  return NextResponse.json({ cluster: { ...cluster, is_freeform }, signals: signals ?? [], score_history: scoreHistory ?? [] })
}
