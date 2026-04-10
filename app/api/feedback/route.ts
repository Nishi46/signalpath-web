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
  const { cluster_id, action } = body

  if (!cluster_id || !action) {
    return NextResponse.json({ error: 'cluster_id and action required' }, { status: 400 })
  }

  if (!['approve', 'skip', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve, skip, or dismiss' }, { status: 400 })
  }

  // workspaceId comes from the authenticated JWT — cannot be spoofed by the client.
  const row: Record<string, unknown> = {
    workspace_id: workspaceId,
    cluster_id,
    action,
  }
  if (userId) {
    row.user_id = userId
  }

  const { error } = await supabaseAdmin.from('feedback').insert(row)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update the cluster's pm_rating (optional column — ignore errors gracefully).
  await supabaseAdmin
    .from('clusters')
    .update({ pm_rating: action })
    .eq('id', cluster_id)
    .eq('workspace_id', workspaceId) // workspace isolation: only update own clusters

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
