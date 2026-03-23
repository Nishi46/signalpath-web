'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OpportunityCard } from '@/components/OpportunityCard'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useWorkspace } from '@/lib/hooks/use-workspace'
import { UserMenu } from '@/components/UserMenu'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [insufficient, setInsufficient] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (wsLoading || !workspaceId) return

    async function load() {
      try {
        const res = await fetch('/api/clusters')
        if (res.ok) {
          const { clusters: clusterData, dismissed: dismissedIds } = await res.json()
          setClusters(clusterData)
          setDismissed(new Set(dismissedIds))

          // If no clusters, check pipeline state
          if (clusterData.length === 0) {
            try {
              const statusRes = await fetch('/api/pipeline-status')
              if (statusRes.ok) {
                const status = await statusRes.json()
                if (status.signals_total === 0) {
                  // No data at all — redirect to connect Zendesk
                  router.push('/connect')
                  return
                }
                if (status.signals_total > 0 && status.signals_embedded >= status.signals_total && status.clusters === 0) {
                  // Pipeline done but not enough data for clustering
                  setInsufficient(true)
                } else if (status.signals_total > 0 && status.clusters === 0) {
                  // Pipeline still running
                  setProcessing(true)
                }
              }
            } catch { /* ignore */ }
          }
        }
      } catch { /* network error — skeleton will clear */ }
      setLoading(false)
    }
    load()
  }, [workspaceId, wsLoading, router])

  const handleFeedback = useCallback((clusterId: string, action: string) => {
    if (action === 'dismiss') {
      setDismissed(prev => new Set(prev).add(clusterId))
    }
  }, [])

  const visibleClusters = clusters.filter(c => !dismissed.has(c.id))

  if (loading || wsLoading || !workspaceId) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-6xl mx-auto px-6 py-10'>
          <div className='mb-8'>
            <div className='h-7 bg-gray-200 rounded w-48 animate-pulse' />
            <div className='h-4 bg-gray-100 rounded w-80 mt-2 animate-pulse' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className='bg-white rounded-xl border border-gray-200 p-5 animate-pulse'>
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
        <div className='max-w-6xl mx-auto px-6 py-10'>
          <div className='flex items-start justify-between mb-8'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>Opportunities</h1>
              <p className='text-gray-500 text-sm mt-1'>
                Product opportunities ranked by churn risk and frequency
              </p>
            </div>
            <UserMenu />
          </div>

          {visibleClusters.length === 0 ? (
            <EmptyState processing={processing} insufficient={insufficient} />
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {visibleClusters.map(cluster => (
                <OpportunityCard
                  key={cluster.id}
                  cluster={cluster}
                  workspaceId={workspaceId}
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
