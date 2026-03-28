'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { OpportunityCard } from '@/components/OpportunityCard'
import { OpportunityListRow } from '@/components/OpportunityListRow'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardNav } from '@/components/DashboardNav'
import { useWorkspace } from '@/lib/hooks/use-workspace'
import { supabase } from '@/lib/supabase'
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
} from 'lucide-react'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
  unique_orgs?: number | null
  dimension_b?: number | null
  dimension_s?: number | null
  dimension_c?: number | null
  dimension_r?: number | null
  dimension_f?: number | null
  spec_generated_at?: string | null
  human_brief?: string | null
}

type ViewMode = 'grid' | 'list'
type SortField = 'opportunity_score' | 'signal_count' | 'churn_signal_count' | 'unique_orgs'
type ConfidenceFilter = 'all' | 'High' | 'Medium' | 'Low'

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'opportunity_score', label: 'Score' },
  { value: 'signal_count', label: 'Signals' },
  { value: 'churn_signal_count', label: 'Churn signals' },
  { value: 'unique_orgs', label: 'Accounts' },
]

export default function OpportunitiesPage() {
  const router = useRouter()
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  // 'idle' = haven't checked yet, 'connected' = zendesk connected but no clusters, 'not-connected' = no zendesk
  const [workspaceState, setWorkspaceState] = useState<'idle' | 'connected' | 'not-connected'>('idle')

  // View & filter state
  const [view, setView] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortField>('opportunity_score')
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [minScore, setMinScore] = useState(0)
  const [churnOnly, setChurnOnly] = useState(false)
  const [hasSpecOnly, setHasSpecOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const loadClusters = useCallback(async () => {
    if (!workspaceId) return
    try {
      const res = await fetch('/api/clusters')
      if (res.ok) {
        const { clusters: clusterData, dismissed: dismissedIds } = await res.json()
        setClusters(clusterData)
        setDismissed(new Set(dismissedIds))

        // Only check workspace/pipeline state when there are no clusters
        if (clusterData.length === 0 && workspaceState === 'idle') {
          try {
            const wsRes = await fetch('/api/workspace-status')
            if (wsRes.ok) {
              const ws = await wsRes.json()
              setWorkspaceState(ws.zendesk_connected ? 'connected' : 'not-connected')
            } else {
              setWorkspaceState('not-connected')
            }
          } catch {
            setWorkspaceState('not-connected')
          }
        }
      }
    } catch { /* network error */ }
    setLoading(false)
  }, [workspaceId, workspaceState])

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

  const handleFeedback = useCallback((clusterId: string, action: string) => {
    if (action === 'dismiss') {
      setDismissed(prev => new Set(prev).add(clusterId))
    }
  }, [])

  const filteredClusters = useMemo(() => {
    let result = clusters.filter(c => !dismissed.has(c.id))

    if (confidenceFilter !== 'all') {
      result = result.filter(c => c.confidence === confidenceFilter)
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

    result.sort((a, b) => {
      const av = (a[sortBy] as number) ?? 0
      const bv = (b[sortBy] as number) ?? 0
      return bv - av
    })

    return result
  }, [clusters, dismissed, confidenceFilter, minScore, churnOnly, hasSpecOnly, sortBy])

  const activeFilterCount =
    (confidenceFilter !== 'all' ? 1 : 0) +
    (minScore > 0 ? 1 : 0) +
    (churnOnly ? 1 : 0) +
    (hasSpecOnly ? 1 : 0)

  function clearFilters() {
    setConfidenceFilter('all')
    setMinScore(0)
    setChurnOnly(false)
    setHasSpecOnly(false)
  }

  if (loading || wsLoading || !workspaceId) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <DashboardNav />
        <div className='max-w-6xl mx-auto px-6 py-10'>
          <div className='mb-8'>
            <div className='h-7 bg-gray-200 rounded w-48 animate-pulse' />
            <div className='h-4 bg-gray-100 rounded w-80 mt-2 animate-pulse' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className='bg-white rounded-2xl border border-gray-200 p-6 animate-pulse'>
                <div className='flex items-start justify-between gap-3 mb-3'>
                  <div className='h-4 bg-gray-200 rounded w-2/3' />
                  <div className='h-6 w-12 bg-gray-200 rounded-full' />
                </div>
                <div className='flex gap-4 mt-4'>
                  <div className='h-3 bg-gray-100 rounded w-16' />
                  <div className='h-3 bg-gray-100 rounded w-24' />
                </div>
                <div className='flex gap-2 pt-3 mt-4 border-t border-gray-100'>
                  <div className='h-7 bg-gray-100 rounded-lg w-16' />
                  <div className='h-7 bg-gray-100 rounded-lg w-12' />
                  <div className='h-7 bg-gray-100 rounded-lg w-16' />
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
      <div className='min-h-screen bg-gray-50'>
        <DashboardNav />
        <div className='max-w-6xl mx-auto px-6 py-10'>
          {/* Header */}
          <div className='flex items-end justify-between mb-6'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>Opportunities</h1>
              <p className='text-gray-500 text-sm mt-1'>
                {filteredClusters.length} opportunit{filteredClusters.length === 1 ? 'y' : 'ies'}
                {activeFilterCount > 0 && ` (filtered from ${clusters.filter(c => !dismissed.has(c.id)).length})`}
              </p>
            </div>

            <div className='flex items-center gap-2'>
              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortField)}
                className='text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300'
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>Sort: {o.label}</option>
                ))}
              </select>

              {/* Filter toggle */}
              <button
                type='button'
                onClick={() => setShowFilters(prev => !prev)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className='w-3.5 h-3.5' />
                Filters
                {activeFilterCount > 0 && (
                  <span className='bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full inline-flex items-center justify-center'>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* View toggle */}
              <div className='flex items-center border border-gray-200 rounded-lg overflow-hidden'>
                <button
                  type='button'
                  onClick={() => setView('grid')}
                  className={`p-2 transition-colors ${view === 'grid' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-400 hover:text-gray-600'}`}
                  title='Grid view'
                >
                  <LayoutGrid className='w-4 h-4' />
                </button>
                <button
                  type='button'
                  onClick={() => setView('list')}
                  className={`p-2 transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-400 hover:text-gray-600'}`}
                  title='List view'
                >
                  <List className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className='bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-4'>
              {/* Confidence */}
              <div className='flex items-center gap-2'>
                <span className='text-xs text-gray-500 font-medium'>Confidence</span>
                <div className='flex items-center gap-1'>
                  {(['all', 'High', 'Medium', 'Low'] as const).map(c => (
                    <button
                      key={c}
                      type='button'
                      onClick={() => setConfidenceFilter(c)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        confidenceFilter === c
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {c === 'all' ? 'All' : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min score */}
              <div className='flex items-center gap-2'>
                <span className='text-xs text-gray-500 font-medium'>Min score</span>
                <input
                  type='range'
                  min={0}
                  max={10}
                  step={1}
                  value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className='w-24 accent-indigo-600'
                />
                <span className='text-xs text-gray-700 font-semibold tabular-nums w-4'>{minScore}</span>
              </div>

              {/* Churn only */}
              <label className='flex items-center gap-1.5 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={churnOnly}
                  onChange={e => setChurnOnly(e.target.checked)}
                  className='rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/20'
                />
                <span className='text-xs text-gray-700 font-medium'>Has churn signals</span>
              </label>

              {/* Has spec */}
              <label className='flex items-center gap-1.5 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={hasSpecOnly}
                  onChange={e => setHasSpecOnly(e.target.checked)}
                  className='rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/20'
                />
                <span className='text-xs text-gray-700 font-medium'>Has PRD</span>
              </label>

              {activeFilterCount > 0 && (
                <button
                  type='button'
                  onClick={clearFilters}
                  className='ml-auto text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1'
                >
                  <X className='w-3 h-3' /> Clear all
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {filteredClusters.length === 0 ? (
            clusters.filter(c => !dismissed.has(c.id)).length === 0 ? (
              <EmptyState
                processing={workspaceState === 'connected'}
              />
            ) : (
              <div className='text-center py-16'>
                <p className='text-gray-500 text-sm'>No opportunities match your filters.</p>
                <button
                  type='button'
                  onClick={clearFilters}
                  className='mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium'
                >
                  Clear filters
                </button>
              </div>
            )
          ) : view === 'grid' ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
              {filteredClusters.map(cluster => (
                <OpportunityCard
                  key={cluster.id}
                  cluster={cluster}
                  onFeedback={handleFeedback}
                />
              ))}
            </div>
          ) : (
            <div className='bg-white rounded-xl border border-gray-200 divide-y divide-gray-100'>
              {filteredClusters.map(cluster => (
                <OpportunityListRow
                  key={cluster.id}
                  cluster={cluster}
                  onFeedback={handleFeedback}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
