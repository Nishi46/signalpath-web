'use client'

function getScoreStyle(score: number) {
  if (score >= 8) return 'bg-red-50 text-red-700 ring-red-200/60'
  if (score >= 6) return 'bg-amber-50 text-amber-700 ring-amber-200/60'
  if (score >= 4) return 'bg-blue-50 text-blue-700 ring-blue-200/60'
  return 'bg-gray-50 text-gray-500 ring-gray-200/60'
}

function confidenceStyle(c: string | null | undefined) {
  if (!c) return 'text-gray-400 bg-gray-50 ring-gray-200/50'
  if (c === 'High') return 'text-emerald-700 bg-emerald-50 ring-emerald-200/60'
  if (c === 'Medium') return 'text-amber-700 bg-amber-50 ring-amber-200/60'
  return 'text-gray-600 bg-gray-100 ring-gray-200/60'
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
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 tabular-nums ${getScoreStyle(s)}`}>
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
