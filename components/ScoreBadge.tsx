'use client'

function getScoreStyle(score: number) {
  if (score >= 8) return 'bg-red-50 text-red-700 ring-red-200/60'
  if (score >= 6) return 'bg-amber-50 text-amber-700 ring-amber-200/60'
  if (score >= 4) return 'bg-blue-50 text-blue-700 ring-blue-200/60'
  return 'bg-gray-50 text-gray-500 ring-gray-200/60'
}

export function ScoreBadge({ score }: { score: number }) {
  const s = score ?? 0
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 tabular-nums ${getScoreStyle(s)}`}>
      {s.toFixed(1)}
    </span>
  )
}
