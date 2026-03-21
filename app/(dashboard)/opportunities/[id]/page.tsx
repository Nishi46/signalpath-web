'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OpportunityDetail } from '@/components/OpportunityDetail'

interface ClusterDetail {
  id: string
  label: string
  score: number
  signal_count: number
  churn_count: number
  frequency_score: number
  recency_score: number
  churn_score: number
}

interface Signal {
  id: string
  body: string
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
      const { data: clusterData } = await supabase
        .from('clusters')
        .select('id, label, score, signal_count, churn_count, frequency_score, recency_score, churn_score')
        .eq('id', clusterId)
        .single()

      if (!clusterData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: signalData } = await supabase
        .from('signals')
        .select('id, body, churn_flag, created_at')
        .eq('cluster_id', clusterId)
        .order('created_at', { ascending: false })
        .limit(10)

      setCluster(clusterData)
      setSignals(signalData ?? [])
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
          <a href='/opportunities' className='text-indigo-600 hover:text-indigo-700 text-sm font-medium'>
            Back to Opportunities
          </a>
        </div>
      </div>
    )
  }

  return <OpportunityDetail cluster={cluster} signals={signals} />
}
