'use client'
import Link from 'next/link'
import { ScoreBadge } from './ScoreBadge'
import { MessageSquare, AlertTriangle, ThumbsUp, SkipForward, X, Check, DollarSign } from 'lucide-react'
import { useToast } from '@/lib/toast-context'

type FeedbackAction = 'approve' | 'skip' | 'dismiss'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
  revenue_at_risk_usd?: number | null
  is_freeform?: boolean
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

function getBarColor(score: number) {
  if (score >= 8) return '#F97316'
  if (score >= 6) return '#F59E0B'
  return '#64748B'
}

export function OpportunityCard({ cluster, status, onFeedback }: OpportunityCardProps) {
  const toast = useToast()

  async function handleFeedback(action: 'approve' | 'skip' | 'dismiss') {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, action }),
      })
      if (!res.ok) throw new Error('Failed')
      onFeedback?.(cluster.id, action)
      const labels: Record<string, string> = { approve: 'Approved', skip: 'Skipped', dismiss: 'Dismissed' }
      toast(labels[action], action === 'approve' ? 'success' : 'info')
    } catch {
      toast('Could not save — please try again', 'error')
    }
  }

  const isDismissed = status === 'dismiss'
  const hasStatus = status === 'approve' || status === 'skip'
  const barColor = getBarColor(cluster.opportunity_score)

  return (
    <div className={`relative bg-white dark:bg-[#1A1D24] rounded-2xl border overflow-hidden transition-all duration-200 group ${
      isDismissed
        ? 'opacity-40 grayscale border-gray-100 dark:border-white/[0.04]'
        : 'border-gray-100 dark:border-white/[0.07] hover:border-white/[0.14] hover:bg-[#1E2129]'
    }`}>
      {/* Score accent bar */}
      <div className='absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl' style={{ backgroundColor: barColor }} />

      <Link href={`/opportunities/${cluster.id}`} className='block p-5 pl-6'>
        <div className='flex items-start justify-between gap-3 mb-3'>
          <h3 className='text-sm font-semibold text-gray-900 dark:text-white/90 leading-snug group-hover:text-white transition-colors'>
            {cluster.label}
          </h3>
          <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
        </div>
        {cluster.is_freeform && (
          <span className='inline-block text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium mb-2'>
            Freeform
          </span>
        )}
        <div className='flex items-center gap-4 text-xs text-gray-500 dark:text-white/35'>
          <span className='flex items-center gap-1.5'>
            <MessageSquare className='w-3.5 h-3.5' />
            {cluster.signal_count} tickets
          </span>
          {cluster.churn_signal_count > 0 && (
            <span className='flex items-center gap-1.5 text-orange-400/80'>
              <AlertTriangle className='w-3.5 h-3.5' />
              {cluster.churn_signal_count} churn
            </span>
          )}
          {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
            <span className='flex items-center gap-1.5 text-emerald-400/80'>
              <DollarSign className='w-3.5 h-3.5' />
              {formatRevenue(cluster.revenue_at_risk_usd)}
            </span>
          )}
        </div>
      </Link>

      {hasStatus ? (
        <div className='flex items-center gap-1.5 px-5 pl-6 pb-4 border-t border-gray-100 dark:border-white/[0.05] pt-3'>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            status === 'approve'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40'
          }`}>
            {status === 'approve' ? <Check className='w-3 h-3' /> : <SkipForward className='w-3 h-3' />}
            {status === 'approve' ? 'Approved' : 'Skipped'}
          </span>
        </div>
      ) : !isDismissed ? (
        <div className='flex items-center gap-1 px-5 pl-6 pb-4 border-t border-gray-100 dark:border-white/[0.05] pt-3'>
          <button
            onClick={() => handleFeedback('approve')}
            className='flex items-center gap-1 text-xs text-emerald-400 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors font-medium'
          >
            <ThumbsUp className='w-3.5 h-3.5' /> Approve
          </button>
          <button
            onClick={() => handleFeedback('skip')}
            className='flex items-center gap-1 text-xs text-gray-500 dark:text-white/35 hover:bg-gray-100 dark:bg-white/[0.06] px-3 py-1.5 rounded-lg transition-colors font-medium'
          >
            <SkipForward className='w-3.5 h-3.5' /> Skip
          </button>
          <button
            onClick={() => handleFeedback('dismiss')}
            className='flex items-center gap-1 text-xs text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors font-medium ml-auto'
          >
            <X className='w-3.5 h-3.5' /> Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}
