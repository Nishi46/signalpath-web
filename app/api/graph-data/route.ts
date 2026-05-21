import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'


export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [nodesResult, edgesResult] = await Promise.all([
    getSupabaseAdmin()
      .from('clusters')
      .select(
        'id, label, opportunity_score, signal_count, churn_signal_count, ' +
        'recent_signal_count, confidence, dimension_c, dimension_r, dimension_f',
      )
      .eq('workspace_id', workspaceId)
      .not('label', 'is', null)
      .is('shipped_at', null)
      .order('opportunity_score', { ascending: false }),

    getSupabaseAdmin().rpc('get_cluster_edges', { p_workspace_id: workspaceId }),
  ])

  if (nodesResult.error) {
    return NextResponse.json({ error: 'Failed to load graph nodes' }, { status: 500 })
  }

  return NextResponse.json({
    nodes: nodesResult.data ?? [],
    edges: edgesResult.data ?? [],
  })
}
