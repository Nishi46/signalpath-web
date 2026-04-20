'use client'
import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'

interface ScorePoint {
  id: string
  score: number
  scoring_model: string
  revenue_source: string | null
  scored_at: string
}

interface ScoreHistoryChartProps {
  clusterId: string
}

function modelColor(model: string): string {
  if (model.startsWith('ml_')) return '#10b981' // emerald
  return '#3b82f6' // blue
}

function modelLabel(model: string): string {
  if (model === 'formula') return 'Formula'
  if (model.startsWith('ml_v')) return `ML v${model.slice(4)}`
  return model
}

export function ScoreHistoryChart({ clusterId }: ScoreHistoryChartProps) {
  const [history, setHistory] = useState<ScorePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/clusters/${encodeURIComponent(clusterId)}/score-history?limit=30`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.history) setHistory(data.history)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clusterId])

  if (loading) {
    return <div className='h-16 bg-white/[0.04] rounded-xl animate-pulse' />
  }

  if (history.length < 2) {
    return (
      <p className='text-xs text-white/30'>
        Score history will appear after the next pipeline run.
      </p>
    )
  }

  // SVG sparkline
  const W = 280
  const H = 56
  const PAD = 6

  const scores = history.map(p => p.score)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const range = maxScore - minScore || 1

  const pts = history.map((p, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((p.score - minScore) / range) * (H - PAD * 2)
    return { x, y, point: p }
  })

  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Detect model transitions
  const transitions: Array<{ x: number; model: string }> = []
  pts.forEach((p, i) => {
    if (i === 0 || p.point.scoring_model !== pts[i - 1].point.scoring_model) {
      transitions.push({ x: p.x, model: p.point.scoring_model })
    }
  })

  const last = history[history.length - 1]

  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <span className='text-xs text-white/40 font-medium flex items-center gap-1.5'>
          <TrendingUp className='w-3.5 h-3.5 text-white/25' />
          Score history ({history.length} runs)
        </span>
        <div className='flex items-center gap-1.5'>
          <span
            className='inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full'
            style={{
              backgroundColor: last.scoring_model.startsWith('ml_') ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
              color: last.scoring_model.startsWith('ml_') ? '#34d399' : '#60a5fa',
            }}
          >
            {modelLabel(last.scoring_model)}
          </span>
          {last.revenue_source === 'crm' && (
            <span className='text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium'>
              CRM revenue
            </span>
          )}
        </div>
      </div>

      <div className='relative bg-white/[0.04] rounded-xl p-2 overflow-hidden'>
        <svg width='100%' viewBox={`0 0 ${W} ${H}`} preserveAspectRatio='none'>
          {/* Model transition vertical lines */}
          {transitions.slice(1).map((t, i) => (
            <line
              key={i}
              x1={t.x}
              y1={0}
              x2={t.x}
              y2={H}
              stroke={modelColor(t.model)}
              strokeWidth='1'
              strokeDasharray='3 2'
              opacity='0.4'
            />
          ))}

          {/* Score line */}
          <polyline
            points={polyline}
            fill='none'
            stroke={modelColor(last.scoring_model)}
            strokeWidth='2'
            strokeLinejoin='round'
            strokeLinecap='round'
          />

          {/* Dots */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r='2.5'
              fill={modelColor(p.point.scoring_model)}
            />
          ))}
        </svg>

        {/* Min/max labels */}
        <div className='flex justify-between mt-1 px-1'>
          <span className='text-[10px] text-white/30'>
            {new Date(history[0].scored_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className='text-[10px] text-white/30'>
            {new Date(last.scored_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Legend for model transitions */}
      {transitions.length > 1 && (
        <div className='flex flex-wrap gap-3 mt-2'>
          {transitions.map((t, i) => (
            <span key={i} className='flex items-center gap-1 text-[10px] text-white/35'>
              <span
                className='inline-block w-2 h-2 rounded-full'
                style={{ backgroundColor: modelColor(t.model) }}
              />
              {modelLabel(t.model)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
