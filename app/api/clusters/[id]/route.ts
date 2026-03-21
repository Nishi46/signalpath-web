import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data: cluster } = await supabaseAdmin
    .from('clusters')
    .select('id, label, score, signal_count, churn_count, frequency_score, recency_score, churn_score')
    .eq('id', id)
    .single()

  if (!cluster) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const { data: signals } = await supabaseAdmin
    .from('signals')
    .select('id, text, churn_flag, created_at')
    .eq('cluster_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ cluster, signals: signals ?? [] })
}
