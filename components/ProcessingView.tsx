'use client'
import Link from 'next/link'
import { CheckCircle, Loader2 } from 'lucide-react'

interface PipelineStatus {
  signals_total: number
  signals_embedded: number
  signals_clustered: number
  clusters: number
}

function getStage(status: PipelineStatus): { label: string; progress: number; complete: boolean } {
  const { signals_total, signals_embedded, signals_clustered, clusters } = status

  if (clusters > 0) {
    return { label: 'Your opportunities are ready!', progress: 100, complete: true }
  }
  if (signals_clustered > 0) {
    return { label: 'Identifying problem patterns...', progress: 85, complete: false }
  }
  if (signals_embedded > 0) {
    const pct = signals_total > 0 ? Math.round((signals_embedded / signals_total) * 50) + 30 : 50
    return { label: 'Analysing ticket content with AI...', progress: pct, complete: false }
  }
  if (signals_total > 0) {
    return { label: 'Downloading your support tickets...', progress: 20, complete: false }
  }
  return { label: 'Starting import...', progress: 5, complete: false }
}

export function ProcessingView({ status }: { status: PipelineStatus }) {
  const { label, progress, complete } = getStage(status)

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-8'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-12 max-w-md w-full text-center'>
        <div className='w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
          {complete ? (
            <CheckCircle className='w-7 h-7 text-green-600' />
          ) : (
            <Loader2 className='w-7 h-7 text-indigo-600 animate-spin' />
          )}
        </div>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>Zendesk connected!</h1>
        <p className='text-gray-500 text-sm mb-6'>{label}</p>

        {/* Progress bar */}
        <div className='w-full bg-gray-100 rounded-full h-2.5 mb-2'>
          <div
            className='bg-indigo-600 h-2.5 rounded-full transition-all duration-500'
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className='text-xs text-gray-400 mb-6'>{progress}% complete</p>

        <div className='bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8'>
          <p className='text-4xl font-bold text-indigo-700'>{status.signals_total.toLocaleString()}</p>
          <p className='text-indigo-500 text-sm mt-2'>tickets processed so far</p>
        </div>

        {complete ? (
          <Link href='/opportunities'
            className='block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl text-sm text-center transition-colors'>
            View Opportunities
          </Link>
        ) : (
          <p className='text-gray-400 text-xs'>This usually takes 30–90 minutes. You can close this page.</p>
        )}
      </div>
    </div>
  )
}
