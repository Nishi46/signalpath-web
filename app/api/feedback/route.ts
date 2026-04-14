import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthContext } from '@/lib/get-workspace-id'
import { API_URL, internalHeaders } from '@/lib/internal-api'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { workspaceId, userId } = await getAuthContext()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body

  // Support both single cluster_id (string) and batch cluster_ids (string[])
  const clusterIds: string[] = Array.isArray(body.cluster_ids)
    ? body.cluster_ids
    : body.cluster_id
      ? [body.cluster_id]
      : []

  if (clusterIds.length === 0 || !action) {
    return NextResponse.json({ error: 'cluster_id(s) and action required' }, { status: 400 })
  }

  if (!['approve', 'skip', 'dismiss', 'ship'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve, skip, dismiss, or ship' }, { status: 400 })
  }

  // Insert feedback rows for each cluster (ship action goes to clusters table only, not feedback)
  if (action !== 'ship') {
    const rows = clusterIds.map(cluster_id => {
      const row: Record<string, unknown> = { workspace_id: workspaceId, cluster_id, action }
      if (userId) row.user_id = userId
      return row
    })

    const { error } = await supabaseAdmin.from('feedback').insert(rows)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Update shipped_at on clusters for ship action (workspace-scoped)
  if (action === 'ship') {
    await supabaseAdmin
      .from('clusters')
      .update({ shipped_at: new Date().toISOString() })
      .in('id', clusterIds)
      .eq('workspace_id', workspaceId)
  }

  // For ship action, skip ML refresh (no new label was added)
  if (action === 'ship') {
    return NextResponse.json({ success: true })
  }

  // Use first cluster_id for backward compat variable
  const cluster_id = clusterIds[0]
  void cluster_id // used below via clusterIds

  // ── ML stats refresh + training trigger ──────────────────────────────────
  // This is a post-save side-effect. Failures must NOT affect the feedback
  // response — the label was already saved successfully above.
  try {
    // 1. Refresh the denormalised labeled_cluster_count and ml_ready flag.
    //    cluster_id is NOT passed to this RPC — it only receives workspace_id,
    //    so a spoofed cluster_id in the request body cannot inflate the count.
    await supabaseAdmin.rpc('refresh_ml_stats', { p_workspace_id: workspaceId })

    // 2. Re-fetch workspace ML state to decide whether to trigger training.
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('ml_ready, ml_model_version, labeled_cluster_count, labels_at_last_train')
      .eq('id', workspaceId)
      .single()

    if (ws) {
      const { ml_ready, ml_model_version, labeled_cluster_count, labels_at_last_train } = ws
      const newLabels = (labeled_cluster_count ?? 0) - (labels_at_last_train ?? 0)

      const shouldTriggerFirstTrain = ml_ready && ml_model_version === 0
      const shouldRetrain = ml_ready && ml_model_version > 0 && newLabels >= 10

      if (shouldTriggerFirstTrain || shouldRetrain) {
        // Fire-and-forget — do not await and do not fail the feedback route.
        // INTERNAL_API_KEY is a server-side env var; never exposed in client bundles.
        fetch(`${API_URL}/pipeline/train/${workspaceId}`, {
          method: 'POST',
          headers: internalHeaders(),
        }).catch((err) => {
          console.error('[feedback] training trigger failed (non-fatal):', err)
        })
      }
    }
  } catch (err) {
    // Log but do not rethrow — the feedback INSERT succeeded.
    console.error('[feedback] refresh_ml_stats failed (non-fatal):', err)
  }

  return NextResponse.json({ success: true })
}
