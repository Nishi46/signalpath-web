'use client'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { MessageSquare, AlertTriangle, ThumbsUp, SkipForward, X, Check, DollarSign } from 'lucide-react'

type FeedbackAction = 'approve' | 'skip' | 'dismiss'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
  revenue_at_risk_usd?: number | null
}

interface OpportunityCardProps {
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

export function OpportunityCard({ cluster, status, onFeedback }: OpportunityCardProps) {
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
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 transition-all duration-200 group ${isDismissed ? 'opacity-40 grayscale' : 'hover:shadow-md hover:border-gray-300'}`}>
      <Link href={`/opportunities/${cluster.id}`} className='block mb-4'>
        <div className='flex items-start justify-between gap-3 mb-4'>
          <h3 className='text-sm font-semibold text-gray-900 leading-snug group-hover:text-emerald-700 transition-colors'>
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
          {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
            <span className='flex items-center gap-1.5 text-emerald-600'>
              <DollarSign className='w-3.5 h-3.5' />
              {formatRevenue(cluster.revenue_at_risk_usd)}
            </span>
          )}
        </div>
      </Link>
      {hasStatus ? (
        <div className='flex items-center gap-1.5 pt-4 border-t border-gray-100'>
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
      ) : null}
    </div>
  )
}
