'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OpportunityDetail } from '@/components/OpportunityDetail'

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

  const [cluster, setCluster] = useState<ClusterDetail | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/clusters/${clusterId}`)
      if (!res.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      setCluster(data.cluster)
      setSignals(data.signals)
      setLoading(false)
    }
    load()
  }, [clusterId])

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <p className='text-gray-400 text-sm'>Loading...</p>
      </div>
    )
  }

  if (notFound || !cluster) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-xl font-bold text-gray-900 mb-2'>Opportunity not found</h1>
          <p className='text-gray-500 text-sm mb-4'>This opportunity may have been removed or doesn&apos;t exist.</p>
          <Link href='/opportunities' className='text-indigo-600 hover:text-indigo-700 text-sm font-medium'>
            Back to Opportunities
          </Link>
        </div>
      </div>
    )
  }

  const workspaceId = '11111111-1111-1111-1111-111111111111' // TODO: from auth

  return <OpportunityDetail cluster={cluster} signals={signals} workspaceId={workspaceId} />
}
