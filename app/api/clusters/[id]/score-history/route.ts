import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: clusterId } = await params
  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '30', 10), 1), 100)

  // Verify the cluster belongs to this workspace before returning history
  const { data: clusterCheck } = await getSupabaseAdmin()
    .from('clusters')
    .select('id')
    .eq('id', clusterId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!clusterCheck) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from('cluster_score_history')
    .select(
      'id, score, scoring_model, revenue_source, dimension_b, dimension_s, dimension_c, ' +
      'dimension_r, dimension_f, dimension_v, revenue_at_risk_usd, signal_count, scored_at',
    )
    .eq('cluster_id', clusterId)
    .eq('workspace_id', workspaceId)
    .order('scored_at', { ascending: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch score history' }, { status: 500 })
  }

  return NextResponse.json({ history: data ?? [] })
}
