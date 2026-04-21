'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { OpportunityCard } from '@/components/OpportunityCard'
import { OpportunityListRow } from '@/components/OpportunityListRow'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardNav } from '@/components/DashboardNav'
import { TriageModal } from '@/components/TriageModal'
import { OnboardingChecklist } from '@/components/OnboardingChecklist'
import { KeyboardShortcutsButton } from '@/components/KeyboardShortcuts'
import { SavedViews, type SavedViewFilters } from '@/components/SavedViews'
import { useWorkspace } from '@/lib/hooks/use-workspace'
import { useToast } from '@/lib/toast-context'
import { supabase } from '@/lib/supabase'
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  Zap,
  Search,
  ThumbsUp,
  SkipForward,
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
  dimension_b?: number | null
  dimension_s?: number | null
  dimension_c?: number | null
  dimension_r?: number | null
  dimension_f?: number | null
  spec_generated_at?: string | null
  human_brief?: string | null
  shipped_at?: string | null
  pm_rating?: string | null
  signal_sources?: string[] | null
}

type ViewMode = 'grid' | 'list'
type SortField = 'opportunity_score' | 'signal_count' | 'churn_signal_count' | 'unique_orgs'
type ConfidenceFilter = 'all' | 'High' | 'Medium' | 'Low'
type SourceFilter = 'all' | 'zendesk' | 'intercom'
type FeedbackAction = 'approve' | 'skip' | 'dismiss'

const MAX_REVENUE_SLIDER = 10_000_000 // $10M ceiling for slider

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'opportunity_score', label: 'Score' },
  { value: 'signal_count', label: 'Signals' },
  { value: 'churn_signal_count', label: 'Churn signals' },
  { value: 'unique_orgs', label: 'Accounts' },
]

const SECTIONS: { key: FeedbackAction | 'new'; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'text-gray-900 dark:text-white' },
  { key: 'approve', label: 'Approved', color: 'text-emerald-400' },
  { key: 'skip', label: 'Skipped', color: 'text-gray-500 dark:text-white/40' },
  { key: 'dismiss', label: 'Dismissed', color: 'text-gray-400 dark:text-white/25' },
]

