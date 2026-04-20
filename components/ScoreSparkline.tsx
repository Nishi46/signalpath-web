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

  const lineColor = delta > 0.5 ? '#10b981' : delta < -0.5 ? '#ef4444' : '#94a3b8'
  const showDelta = Math.abs(delta) >= 0.1

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
      {showDelta ? (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          delta > 0.5 ? 'bg-emerald-500/10 text-emerald-400' :
          delta < -0.5 ? 'bg-red-500/10 text-red-400' :
          'bg-white/[0.07] text-white/40'
        }`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
        </span>
      ) : (
        <span className='text-[10px] text-white/30'>Stable</span>
      )}
    </div>
  )
}
