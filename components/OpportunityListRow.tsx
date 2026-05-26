'use client'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import {
  MessageSquare,
  AlertTriangle,
  Users,
  Sparkles,
  ThumbsUp,
  SkipForward,
  X,
  DollarSign,
  Check,
  Package,
} from 'lucide-react'

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
  shipped_at?: string | null
  is_freeform?: boolean
}

type FeedbackAction = 'approve' | 'skip' | 'dismiss'

interface OpportunityListRowProps {
  cluster: Cluster
  status?: FeedbackAction | null
  onFeedback?: (clusterId: string, action: string) => void
  selected?: boolean
  onSelect?: (id: string, checked: boolean) => void
}

function formatRevenue(amount: number | null | undefined): string {
  if (!amount) return '$0'
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function OpportunityListRow({ cluster, status, onFeedback, selected, onSelect }: OpportunityListRowProps) {
  const isShipped = Boolean(cluster.shipped_at)

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
  const showCheckbox = onSelect !== undefined

  return (
    <div
      className={`flex items-center gap-3 px-4 py-4 transition-colors group ${
        isDismissed || isShipped ? 'opacity-40 grayscale' : 'hover:bg-gray-50 dark:bg-white/[0.03]'
      }`}
    >
      {showCheckbox && (
        <input
          type='checkbox'
          checked={selected ?? false}
          onChange={e => onSelect?.(cluster.id, e.target.checked)}
          onClick={e => e.stopPropagation()}
          className='shrink-0 rounded border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 text-blue-500 focus:ring-blue-500/20'
        />
      )}

      <div className='shrink-0'>
        <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
      </div>

      <Link href={`/opportunities/${cluster.id}`} className='flex-1 min-w-0'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-white/90 truncate group-hover:text-white transition-colors'>
          {cluster.label}
        </h3>
        <div className='flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-white/35'>
          <span className='flex items-center gap-1'>
            <MessageSquare className='w-3 h-3' />
            {cluster.signal_count} tickets
          </span>
          {cluster.churn_signal_count > 0 && (
            <span className='flex items-center gap-1 text-orange-400/80'>
              <AlertTriangle className='w-3 h-3' />
              {cluster.churn_signal_count} churn
            </span>
          )}
          {(cluster.unique_orgs ?? 0) > 0 && (
            <span className='flex items-center gap-1 text-violet-400/80'>
              <Users className='w-3 h-3' />
              {cluster.unique_orgs} accounts
            </span>
          )}
          {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
            <span className='flex items-center gap-1 text-emerald-400/80'>
              <DollarSign className='w-3 h-3' />
              {formatRevenue(cluster.revenue_at_risk_usd)}
            </span>
          )}
          {cluster.spec_generated_at && (
            <span className='flex items-center gap-1 text-blue-400/80'>
              <Sparkles className='w-3 h-3' />
              PRD
            </span>
          )}
          {cluster.is_freeform && (
            <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium'>
              Freeform
            </span>
          )}
        </div>
      </Link>

      {isShipped ? (
        <div className='shrink-0'>
          <span className='inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400'>
            <Package className='w-3 h-3' />
            Shipped
          </span>
        </div>
      ) : hasStatus ? (
        <div className='shrink-0'>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            status === 'approve'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/35'
          }`}>
            {status === 'approve' ? <Check className='w-3 h-3' /> : <SkipForward className='w-3 h-3' />}
            {status === 'approve' ? 'Approved' : 'Skipped'}
          </span>
        </div>
      ) : !isDismissed ? (
        <div className='shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
          <button
            type='button'
            onClick={() => void handleFeedback('approve')}
            className='p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors'
            title='Approve'
          >
            <ThumbsUp className='w-3.5 h-3.5' />
          </button>
          <button
            type='button'
            onClick={() => void handleFeedback('skip')}
            className='p-1.5 text-gray-500 dark:text-white/35 hover:bg-gray-100 dark:bg-white/[0.06] rounded-md transition-colors'
            title='Skip'
          >
            <SkipForward className='w-3.5 h-3.5' />
          </button>
          <button
            type='button'
            onClick={() => void handleFeedback('dismiss')}
            className='p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors'
            title='Dismiss'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      ) : null}
    </div>
  )
}
