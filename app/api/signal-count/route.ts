import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getWorkspaceId } from '@/lib/get-workspace-id'


export async function GET() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { count } = await getSupabaseAdmin()
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  return NextResponse.json({ count: count ?? 0 })
}
