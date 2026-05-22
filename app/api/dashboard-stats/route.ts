import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'


export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [clustersRes, workspaceRes, topRes, shippedRes] = await Promise.all([
    getSupabaseAdmin()
      .from('clusters')
      .select('id, opportunity_score, signal_count, churn_signal_count, revenue_at_risk_usd, label, confidence, scored_at, pm_rating')
      .eq('workspace_id', workspaceId),
    getSupabaseAdmin()
      .from('workspaces')
      .select('labeled_cluster_count, ml_ready, ml_model_version, labels_at_last_train')
      .eq('id', workspaceId)
      .single(),
    getSupabaseAdmin()
      .from('clusters')
      .select('id, label, opportunity_score, churn_signal_count, revenue_at_risk_usd, confidence')
      .eq('workspace_id', workspaceId)
      .is('pm_rating', null)
      .order('opportunity_score', { ascending: false })
      .limit(3),
    getSupabaseAdmin()
      .from('clusters')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'shipped')
      .gte('shipped_at', startOfMonth),
  ])

  const clusters = clustersRes.data ?? []
  const ws = workspaceRes.data
  const shippedThisMonth = shippedRes.count ?? 0

  // Aggregate stats
  const totalOpportunities = clusters.length
  const totalRevenue = clusters.reduce((sum, c) => sum + (c.revenue_at_risk_usd ?? 0), 0)
  const churnRiskCount = clusters.filter(c => c.churn_signal_count > 0).length
  const ratedCount = clusters.filter(c => c.pm_rating).length

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
    shipped_this_month: shippedThisMonth,
    ml_stats: {
      labeled_cluster_count: ws?.labeled_cluster_count ?? 0,
      ml_ready: ws?.ml_ready ?? false,
      ml_model_version: ws?.ml_model_version ?? 0,
      labels_needed: Math.max(0, 50 - (ws?.labeled_cluster_count ?? 0)),
    },
    top_opportunities: topRes.data ?? [],
  })
}
