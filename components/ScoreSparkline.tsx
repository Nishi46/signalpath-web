'use client'

interface ScorePoint {
  score: number
  scored_at: string
  scoring_model?: string
}

interface ScoreSparklineProps {
  history: ScorePoint[]
}

export function ScoreSparkline({ history }: ScoreSparklineProps) {
  if (history.length < 2) return null

  const W = 120
  const H = 32
  const PAD = 3

  const scores = history.map(p => p.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = Math.max(max - min, 0.1) // guard against all-equal scores

  const pts = history.map((p, i) => {
    const x = PAD + (i / (history.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((p.score - min) / range) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const latest = history[history.length - 1].score
  const prev = history[history.length - 2].score
  const delta = latest - prev

  let badgeClass = 'bg-gray-100 text-gray-500'
  const deltaLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`
  if (delta > 0.5) badgeClass = 'bg-green-100 text-green-700'
  else if (delta < -0.5) badgeClass = 'bg-red-100 text-red-700'

  const lineColor = delta > 0.5 ? '#10b981' : delta < -0.5 ? '#ef4444' : '#94a3b8'

  return (
    <div className='flex items-center gap-2'>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <polyline
          points={pts.join(' ')}
          fill='none'
          stroke={lineColor}
          strokeWidth='1.5'
          strokeLinejoin='round'
          strokeLinecap='round'
        />
      </svg>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeClass}`}>
        {deltaLabel}
      </span>
    </div>
  )
}
