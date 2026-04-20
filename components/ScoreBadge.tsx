'use client'

function getScoreStyle(score: number) {
  if (score >= 8) return 'bg-orange-500/10 text-orange-400 ring-orange-500/20'
  if (score >= 6) return 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
  if (score >= 4) return 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
  return 'bg-white/[0.06] text-white/40 ring-white/10'
}

function confidenceStyle(c: string | null | undefined) {
  if (!c) return 'text-white/30 bg-white/[0.04] ring-white/10'
  if (c === 'High') return 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20'
  if (c === 'Medium') return 'text-amber-400 bg-amber-500/10 ring-amber-500/20'
  return 'text-white/40 bg-white/[0.06] ring-white/10'
}

export function ScoreBadge({
  score,
  confidence,
}: {
  score: number
  confidence?: string | null
}) {
  const s = score ?? 0
  return (
    <div className='flex flex-col items-end gap-1'>
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 tabular-nums font-mono ${getScoreStyle(s)}`}>
        {s.toFixed(1)}
      </span>
      {confidence && (
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ring-1 ${confidenceStyle(confidence)}`}>
          {confidence}
        </span>
      )}
    </div>
  )
}
