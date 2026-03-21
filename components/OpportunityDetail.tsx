'use client'
import { ScoreBadge } from './ScoreBadge'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

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

interface OpportunityDetailProps {
  cluster: ClusterDetail
  signals: Signal[]
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.min((score / 10) * 100, 100)
  return (
    <div className='mb-3'>
      <div className='flex justify-between text-xs mb-1'>
        <span className='text-gray-600 font-medium'>{label}</span>
        <span className='text-gray-500'>{score.toFixed(1)} / 10</span>
      </div>
      <div className='w-full bg-gray-100 rounded-full h-2'>
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function OpportunityDetail({ cluster, signals }: OpportunityDetailProps) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <a href='/opportunities' className='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6'>
          <ArrowLeft className='w-4 h-4' /> Back to Opportunities
        </a>

        {/* Header */}
        <div className='bg-white rounded-xl border border-gray-200 p-6 mb-6'>
          <div className='flex items-start justify-between gap-4 mb-6'>
            <h1 className='text-xl font-bold text-gray-900'>{cluster.label}</h1>
            <ScoreBadge score={cluster.score} />
          </div>

          <div className='flex gap-4 text-sm text-gray-500 mb-6'>
            <span>{cluster.signal_count} tickets</span>
            {cluster.churn_count > 0 && (
              <span className='text-red-500'>{cluster.churn_count} churn signals</span>
            )}
          </div>

          {/* Score breakdown */}
          <div className='border-t border-gray-100 pt-5'>
            <h2 className='text-sm font-semibold text-gray-900 mb-4'>Score Breakdown</h2>
            <ScoreBar label='Frequency' score={cluster.frequency_score} color='bg-blue-500' />
            <ScoreBar label='Recency' score={cluster.recency_score} color='bg-amber-500' />
            <ScoreBar label='Churn Correlation' score={cluster.churn_score} color='bg-red-500' />
          </div>
        </div>

        {/* Push buttons */}
        <div className='flex gap-3 mb-6'>
          <button
            disabled
            className='flex-1 bg-indigo-600 text-white font-medium py-3 rounded-xl text-sm opacity-50 cursor-not-allowed'
          >
            Push to Linear
          </button>
          <button
            disabled
            className='flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl text-sm opacity-50 cursor-not-allowed'
          >
            Push to Jira
          </button>
        </div>

        {/* Evidence */}
        <div className='bg-white rounded-xl border border-gray-200 p-6'>
          <h2 className='text-sm font-semibold text-gray-900 mb-4'>
            Evidence ({signals.length} tickets)
          </h2>
          {signals.length === 0 ? (
            <p className='text-gray-400 text-sm'>No ticket evidence available yet.</p>
          ) : (
            <div className='space-y-4'>
              {signals.map(signal => (
                <div key={signal.id} className='border-b border-gray-50 pb-4 last:border-0 last:pb-0'>
                  <div className='flex items-center gap-2 mb-1.5'>
                    <span className='text-xs text-gray-400'>
                      {new Date(signal.created_at).toLocaleDateString()}
                    </span>
                    {signal.churn_flag && (
                      <span className='inline-flex items-center gap-1 text-xs text-red-500'>
                        <AlertTriangle className='w-3 h-3' /> Churn signal
                      </span>
                    )}
                  </div>
                  <p className='text-sm text-gray-700 leading-relaxed'>
                    {signal.body.length > 200 ? signal.body.slice(0, 200) + '...' : signal.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
