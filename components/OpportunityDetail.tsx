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
  Download,
  Sparkles,
  ThumbsUp,
  SkipForward,
  X,
  Users,
  FileText,
  FileDown,
  ChevronDown,
  DollarSign,
  Package,
  Building2,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { exportPrdToDocx } from '@/lib/export-prd'
import { ScoreBreakdownPanel, type ScoreHistoryEntry } from './ScoreBreakdownPanel'
import { ScoreSparkline } from './ScoreSparkline'
import { useToast } from '@/lib/toast-context'

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
  dimension_v?: number | null
  revenue_at_risk_usd?: number | null
  scoring_model?: string | null
  ml_review_needed?: boolean | null
  revenue_source?: string | null
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
  scoreHistory?: ScoreHistoryEntry[]
  workspaceId: string
  onRefresh?: () => Promise<void>
}

function formatRevenue(amount: number | null | undefined): string {
  if (!amount) return '$0'
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}


export function OpportunityDetail({ cluster, signals, scoreHistory = [], workspaceId, onRefresh }: OpportunityDetailProps) {
  const toast = useToast()
  const [pushingLinear, setPushingLinear] = useState(false)
  const [pushingJira, setPushingJira] = useState(false)
  const [pushedLinear, setPushedLinear] = useState<string | null>(null)
  const [pushedJira, setPushedJira] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [specBusy, setSpecBusy] = useState(false)
  const [specError, setSpecError] = useState<string | null>(null)
  const [linearConnected, setLinearConnected] = useState<boolean | null>(null)
  const [jiraConnected, setJiraConnected] = useState<boolean | null>(null)
  const [briefExpanded, setBriefExpanded] = useState(false)
  const [specRejecting, setSpecRejecting] = useState(false)
  const [specNotes, setSpecNotes] = useState('')
  const [specRejectBusy, setSpecRejectBusy] = useState(false)
  const [shipped, setShipped] = useState(false)
  const [shippingBusy, setShippingBusy] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accounts, setAccounts] = useState<{
    organization_id: string
    name: string
    domain: string | null
    arr_usd: number | null
    revenue_source: string
  }[]>([])

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
          sessionStorage.setItem('oauth_return_to', window.location.pathname)
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
        const lc = detail.toLowerCase()
        if (res.status === 401 || lc.includes('not connected') || lc.includes('expired') || lc.includes('reconnect')) {
          setLinearConnected(false)
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
        const lc = detail.toLowerCase()
        if (res.status === 401 || lc.includes('not connected') || lc.includes('expired') || lc.includes('reconnect')) {
          setJiraConnected(false)
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
      const labels: Record<string, string> = { approve: 'Approved', skip: 'Skipped', dismiss: 'Dismissed' }
      toast(labels[action], action === 'approve' ? 'success' : 'info')
      void refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Feedback failed', 'error')
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

  function handleDownloadDocx() {
    if (!cluster.human_brief) return
    void exportPrdToDocx(cluster.human_brief, cluster.label)
  }

  function handleDownloadPdf() {
    window.print()
  }

  async function triggerSpecGeneration(notes?: string) {
    setSpecBusy(true)
    setSpecError(null)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/generate-spec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notes ? { notes } : {}),
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

  async function handleRejectSpec() {
    if (!specNotes.trim()) return
    setSpecRejectBusy(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster_id: cluster.id,
          action: 'dismiss',
          feedback_type: 'spec',
          notes: specNotes.trim(),
        }),
      })
      setSpecRejecting(false)
      setSpecNotes('')
      await triggerSpecGeneration(specNotes.trim())
    } catch {
      toast('Could not submit revision — please try again', 'error')
    } finally {
      setSpecRejectBusy(false)
    }
  }

  const hasSpec = Boolean(cluster.agent_spec && cluster.human_brief)

  async function handleShip() {
    setShippingBusy(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, action: 'ship' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Could not mark as shipped')
      }
      setShipped(true)
      toast('Marked as shipped', 'success')
      void refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Ship failed', 'error')
    } finally {
      setShippingBusy(false)
    }
  }

  async function fetchAccounts() {
    if (accounts.length > 0) return
    setAccountsLoading(true)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/accounts`)
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts ?? [])
      }
    } catch { /* non-fatal */ }
    setAccountsLoading(false)
  }

  function toggleAccounts() {
    if (!accountsOpen) void fetchAccounts()
    setAccountsOpen(prev => !prev)
  }

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <Link href='/opportunities' className='inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/40 hover:text-gray-600 dark:text-white/70 mb-6 transition-colors'>
          <ArrowLeft className='w-4 h-4' /> Back to Opportunities
        </Link>

        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 mb-6'>
          <div className='flex items-start justify-between gap-4 mb-6'>
            <h1 className='text-xl font-bold text-gray-900 dark:text-white'>{cluster.label}</h1>
            <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
          </div>

          <div className='flex flex-wrap gap-5 text-sm text-gray-500 dark:text-white/40 mb-6'>
            <span className='flex items-center gap-1.5'>
              <MessageSquare className='w-4 h-4 text-gray-400 dark:text-white/25' />
              {cluster.signal_count} tickets
            </span>
            {cluster.churn_signal_count > 0 && (
              <span className='flex items-center gap-1.5 text-orange-400'>
                <AlertTriangle className='w-4 h-4' />
                {cluster.churn_signal_count} churn signals
              </span>
            )}
            {cluster.recent_signal_count > 0 && (
              <span className='flex items-center gap-1.5 text-amber-400'>
                <Clock className='w-4 h-4' />
                {cluster.recent_signal_count} recent (30d)
              </span>
            )}
            {(cluster.unique_orgs ?? 0) > 0 && (
              <button
                type='button'
                onClick={toggleAccounts}
                className='flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors'
              >
                <Users className='w-4 h-4' />
                {cluster.unique_orgs} accounts affected
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${accountsOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
              <span className='flex items-center gap-1.5 text-emerald-400'>
                <DollarSign className='w-4 h-4' />
                {formatRevenue(cluster.revenue_at_risk_usd)} at risk
                <span className='text-xs text-gray-400 dark:text-white/30 italic'>
                  {cluster.revenue_source === 'crm' ? 'CRM' : 'AI estimate'}
                </span>
              </span>
            )}
          </div>

          <div className='flex flex-wrap gap-2 pb-6 border-b border-gray-100 dark:border-white/[0.07]'>
            <button
              type='button'
              onClick={() => void handleFeedback('approve')}
              className='flex items-center gap-1 text-xs text-emerald-400 hover:bg-emerald-500/10 px-3 py-2 rounded-lg font-medium border border-emerald-500/20 transition-colors'
            >
              <ThumbsUp className='w-3.5 h-3.5' /> Approve
            </button>
            <button
              type='button'
              onClick={() => void handleFeedback('skip')}
              className='flex items-center gap-1 text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:bg-white/[0.06] px-3 py-2 rounded-lg font-medium border border-gray-200 dark:border-white/[0.08] transition-colors'
            >
              <SkipForward className='w-3.5 h-3.5' /> Skip
            </button>
            <button
              type='button'
              onClick={() => void handleFeedback('dismiss')}
              className='flex items-center gap-1 text-xs text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg font-medium border border-red-500/20 transition-colors'
            >
              <X className='w-3.5 h-3.5' /> Dismiss
            </button>
            <button
              type='button'
              disabled={shippingBusy || shipped}
              onClick={() => void handleShip()}
              className='flex items-center gap-1 text-xs text-violet-400 hover:bg-violet-500/10 px-3 py-2 rounded-lg font-medium border border-violet-500/20 disabled:opacity-50 transition-colors'
            >
              <Package className='w-3.5 h-3.5' />
              {shippingBusy ? 'Marking…' : shipped ? 'Shipped' : 'Mark as shipped'}
            </button>
          </div>


          {/* Affected accounts drawer */}
          {accountsOpen && (
            <div className='border-t border-gray-100 dark:border-white/[0.07] pt-5 mt-5'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3'>
                <Building2 className='w-4 h-4 text-violet-400' />
                Affected accounts
              </h3>
              {accountsLoading ? (
                <div className='space-y-2'>
                  {[1, 2, 3].map(i => (
                    <div key={i} className='h-10 bg-gray-100 dark:bg-white/[0.05] rounded-xl animate-pulse' />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-white/30'>No account data available.</p>
              ) : (
                <div className='space-y-1'>
                  {accounts.map(acc => (
                    <div key={acc.organization_id} className='flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:bg-white/[0.04] transition-colors'>
                      <div className='min-w-0'>
                        <p className='text-sm font-medium text-gray-700 dark:text-white/80 truncate'>{acc.name}</p>
                        {acc.domain && (
                          <p className='text-xs text-gray-400 dark:text-white/30'>{acc.domain}</p>
                        )}
                      </div>
                      {acc.arr_usd ? (
                        <div className='shrink-0 flex items-center gap-1.5'>
                          <span className='text-sm font-semibold text-emerald-400'>
                            {formatRevenue(acc.arr_usd)}
                          </span>
                          <span className='text-[10px] text-gray-400 dark:text-white/30 font-medium bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full'>
                            {acc.revenue_source === 'crm' ? 'CRM' : 'est'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className='border-t border-gray-100 dark:border-white/[0.07] pt-6 mt-6'>
            <ScoreBreakdownPanel
              cluster={cluster}
              mlModelVersion={cluster.scoring_model?.startsWith('ml_v') ? parseInt(cluster.scoring_model.slice(4)) : 0}
              scoreHistory={scoreHistory}
            />
          </div>

          {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
            <div className='border-t border-gray-100 dark:border-white/[0.07] pt-5 mt-5'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-500 dark:text-white/50 font-medium flex items-center gap-1.5'>
                  <DollarSign className='w-3.5 h-3.5 text-gray-400 dark:text-white/25' />
                  Revenue at risk
                </span>
                <div className='flex items-center gap-2'>
                  <span className='text-lg font-bold text-emerald-400'>{formatRevenue(cluster.revenue_at_risk_usd)}</span>
                  <span className='text-xs text-gray-400 dark:text-white/30 italic'>
                    {cluster.revenue_source === 'crm' ? 'CRM' : 'AI estimate'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Scoring transparency panel */}
          <div className='border-t border-gray-100 dark:border-white/[0.07] pt-5 mt-5 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-gray-500 dark:text-white/40 font-medium'>Scoring model</span>
              <div className='flex items-center gap-2'>
                {cluster.ml_review_needed && (
                  <span className='text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full'>
                    Review needed
                  </span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  cluster.scoring_model?.startsWith('ml_')
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {cluster.scoring_model?.startsWith('ml_v')
                    ? `Personalized ML v${cluster.scoring_model.slice(4)}`
                    : 'Formula'}
                </span>
              </div>
            </div>
            {scoreHistory.length >= 2 && (
              <div>
                <span className='text-xs text-gray-500 dark:text-white/40 font-medium'>Score trend</span>
                <div className='mt-1.5'>
                  <ScoreSparkline history={scoreHistory} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 mb-6'>
          <div className='flex items-center justify-between gap-3 mb-4'>
            <h2 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <Sparkles className='w-4 h-4 text-sky-400' />
              Opportunity brief & agent spec
            </h2>
            <div className='flex flex-wrap gap-2'>
              {cluster.human_brief && (
                <>
                  <button
                    type='button'
                    onClick={handleDownloadPdf}
                    className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60 bg-gray-100 dark:bg-white/[0.05] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:bg-white/[0.08] transition-colors'
                  >
                    <FileText className='w-3.5 h-3.5' />
                    PDF
                  </button>
                  <button
                    type='button'
                    onClick={handleDownloadDocx}
                    className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60 bg-gray-100 dark:bg-white/[0.05] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:bg-white/[0.08] transition-colors'
                  >
                    <FileDown className='w-3.5 h-3.5' />
                    DOCX
                  </button>
                </>
              )}
              {cluster.agent_spec && (
                <button
                  type='button'
                  onClick={downloadAgentSpec}
                  className='inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 px-3 py-2 rounded-lg border border-sky-500/20 hover:bg-sky-500/15 transition-colors'
                >
                  <Download className='w-3.5 h-3.5' />
                  agent_spec.json
                </button>
              )}
              <button
                type='button'
                disabled={specBusy}
                onClick={() => void triggerSpecGeneration()}
                className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60 bg-gray-100 dark:bg-white/[0.06] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:bg-white/[0.09] disabled:opacity-50 transition-colors'
              >
                <Sparkles className='w-3.5 h-3.5' />
                {specBusy ? 'Generating…' : hasSpec ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>
          {specError && (
            <p className='text-sm text-red-400 mb-3'>{specError}</p>
          )}
          {specBusy && !cluster.human_brief && (
            <p className='text-sm text-gray-500 dark:text-white/40 mb-3 animate-pulse'>
              Analysing evidence and drafting specification… this can take 15–45 seconds.
            </p>
          )}
          {cluster.human_brief ? (
            <div>
              <div
                className={`relative overflow-hidden transition-[max-height] duration-300 ease-in-out ${briefExpanded ? 'max-h-none' : 'max-h-64'}`}
              >
                <div className='prd-document max-w-none' id='prd-content'>
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{cluster.human_brief}</ReactMarkdown>
                </div>
                {!briefExpanded && (
                  <div className='absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-[#1A1D24] to-transparent pointer-events-none' />
                )}
              </div>
              <button
                type='button'
                onClick={() => setBriefExpanded(!briefExpanded)}
                className='w-full flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-white/40 hover:text-gray-600 dark:text-white/70 py-2 mt-1 transition-colors'
              >
                {briefExpanded ? 'Show less' : 'Show more'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${briefExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          ) : (
            <p className='text-gray-400 dark:text-white/30 text-sm'>
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
              className='flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-emerald-500 transition-colors'
            >
              Pushed to Linear <ExternalLink className='w-4 h-4' />
            </a>
          ) : (
            <button
              type='button'
              onClick={() => void handlePushToLinear()}
              disabled={pushingLinear}
              className='flex-1 bg-blue-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingLinear ? 'Creating ticket...' : linearConnected === false ? 'Connect Linear' : 'Push to Linear'}
            </button>
          )}

          {pushedJira ? (
            <a
              href={pushedJira}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-emerald-500 transition-colors'
            >
              Pushed to Jira <ExternalLink className='w-4 h-4' />
            </a>
          ) : (
            <button
              type='button'
              onClick={() => void handlePushToJira()}
              disabled={pushingJira}
              className='flex-1 bg-blue-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingJira ? 'Creating ticket...' : jiraConnected === false ? 'Connect Jira' : 'Push to Jira'}
            </button>
          )}
        </div>

        {pushError && (
          <div className='mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl'>
            <p className='text-sm text-red-400'>{pushError}</p>
          </div>
        )}

        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
          <h2 className='text-sm font-semibold text-gray-900 dark:text-white mb-5'>
            Evidence ({signals.length} tickets)
          </h2>
          {signals.length === 0 ? (
            <p className='text-gray-400 dark:text-white/30 text-sm'>No ticket evidence available yet.</p>
          ) : (
            <div className='space-y-1'>
              {signals.map(signal => (
                <div key={signal.id} className='rounded-xl p-4 hover:bg-gray-50 dark:bg-white/[0.03] transition-colors -mx-2'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-xs text-gray-400 dark:text-white/30 font-medium'>
                      {new Date(signal.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                    {signal.churn_flag && (
                      <span className='inline-flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium'>
                        <AlertTriangle className='w-3 h-3' /> Churn risk
                      </span>
                    )}
                  </div>
                  <p className='text-sm text-gray-500 dark:text-white/60 leading-relaxed'>
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
