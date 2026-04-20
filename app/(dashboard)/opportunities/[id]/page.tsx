'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OpportunityDetail, type ClusterDetail } from '@/components/OpportunityDetail'
import { type ScoreHistoryEntry } from '@/components/ScoreBreakdownPanel'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardNav } from '@/components/DashboardNav'
import { useWorkspace } from '@/lib/hooks/use-workspace'

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
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
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
      setScoreHistory(data.score_history ?? [])
      setNotFound(false)
    } catch {
      setNotFound(true)
    }
    setLoading(false)
  }, [clusterId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates cluster state
    void load()
  }, [load])

  if (loading || wsLoading || !workspaceId) {
    return (
      <div className='min-h-screen bg-[#111318]'>
        <DashboardNav />
        <div className='max-w-3xl mx-auto px-6 py-10'>
          <div className='h-4 bg-white/[0.07] rounded w-32 mb-6 animate-pulse' />
          <div className='bg-[#1A1D24] rounded-2xl border border-white/[0.07] p-8 mb-6 animate-pulse'>
            <div className='flex items-start justify-between mb-6'>
              <div className='h-6 bg-white/[0.07] rounded w-2/3' />
              <div className='h-8 w-16 bg-white/[0.06] rounded-full' />
            </div>
            <div className='flex gap-6 mt-4 mb-8'>
              <div className='h-4 bg-white/[0.05] rounded w-24' />
              <div className='h-4 bg-white/[0.05] rounded w-32' />
              <div className='h-4 bg-white/[0.05] rounded w-28' />
            </div>
            <div className='border-t border-white/[0.06] pt-6 space-y-4'>
              <div className='h-8 bg-white/[0.05] rounded w-full' />
              <div className='h-8 bg-white/[0.05] rounded w-4/5' />
              <div className='h-8 bg-white/[0.05] rounded w-3/5' />
            </div>
          </div>
          <div className='bg-[#1A1D24] rounded-2xl border border-white/[0.07] p-8 animate-pulse'>
            <div className='h-5 bg-white/[0.07] rounded w-48 mb-5' />
            <div className='space-y-4'>
              {[1, 2, 3].map(i => (
                <div key={i} className='p-4 rounded-xl bg-white/[0.04]'>
                  <div className='h-3 bg-white/[0.07] rounded w-24 mb-3' />
                  <div className='h-4 bg-white/[0.05] rounded w-full mb-2' />
                  <div className='h-4 bg-white/[0.05] rounded w-3/4' />
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
      <div className='min-h-screen bg-[#111318]'>
        <DashboardNav />
        <div className='flex items-center justify-center mt-32'>
          <div className='text-center'>
            <h1 className='text-xl font-bold text-white mb-2'>Opportunity not found</h1>
            <p className='text-white/40 text-sm mb-4'>This opportunity may have been removed or doesn&apos;t exist.</p>
            <Link href='/opportunities' className='text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors'>
              Back to Opportunities
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <OpportunityDetail
        cluster={cluster}
        signals={signals}
        scoreHistory={scoreHistory}
        workspaceId={workspaceId}
        onRefresh={load}
      />
    </ErrorBoundary>
  )
}
