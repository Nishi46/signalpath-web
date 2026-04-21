'use client'
import { CheckCircle2, Circle } from 'lucide-react'

interface ChecklistStep {
  label: string
  done: boolean
}

interface OnboardingChecklistProps {
  zendeskConnected: boolean
  hasClusters: boolean
  ratedCount: number
  pushed: boolean
  mlActive: boolean
  onDismiss: () => void
}

export function OnboardingChecklist({
  zendeskConnected,
  hasClusters,
  ratedCount,
  pushed,
  mlActive,
  onDismiss,
}: OnboardingChecklistProps) {
  const steps: ChecklistStep[] = [
    { label: 'Connect Zendesk',                        done: zendeskConnected },
    { label: 'First pipeline run complete',             done: hasClusters },
    { label: `Rate 5 opportunities (${Math.min(ratedCount, 5)}/5)`, done: ratedCount >= 5 },
    { label: 'Push a ticket to Linear or Jira',        done: pushed },
    { label: 'Personalized scoring model active',      done: mlActive },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  if (allDone) return null

  return (
    <div className='bg-white dark:bg-[#1A1D24] border border-blue-500/15 rounded-2xl p-5 mb-6 relative'>
      <div className='flex items-start justify-between mb-4'>
        <div>
          <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>Getting started</h3>
          <p className='text-xs text-gray-500 dark:text-white/40 mt-0.5'>{completedCount} of {steps.length} steps complete</p>
        </div>
        <button
          onClick={onDismiss}
          className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-500 dark:text-white/60 transition-colors'
        >
          Dismiss
        </button>
      </div>
      <div className='w-full bg-gray-100 dark:bg-white/[0.07] rounded-full h-1 mb-4'>
        <div
          className='bg-blue-500 h-1 rounded-full transition-all duration-500'
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>
      <ul className='space-y-2'>
        {steps.map(step => (
          <li key={step.label} className='flex items-center gap-2.5'>
            {step.done
              ? <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
              : <Circle className='w-4 h-4 text-gray-300 dark:text-white/20 shrink-0' />}
            <span className={`text-xs ${step.done ? 'text-gray-400 dark:text-white/25 line-through' : 'text-gray-500 dark:text-white/60'}`}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
