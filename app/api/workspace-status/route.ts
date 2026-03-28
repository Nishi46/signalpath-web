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

  const { data } = await supabaseAdmin
    .from('workspaces')
    .select('zendesk_domain, zendesk_token, linear_token, jira_token')
    .eq('id', workspaceId)
    .single()

  return NextResponse.json({
    zendesk_connected: !!(data?.zendesk_domain && data?.zendesk_token),
    linear_connected: !!data?.linear_token,
    jira_connected: !!data?.jira_token,
  })
}
