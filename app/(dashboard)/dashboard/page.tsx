'use client'
import { useState, useEffect } from 'react'
import { DashboardNav } from '@/components/DashboardNav'
import Link from 'next/link'
import {
  TrendingUp,
  AlertTriangle,
  Star,
  Brain,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  BarChart3,
} from 'lucide-react'

interface DashboardStats {
  total_opportunities: number
  total_revenue_at_risk: number
  churn_risk_count: number
  rated_count: number
  new_this_week: number
  new_last_week: number
  ml_stats: {
    labeled_cluster_count: number
    ml_ready: boolean
    ml_model_version: number
    labels_needed: number
  }
  top_opportunities: {
    id: string
    label: string
    opportunity_score: number
    churn_signal_count: number
    revenue_at_risk_usd: number | null
    confidence: string | null
  }[]
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

function WeekTrend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className='text-xs text-gray-400'>No data</span>
  const delta = current - previous
  if (delta === 0) return (
    <span className='flex items-center gap-0.5 text-xs text-gray-400'>
      <Minus className='w-3 h-3' /> Same as last week
    </span>
  )
  const pct = previous > 0 ? Math.round(Math.abs(delta / previous) * 100) : 100
  return delta > 0 ? (
    <span className='flex items-center gap-0.5 text-xs text-emerald-600'>
      <ArrowUp className='w-3 h-3' />{pct}% vs last week
    </span>
  ) : (
    <span className='flex items-center gap-0.5 text-xs text-red-500'>
      <ArrowDown className='w-3 h-3' />{pct}% vs last week
    </span>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard-stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <DashboardNav />
        <div className='max-w-6xl mx-auto px-6 py-10'>
          <div className='h-7 bg-gray-200 rounded w-48 animate-pulse mb-8' />
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8'>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className='bg-white rounded-2xl border border-gray-200 p-6 animate-pulse'>
                <div className='h-3 bg-gray-100 rounded w-24 mb-3' />
                <div className='h-8 bg-gray-200 rounded w-20 mb-2' />
                <div className='h-3 bg-gray-100 rounded w-28' />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const ml = stats?.ml_stats
  const mlProgress = Math.min(((ml?.labeled_cluster_count ?? 0) / 50) * 100, 100)

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='max-w-6xl mx-auto px-6 py-10'>
        <div className='mb-8'>
          <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
          <p className='text-gray-500 text-sm mt-1'>Workspace overview</p>
        </div>

        {/* Stat cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8'>
          <div className='bg-white rounded-2xl border border-gray-200 p-6'>
            <div className='flex items-center gap-2 text-xs font-medium text-gray-500 mb-3'>
              <BarChart3 className='w-3.5 h-3.5' />
              Total opportunities
            </div>
            <div className='text-3xl font-bold text-gray-900 mb-2'>{stats?.total_opportunities ?? 0}</div>
            <WeekTrend current={stats?.new_this_week ?? 0} previous={stats?.new_last_week ?? 0} />
          </div>

          <div className='bg-white rounded-2xl border border-gray-200 p-6'>
            <div className='flex items-center gap-2 text-xs font-medium text-gray-500 mb-3'>
              <DollarSign className='w-3.5 h-3.5' />
              Revenue at risk
            </div>
            <div className='text-3xl font-bold text-emerald-600 mb-2'>
              {formatRevenue(stats?.total_revenue_at_risk ?? 0)}
            </div>
            <p className='text-xs text-gray-400'>across all opportunities</p>
          </div>

          <div className='bg-white rounded-2xl border border-gray-200 p-6'>
            <div className='flex items-center gap-2 text-xs font-medium text-gray-500 mb-3'>
              <AlertTriangle className='w-3.5 h-3.5' />
              Churn risks
            </div>
            <div className='text-3xl font-bold text-red-600 mb-2'>{stats?.churn_risk_count ?? 0}</div>
            <p className='text-xs text-gray-400'>with churn signals</p>
          </div>

          <div className='bg-white rounded-2xl border border-gray-200 p-6'>
            <div className='flex items-center gap-2 text-xs font-medium text-gray-500 mb-3'>
              <Star className='w-3.5 h-3.5' />
              Rated
            </div>
            <div className='text-3xl font-bold text-gray-900 mb-2'>{stats?.rated_count ?? 0}</div>
            <p className='text-xs text-gray-400'>
              of {stats?.total_opportunities ?? 0} total
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* ML Model status */}
          <div className='bg-white rounded-2xl border border-gray-200 p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-sm font-semibold text-gray-900 flex items-center gap-2'>
                <Brain className='w-4 h-4 text-blue-500' />
                Personalized model
              </h2>
              {(ml?.ml_model_version ?? 0) > 0 ? (
                <span className='text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full'>
                  Active — v{ml!.ml_model_version}
                </span>
              ) : ml?.ml_ready ? (
                <span className='text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full'>
                  Ready to train
                </span>
              ) : (
                <span className='text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full'>
                  Needs labels
                </span>
              )}
            </div>
            <div className='mb-2 flex justify-between text-xs text-gray-500'>
              <span>{ml?.labeled_cluster_count ?? 0} ratings collected</span>
              <span>{ml?.labels_needed ?? 50} to go</span>
            </div>
            <div className='w-full bg-gray-100 rounded-full h-2 mb-3'>
              <div
                className='h-2 rounded-full bg-blue-500 transition-all duration-500'
                style={{ width: `${mlProgress}%` }}
              />
            </div>
            <p className='text-xs text-gray-400'>
              {mlProgress >= 100
                ? 'Threshold reached. Model retrains automatically after every 10 new ratings.'
                : `Rate ${ml?.labels_needed ?? 50} more opportunities to unlock the personalized model.`}
            </p>
            <Link
              href='/opportunities'
              className='mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700'
            >
              Rate opportunities <ArrowRight className='w-3 h-3' />
            </Link>
          </div>

          {/* Top opportunities */}
          <div className='bg-white rounded-2xl border border-gray-200 p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-sm font-semibold text-gray-900 flex items-center gap-2'>
                <TrendingUp className='w-4 h-4 text-blue-500' />
                Top unrated
              </h2>
              <Link
                href='/opportunities'
                className='text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1'
              >
                See all <ArrowRight className='w-3 h-3' />
              </Link>
            </div>
            {(stats?.top_opportunities?.length ?? 0) === 0 ? (
              <p className='text-sm text-gray-400'>All opportunities have been rated.</p>
            ) : (
              <div className='space-y-1'>
                {stats!.top_opportunities.map(opp => (
                  <Link
                    key={opp.id}
                    href={`/opportunities/${opp.id}`}
                    className='flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors -mx-2 group'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors'>
                        {opp.label}
                      </p>
                      <div className='flex items-center gap-3 mt-0.5'>
                        {opp.churn_signal_count > 0 && (
                          <span className='text-xs text-red-500 flex items-center gap-0.5'>
                            <AlertTriangle className='w-3 h-3' />
                            {opp.churn_signal_count} churn
                          </span>
                        )}
                        {opp.revenue_at_risk_usd ? (
                          <span className='text-xs text-emerald-600'>
                            {formatRevenue(opp.revenue_at_risk_usd)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className='shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center'>
                      <span className='text-sm font-bold text-blue-700'>
                        {opp.opportunity_score.toFixed(1)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
