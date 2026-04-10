import { redirect } from 'next/navigation'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react'

const ML_THRESHOLD = 50

interface MlStats {
  labeled_cluster_count: number
  ml_ready: boolean
  ml_model_version: number
  labels_needed: number
}

async function getMlStats(workspaceId: string): Promise<MlStats> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/workspace-status`, {
      headers: { 'x-workspace-id': workspaceId },
      cache: 'no-store',
    })
    if (!res.ok) return { labeled_cluster_count: 0, ml_ready: false, ml_model_version: 0, labels_needed: ML_THRESHOLD }
    const json = await res.json()
    return json.ml_stats ?? { labeled_cluster_count: 0, ml_ready: false, ml_model_version: 0, labels_needed: ML_THRESHOLD }
  } catch {
    return { labeled_cluster_count: 0, ml_ready: false, ml_model_version: 0, labels_needed: ML_THRESHOLD }
  }
}

export default async function SettingsPage() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) redirect('/signin')

  const ml = await getMlStats(workspaceId)

  const progressPct = Math.min(
    Math.round((ml.labeled_cluster_count / ML_THRESHOLD) * 100),
    100,
  )

  // Derive display state
  const isTraining = ml.ml_ready && ml.ml_model_version === 0
  const isActive   = ml.ml_model_version > 0

  return (
    <div className='max-w-2xl mx-auto px-6 py-10'>
      <h1 className='text-xl font-bold text-gray-900 mb-1'>Settings</h1>
      <p className='text-sm text-gray-500 mb-8'>Workspace configuration and model status.</p>

      {/* ── Personalized Scoring Model card ─────────────────────────────── */}
      <div className='bg-white border border-gray-200 rounded-2xl p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center'>
            <Sparkles className='w-5 h-5 text-blue-600' />
          </div>
          <div>
            <h2 className='text-sm font-semibold text-gray-900'>Personalized Scoring Model</h2>
            <p className='text-xs text-gray-500'>
              Learns which opportunities your team actually prioritises.
            </p>
          </div>
        </div>

        {/* ── State A: collecting labels ──────────────────────────────────── */}
        {!isTraining && !isActive && (
          <div className='space-y-3'>
            <div className='flex items-center justify-between text-xs text-gray-500'>
              <span>Ratings collected</span>
              <span className='font-medium text-gray-700'>
                {ml.labeled_cluster_count} / {ML_THRESHOLD}
              </span>
            </div>
            <div className='w-full bg-gray-100 rounded-full h-2'>
              <div
                className='bg-blue-500 h-2 rounded-full transition-all duration-500'
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className='text-xs text-gray-500'>
              {ml.labels_needed > 0
                ? `Your scoring model improves at ${ML_THRESHOLD} ratings — ${ml.labels_needed} to go.`
                : 'Almost there — model training will start automatically.'}
            </p>
            <div className='mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700'>
              <span className='font-medium'>How to collect ratings: </span>
              Go to{' '}
              <a href='/opportunities' className='underline underline-offset-2'>
                Opportunities
              </a>{' '}
              and Approve, Skip, or Dismiss each cluster. Every rating teaches your model your team&apos;s priorities.
            </div>
          </div>
        )}

        {/* ── State B: training in progress ──────────────────────────────── */}
        {isTraining && (
          <div className='flex items-center gap-3 py-2'>
            <Loader2 className='w-4 h-4 text-blue-500 animate-spin shrink-0' />
            <div>
              <p className='text-sm font-medium text-gray-800'>Training your personalized model…</p>
              <p className='text-xs text-gray-500 mt-0.5'>
                This usually takes under a minute. Refresh to check progress.
              </p>
            </div>
          </div>
        )}

        {/* ── State C: model active ───────────────────────────────────────── */}
        {isActive && (
          <div className='space-y-3'>
            <div className='flex items-center gap-2.5'>
              <CheckCircle2 className='w-4 h-4 text-emerald-500 shrink-0' />
              <p className='text-sm font-medium text-gray-800'>
                Personalized scoring model active{' '}
                <span className='text-xs font-normal text-gray-500'>(v{ml.ml_model_version})</span>
              </p>
            </div>
            <p className='text-xs text-gray-500'>
              Scoring now reflects your team&apos;s actual priorities. The model retrains
              automatically every 10 new ratings.
            </p>
            {/* Progress toward next retrain */}
            {ml.labels_needed === 0 && (
              <div className='pt-1'>
                <div className='flex items-center justify-between text-xs text-gray-400 mb-1'>
                  <span>Labels since last retrain</span>
                  <span>{ml.labeled_cluster_count}</span>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-1.5'>
                  <div className='bg-emerald-400 h-1.5 rounded-full' style={{ width: '100%' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
