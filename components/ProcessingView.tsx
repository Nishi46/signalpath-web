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

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='flex items-center justify-center p-8 mt-10'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center'>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            stage.status === 'complete' ? 'bg-green-50' :
            stage.status === 'insufficient' ? 'bg-amber-50' : 'bg-blue-50'
          }`}>
            {stage.status === 'complete' ? (
              <CheckCircle className='w-8 h-8 text-green-600' />
            ) : stage.status === 'insufficient' ? (
              <AlertTriangle className='w-8 h-8 text-amber-500' />
            ) : (
              <Loader2 className='w-8 h-8 text-blue-600 animate-spin' />
            )}
          </div>
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>Zendesk connected!</h1>
          <p className='text-gray-500 text-sm mb-8'>{stage.label}</p>

          {/* Progress bar */}
          <div className='w-full bg-gray-100 rounded-full h-2 mb-2'>
            <div
              className={`h-2 rounded-full transition-all duration-700 ease-out ${
                stage.status === 'insufficient' ? 'bg-amber-400' :
                stage.status === 'complete' ? 'bg-green-500' : 'bg-blue-600'
              }`}
              style={{ width: `${stage.progress}%` }}
            />
          </div>
          <p className='text-xs text-gray-400 mb-8 tabular-nums'>{stage.progress}% complete</p>

          <div className={`rounded-2xl p-6 mb-8 ${
            stage.status === 'complete' ? 'bg-green-50 border border-green-100' :
            stage.status === 'insufficient' ? 'bg-amber-50 border border-amber-100' :
            'bg-blue-50 border border-blue-100'
          }`}>
            <p className={`text-4xl font-bold tabular-nums ${
              stage.status === 'complete' ? 'text-green-700' :
              stage.status === 'insufficient' ? 'text-amber-700' : 'text-blue-700'
            }`}>{status.signals_total.toLocaleString()}</p>
            <p className={`text-sm mt-2 ${
              stage.status === 'complete' ? 'text-green-500' :
              stage.status === 'insufficient' ? 'text-amber-500' : 'text-blue-500'
            }`}>tickets processed so far</p>
          </div>

          {stage.status === 'complete' ? (
            <Link href='/opportunities'
              className='block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm text-center transition-colors'>
              View Opportunities
            </Link>
          ) : stage.status === 'insufficient' ? (
            <p className='text-gray-500 text-sm leading-relaxed'>
              Your Zendesk has too few recent tickets for our AI to find patterns.
              Add more support tickets and reconnect to try again.
            </p>
          ) : (
            <p className='text-gray-400 text-xs'>This usually takes 30–90 minutes. You can close this page.</p>
          )}
        </div>
      </div>
    </div>
  )
}
