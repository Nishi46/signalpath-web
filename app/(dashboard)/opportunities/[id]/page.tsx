'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OpportunityDetail } from '@/components/OpportunityDetail'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardNav } from '@/components/DashboardNav'
import { useWorkspace } from '@/lib/hooks/use-workspace'

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

export default function OpportunityDetailPage() {
  const params = useParams()
  const clusterId = params.id as string
  const { workspaceId, loading: wsLoading } = useWorkspace()

  const [cluster, setCluster] = useState<ClusterDetail | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/clusters/${encodeURIComponent(clusterId)}`)
        if (!res.ok) {
          setNotFound(true)
          setLoading(false)
          return
        }
        const data = await res.json()
        setCluster(data.cluster)
        setSignals(data.signals)
      } catch {
        setNotFound(true)
      }
      setLoading(false)
    }
    load()
  }, [clusterId])

  if (loading || wsLoading || !workspaceId) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <DashboardNav />
        <div className='max-w-3xl mx-auto px-6 py-10'>
          <div className='h-4 bg-gray-200 rounded w-32 mb-6 animate-pulse' />
          <div className='bg-white rounded-2xl border border-gray-200 p-8 mb-6 animate-pulse'>
            <div className='flex items-start justify-between mb-6'>
              <div className='h-6 bg-gray-200 rounded w-2/3' />
              <div className='h-8 w-16 bg-gray-200 rounded-full' />
            </div>
            <div className='flex gap-6 mt-4 mb-8'>
              <div className='h-4 bg-gray-100 rounded w-24' />
              <div className='h-4 bg-gray-100 rounded w-32' />
              <div className='h-4 bg-gray-100 rounded w-28' />
            </div>
            <div className='border-t border-gray-100 pt-6 space-y-4'>
              <div className='h-8 bg-gray-100 rounded w-full' />
              <div className='h-8 bg-gray-100 rounded w-4/5' />
              <div className='h-8 bg-gray-100 rounded w-3/5' />
            </div>
          </div>
          <div className='bg-white rounded-2xl border border-gray-200 p-8 animate-pulse'>
            <div className='h-5 bg-gray-200 rounded w-48 mb-5' />
            <div className='space-y-4'>
              {[1, 2, 3].map(i => (
                <div key={i} className='p-4 rounded-xl bg-gray-50'>
                  <div className='h-3 bg-gray-200 rounded w-24 mb-3' />
                  <div className='h-4 bg-gray-100 rounded w-full mb-2' />
                  <div className='h-4 bg-gray-100 rounded w-3/4' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !cluster) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <DashboardNav />
        <div className='flex items-center justify-center mt-32'>
          <div className='text-center'>
            <h1 className='text-xl font-bold text-gray-900 mb-2'>Opportunity not found</h1>
            <p className='text-gray-500 text-sm mb-4'>This opportunity may have been removed or doesn&apos;t exist.</p>
            <Link href='/opportunities' className='text-indigo-600 hover:text-indigo-700 text-sm font-medium'>
              Back to Opportunities
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <OpportunityDetail cluster={cluster} signals={signals} workspaceId={workspaceId} />
    </ErrorBoundary>
  )
}
