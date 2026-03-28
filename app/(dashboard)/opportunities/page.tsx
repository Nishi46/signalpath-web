'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OpportunityCard } from '@/components/OpportunityCard'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardNav } from '@/components/DashboardNav'
import { useWorkspace } from '@/lib/hooks/use-workspace'
import { supabase } from '@/lib/supabase'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
}

export default function OpportunitiesPage() {
  const router = useRouter()
  const { workspaceId, loading: wsLoading } = useWorkspace()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const loadClusters = useCallback(async () => {
    if (!workspaceId) return
    try {
      const res = await fetch('/api/clusters')
      if (res.ok) {
        const { clusters: clusterData, dismissed: dismissedIds } = await res.json()
        setClusters(clusterData)
        setDismissed(new Set(dismissedIds))

        if (clusterData.length === 0) {
          try {
            // Check if workspace has Zendesk connected before redirecting
            const statusRes = await fetch('/api/pipeline-status')
            if (statusRes.ok) {
              const status = await statusRes.json()
              if (status.signals_total > 0 && status.clusters === 0) {
                // Signals exist but no clusters yet — pipeline is still running
                setProcessing(true)
              } else if (status.signals_total === 0) {
                // Check if Zendesk is connected (workspace has a token)
                const wsRes = await fetch('/api/workspace-status')
                if (wsRes.ok) {
                  const ws = await wsRes.json()
                  if (!ws.zendesk_connected) {
                    router.push('/connect')
                    return
                  }
                  // Zendesk is connected but no signals yet — pipeline still fetching
                  setProcessing(true)
                } else {
                  router.push('/connect')
                  return
                }
              }
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* network error */ }
    setLoading(false)
  }, [workspaceId, router])

  useEffect(() => {
    if (wsLoading || !workspaceId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async list fetch
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

  const visibleClusters = clusters.filter(c => !dismissed.has(c.id))

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
          <div className='mb-8'>
            <h1 className='text-2xl font-bold text-gray-900'>Opportunities</h1>
            <p className='text-gray-500 text-sm mt-1'>
              Product opportunities ranked by churn risk and frequency
            </p>
          </div>

          {visibleClusters.length === 0 ? (
            <EmptyState processing={processing} />
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
              {visibleClusters.map(cluster => (
                <OpportunityCard
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
