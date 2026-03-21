'use client'

function getScoreColor(score: number) {
  if (score >= 8) return 'bg-red-100 text-red-700 border-red-200'
  if (score >= 6) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (score >= 4) return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

export function ScoreBadge({ score }: { score: number }) {
  const s = score ?? 0
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border ${getScoreColor(s)}`}>
      {s.toFixed(1)}
    </span>
  )
}
