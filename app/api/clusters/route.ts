import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })
  }

  const { data: clusters } = await supabaseAdmin
    .from('clusters')
    .select('id, label, opportunity_score, signal_count, churn_signal_count')
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
