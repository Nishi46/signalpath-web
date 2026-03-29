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
      'id, label, opportunity_score, signal_count, churn_signal_count, confidence, dimension_f, dimension_r, dimension_c, dimension_b, dimension_s, dimension_v, unique_orgs, revenue_at_risk_usd, spec_generated_at, human_brief',
    )
    .eq('workspace_id', workspaceId)
    .order('opportunity_score', { ascending: false })

  const { data: feedback } = await supabaseAdmin
    .from('feedback')
    .select('cluster_id')
    .eq('workspace_id', workspaceId)
    .eq('action', 'dismiss')

  return NextResponse.json({
    clusters: clusters ?? [],
    dismissed: (feedback ?? []).map(f => f.cluster_id),
  })
}
