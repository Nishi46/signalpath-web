'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  GitPullRequest,
  GitMerge,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

interface PRFeedItem {
  pr_number: number
  pr_title: string
  pr_state: 'open' | 'merged'
  author_login: string
  merged_at: string | null
  created_at: string
  html_url: string
  head_branch: string
  relevance_score: number
}

interface PRFeedData {
  prs: PRFeedItem[]
  repo_full_name: string | null
  last_synced_at: string | null
  total: number
}

interface PRFeedPanelProps {
  clusterId: string
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHrs / 24)
  if (diffHrs < 1) return 'just now'
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function relevanceBadgeClass(score: number): string {
  if (score >= 0.70) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40'
  if (score >= 0.50) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40'
  return 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40 border border-gray-200 dark:border-white/[0.08]'
}

function relevanceLabel(score: number): string {
  if (score >= 0.70) return 'High match'
  if (score >= 0.50) return 'Possible'
  return 'Low'
}

export function PRFeedPanel({ clusterId }: PRFeedPanelProps) {
  const [data, setData] = useState<PRFeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const loadPRs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(clusterId)}/prs`)
      if (!res.ok) throw new Error('Failed to load PR feed')
      const json: PRFeedData = await res.json()
      setData(json)
    } catch {
      setError('Could not load GitHub activity.')
    } finally {
      setLoading(false)
    }
  }, [clusterId])

  useEffect(() => {
    void loadPRs()
  }, [loadPRs])

  if (collapsed) {
    return (
      <div className='w-10 flex-shrink-0 border border-gray-100 dark:border-white/[0.07] rounded-2xl bg-white dark:bg-[#1A1D24] overflow-hidden'>
        <button
          onClick={() => setCollapsed(false)}
          className='w-full h-full flex items-center justify-center py-6 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors'
          title='Show PR activity'
        >
          <span
            className='text-[10px] font-medium tracking-widest uppercase'
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            PR Activity
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className='w-72 flex-shrink-0 border border-gray-100 dark:border-white/[0.07] rounded-2xl bg-white dark:bg-[#1A1D24] overflow-hidden flex flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]'>
        <div className='flex items-center gap-2'>
          <GitPullRequest className='w-4 h-4 text-gray-400 dark:text-white/30' />
          <span className='text-sm font-medium text-gray-700 dark:text-white/70'>Recent PRs</span>
          {data && data.total > 0 && (
            <span className='text-xs font-mono bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40 rounded-full px-2 py-0.5'>
              {data.total}
            </span>
          )}
        </div>
        <div className='flex items-center gap-1'>
          {!loading && (
            <button
              onClick={loadPRs}
              className='p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors'
              title='Refresh'
            >
              <RefreshCw className='w-3.5 h-3.5' />
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className='p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors'
            title='Collapse'
          >
            <ChevronRight className='w-4 h-4 rotate-90' />
          </button>
        </div>
      </div>

      {/* Repo label */}
      {data?.repo_full_name && (
        <div className='px-4 py-1.5 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.05]'>
          <span className='text-xs font-mono text-gray-400 dark:text-white/25 truncate block'>
            {data.repo_full_name}
          </span>
        </div>
      )}

      {/* Content */}
      <div className='flex-1 overflow-y-auto'>
        {loading && (
          <div className='flex flex-col gap-3 p-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='animate-pulse'>
                <div className='h-3 bg-gray-100 dark:bg-white/[0.06] rounded w-3/4 mb-2' />
                <div className='h-2 bg-gray-100 dark:bg-white/[0.04] rounded w-1/2' />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className='p-4 text-center'>
            <p className='text-xs text-gray-400 dark:text-white/30'>{error}</p>
            <button
              onClick={loadPRs}
              className='mt-2 text-xs text-blue-500 dark:text-blue-400 hover:underline'
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && data && data.total === 0 && (
          <div className='p-6 text-center'>
            <GitPullRequest className='w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2' />
            <p className='text-xs text-gray-400 dark:text-white/30'>No closely related PRs found</p>
            <p className='text-xs text-gray-300 dark:text-white/20 mt-1'>Syncs every 15 minutes</p>
          </div>
        )}

        {!loading && !error && data && data.prs.length > 0 && (
          <ul className='divide-y divide-gray-50 dark:divide-white/[0.04]'>
            {data.prs.map((pr) => (
              <li
                key={pr.pr_number}
                className='px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group'
              >
                {/*
                  rel="noopener noreferrer" prevents the opened tab from accessing
                  window.opener and stops Referer leakage to GitHub.
                */}
                <a
                  href={pr.html_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block'
                >
                  {/* State + number + badge + external icon */}
                  <div className='flex items-center gap-1.5 mb-1'>
                    {pr.pr_state === 'merged' ? (
                      <GitMerge className='w-3.5 h-3.5 text-violet-500 dark:text-violet-400 flex-shrink-0' />
                    ) : (
                      <GitPullRequest className='w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0' />
                    )}
                    <span className='text-xs text-gray-400 dark:text-white/30 font-mono'>
                      #{pr.pr_number}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${relevanceBadgeClass(pr.relevance_score)}`}>
                      {relevanceLabel(pr.relevance_score)}
                    </span>
                    <ExternalLink className='w-3 h-3 text-gray-300 dark:text-white/20 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
                  </div>

                  {/* PR title */}
                  <p className='text-sm text-gray-800 dark:text-white/80 leading-snug line-clamp-2 mb-1.5'>
                    {pr.pr_title}
                  </p>

                  {/* Author + time */}
                  <div className='flex items-center gap-1.5'>
                    <div className='w-4 h-4 rounded-full bg-gray-200 dark:bg-white/[0.10] flex items-center justify-center flex-shrink-0'>
                      <span className='text-[9px] text-gray-500 dark:text-white/50 font-medium uppercase'>
                        {pr.author_login.charAt(0)}
                      </span>
                    </div>
                    <span className='text-xs text-gray-500 dark:text-white/40 truncate max-w-[80px]'>
                      {pr.author_login}
                    </span>
                    <span className='text-gray-300 dark:text-white/20 text-xs'>·</span>
                    <span className='text-xs text-gray-400 dark:text-white/30'>
                      {pr.pr_state === 'merged' && pr.merged_at
                        ? `merged ${timeAgo(pr.merged_at)}`
                        : `opened ${timeAgo(pr.created_at)}`}
                    </span>
                  </div>

                  {/* Branch name */}
                  <div className='mt-1.5'>
                    <span className='text-xs font-mono text-gray-400 dark:text-white/25 bg-gray-100 dark:bg-white/[0.05] px-1.5 py-0.5 rounded truncate block max-w-full'>
                      {pr.head_branch}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: last synced */}
      {data?.last_synced_at && (
        <div className='px-4 py-2 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]'>
          <p className='text-xs text-gray-400 dark:text-white/25'>
            Synced {timeAgo(data.last_synced_at)}
          </p>
        </div>
      )}
    </div>
  )
}
