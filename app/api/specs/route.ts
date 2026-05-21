import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceId } from '@/lib/get-workspace-id'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * GET /api/specs
 * Returns all specs for the workspace: signal-driven (from clusters)
 * and freeform (from freeform_specs), merged and sorted newest-first.
 */
export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [clusterRes, freeformRes] = await Promise.all([
    supabaseAdmin
      .from('clusters')
      .select('id, label, spec_generated_at, created_at, human_brief, agent_spec')
      .eq('workspace_id', workspaceId)
      .not('spec_generated_at', 'is', null)
      .order('spec_generated_at', { ascending: false })
      .limit(100),

    supabaseAdmin
      .from('freeform_specs')
      .select('id, description, agent_spec, source, generation_status, pushed_to, pushed_at, external_id, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const clusterSpecs = (clusterRes.data ?? []).map(c => ({
    id:           c.id,
    title:        c.label,
    source:       'signal-driven' as const,
    status:       'ready' as const,
    pushed_to:    null,
    pushed_at:    null,
    external_id:  null,
    created_at:   c.spec_generated_at ?? c.created_at,
    href:         `/opportunities/${c.id}`,
  }))

  const freeformSpecs = (freeformRes.data ?? []).map(f => {
    const agentSpec = f.agent_spec as Record<string, unknown> | null
    const feature   = agentSpec?.feature as Record<string, unknown> | null
    return {
      id:          f.id,
      title:       (feature?.title as string | undefined) ?? f.description.slice(0, 80),
      source:      f.source as string,
      status:      f.generation_status as string,
      pushed_to:   f.pushed_to,
      pushed_at:   f.pushed_at,
      external_id: f.external_id,
      created_at:  f.created_at,
      href:        `/freeform/${f.id}`,
    }
  })

  // Merge and sort newest-first
  const all = [...clusterSpecs, ...freeformSpecs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return NextResponse.json({ specs: all })
}
