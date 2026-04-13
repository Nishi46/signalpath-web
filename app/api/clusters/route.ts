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

  const { data: clusters } = await supabaseAdmin
    .from('clusters')
    .select(
      'id, label, opportunity_score, signal_count, churn_signal_count, confidence, dimension_f, dimension_r, dimension_c, dimension_b, dimension_s, dimension_v, unique_orgs, revenue_at_risk_usd, spec_generated_at, human_brief, shipped_at, pm_rating',
    )
    .eq('workspace_id', workspaceId)
    .order('opportunity_score', { ascending: false })

  const { data: feedback } = await supabaseAdmin
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
    clusters: clusters ?? [],
    feedback: feedbackMap,
  })
}
