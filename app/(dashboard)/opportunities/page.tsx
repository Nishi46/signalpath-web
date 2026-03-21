'use client'
import { useState, useEffect, useCallback } from 'react'
import { OpportunityCard } from '@/components/OpportunityCard'
import { EmptyState } from '@/components/EmptyState'

interface Cluster {
  id: string
  label: string
  score: number
  signal_count: number
  churn_count: number
}

export default function OpportunitiesPage() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const workspaceId = '11111111-1111-1111-1111-111111111111' // TODO: from auth

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/clusters?workspace_id=${workspaceId}`)
      if (res.ok) {
        const { clusters: clusterData, dismissed: dismissedIds } = await res.json()
        setClusters(clusterData)
        setDismissed(new Set(dismissedIds))
      }
      setLoading(false)
    }
    load()
  }, [workspaceId])

  const handleFeedback = useCallback((clusterId: string, action: string) => {
    if (action === 'dismiss') {
      setDismissed(prev => new Set(prev).add(clusterId))
    }
  }, [])

  const visibleClusters = clusters.filter(c => !dismissed.has(c.id))

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <p className='text-gray-400 text-sm'>Loading opportunities...</p>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-6xl mx-auto px-6 py-10'>
        <div className='mb-8'>
          <h1 className='text-2xl font-bold text-gray-900'>Opportunities</h1>
          <p className='text-gray-500 text-sm mt-1'>
            Product opportunities ranked by churn risk and frequency
          </p>
        </div>

        {visibleClusters.length === 0 ? (
          <EmptyState />
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
  )
}
