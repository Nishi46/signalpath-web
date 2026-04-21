'use client'
import Link from 'next/link'
import { DashboardNav } from './DashboardNav'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface PipelineStatus {
  signals_total: number
  signals_embedded: number
  signals_clustered: number
  clusters: number
}

type StageStatus = 'processing' | 'complete' | 'insufficient'

function getStage(status: PipelineStatus, stalledPolls: number): { label: string; progress: number; status: StageStatus } {
  const { signals_total, signals_embedded, signals_clustered, clusters } = status

  if (clusters > 0) {
    return { label: 'Your opportunities are ready!', progress: 100, status: 'complete' }
  }
  if (signals_clustered > 0) {
    return { label: 'Naming and scoring opportunities...', progress: 90, status: 'processing' }
  }
  if (signals_total > 0 && signals_embedded >= signals_total) {
    if (stalledPolls >= 12) {
      return {
        label: signals_total < 3
          ? 'We need at least 3 support tickets to identify patterns.'
          : 'Analysis complete — no distinct patterns found in your tickets.',
        progress: 100,
        status: 'insufficient',
      }
    }
    return { label: 'Identifying problem patterns...', progress: 85, status: 'processing' }
  }
  if (signals_embedded > 0) {
    const pct = signals_total > 0 ? Math.round((signals_embedded / signals_total) * 50) + 30 : 50
    return { label: 'Analysing ticket content with AI...', progress: pct, status: 'processing' }
  }
  if (signals_total > 0) {
    return { label: 'Downloading your support tickets...', progress: 20, status: 'processing' }
  }
  return { label: 'Starting import...', progress: 5, status: 'processing' }
}

export function ProcessingView({ status, stalledPolls = 0 }: { status: PipelineStatus; stalledPolls?: number }) {
  const stage = getStage(status, stalledPolls)

  const accentColor = stage.status === 'complete' ? '#10B981' : stage.status === 'insufficient' ? '#F59E0B' : '#3B82F6'
  const iconBg = stage.status === 'complete' ? 'bg-emerald-500/10' : stage.status === 'insufficient' ? 'bg-amber-500/10' : 'bg-blue-500/10'
  const statBg = stage.status === 'complete' ? 'bg-emerald-500/8 border-emerald-500/15' : stage.status === 'insufficient' ? 'bg-amber-500/8 border-amber-500/15' : 'bg-blue-500/8 border-blue-500/15'
  const statText = stage.status === 'complete' ? 'text-emerald-400' : stage.status === 'insufficient' ? 'text-amber-400' : 'text-blue-400'

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='flex items-center justify-center p-8 mt-10'>
        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-10 max-w-md w-full text-center'>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${iconBg}`}>
            {stage.status === 'complete' ? (
              <CheckCircle className='w-8 h-8 text-emerald-400' />
            ) : stage.status === 'insufficient' ? (
              <AlertTriangle className='w-8 h-8 text-amber-400' />
            ) : (
              <Loader2 className='w-8 h-8 text-blue-400 animate-spin' />
            )}
          </div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>Zendesk connected!</h1>
          <p className='text-gray-500 dark:text-white/45 text-sm mb-8'>{stage.label}</p>

          {/* Progress bar */}
          <div className='w-full bg-gray-100 dark:bg-white/[0.07] rounded-full h-1.5 mb-2'>
            <div
              className='h-1.5 rounded-full transition-all duration-700 ease-out'
              style={{ width: `${stage.progress}%`, backgroundColor: accentColor }}
            />
          </div>
          <p className='text-xs text-gray-400 dark:text-white/25 mb-8 tabular-nums'>{stage.progress}% complete</p>

          <div className={`rounded-2xl p-6 mb-8 border ${statBg}`}>
            <p className={`text-4xl font-bold tabular-nums ${statText}`}>
              {status.signals_total.toLocaleString()}
            </p>
            <p className='text-gray-500 dark:text-white/35 text-sm mt-2'>tickets processed so far</p>
          </div>

          {stage.status === 'complete' ? (
            <Link
              href='/opportunities'
              className='block w-full bg-blue-600 hover:bg-blue-500 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm text-center transition-colors'
            >
              View Opportunities
            </Link>
          ) : stage.status === 'insufficient' ? (
            <p className='text-gray-500 dark:text-white/40 text-sm leading-relaxed'>
              Your Zendesk has too few recent tickets for our AI to find patterns.
              Add more support tickets and reconnect to try again.
            </p>
          ) : (
            <p className='text-gray-400 dark:text-white/25 text-xs'>This usually takes 30–90 minutes. You can close this page.</p>
          )}
        </div>
      </div>
    </div>
  )
}
