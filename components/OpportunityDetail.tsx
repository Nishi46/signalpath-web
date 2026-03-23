'use client'
import { useState } from 'react'
import { ScoreBadge } from './ScoreBadge'
import { DashboardNav } from './DashboardNav'
import { ArrowLeft, AlertTriangle, ExternalLink, MessageSquare, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface ClusterDetail {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  recent_signal_count: number
}

interface Signal {
  id: string
  text: string
  churn_flag: boolean
  created_at: string
}

interface OpportunityDetailProps {
  cluster: ClusterDetail
  signals: Signal[]
  workspaceId: string
}

function ScoreBar({ label, value, max, color, icon: Icon }: {
  label: string; value: number; max: number; color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className='mb-4 last:mb-0'>
      <div className='flex justify-between text-sm mb-2'>
        <span className='text-gray-600 font-medium flex items-center gap-1.5'>
          <Icon className='w-3.5 h-3.5 text-gray-400' />
          {label}
        </span>
        <span className='text-gray-900 font-semibold tabular-nums'>{value}</span>
      </div>
      <div className='w-full bg-gray-100 rounded-full h-2'>
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function OpportunityDetail({ cluster, signals, workspaceId }: OpportunityDetailProps) {
  const [pushingLinear, setPushingLinear] = useState(false)
  const [pushingJira, setPushingJira] = useState(false)
  const [pushedLinear, setPushedLinear] = useState<string | null>(null)
  const [pushedJira, setPushedJira] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)

  async function handlePushToLinear() {
    setPushingLinear(true)
    setPushError(null)
    try {
      const res = await fetch('/api/push-linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, workspace_id: workspaceId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Push to Linear failed')
      }
      const { url } = await res.json()
      setPushedLinear(url)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Push to Linear failed'
      setPushError(message)
    } finally {
      setPushingLinear(false)
    }
  }

  async function handlePushToJira() {
    setPushingJira(true)
    setPushError(null)
    try {
      const res = await fetch('/api/push-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, workspace_id: workspaceId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Push to Jira failed')
      }
      const { url } = await res.json()
      setPushedJira(url)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Push to Jira failed'
      setPushError(message)
    } finally {
      setPushingJira(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <Link href='/opportunities' className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors'>
          <ArrowLeft className='w-4 h-4' /> Back to Opportunities
        </Link>

        {/* Header */}
        <div className='bg-white rounded-2xl border border-gray-200 p-8 mb-6'>
          <div className='flex items-start justify-between gap-4 mb-6'>
            <h1 className='text-xl font-bold text-gray-900'>{cluster.label}</h1>
            <ScoreBadge score={cluster.opportunity_score} />
          </div>

          <div className='flex gap-5 text-sm text-gray-500 mb-8'>
            <span className='flex items-center gap-1.5'>
              <MessageSquare className='w-4 h-4 text-gray-400' />
              {cluster.signal_count} tickets
            </span>
            {cluster.churn_signal_count > 0 && (
              <span className='flex items-center gap-1.5 text-red-500'>
                <AlertTriangle className='w-4 h-4' />
                {cluster.churn_signal_count} churn signals
              </span>
            )}
            {cluster.recent_signal_count > 0 && (
              <span className='flex items-center gap-1.5 text-amber-600'>
                <Clock className='w-4 h-4' />
                {cluster.recent_signal_count} recent (30d)
              </span>
            )}
          </div>

          {/* Score breakdown */}
          <div className='border-t border-gray-100 pt-6'>
            <h2 className='text-sm font-semibold text-gray-900 mb-5'>Score Breakdown</h2>
            <ScoreBar icon={MessageSquare} label='Total tickets' value={cluster.signal_count} max={cluster.signal_count} color='bg-indigo-500' />
            <ScoreBar icon={Clock} label='Recent tickets (30d)' value={cluster.recent_signal_count} max={cluster.signal_count} color='bg-amber-500' />
            <ScoreBar icon={TrendingUp} label='Churn signals' value={cluster.churn_signal_count} max={cluster.signal_count} color='bg-red-500' />
          </div>
        </div>

        {/* Push buttons */}
        <div className='flex gap-3 mb-6'>
          {pushedLinear ? (
            <a
              href={pushedLinear}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-3 rounded-xl text-sm hover:bg-green-700 transition-colors'
            >
              Pushed to Linear <ExternalLink className='w-4 h-4' />
            </a>
          ) : (
            <button
              onClick={handlePushToLinear}
              disabled={pushingLinear}
              className='flex-1 bg-indigo-600 text-white font-medium py-3 rounded-xl text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingLinear ? 'Creating ticket...' : 'Push to Linear'}
            </button>
          )}

          {pushedJira ? (
            <a
              href={pushedJira}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-3 rounded-xl text-sm hover:bg-green-700 transition-colors'
            >
              Pushed to Jira <ExternalLink className='w-4 h-4' />
            </a>
          ) : (
            <button
              onClick={handlePushToJira}
              disabled={pushingJira}
              className='flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingJira ? 'Creating ticket...' : 'Push to Jira'}
            </button>
          )}
        </div>

        {pushError && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-xl'>
            <p className='text-sm text-red-600'>{pushError}</p>
          </div>
        )}

        {/* Evidence */}
        <div className='bg-white rounded-2xl border border-gray-200 p-8'>
          <h2 className='text-sm font-semibold text-gray-900 mb-5'>
            Evidence ({signals.length} tickets)
          </h2>
          {signals.length === 0 ? (
            <p className='text-gray-400 text-sm'>No ticket evidence available yet.</p>
          ) : (
            <div className='space-y-1'>
              {signals.map(signal => (
                <div key={signal.id} className='rounded-xl p-4 hover:bg-gray-50 transition-colors -mx-2'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-xs text-gray-400 font-medium'>
                      {new Date(signal.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                    {signal.churn_flag && (
                      <span className='inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-medium'>
                        <AlertTriangle className='w-3 h-3' /> Churn risk
                      </span>
                    )}
                  </div>
                  <p className='text-sm text-gray-700 leading-relaxed'>
                    {signal.text.length > 200 ? signal.text.slice(0, 200) + '...' : signal.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
