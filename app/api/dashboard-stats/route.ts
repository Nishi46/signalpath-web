import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceId } from '@/lib/get-workspace-id'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [clustersRes, workspaceRes, topRes] = await Promise.all([
    supabaseAdmin
      .from('clusters')
      .select('id, opportunity_score, signal_count, churn_signal_count, revenue_at_risk_usd, label, confidence, scored_at')
      .eq('workspace_id', workspaceId),
    supabaseAdmin
      .from('workspaces')
      .select('labeled_cluster_count, ml_ready, ml_model_version, labels_at_last_train')
      .eq('id', workspaceId)
      .single(),
    supabaseAdmin
      .from('clusters')
      .select('id, label, opportunity_score, churn_signal_count, revenue_at_risk_usd, confidence')
      .eq('workspace_id', workspaceId)
      .order('opportunity_score', { ascending: false })
      .limit(3),
  ])

  const clusters = clustersRes.data ?? []
  const ws = workspaceRes.data

  // Aggregate stats
  const totalOpportunities = clusters.length
  const totalRevenue = clusters.reduce((sum, c) => sum + (c.revenue_at_risk_usd ?? 0), 0)
  const churnRiskCount = clusters.filter(c => c.churn_signal_count > 0).length
  const ratedCount = 0

  // This week vs last week (by scored_at)
  const thisWeek = clusters.filter(c => c.scored_at && c.scored_at >= weekAgo).length
  const lastWeek = clusters.filter(c => c.scored_at && c.scored_at >= twoWeeksAgo && c.scored_at < weekAgo).length

  return NextResponse.json({
    total_opportunities: totalOpportunities,
    total_revenue_at_risk: totalRevenue,
    churn_risk_count: churnRiskCount,
    rated_count: ratedCount,
    new_this_week: thisWeek,
    new_last_week: lastWeek,
    ml_stats: {
      labeled_cluster_count: ws?.labeled_cluster_count ?? 0,
      ml_ready: ws?.ml_ready ?? false,
      ml_model_version: ws?.ml_model_version ?? 0,
      labels_needed: Math.max(0, 50 - (ws?.labeled_cluster_count ?? 0)),
    },
    top_opportunities: topRes.data ?? [],
  })
}
