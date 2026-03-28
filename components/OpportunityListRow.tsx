'use client'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { MessageSquare, AlertTriangle, Users, Sparkles, ThumbsUp, SkipForward, X } from 'lucide-react'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
  unique_orgs?: number | null
  spec_generated_at?: string | null
}

interface OpportunityListRowProps {
  cluster: Cluster
  onFeedback?: (clusterId: string, action: string) => void
}

export function OpportunityListRow({ cluster, onFeedback }: OpportunityListRowProps) {
  async function handleFeedback(action: 'approve' | 'skip' | 'dismiss') {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cluster_id: cluster.id, action }),
    })
    onFeedback?.(cluster.id, action)
  }

  return (
    <div className='flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group'>
      {/* Score */}
      <div className='shrink-0'>
        <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
      </div>

      {/* Main content */}
      <Link href={`/opportunities/${cluster.id}`} className='flex-1 min-w-0'>
        <h3 className='text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors'>
          {cluster.label}
        </h3>
        <div className='flex items-center gap-4 mt-1 text-xs text-gray-500'>
          <span className='flex items-center gap-1'>
            <MessageSquare className='w-3 h-3 text-gray-400' />
            {cluster.signal_count} tickets
          </span>
          {cluster.churn_signal_count > 0 && (
            <span className='flex items-center gap-1 text-red-500'>
              <AlertTriangle className='w-3 h-3' />
              {cluster.churn_signal_count} churn
            </span>
          )}
          {(cluster.unique_orgs ?? 0) > 0 && (
            <span className='flex items-center gap-1 text-purple-600'>
              <Users className='w-3 h-3' />
              {cluster.unique_orgs} accounts
            </span>
          )}
          {cluster.spec_generated_at && (
            <span className='flex items-center gap-1 text-violet-600'>
              <Sparkles className='w-3 h-3' />
              PRD
            </span>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className='shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
        <button
          type='button'
          onClick={() => handleFeedback('approve')}
          className='p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors'
          title='Approve'
        >
          <ThumbsUp className='w-3.5 h-3.5' />
        </button>
        <button
          type='button'
          onClick={() => handleFeedback('skip')}
          className='p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors'
          title='Skip'
        >
          <SkipForward className='w-3.5 h-3.5' />
        </button>
        <button
          type='button'
          onClick={() => handleFeedback('dismiss')}
          className='p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors'
          title='Dismiss'
        >
          <X className='w-3.5 h-3.5' />
        </button>
      </div>
    </div>
  )
}
