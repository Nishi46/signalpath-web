'use client'
import { useCallback, useEffect, useState } from 'react'
import { X, ThumbsUp, SkipForward, ChevronRight } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'
import { useToast } from '@/lib/toast-context'

interface Cluster {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  confidence?: string | null
}

interface TriageModalProps {
  clusters: Cluster[]
  labeledCount: number
  mlThreshold: number
  onClose: () => void
  onFeedback: (clusterId: string, action: string) => void
}

const ACTIONS = [
  { key: 'approve', label: 'Approve', shortcut: 'A', icon: ThumbsUp, color: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  { key: 'skip',    label: 'Skip',    shortcut: 'S', icon: SkipForward, color: 'bg-white/[0.08] hover:bg-white/[0.12] text-white/70' },
  { key: 'dismiss', label: 'Dismiss', shortcut: 'D', icon: X, color: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20' },
] as const

export function TriageModal({ clusters, labeledCount, mlThreshold, onClose, onFeedback }: TriageModalProps) {
  const toast = useToast()
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localCount, setLocalCount] = useState(labeledCount)

  const current = clusters[index]
  const progress = Math.min(Math.round((localCount / mlThreshold) * 100), 100)
  const remaining = Math.max(0, mlThreshold - localCount)

  const advance = useCallback(() => {
    if (index + 1 >= clusters.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }, [index, clusters.length])

  const handleAction = useCallback(async (action: 'approve' | 'skip' | 'dismiss') => {
    if (!current || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: current.id, action }),
      })
      if (!res.ok) throw new Error('Failed')
      onFeedback(current.id, action)
      setLocalCount(c => c + 1)
      advance()
    } catch {
      toast('Could not save — please try again', 'error')
    } finally {
      setBusy(false)
    }
  }, [current, busy, onFeedback, advance, toast])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'a' || e.key === 'A') { void handleAction('approve'); return }
      if (e.key === 's' || e.key === 'S') { void handleAction('skip'); return }
      if (e.key === 'd' || e.key === 'D') { void handleAction('dismiss'); return }
      if (e.key === 'ArrowRight') advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleAction, advance, onClose])

  return (
    <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'>
      <div className='bg-[#1A1D24] border border-white/[0.07] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.07]'>
          <div>
            <h2 className='text-sm font-semibold text-white'>Quick-rate opportunities</h2>
            <p className='text-xs text-white/40 mt-0.5'>
              {done || index >= clusters.length
                ? 'All done for now!'
                : `${index + 1} of ${clusters.length}`}
            </p>
          </div>
          <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors'>
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* ML progress bar */}
        <div className='px-6 py-3 bg-white/[0.02] border-b border-white/[0.07]'>
          <div className='flex items-center justify-between text-xs text-white/40 mb-1.5'>
            <span>Ratings toward personalized model</span>
            <span className='font-medium text-white/60'>{localCount} / {mlThreshold}</span>
          </div>
          <div className='w-full bg-white/[0.07] rounded-full h-1.5'>
            <div
              className='bg-blue-500 h-1.5 rounded-full transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
          {remaining > 0 && (
            <p className='text-[10px] text-white/25 mt-1'>{remaining} ratings to unlock your personalized model</p>
          )}
        </div>

        {/* Content */}
        <div className='px-6 py-5 flex-1'>
          {done || !current ? (
            <div className='text-center py-8'>
              <div className='w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3'>
                <ThumbsUp className='w-6 h-6 text-emerald-400' />
              </div>
              <p className='text-sm font-semibold text-white mb-1'>You&apos;re all caught up!</p>
              <p className='text-xs text-white/40'>Come back after the next pipeline run for new opportunities to rate.</p>
            </div>
          ) : (
            <>
              <div className='flex items-start justify-between gap-3 mb-4'>
                <h3 className='text-base font-semibold text-white leading-snug'>{current.label}</h3>
                <ScoreBadge score={current.opportunity_score} confidence={current.confidence} />
              </div>
              <div className='flex items-center gap-4 text-xs text-white/40 mb-4'>
                <span>{current.signal_count} tickets</span>
                {current.churn_signal_count > 0 && (
                  <span className='text-orange-400'>{current.churn_signal_count} churn signals</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!done && current && (
          <div className='px-6 pb-5'>
            <div className='flex gap-2'>
              {ACTIONS.map(({ key, label, shortcut, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => void handleAction(key)}
                  disabled={busy}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${color}`}
                >
                  <Icon className='w-3.5 h-3.5' />
                  {label}
                  <span className='text-[10px] opacity-60 ml-0.5'>[{shortcut}]</span>
                </button>
              ))}
            </div>
            <button
              onClick={advance}
              className='w-full mt-2 flex items-center justify-center gap-1 text-xs text-white/30 hover:text-white/60 py-1.5 transition-colors'
            >
              Skip without rating <ChevronRight className='w-3.5 h-3.5' /> [→]
            </button>
          </div>
        )}

        {done && (
          <div className='px-6 pb-5'>
            <button
              onClick={onClose}
              className='w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-medium transition-colors'
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
