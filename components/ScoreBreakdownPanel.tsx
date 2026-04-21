'use client'
import { Users, ShieldAlert, TrendingUp, Clock, MessageSquare, DollarSign } from 'lucide-react'

const DIMENSIONS = [
  { key: 'dimension_b', label: 'Account Breadth (B)', formulaWeight: 0.25, icon: Users,        color: 'bg-purple-500' },
  { key: 'dimension_s', label: 'Severity (S)',         formulaWeight: 0.20, icon: ShieldAlert,  color: 'bg-orange-500' },
  { key: 'dimension_c', label: 'Churn & Competitive (C)', formulaWeight: 0.15, icon: TrendingUp, color: 'bg-red-500' },
  { key: 'dimension_r', label: 'Recency (R)',           formulaWeight: 0.15, icon: Clock,        color: 'bg-amber-500' },
  { key: 'dimension_f', label: 'Frequency (F)',         formulaWeight: 0.10, icon: MessageSquare, color: 'bg-blue-500' },
  { key: 'dimension_v', label: 'Revenue at Risk (V)',   formulaWeight: 0.15, icon: DollarSign,  color: 'bg-emerald-500' },
] as const

type DimKey = (typeof DIMENSIONS)[number]['key']

type ClusterDims = {
  [K in DimKey]?: number | null
}

export interface ScoreHistoryEntry {
  id?: string
  score: number
  scoring_model?: string
  revenue_source?: string | null
  dimension_b?: number | null
  dimension_s?: number | null
  dimension_c?: number | null
  dimension_r?: number | null
  dimension_f?: number | null
  dimension_v?: number | null
  scored_at: string
  [key: string]: number | string | null | undefined
}

interface ScoreBreakdownPanelProps {
  cluster: ClusterDims
  mlModelVersion?: number | null
  scoreHistory?: ScoreHistoryEntry[]
}

function whatChangedTooltip(
  cluster: ClusterDims,
  scoreHistory: ScoreHistoryEntry[],
): string | null {
  if (scoreHistory.length < 2) return null
  const prev = scoreHistory[scoreHistory.length - 2]

  let bestKey: DimKey | null = null
  let bestDelta = 0

  for (const dim of DIMENSIONS) {
    const current = cluster[dim.key] ?? 0
    const prevVal = typeof prev[dim.key] === 'number' ? (prev[dim.key] as number) : 0
    const delta = current - prevVal
    if (Math.abs(delta) > bestDelta) {
      bestDelta = Math.abs(delta)
      bestKey = dim.key
    }
  }

  if (!bestKey || bestDelta <= 0.5) return 'Score unchanged since last run.'

  const dimLabel = DIMENSIONS.find(d => d.key === bestKey)!.label
  const current = cluster[bestKey] ?? 0
  const prevVal = typeof prev[bestKey] === 'number' ? (prev[bestKey] as number) : 0
  const delta = current - prevVal
  const direction = delta > 0 ? 'increased' : 'decreased'
  return `${dimLabel} ${direction} by ${Math.abs(delta).toFixed(1)} points · this drove the score ${delta > 0 ? 'up' : 'down'}.`
}

export function ScoreBreakdownPanel({ cluster, mlModelVersion, scoreHistory = [] }: ScoreBreakdownPanelProps) {
  const isML = (mlModelVersion ?? 0) > 0
  const tooltip = whatChangedTooltip(cluster, scoreHistory)

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>Score dimensions (0–10)</h2>
        {isML && (
          <span className='text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full'>
            ML weights active
          </span>
        )}
      </div>

      {tooltip && (
        <div className='mb-4 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg'>
          <p className='text-xs text-blue-300'>{tooltip}</p>
        </div>
      )}

      {DIMENSIONS.map(({ key, label, formulaWeight, icon: Icon, color }) => {
        const v = Number.isFinite(cluster[key] ?? NaN) ? (cluster[key] as number) : 0
        const pct = Math.min((v / 10) * 100, 100)

        return (
          <div key={key} className='mb-4 last:mb-0'>
            <div className='flex justify-between text-sm mb-2'>
              <span className='text-gray-500 dark:text-white/60 font-medium flex items-center gap-1.5'>
                <Icon className='w-3.5 h-3.5 text-gray-400 dark:text-white/30' />
                {label}
              </span>
              <div className='flex items-center gap-2'>
                <span className='text-gray-900 dark:text-white font-semibold tabular-nums'>{v.toFixed(1)} / 10</span>
                <span className='text-[10px] text-gray-400 dark:text-white/30'>
                  {isML ? 'ML' : `${Math.round(formulaWeight * 100)}%`}
                </span>
              </div>
            </div>
            <div className='w-full bg-gray-100 dark:bg-white/[0.07] rounded-full h-2'>
              <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