export default function OpportunitiesPage() {
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const toast = useToast()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  // View & filter state
  const [view, setView] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortField>('opportunity_score')
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [minScore, setMinScore] = useState(0)
  const [churnOnly, setChurnOnly] = useState(false)
  const [hasSpecOnly, setHasSpecOnly] = useState(false)
  const [minRevenue, setMinRevenue] = useState(0)
  const [maxRevenue, setMaxRevenue] = useState(MAX_REVENUE_SLIDER)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')

  // Triage modal
  const [showTriage, setShowTriage] = useState(false)

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Onboarding
  const [mlStats, setMlStats] = useState<{ labeled_cluster_count: number; ml_model_version: number } | null>(null)
  const [zendeskConnected, setZendeskConnected] = useState(false)
  const [signalCount, setSignalCount] = useState<number | null>(null)
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sp_checklist_dismissed') === '1'
  })
  const [pushedToIssueTracker, setPushedToIssueTracker] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sp_pushed') === '1'
  })

  const loadClusters = useCallback(async () => {
    if (!workspaceId) return
    try {
      const res = await fetch('/api/clusters')
      if (res.ok) {
        const data = await res.json()
        setClusters(data.clusters)
        setFeedback(data.feedback ?? {})
      } else {
        console.error('Failed to load clusters:', res.status, await res.text().catch(() => ''))
      }
    } catch (e) {
      console.error('Network error loading clusters:', e)
    }
    setLoading(false)
  }, [workspaceId])

  useEffect(() => {
    if (wsLoading || !workspaceId) return
    void loadClusters()
  }, [workspaceId, wsLoading, loadClusters])

  useEffect(() => {
    if (!workspaceId) return
    const channel = supabase
      .channel(`clusters:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clusters',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          void loadClusters()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [workspaceId, loadClusters])

  const searchInputRef = useCallback((el: HTMLInputElement | null) => {
    if (!el) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== el) {
        e.preventDefault()
        el.focus()
      }
    }
    window.addEventListener('keydown', handler)
    ;(el as HTMLInputElement & { _cleanup?: () => void })._cleanup = () =>
      window.removeEventListener('keydown', handler)
  }, [])

  const handleFeedback = useCallback((clusterId: string, action: string) => {
    setFeedback(prev => ({ ...prev, [clusterId]: action }))
    if (action === 'approve' || action === 'skip' || action === 'dismiss') {
      setMlStats(prev => prev ? { ...prev, labeled_cluster_count: prev.labeled_cluster_count + 1 } : prev)
    }
  }, [])

  // Fetch workspace status for onboarding checklist + signal count for empty state
  useEffect(() => {
    if (!workspaceId) return
    fetch('/api/workspace-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setZendeskConnected(!!data.zendesk_connected)
        setMlStats(data.ml_stats ?? null)
        if (data.linear_connected || data.jira_connected) {
          setPushedToIssueTracker(true)
          localStorage.setItem('sp_pushed', '1')
        }
      })
      .catch(() => {})
    fetch('/api/signal-count')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSignalCount(data.count) })
      .catch(() => {})
  }, [workspaceId])

  // Bulk action handler
  async function handleBulkAction(action: FeedbackAction) {
    if (selectedIds.size === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_ids: Array.from(selectedIds), action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Bulk action failed')
      }
      const labels: Record<string, string> = { approve: 'Approved', skip: 'Skipped', dismiss: 'Dismissed' }
      toast(`${labels[action]} ${selectedIds.size} opportunit${selectedIds.size === 1 ? 'y' : 'ies'}`, 'success')
      for (const id of selectedIds) {
        handleFeedback(id, action)
      }
      setSelectedIds(new Set())
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Bulk action failed', 'error')
    } finally {
      setBulkLoading(false)
    }
  }

  function handleSelectId(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleSelectAll(ids: string[], checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function handleLoadView(filters: SavedViewFilters) {
    setConfidenceFilter(filters.confidenceFilter)
    setMinScore(filters.minScore)
    setChurnOnly(filters.churnOnly)
    setHasSpecOnly(filters.hasSpecOnly)
    setSortBy(filters.sortBy)
    setSourceFilter(filters.sourceFilter ?? 'all')
    setMinRevenue(filters.minRevenue ?? 0)
    setMaxRevenue(filters.maxRevenue ?? MAX_REVENUE_SLIDER)
  }

  // Apply filters (including search) to a list of clusters
  const applyFilters = useCallback((list: Cluster[]) => {
    let result = list

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(c => c.label.toLowerCase().includes(q))
    }
    if (confidenceFilter !== 'all') {
      result = result.filter(c => c.confidence === confidenceFilter)
    }
    if (sourceFilter !== 'all') {
      result = result.filter(c => c.signal_sources?.includes(sourceFilter))
    }
    if (minScore > 0) {
      result = result.filter(c => c.opportunity_score >= minScore)
    }
    if (churnOnly) {
      result = result.filter(c => c.churn_signal_count > 0)
    }
    if (hasSpecOnly) {
      result = result.filter(c => c.spec_generated_at)
    }
    if (minRevenue > 0) {
      result = result.filter(c => (c.revenue_at_risk_usd ?? 0) >= minRevenue)
    }
    if (maxRevenue < MAX_REVENUE_SLIDER) {
      result = result.filter(c => (c.revenue_at_risk_usd ?? 0) <= maxRevenue)
    }

    result.sort((a, b) => {
      const av = (a[sortBy] as number) ?? 0
      const bv = (b[sortBy] as number) ?? 0
      return bv - av
    })

    return result
  }, [search, confidenceFilter, sourceFilter, minScore, churnOnly, hasSpecOnly, minRevenue, maxRevenue, sortBy])

  // Group clusters into tiered sections (Shipped is separate, based on cluster.shipped_at)
  const { sections, shippedSection } = useMemo(() => {
    const groups: Record<string, Cluster[]> = {
      new: [],
      approve: [],
      skip: [],
      dismiss: [],
    }
    const shipped: Cluster[] = []

    for (const c of clusters) {
      if (c.shipped_at) {
        shipped.push(c)
        continue
      }
      const action = feedback[c.id]
      if (action === 'approve' || action === 'skip' || action === 'dismiss') {
        groups[action].push(c)
      } else {
        groups['new'].push(c)
      }
    }

    return {
      sections: SECTIONS.map(s => ({
        ...s,
        clusters: applyFilters(groups[s.key]),
        totalUnfiltered: groups[s.key].length,
      })).filter(s => s.totalUnfiltered > 0),
      shippedSection: shipped.length > 0
        ? { clusters: applyFilters(shipped), totalUnfiltered: shipped.length }
        : null,
    }
  }, [clusters, feedback, applyFilters])

  const totalVisible = sections.reduce((sum, s) => sum + s.clusters.length, 0)
    + (shippedSection?.clusters.length ?? 0)

  const activeFilterCount =
    (confidenceFilter !== 'all' ? 1 : 0) +
    (sourceFilter !== 'all' ? 1 : 0) +
    (minScore > 0 ? 1 : 0) +
    (churnOnly ? 1 : 0) +
    (hasSpecOnly ? 1 : 0) +
    (minRevenue > 0 || maxRevenue < MAX_REVENUE_SLIDER ? 1 : 0)

  function clearFilters() {
    setConfidenceFilter('all')
    setSourceFilter('all')
    setMinScore(0)
    setChurnOnly(false)
    setHasSpecOnly(false)
    setMinRevenue(0)
    setMaxRevenue(MAX_REVENUE_SLIDER)
  }

  const currentFilters: SavedViewFilters = {
    confidenceFilter, minScore, churnOnly, hasSpecOnly, sortBy,
    sourceFilter, minRevenue, maxRevenue,
  }

  if (loading || wsLoading || !workspaceId) {
    return (
      <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
        <DashboardNav />
        <div className='max-w-6xl mx-auto px-6 py-10'>
          <div className='mb-8'>
            <div className='h-7 bg-gray-100 dark:bg-white/[0.08] rounded w-48 animate-pulse' />
            <div className='h-4 bg-gray-100 dark:bg-white/[0.05] rounded w-80 mt-2 animate-pulse' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6 animate-pulse'>
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <div className='h-4 bg-gray-100 dark:bg-white/[0.08] rounded w-2/3' />
                  <div className='h-6 w-12 bg-gray-100 dark:bg-white/[0.06] rounded-full' />
                </div>
                <div className='flex gap-4 mt-4'>
                  <div className='h-3 bg-gray-100 dark:bg-white/[0.05] rounded w-16' />
                  <div className='h-3 bg-gray-100 dark:bg-white/[0.05] rounded w-24' />
                </div>
                <div className='flex gap-2 pt-3 mt-4 border-t border-gray-100 dark:border-white/[0.05]'>
                  <div className='h-7 bg-gray-100 dark:bg-white/[0.05] rounded-lg w-16' />
                  <div className='h-7 bg-gray-100 dark:bg-white/[0.05] rounded-lg w-12' />
                  <div className='h-7 bg-gray-100 dark:bg-white/[0.05] rounded-lg w-16' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
        <DashboardNav />
        <div className='max-w-6xl mx-auto px-6 py-10'>
          {/* Onboarding checklist */}
          {!checklistDismissed && (
            <OnboardingChecklist
              zendeskConnected={zendeskConnected}
              hasClusters={clusters.length > 0}
              ratedCount={Object.keys(feedback).length}
              pushed={pushedToIssueTracker}
              mlActive={(mlStats?.ml_model_version ?? 0) > 0}
              onDismiss={() => {
                setChecklistDismissed(true)
                localStorage.setItem('sp_checklist_dismissed', '1')
              }}
            />
          )}

          {/* Header */}
          <div className='flex items-end justify-between mb-4'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Opportunities</h1>
              <p className='text-gray-500 dark:text-white/40 text-sm mt-1'>
                {totalVisible} opportunit{totalVisible === 1 ? 'y' : 'ies'}
                {activeFilterCount > 0 && ` (filtered from ${clusters.length})`}
              </p>
            </div>

            <div className='flex items-center gap-2'>
              {/* Quick-rate triage */}
              {clusters.filter(c => !feedback[c.id] && !c.shipped_at).length > 0 && (
                <button
                  type='button'
                  onClick={() => setShowTriage(true)}
                  className='inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-blue-600 text-gray-900 dark:text-white hover:bg-blue-700 transition-colors'
                >
                  <Zap className='w-3.5 h-3.5' />
                  Rate quickly
                </button>
              )}

              {/* Search */}
              <div className='relative'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/30 pointer-events-none' />
                <input
                  ref={searchInputRef}
                  type='text'
                  placeholder='Search… [/]'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); (e.target as HTMLInputElement).blur() } }}
                  className='pl-8 pr-3 py-2 text-xs border border-gray-200 dark:border-white/[0.08] rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50 w-40'
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortField)}
                className='text-xs border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/70 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/50'
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>Sort: {o.label}</option>
                ))}
              </select>

              {/* Saved views */}
              <SavedViews currentFilters={currentFilters} onLoadView={handleLoadView} />

              {/* Filter toggle */}
              <button
                type='button'
                onClick={() => setShowFilters(prev => !prev)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-blue-600/15 text-blue-400 border-blue-500/20'
                    : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/60 border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:bg-white/[0.08]'
                }`}
              >
                <SlidersHorizontal className='w-3.5 h-3.5' />
                Filters
                {activeFilterCount > 0 && (
                  <span className='bg-blue-600 text-gray-900 dark:text-white text-[10px] font-bold w-4 h-4 rounded-full inline-flex items-center justify-center'>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* View toggle */}
              <div className='flex items-center border border-gray-200 dark:border-white/[0.08] rounded-lg overflow-hidden'>
                <button
                  type='button'
                  onClick={() => setView('grid')}
                  className={`p-2 transition-colors ${view === 'grid' ? 'bg-gray-100 dark:bg-white/[0.08] text-white' : 'bg-transparent text-gray-400 dark:text-white/30 hover:text-gray-500 dark:text-white/60'}`}
                  title='Grid view'
                >
                  <LayoutGrid className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => setView('list')}
                  className={`p-2 transition-colors ${view === 'list' ? 'bg-gray-100 dark:bg-white/[0.08] text-white' : 'bg-transparent text-gray-400 dark:text-white/30 hover:text-gray-500 dark:text-white/60'}`}
                  title='List view'
                >
                  <List className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className='bg-white dark:bg-[#1A1D24] rounded-xl border border-gray-100 dark:border-white/[0.07] p-4 mb-6 space-y-3'>
              <div className='flex flex-wrap items-center gap-x-6 gap-y-3'>

                {/* Source */}
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-gray-500 dark:text-white/40 font-medium w-16 shrink-0'>Source</span>
                  <div className='flex items-center gap-1'>
                    {([
                      { value: 'all', label: 'All' },
                      { value: 'zendesk', label: 'Zendesk' },
                      { value: 'intercom', label: 'Intercom' },
                    ] as const).map(({ value, label }) => (
                      <button
                        key={value}
                        type='button'
                        onClick={() => setSourceFilter(value)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                          sourceFilter === value
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:bg-white/[0.06]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confidence */}
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-gray-500 dark:text-white/40 font-medium w-16 shrink-0'>Confidence</span>
                  <div className='flex items-center gap-1'>
                    {(['all', 'High', 'Medium', 'Low'] as const).map(c => (
                      <button
                        key={c}
                        type='button'
                        onClick={() => setConfidenceFilter(c)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                          confidenceFilter === c
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:bg-white/[0.06]'
                        }`}
                      >
                        {c === 'all' ? 'All' : c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className='flex items-center gap-4'>
                  <label className='flex items-center gap-1.5 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={churnOnly}
                      onChange={e => setChurnOnly(e.target.checked)}
                      className='rounded border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 text-blue-500 focus:ring-blue-500/20'
                    />
                    <span className='text-xs text-gray-500 dark:text-white/60 font-medium'>Churn signals</span>
                  </label>
                  <label className='flex items-center gap-1.5 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={hasSpecOnly}
                      onChange={e => setHasSpecOnly(e.target.checked)}
                      className='rounded border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 text-blue-500 focus:ring-blue-500/20'
                    />
                    <span className='text-xs text-gray-500 dark:text-white/60 font-medium'>Has PRD</span>
                  </label>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    type='button'
                    onClick={clearFilters}
                    className='ml-auto text-xs text-gray-500 dark:text-white/40 hover:text-gray-600 dark:text-white/70 flex items-center gap-1 transition-colors'
                  >
                    <X className='w-3 h-3' /> Clear all
                  </button>
                )}
              </div>

              {/* Score + Revenue sliders — second row */}
              <div className='flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]'>

                {/* Min score */}
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-gray-500 dark:text-white/40 font-medium w-16 shrink-0'>Min score</span>
                  <input
                    type='range'
                    min={0}
                    max={10}
                    step={1}
                    value={minScore}
                    onChange={e => setMinScore(Number(e.target.value))}
                    className='w-28 accent-blue-500'
                  />
                  <span className='text-xs font-semibold text-gray-600 dark:text-white/70 tabular-nums w-4'>{minScore}</span>
                </div>

                {/* Revenue range */}
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-gray-500 dark:text-white/40 font-medium w-16 shrink-0'>Revenue</span>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-xs text-gray-400 dark:text-white/30'>Min</span>
                    <input
                      type='range'
                      min={0}
                      max={MAX_REVENUE_SLIDER}
                      step={50_000}
                      value={minRevenue}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setMinRevenue(v)
                        if (v > maxRevenue) setMaxRevenue(v)
                      }}
                      className='w-24 accent-blue-500'
                    />
                    <span className='text-xs font-semibold text-gray-600 dark:text-white/70 tabular-nums w-14'>
                      {minRevenue === 0 ? 'Any' : `$${(minRevenue / 1000).toFixed(0)}K`}
                    </span>
                    <span className='text-xs text-gray-400 dark:text-white/30'>Max</span>
                    <input
                      type='range'
                      min={0}
                      max={MAX_REVENUE_SLIDER}
                      step={50_000}
                      value={maxRevenue}
                      onChange={e => {
                        const v = Number(e.target.value)
                        setMaxRevenue(v)
                        if (v < minRevenue) setMinRevenue(v)
                      }}
                      className='w-24 accent-blue-500'
                    />
                    <span className='text-xs font-semibold text-gray-600 dark:text-white/70 tabular-nums w-14'>
                      {maxRevenue >= MAX_REVENUE_SLIDER ? 'Any' : `$${(maxRevenue / 1000).toFixed(0)}K`}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Results — tiered sections */}
          {clusters.length === 0 ? (
            <EmptyState
              processing={zendeskConnected && signalCount === null}
              insufficient={zendeskConnected && signalCount !== null && signalCount < 3}
            />
          ) : sections.length === 0 && !shippedSection ? (
            <div className='text-center py-16'>
              <p className='text-gray-500 dark:text-white/40 text-sm'>No opportunities match your filters.</p>
              <button
                type='button'
                onClick={clearFilters}
                className='mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors'
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className='space-y-8'>
              {sections.map(section => {
                const sectionIds = section.clusters.map(c => c.id)
                const allSelected = sectionIds.length > 0 && sectionIds.every(id => selectedIds.has(id))

                return (
                  <div key={section.key}>
                    {/* Section header */}
                    <div className='flex items-center gap-3 mb-4'>
                      {view === 'list' && section.clusters.length > 0 && (
                        <input
                          type='checkbox'
                          checked={allSelected}
                          onChange={e => handleSelectAll(sectionIds, e.target.checked)}
                          className='rounded border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 text-blue-500 focus:ring-blue-500/20'
                          title='Select all in section'
                        />
                      )}
                      <h2 className={`text-sm font-semibold ${section.color}`}>
                        {section.label}
                      </h2>
                      <span className='text-xs text-gray-400 dark:text-white/30'>
                        {section.clusters.length}
                        {section.clusters.length !== section.totalUnfiltered && ` of ${section.totalUnfiltered}`}
                      </span>
                      <div className='flex-1 border-t border-gray-100 dark:border-white/[0.07]' />
                    </div>

                    {/* Section content */}
                    {section.clusters.length === 0 ? (
                      <p className='text-xs text-gray-400 dark:text-white/30 pl-1'>No matches for current filters.</p>
                    ) : view === 'grid' ? (
                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
                        {section.clusters.map(cluster => (
                          <OpportunityCard
                            key={cluster.id}
                            cluster={cluster}
                            status={section.key === 'new' ? null : section.key as FeedbackAction}
                            onFeedback={handleFeedback}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className='bg-white dark:bg-[#1A1D24] rounded-xl border border-gray-100 dark:border-white/[0.07] divide-y divide-gray-100 dark:divide-white/[0.05]'>
                        {section.clusters.map(cluster => (
                          <OpportunityListRow
                            key={cluster.id}
                            cluster={cluster}
                            status={section.key === 'new' ? null : section.key as FeedbackAction}
                            onFeedback={handleFeedback}
                            selected={selectedIds.has(cluster.id)}
                            onSelect={handleSelectId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Shipped section */}
              {shippedSection && (
                <div>
                  <div className='flex items-center gap-3 mb-4'>
                    <h2 className='text-sm font-semibold text-violet-400'>Shipped</h2>
                    <span className='text-xs text-gray-400 dark:text-white/30'>
                      {shippedSection.clusters.length}
                      {shippedSection.clusters.length !== shippedSection.totalUnfiltered
                        && ` of ${shippedSection.totalUnfiltered}`}
                    </span>
                    <div className='flex-1 border-t border-gray-100 dark:border-white/[0.07]' />
                  </div>
                  {view === 'grid' ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-60'>
                      {shippedSection.clusters.map(cluster => (
                        <OpportunityCard
                          key={cluster.id}
                          cluster={cluster}
                          status={null}
                          onFeedback={handleFeedback}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className='bg-white dark:bg-[#1A1D24] rounded-xl border border-gray-100 dark:border-white/[0.07] divide-y divide-gray-100 dark:divide-white/[0.05]'>
                      {shippedSection.clusters.map(cluster => (
                        <OpportunityListRow
                          key={cluster.id}
                          cluster={cluster}
                          status={null}
                          onFeedback={handleFeedback}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <KeyboardShortcutsButton />

      {/* Triage modal */}
      {showTriage && (
        <TriageModal
          clusters={clusters.filter(c => !feedback[c.id] && !c.shipped_at)}
          labeledCount={mlStats?.labeled_cluster_count ?? Object.keys(feedback).length}
          mlThreshold={50}
          onClose={() => setShowTriage(false)}
          onFeedback={handleFeedback}
        />
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-40'>
          <div className='bg-gray-900 text-gray-900 dark:text-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4'>
            <span className='text-sm font-medium'>
              {selectedIds.size} selected
            </span>
            <div className='w-px h-5 bg-gray-200 dark:bg-white/20' />
            <button
              type='button'
              disabled={bulkLoading}
              onClick={() => void handleBulkAction('approve')}
              className='inline-flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors'
            >
              <ThumbsUp className='w-4 h-4' />
              Approve ({selectedIds.size})
            </button>
            <button
              type='button'
              disabled={bulkLoading}
              onClick={() => void handleBulkAction('skip')}
              className='inline-flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-gray-900 dark:text-white disabled:opacity-50 transition-colors'
            >
              <SkipForward className='w-4 h-4' />
              Skip ({selectedIds.size})
            </button>
            <button
              type='button'
              disabled={bulkLoading}
              onClick={() => void handleBulkAction('dismiss')}
              className='inline-flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors'
            >
              <X className='w-4 h-4' />
              Dismiss ({selectedIds.size})
            </button>
            <div className='w-px h-5 bg-gray-200 dark:bg-white/20' />
            <button
              type='button'
              onClick={() => setSelectedIds(new Set())}
              className='text-sm text-gray-400 hover:text-gray-900 dark:text-white transition-colors'
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </ErrorBoundary>
  )
}
