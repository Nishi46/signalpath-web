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

  const { id: clusterId } = await params

  // Verify cluster belongs to this workspace
  const { data: clusterCheck } = await getSupabaseAdmin()
    .from('clusters')
    .select('id')
    .eq('id', clusterId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!clusterCheck) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get all signals for this cluster, join org_enrichments for org info
  const { data: signals } = await getSupabaseAdmin()
    .from('signals')
    .select('organization_id')
    .eq('cluster_id', clusterId)
    .not('organization_id', 'is', null)

  if (!signals || signals.length === 0) {
    return NextResponse.json({ accounts: [] })
  }

  const orgIds = [...new Set(signals.map(s => s.organization_id).filter(Boolean))]

  const { data: enrichments } = await getSupabaseAdmin()
    .from('org_enrichments')
    .select('zendesk_org_id, org_name, domain, estimated_revenue_usd')
    .in('zendesk_org_id', orgIds)
    .eq('workspace_id', workspaceId)

  // Also check CRM for real ARR by domain
  const domains = (enrichments ?? [])
    .map(e => e.domain)
    .filter(Boolean) as string[]

  const crmMap: Record<string, number> = {}
  if (domains.length > 0) {
    const { data: crmAccounts } = await getSupabaseAdmin()
      .from('crm_accounts')
      .select('domain, arr_usd')
      .eq('workspace_id', workspaceId)
      .in('domain', domains)
      .not('arr_usd', 'is', null)

    for (const acc of crmAccounts ?? []) {
      if (acc.domain && acc.arr_usd) crmMap[acc.domain] = acc.arr_usd
    }
  }

  const accounts = (enrichments ?? []).map(e => ({
    organization_id: e.zendesk_org_id,
    name: e.org_name ?? e.domain ?? 'Unknown',
    domain: e.domain ?? null,
    arr_usd: e.domain && crmMap[e.domain] ? crmMap[e.domain] : (e.estimated_revenue_usd ?? null),
    revenue_source: e.domain && crmMap[e.domain] ? 'crm' : 'ai_estimate',
  }))

  // Sort by ARR descending (nulls last)
  accounts.sort((a, b) => (b.arr_usd ?? 0) - (a.arr_usd ?? 0))

  return NextResponse.json({ accounts })
}
