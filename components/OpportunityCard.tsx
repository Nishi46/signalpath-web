'use client'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { MessageSquare, AlertTriangle, ThumbsUp, SkipForward, X } from 'lucide-react'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
}

interface OpportunityCardProps {
  cluster: Cluster
  onFeedback?: (clusterId: string, action: string) => void
}

export function OpportunityCard({ cluster, onFeedback }: OpportunityCardProps) {
  async function handleFeedback(action: 'approve' | 'skip' | 'dismiss') {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cluster_id: cluster.id, action }),
    })
    onFeedback?.(cluster.id, action)
  }

  return (
    <div className='bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 group'>
      <Link href={`/opportunities/${cluster.id}`} className='block mb-4'>
        <div className='flex items-start justify-between gap-3 mb-4'>
          <h3 className='text-sm font-semibold text-gray-900 leading-snug group-hover:text-indigo-700 transition-colors'>
            {cluster.label}
          </h3>
          <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
        </div>
        <div className='flex items-center gap-4 text-xs text-gray-500'>
          <span className='flex items-center gap-1.5'>
            <MessageSquare className='w-3.5 h-3.5 text-gray-400' />
            {cluster.signal_count} tickets
          </span>
          {cluster.churn_signal_count > 0 && (
            <span className='flex items-center gap-1.5 text-red-500'>
              <AlertTriangle className='w-3.5 h-3.5' />
              {cluster.churn_signal_count} churn
            </span>
          )}
        </div>
      </Link>
      <div className='flex items-center gap-1.5 pt-4 border-t border-gray-100'>
        <button
          onClick={() => handleFeedback('approve')}
          className='flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors font-medium'
        >
          <ThumbsUp className='w-3.5 h-3.5' /> Approve
        </button>
        <button
          onClick={() => handleFeedback('skip')}
          className='flex items-center gap-1 text-xs text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors font-medium'
        >
          <SkipForward className='w-3.5 h-3.5' /> Skip
        </button>
        <button
          onClick={() => handleFeedback('dismiss')}
          className='flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium ml-auto'
        >
          <X className='w-3.5 h-3.5' /> Dismiss
        </button>
      </div>
    </div>
  )
}
