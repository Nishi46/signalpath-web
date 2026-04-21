'use client'
import { useState, useEffect } from 'react'
import { DashboardNav } from '@/components/DashboardNav'
import Link from 'next/link'
import {
  TrendingUp,
  AlertTriangle,
  Brain,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  Layers,
  ThumbsUp,
  Zap,
  PlugZap,
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
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`
  return `$${amount}`
}

function scoreColor(score: number): { bg: string; text: string; ring: string } {
  if (score >= 7) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' }
  if (score >= 4) return { bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/20' }
  return { bg: 'bg-gray-100 dark:bg-white/[0.06]', text: 'text-gray-500 dark:text-white/40', ring: 'ring-white/10' }
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  sub?: React.ReactNode
  trend?: React.ReactNode
}) {
  return (
    <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-5 flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {trend}
      </div>
      <div>
        <p className='text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none'>{value}</p>
        <p className='text-xs font-medium text-gray-500 dark:text-white/40 mt-1.5'>{label}</p>
      </div>
      {sub && <div className='border-t border-gray-100 dark:border-white/[0.05] pt-2.5'>{sub}</div>}
    </div>
  )
}

function WeekBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  const delta = current - previous
  if (delta === 0) return (
    <span className='flex items-center gap-0.5 text-[11px] font-medium text-gray-500 dark:text-white/35 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full'>
      <Minus className='w-3 h-3' /> Same
    </span>
  )
  const pct = previous > 0 ? Math.round(Math.abs(delta / previous) * 100) : 100
  return delta > 0 ? (
    <span className='flex items-center gap-0.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full'>
      <ArrowUp className='w-3 h-3' />{pct}%
    </span>
  ) : (
    <span className='flex items-center gap-0.5 text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full'>
      <ArrowDown className='w-3 h-3' />{pct}%
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-5xl mx-auto px-6 py-10'>
        <div className='h-7 bg-gray-100 dark:bg-white/[0.08] rounded-lg w-36 animate-pulse mb-1' />
        <div className='h-4 bg-gray-100 dark:bg-white/[0.05] rounded w-48 animate-pulse mb-8' />
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-5 animate-pulse'>
              <div className='w-8 h-8 bg-gray-100 dark:bg-white/[0.08] rounded-xl mb-4' />
              <div className='h-7 bg-gray-100 dark:bg-white/[0.06] rounded w-16 mb-2' />
              <div className='h-3 bg-gray-50 dark:bg-white/[0.04] rounded w-24' />
            </div>
          ))}
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6 animate-pulse h-52' />
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6 animate-pulse h-52' />
        </div>
      </div>
    </div>
  )
}

function EmptyDashboard() {
  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-5xl mx-auto px-6 py-10'>
        <div className='mb-8'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Dashboard</h1>
          <p className='text-sm text-gray-500 dark:text-white/40 mt-1'>Your workspace overview</p>
        </div>
        <div className='bg-white dark:bg-[#1A1D24] border border-gray-100 dark:border-white/[0.07] rounded-2xl p-10 flex flex-col items-center text-center max-w-sm mx-auto'>
          <div className='w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4'>
            <PlugZap className='w-7 h-7 text-blue-400' />
          </div>
          <h2 className='text-base font-semibold text-gray-900 dark:text-white mb-2'>No data yet</h2>
          <p className='text-sm text-gray-500 dark:text-white/40 mb-6 leading-relaxed'>
            Connect Zendesk or Intercom to start surfacing product opportunities from your support conversations.
          </p>
          <Link
            href='/connect'
            className='inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-gray-900 dark:text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors'
          >
            Connect a data source <ArrowRight className='w-4 h-4' />
          </Link>
        </div>
      </div>
    </div>
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

  if (loading) return <LoadingSkeleton />
  if (!stats || stats.total_opportunities === 0) return <EmptyDashboard />

  const ml = stats.ml_stats
  const mlProgress = Math.min(((ml.labeled_cluster_count) / 50) * 100, 100)
  const unrated = Math.max(0, stats.total_opportunities - stats.rated_count)
  const isModelActive = ml.ml_model_version > 0

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-5xl mx-auto px-6 py-10'>

        {/* Header */}
        <div className='mb-7'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Dashboard</h1>
          <p className='text-sm text-gray-500 dark:text-white/40 mt-1'>Your workspace overview</p>
        </div>

        {/* Stat cards */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <StatCard
            icon={Layers}
            iconBg='bg-blue-500/10'
            iconColor='text-blue-400'
            label='Total opportunities'
            value={stats.total_opportunities}
            trend={<WeekBadge current={stats.new_this_week} previous={stats.new_last_week} />}
            sub={
              <p className='text-xs text-gray-400 dark:text-white/30'>
                <span className='font-medium text-gray-500 dark:text-white/55'>{stats.new_this_week}</span> new this week
              </p>
            }
          />

          <StatCard
            icon={DollarSign}
            iconBg='bg-emerald-500/10'
            iconColor='text-emerald-400'
            label='Revenue at risk'
            value={formatRevenue(stats.total_revenue_at_risk)}
            sub={<p className='text-xs text-gray-400 dark:text-white/30'>across all clusters</p>}
          />

          <StatCard
            icon={AlertTriangle}
            iconBg='bg-red-500/10'
            iconColor='text-red-400'
            label='Churn risks'
            value={stats.churn_risk_count}
            sub={
              stats.churn_risk_count > 0 ? (
                <Link
                  href='/opportunities?filter=churn'
                  className='text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 transition-colors'
                >
                  Review now <ArrowRight className='w-3 h-3' />
                </Link>
              ) : (
                <p className='text-xs text-gray-400 dark:text-white/30'>No churn signals</p>
              )
            }
          />

          <StatCard
            icon={ThumbsUp}
            iconBg='bg-violet-500/10'
            iconColor='text-violet-400'
            label='Rated'
            value={stats.rated_count}
            sub={
              <div className='flex items-center gap-2'>
                <div className='flex-1 bg-gray-100 dark:bg-white/[0.07] rounded-full h-1.5'>
                  <div
                    className='bg-violet-500 h-1.5 rounded-full transition-all duration-500'
                    style={{ width: `${Math.min((stats.rated_count / Math.max(stats.total_opportunities, 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className='text-[11px] text-gray-400 dark:text-white/30 shrink-0 tabular-nums'>
                  {unrated} left
                </span>
              </div>
            }
          />
        </div>

        {/* Lower panels */}
        <div className='grid grid-cols-1 lg:grid-cols-5 gap-5'>

          {/* Top opportunities — wider */}
          <div className='lg:col-span-3 bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] overflow-hidden'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]'>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                <TrendingUp className='w-4 h-4 text-blue-400' />
                Top unrated
              </h2>
              <Link
                href='/opportunities'
                className='text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors'
              >
                See all <ArrowRight className='w-3 h-3' />
              </Link>
            </div>

            {stats.top_opportunities.length === 0 ? (
              <div className='px-5 py-8 text-center'>
                <p className='text-sm text-gray-500 dark:text-white/40'>All opportunities have been rated.</p>
                <Link href='/opportunities' className='text-xs text-blue-400 mt-1 inline-block'>
                  View them →
                </Link>
              </div>
            ) : (
              <div className='divide-y divide-white/[0.04]'>
                {stats.top_opportunities.map((opp, idx) => {
                  const colors = scoreColor(opp.opportunity_score)
                  return (
                    <Link
                      key={opp.id}
                      href={`/opportunities/${opp.id}`}
                      className='flex items-center gap-3.5 px-5 py-3.5 hover:bg-gray-50 dark:bg-white/[0.03] transition-colors group'
                    >
                      <span className='text-xs font-bold text-gray-300 dark:text-white/20 w-4 shrink-0 tabular-nums'>
                        {idx + 1}
                      </span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-800 dark:text-white/85 truncate group-hover:text-white transition-colors'>
                          {opp.label}
                        </p>
                        <div className='flex items-center gap-2.5 mt-0.5'>
                          {opp.churn_signal_count > 0 && (
                            <span className='flex items-center gap-0.5 text-[11px] text-orange-400/80 font-medium'>
                              <AlertTriangle className='w-3 h-3' />
                              {opp.churn_signal_count} churn
                            </span>
                          )}
                          {opp.revenue_at_risk_usd != null && opp.revenue_at_risk_usd > 0 && (
                            <span className='text-[11px] text-emerald-400/80 font-medium'>
                              {formatRevenue(opp.revenue_at_risk_usd)}
                            </span>
                          )}
                          {opp.confidence && (
                            <span className='text-[11px] text-gray-400 dark:text-white/25'>{opp.confidence} confidence</span>
                          )}
                        </div>
                      </div>
                      <div className={`shrink-0 w-10 h-10 rounded-xl ring-1 ${colors.bg} ${colors.ring} flex items-center justify-center`}>
                        <span className={`text-sm font-bold font-mono ${colors.text} tabular-nums`}>
                          {opp.opportunity_score.toFixed(1)}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className='lg:col-span-2 flex flex-col gap-5'>

            {/* ML Model */}
            <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] overflow-hidden'>
              <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]'>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                  <Brain className='w-4 h-4 text-violet-400' />
                  Scoring model
                </h2>
                {isModelActive ? (
                  <span className='flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full'>
                    <Zap className='w-3 h-3' /> Active
                  </span>
                ) : ml.ml_ready ? (
                  <span className='text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full'>
                    Training
                  </span>
                ) : (
                  <span className='text-[11px] font-medium text-gray-500 dark:text-white/35 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full'>
                    Learning
                  </span>
                )}
              </div>
              <div className='px-5 py-4'>
                {isModelActive ? (
                  <div className='space-y-3'>
                    <p className='text-xs text-gray-500 dark:text-white/40 leading-relaxed'>
                      Opportunities are scored using your team&apos;s rating history. Retrains every 10 new ratings.
                    </p>
                    <div className='flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/[0.04] rounded-xl text-xs'>
                      <span className='text-gray-500 dark:text-white/40'>Ratings used</span>
                      <span className='font-semibold text-gray-600 dark:text-white/70 tabular-nums'>{ml.labeled_cluster_count}</span>
                    </div>
                    <div className='flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/[0.04] rounded-xl text-xs'>
                      <span className='text-gray-500 dark:text-white/40'>Model version</span>
                      <span className='font-semibold text-gray-600 dark:text-white/70'>v{ml.ml_model_version}</span>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <div className='flex items-end justify-between'>
                      <span className='text-2xl font-bold text-gray-900 dark:text-white tabular-nums'>
                        {ml.labeled_cluster_count}
                        <span className='text-sm font-normal text-gray-400 dark:text-white/30 ml-1'>/ 50</span>
                      </span>
                      <span className='text-xs text-gray-400 dark:text-white/30 mb-1'>{ml.labels_needed} to go</span>
                    </div>
                    <div className='w-full bg-gray-100 dark:bg-white/[0.07] rounded-full h-1.5'>
                      <div
                        className='bg-violet-500 h-1.5 rounded-full transition-all duration-700'
                        style={{ width: `${mlProgress}%` }}
                      />
                    </div>
                    <p className='text-xs text-gray-500 dark:text-white/35 leading-relaxed'>
                      Rate opportunities to unlock personalized scoring tailored to your team.
                    </p>
                    <Link
                      href='/opportunities'
                      className='flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors'
                    >
                      Rate now <ArrowRight className='w-3 h-3' />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats summary */}
            <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-5'>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>This week</h2>
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-gray-500 dark:text-white/40'>New opportunities</span>
                  <span className='font-semibold text-gray-600 dark:text-white/70 tabular-nums'>{stats.new_this_week}</span>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-gray-500 dark:text-white/40'>Last week</span>
                  <span className='font-semibold text-gray-600 dark:text-white/70 tabular-nums'>{stats.new_last_week}</span>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-gray-500 dark:text-white/40'>Churn risks</span>
                  <span className={`font-semibold tabular-nums ${stats.churn_risk_count > 0 ? 'text-red-400' : 'text-gray-600 dark:text-white/70'}`}>
                    {stats.churn_risk_count}
                  </span>
                </div>
                <div className='pt-1 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between text-xs'>
                  <span className='text-gray-500 dark:text-white/40'>Rated so far</span>
                  <span className='font-semibold text-gray-600 dark:text-white/70 tabular-nums'>
                    {stats.rated_count} / {stats.total_opportunities}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
