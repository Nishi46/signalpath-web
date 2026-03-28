'use client'
import { useState, useEffect, useCallback } from 'react'
import { ScoreBadge } from './ScoreBadge'
import { DashboardNav } from './DashboardNav'
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Clock,
  TrendingUp,
  Download,
  Sparkles,
  ThumbsUp,
  SkipForward,
  X,
  Users,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export interface ClusterDetail {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  recent_signal_count: number
  human_brief?: string | null
  agent_spec?: Record<string, unknown> | null
  spec_generated_at?: string | null
  confidence?: string | null
  dimension_f?: number | null
  dimension_r?: number | null
  dimension_c?: number | null
  dimension_b?: number | null
  dimension_s?: number | null
  unique_orgs?: number | null
  unique_requesters?: number | null
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
  onRefresh?: () => Promise<void>
}

function DimensionBar({ label, value, color, icon: Icon }: {
  label: string
  value: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const v = Number.isFinite(value) ? value : 0
  const pct = Math.min((v / 10) * 100, 100)
  return (
    <div className='mb-4 last:mb-0'>
      <div className='flex justify-between text-sm mb-2'>
        <span className='text-gray-600 font-medium flex items-center gap-1.5'>
          <Icon className='w-3.5 h-3.5 text-gray-400' />
          {label}
        </span>
        <span className='text-gray-900 font-semibold tabular-nums'>{v.toFixed(1)} / 10</span>
      </div>
      <div className='w-full bg-gray-100 rounded-full h-2'>
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function OpportunityDetail({ cluster, signals, workspaceId, onRefresh }: OpportunityDetailProps) {
  const [pushingLinear, setPushingLinear] = useState(false)
  const [pushingJira, setPushingJira] = useState(false)
  const [pushedLinear, setPushedLinear] = useState<string | null>(null)
  const [pushedJira, setPushedJira] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [specBusy, setSpecBusy] = useState(false)
  const [specError, setSpecError] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [linearConnected, setLinearConnected] = useState<boolean | null>(null)
  const [jiraConnected, setJiraConnected] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/workspace-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLinearConnected(data.linear_connected)
          setJiraConnected(data.jira_connected)
        }
      })
      .catch(() => {})
  }, [])

  const refresh = useCallback(async () => {
    if (onRefresh) await onRefresh()
  }, [onRefresh])

  useEffect(() => {
    if (!cluster.id) return
    const channel = supabase
      .channel(`cluster-row:${cluster.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clusters',
          filter: `id=eq.${cluster.id}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [cluster.id, refresh])

  async function redirectToOAuth(service: 'linear' | 'jira') {
    try {
      const initRes = await fetch(`/api/auth-${service}`)
      if (initRes.ok) {
        const { redirect_url } = await initRes.json()
        if (redirect_url) {
          window.location.href = redirect_url
          return true
        }
      }
    } catch { /* fall through */ }
    return false
  }

  async function handlePushToLinear() {
    setPushingLinear(true)
    setPushError(null)
    if (linearConnected === false) {
      const redirected = await redirectToOAuth('linear')
      if (!redirected) setPushError('Could not start Linear connection. Please try from the Connect page.')
      setPushingLinear(false)
      return
    }
    try {
      const res = await fetch('/api/push-linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, workspace_id: workspaceId }),
      })
      if (!res.ok) {
        const err = await res.json()
        const detail = err.detail ?? 'Push to Linear failed'
        if (detail.toLowerCase().includes('not connected')) {
          const redirected = await redirectToOAuth('linear')
          if (!redirected) throw new Error('Linear not connected. Please connect from the Connect page.')
          return
        }
        throw new Error(detail)
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
    if (jiraConnected === false) {
      const redirected = await redirectToOAuth('jira')
      if (!redirected) setPushError('Could not start Jira connection. Please try from the Connect page.')
      setPushingJira(false)
      return
    }
    try {
      const res = await fetch('/api/push-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, workspace_id: workspaceId }),
      })
      if (!res.ok) {
        const err = await res.json()
        const detail = err.detail ?? 'Push to Jira failed'
        if (detail.toLowerCase().includes('not connected')) {
          const redirected = await redirectToOAuth('jira')
          if (!redirected) throw new Error('Jira not connected. Please connect from the Connect page.')
          return
        }
        throw new Error(detail)
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

  async function handleFeedback(action: 'approve' | 'skip' | 'dismiss') {
    setFeedbackMsg(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Could not save feedback')
      }
      setFeedbackMsg(action === 'approve' ? 'Marked as approve.' : action === 'skip' ? 'Skipped.' : 'Dismissed.')
      void refresh()
    } catch (e: unknown) {
      setFeedbackMsg(e instanceof Error ? e.message : 'Feedback failed')
    }
  }

  function downloadAgentSpec() {
    if (!cluster.agent_spec) return
    const blob = new Blob([JSON.stringify(cluster.agent_spec, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent_spec_${cluster.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function triggerSpecGeneration() {
    setSpecBusy(true)
    setSpecError(null)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/generate-spec`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? err.error ?? 'Could not start spec generation')
      }
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 2500))
        const poll = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}`)
        if (poll.ok) {
          const data = await poll.json()
          if (data.cluster?.human_brief) {
            await refresh()
            return
          }
        }
      }
      await refresh()
    } catch (e: unknown) {
      setSpecError(e instanceof Error ? e.message : 'Spec generation failed')
    } finally {
      setSpecBusy(false)
    }
  }

  const B = cluster.dimension_b ?? 0
  const S = cluster.dimension_s ?? 0
  const C = cluster.dimension_c ?? 0
  const R = cluster.dimension_r ?? 0
  const F = cluster.dimension_f ?? 0
  const hasSpec = Boolean(cluster.agent_spec && cluster.human_brief)

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <Link href='/opportunities' className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors'>
          <ArrowLeft className='w-4 h-4' /> Back to Opportunities
        </Link>

        <div className='bg-white rounded-2xl border border-gray-200 p-8 mb-6'>
          <div className='flex items-start justify-between gap-4 mb-6'>
            <h1 className='text-xl font-bold text-gray-900'>{cluster.label}</h1>
            <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
          </div>

          <div className='flex flex-wrap gap-5 text-sm text-gray-500 mb-6'>
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
            {(cluster.unique_orgs ?? 0) > 0 && (
              <span className='flex items-center gap-1.5 text-purple-600'>
                <Users className='w-4 h-4' />
                {cluster.unique_orgs} accounts affected
              </span>
            )}
          </div>

          <div className='flex flex-wrap gap-2 pb-6 border-b border-gray-100'>
            <button
              type='button'
              onClick={() => void handleFeedback('approve')}
              className='flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg font-medium border border-green-100'
            >
              <ThumbsUp className='w-3.5 h-3.5' /> Approve
            </button>
            <button
              type='button'
              onClick={() => void handleFeedback('skip')}
              className='flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium border border-gray-200'
            >
              <SkipForward className='w-3.5 h-3.5' /> Skip
            </button>
            <button
              type='button'
              onClick={() => void handleFeedback('dismiss')}
              className='flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-medium border border-red-100'
            >
              <X className='w-3.5 h-3.5' /> Dismiss
            </button>
          </div>
          {feedbackMsg && (
            <p className='text-xs text-gray-600 mt-3'>{feedbackMsg}</p>
          )}

          <div className='border-t border-gray-100 pt-6 mt-6'>
            <h2 className='text-sm font-semibold text-gray-900 mb-5'>Score dimensions (0–10)</h2>
            <DimensionBar icon={Users} label='Account breadth (B)' value={B} color='bg-purple-500' />
            <DimensionBar icon={ShieldAlert} label='Severity (S)' value={S} color='bg-orange-500' />
            <DimensionBar icon={TrendingUp} label='Churn & competitive (C)' value={C} color='bg-red-500' />
            <DimensionBar icon={Clock} label='Recency (R)' value={R} color='bg-amber-500' />
            <DimensionBar icon={MessageSquare} label='Frequency (F)' value={F} color='bg-indigo-500' />
          </div>
        </div>

        <div className='bg-white rounded-2xl border border-gray-200 p-8 mb-6'>
          <div className='flex items-center justify-between gap-3 mb-4'>
            <h2 className='text-sm font-semibold text-gray-900 flex items-center gap-2'>
              <Sparkles className='w-4 h-4 text-violet-500' />
              Opportunity brief & agent spec
            </h2>
            <div className='flex flex-wrap gap-2'>
              {cluster.agent_spec && (
                <button
                  type='button'
                  onClick={downloadAgentSpec}
                  className='inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 px-3 py-2 rounded-lg border border-violet-100 hover:bg-violet-100'
                >
                  <Download className='w-3.5 h-3.5' />
                  agent_spec.json
                </button>
              )}
              <button
                type='button'
                disabled={specBusy}
                onClick={() => void triggerSpecGeneration()}
                className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-200 disabled:opacity-50'
              >
                <Sparkles className='w-3.5 h-3.5' />
                {specBusy ? 'Generating…' : hasSpec ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>
          {specError && (
            <p className='text-sm text-red-600 mb-3'>{specError}</p>
          )}
          {specBusy && !cluster.human_brief && (
            <p className='text-sm text-gray-500 mb-3 animate-pulse'>
              Analysing evidence and drafting specification… this can take 15–45 seconds.
            </p>
          )}
          {cluster.human_brief ? (
            <div className='prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap'>
              {cluster.human_brief}
            </div>
          ) : (
            <p className='text-gray-400 text-sm'>
              No brief yet. Scoring runs spec generation automatically; use Generate if you need to retry.
            </p>
          )}
        </div>

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
              type='button'
              onClick={() => void handlePushToLinear()}
              disabled={pushingLinear}
              className='flex-1 bg-indigo-600 text-white font-medium py-3 rounded-xl text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingLinear ? 'Creating ticket...' : linearConnected === false ? 'Connect Linear' : 'Push to Linear'}
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
              type='button'
              onClick={() => void handlePushToJira()}
              disabled={pushingJira}
              className='flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingJira ? 'Creating ticket...' : jiraConnected === false ? 'Connect Jira' : 'Push to Jira'}
            </button>
          )}
        </div>

        {pushError && (
          <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-xl'>
            <p className='text-sm text-red-600'>{pushError}</p>
          </div>
        )}

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
