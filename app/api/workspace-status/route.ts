import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceId } from '@/lib/get-workspace-id'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface WorkspaceRow {
  zendesk_domain: string | null
  zendesk_token: string | null
  linear_token: string | null
  jira_token: string | null
  labeled_cluster_count: number | null
  ml_ready: boolean | null
  ml_model_version: number | null
  hubspot_token: string | null
  salesforce_token: string | null
}

export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('workspaces')
    .select(
      'zendesk_domain, zendesk_token, linear_token, jira_token, ' +
      'labeled_cluster_count, ml_ready, ml_model_version, ' +
      'hubspot_token, salesforce_token'
    )
    .eq('id', workspaceId)
    .single() as { data: WorkspaceRow | null }

  const labeledCount = data?.labeled_cluster_count ?? 0
  const ML_THRESHOLD = 50

  return NextResponse.json({
    zendesk_connected: !!(data?.zendesk_domain && data?.zendesk_token),
    linear_connected: !!data?.linear_token,
    jira_connected: !!data?.jira_token,
    // Boolean flags only — encrypted token strings are NEVER sent to the frontend.
    hubspot_connected: !!data?.hubspot_token,
    salesforce_connected: !!data?.salesforce_token,
    // ML readiness stats — safe to expose (version number + counts, no model weights or paths).
    ml_stats: {
      labeled_cluster_count: labeledCount,
      ml_ready: data?.ml_ready ?? false,
      ml_model_version: data?.ml_model_version ?? 0,
      labels_needed: Math.max(0, ML_THRESHOLD - labeledCount),
    },
  })
}
