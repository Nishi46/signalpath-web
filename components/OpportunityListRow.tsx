'use client'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { MessageSquare, AlertTriangle, Users, Sparkles, ThumbsUp, SkipForward, X, DollarSign, Check } from 'lucide-react'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
  unique_orgs?: number | null
  revenue_at_risk_usd?: number | null
  spec_generated_at?: string | null
}

type FeedbackAction = 'approve' | 'skip' | 'dismiss'

interface OpportunityListRowProps {
  cluster: Cluster
  status?: FeedbackAction | null
  onFeedback?: (clusterId: string, action: string) => void
}

function formatRevenue(amount: number | null | undefined): string {
  if (!amount) return '$0'
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function OpportunityListRow({ cluster, status, onFeedback }: OpportunityListRowProps) {
  async function handleFeedback(action: 'approve' | 'skip' | 'dismiss') {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cluster_id: cluster.id, action }),
    })
    onFeedback?.(cluster.id, action)
  }

  const isDismissed = status === 'dismiss'
  const hasStatus = status === 'approve' || status === 'skip'

  return (
    <div className={`flex items-center gap-4 px-5 py-4 transition-colors group ${isDismissed ? 'opacity-40 grayscale' : 'hover:bg-gray-50'}`}>
      {/* Score */}
      <div className='shrink-0'>
        <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
      </div>

      {/* Main content */}
      <Link href={`/opportunities/${cluster.id}`} className='flex-1 min-w-0'>
        <h3 className='text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors'>
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
          {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
            <span className='flex items-center gap-1 text-emerald-600'>
              <DollarSign className='w-3 h-3' />
              {formatRevenue(cluster.revenue_at_risk_usd)}
            </span>
          )}
          {cluster.spec_generated_at && (
            <span className='flex items-center gap-1 text-teal-600'>
              <Sparkles className='w-3 h-3' />
              PRD
            </span>
          )}
        </div>
      </Link>

      {/* Actions / Status badge */}
      {hasStatus ? (
        <div className='shrink-0'>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            status === 'approve'
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {status === 'approve' ? <Check className='w-3 h-3' /> : <SkipForward className='w-3 h-3' />}
            {status === 'approve' ? 'Approved' : 'Skipped'}
          </span>
        </div>
      ) : !isDismissed ? (
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
      ) : null}
    </div>
  )
}
