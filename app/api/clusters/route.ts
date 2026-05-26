import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'


export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: clusters, error: clustersError }, { data: freeformRows }] = await Promise.all([
    getSupabaseAdmin()
      .from('clusters')
      .select(
        'id, label, opportunity_score, signal_count, churn_signal_count, confidence, dimension_f, dimension_r, dimension_c, dimension_b, dimension_s, dimension_v, unique_orgs, revenue_at_risk_usd, spec_generated_at, human_brief, shipped_at, pm_rating, signal_sources',
      )
      .eq('workspace_id', workspaceId)
      .not('label', 'is', null)
      .order('opportunity_score', { ascending: false }),
    getSupabaseAdmin()
      .from('freeform_specs')
      .select('linked_cluster_id')
      .eq('workspace_id', workspaceId)
      .eq('source', 'promoted')
      .not('linked_cluster_id', 'is', null),
  ])

  if (clustersError) {
    console.error('[/api/clusters] Supabase error:', clustersError.message, 'workspace:', workspaceId)
    return NextResponse.json({ error: 'Failed to load clusters', detail: clustersError.message }, { status: 500 })
  }
  console.log('[/api/clusters] workspace:', workspaceId, 'clusters returned:', clusters?.length ?? 0)

  const freeformClusterIds = new Set((freeformRows ?? []).map((r: { linked_cluster_id: string }) => r.linked_cluster_id))

  const { data: feedback } = await getSupabaseAdmin()
    .from('feedback')
    .select('cluster_id, action')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  // Keep only the latest action per cluster
  const feedbackMap: Record<string, string> = {}
  for (const f of (feedback ?? [])) {
    if (!feedbackMap[f.cluster_id]) {
      feedbackMap[f.cluster_id] = f.action
    }
  }

  return NextResponse.json({
    clusters: (clusters ?? []).map(c => ({ ...c, is_freeform: freeformClusterIds.has(c.id) })),
    feedback: feedbackMap,
  })
}
