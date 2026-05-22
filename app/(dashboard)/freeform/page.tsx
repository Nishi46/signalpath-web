'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardNav } from '@/components/DashboardNav'
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'

const EXAMPLES = [
  'Add a pricing page with monthly/annual toggle and Stripe integration',
  'Refactor the auth module to support OAuth 2.0 PKCE flow',
  'Add CSV bulk import for the admin dashboard',
  'Build a white-label theming system for enterprise customers',
]

interface RepoInfo {
  status: 'none' | 'pending' | 'indexing' | 'ready' | 'failed' | 'stale'
  repo?: string
  last_indexed_at?: string | null
}

interface DesignChoice {
  id: string
  label: string
  description: string
}

interface DesignOption {
  category: string
  description: string
  choices: DesignChoice[]
}

interface Question {
  id: string
  text: string
  type: 'boolean' | 'radio' | 'text'
  options: string[]
}

interface PreflightData {
  design_options: DesignOption[]
  questions: Question[]
}

type Step = 'input' | 'preflight-loading' | 'preflight' | 'generating'

function hoursAgo(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)
}

function CodebaseIndicator({ repos }: { repos: RepoInfo[] | null }) {
  if (!repos) return null

  const ready = repos.filter(r => r.status === 'ready')
  const indexing = repos.filter(r => r.status === 'indexing' || r.status === 'pending')

  if (ready.length > 0) {
    const oldestHours = ready.reduce<number | null>((max, r) => {
      if (!r.last_indexed_at) return max
      const h = hoursAgo(r.last_indexed_at)
      return max === null ? h : Math.max(max, h)
    }, null)
    const isStale = oldestHours !== null && oldestHours > 24 * 5
    const repoNames = ready.map(r => r.repo).filter(Boolean).join(', ')
    const newestHours = ready.reduce<number | null>((min, r) => {
      if (!r.last_indexed_at) return min
      const h = hoursAgo(r.last_indexed_at)
      return min === null ? h : Math.min(min, h)
    }, null)

    if (isStale) {
      return (
        <p className='flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400'>
          <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' />
          Codebase index is stale (last indexed {oldestHours ? `${oldestHours}h` : 'unknown'} ago) —{' '}
          <a href='/connect/github' className='underline hover:no-underline'>Refresh index</a>
        </p>
      )
    }
    return (
      <p className='flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400'>
        <CheckCircle className='w-3.5 h-3.5 flex-shrink-0' />
        Codebase connected: {repoNames}{newestHours !== null && ` (last indexed ${newestHours < 1 ? '<1h' : `${newestHours}h`} ago)`}
        {' — '}<a href='/connect/github' className='underline hover:no-underline'>Add repo</a>
      </p>
    )
  }

  if (indexing.length > 0) {
    return (
      <p className='flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400'>
        <Loader2 className='w-3.5 h-3.5 flex-shrink-0 animate-spin' />
        Indexing codebase... spec will use results when ready.
      </p>
    )
  }

  return (
    <p className='flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/35'>
      <XCircle className='w-3.5 h-3.5 flex-shrink-0' />
      No codebase connected. Spec will use declared tech stack only. —{' '}
      <a href='/connect/github' className='underline hover:no-underline'>Connect GitHub</a>
    </p>
  )
}

function DesignOptionPicker({
  option,
  selected,
  onSelect,
}: {
  option: DesignOption
  selected: string | undefined
  onSelect: (choiceId: string) => void
}) {
  return (
    <div>
      <p className='text-xs font-semibold text-gray-700 dark:text-white/70 mb-0.5'>{option.category}</p>
      <p className='text-xs text-gray-400 dark:text-white/35 mb-2'>{option.description}</p>
      <div className='flex gap-2 flex-wrap'>
        {option.choices.map(choice => (
          <button
            key={choice.id}
            type='button'
            onClick={() => onSelect(choice.id)}
            className={`flex-1 min-w-[120px] text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
              selected === choice.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500'
                : 'border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-white/70 hover:border-blue-300 dark:hover:border-blue-500/40 hover:bg-gray-50 dark:hover:bg-white/[0.03]'
            }`}
          >
            <span className='block font-medium text-xs mb-0.5'>{choice.label}</span>
            <span className='block text-xs text-gray-400 dark:text-white/35 leading-snug'>{choice.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (val: string) => void
}) {
  if (question.type === 'text') {
    return (
      <div>
        <label className='block text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5'>{question.text}</label>
        <input
          type='text'
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={300}
          className='w-full text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors'
          placeholder='Optional'
        />
      </div>
    )
  }

  return (
    <div>
      <label className='block text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5'>{question.text}</label>
      <div className='flex gap-2 flex-wrap'>
        {question.options.map(opt => (
          <button
            key={opt}
            type='button'
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
              value === opt
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/60 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FreeformPage() {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [description, setDescription] = useState('')
  const [techStackOverride, setTechStackOverride] = useState('')
  const [complexityConstraint, setComplexityConstraint] = useState<'' | 'S' | 'M' | 'L'>('')
  const [targetAudience, setTargetAudience] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [step, setStep] = useState<Step>('input')
  const [preflightData, setPreflightData] = useState<PreflightData | null>(null)
  const [designChoices, setDesignChoices] = useState<Record<string, string>>({})
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({})

  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [indexRepos, setIndexRepos] = useState<RepoInfo[] | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % EXAMPLES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/codebase-index')
      .then(r => r.json())
      .then((d: { repos?: RepoInfo[] }) => setIndexRepos(d.repos ?? []))
      .catch(() => setIndexRepos([]))
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [])

  const canContinue = description.trim().length >= 10 && step === 'input'

  async function handleContinue() {
    if (!canContinue) return
    setError(null)
    setStep('preflight-loading')

    try {
      const res = await fetch('/api/freeform/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          tech_stack_override: techStackOverride.trim() || null,
          complexity_constraint: complexityConstraint || null,
          target_audience: targetAudience.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Preflight failure is non-fatal — go straight to generate
        await handleGenerate(false)
        return
      }
      setPreflightData(data)
      setDesignChoices({})
      setClarificationAnswers({})
      setStep('preflight')
    } catch {
      // Network error — skip preflight silently
      await handleGenerate(false)
    }
  }

  async function handleGenerate(fromPreflight = true) {
    if (fromPreflight) setStep('generating')
    setError(null)

    try {
      const res = await fetch('/api/freeform/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          tech_stack_override: techStackOverride.trim() || null,
          complexity_constraint: complexityConstraint || null,
          target_audience: targetAudience.trim() || null,
          design_choices: Object.keys(designChoices).length > 0 ? designChoices : null,
          clarification_answers: Object.keys(clarificationAnswers).length > 0 ? clarificationAnswers : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Generation failed. Please try again.')
        setStep('preflight')
        return
      }

      router.push(`/freeform/${data.id}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStep('preflight')
    }
  }

  const descriptionPreview = description.trim().length > 120
    ? description.trim().slice(0, 120) + '…'
    : description.trim()

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />

      <div className='flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12'>
        <div className='w-full max-w-2xl'>
          <div className='mb-8 text-center'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
              New Spec
            </h1>
            <p className='text-sm text-gray-500 dark:text-white/45'>
              {step === 'preflight' || step === 'preflight-loading'
                ? 'Refine your intent before generating.'
                : 'Describe any change in plain English — SignalPath will generate a codebase-grounded spec.'}
            </p>
          </div>

          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] shadow-sm overflow-hidden'>

            {/* ── Step 1: Input ─────────────────────────────────────────── */}
            {(step === 'input' || step === 'preflight-loading') && (
              <div className='p-6'>
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={handleChange}
                  placeholder={EXAMPLES[placeholderIdx]}
                  rows={4}
                  maxLength={2000}
                  disabled={step === 'preflight-loading'}
                  className='w-full resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 font-mono text-sm leading-relaxed outline-none min-h-[120px] max-h-[320px] transition-[height] disabled:opacity-60'
                  style={{ height: '120px' }}
                  autoFocus
                />

                <p className='text-right text-xs text-gray-400 dark:text-white/25 mt-1 mb-4'>
                  {description.length} / 2,000
                </p>

                <div className='mb-4'>
                  <CodebaseIndicator repos={indexRepos} />
                </div>

                <div className='mb-5'>
                  <button
                    type='button'
                    onClick={() => setAdvancedOpen(o => !o)}
                    className='flex items-center gap-1 text-xs text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60 transition-colors'
                  >
                    {advancedOpen ? <ChevronUp className='w-3.5 h-3.5' /> : <ChevronDown className='w-3.5 h-3.5' />}
                    More options
                  </button>

                  {advancedOpen && (
                    <div className='mt-4 grid gap-4'>
                      <div>
                        <label className='block text-xs font-medium text-gray-500 dark:text-white/45 mb-1'>
                          Tech stack override
                        </label>
                        <input
                          type='text'
                          value={techStackOverride}
                          onChange={e => setTechStackOverride(e.target.value)}
                          maxLength={500}
                          placeholder='e.g. Use React Native instead of Next.js for this feature'
                          className='w-full text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors'
                        />
                      </div>

                      <div>
                        <label className='block text-xs font-medium text-gray-500 dark:text-white/45 mb-2'>
                          Complexity constraint
                        </label>
                        <div className='flex gap-2'>
                          {(['S', 'M', 'L'] as const).map(v => (
                            <button
                              key={v}
                              type='button'
                              onClick={() => setComplexityConstraint(c => c === v ? '' : v)}
                              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                complexityConstraint === v
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/60 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                              }`}
                            >
                              {v === 'S' ? 'Small' : v === 'M' ? 'Medium' : 'Large'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className='block text-xs font-medium text-gray-500 dark:text-white/45 mb-1'>
                          Target audience
                        </label>
                        <input
                          type='text'
                          value={targetAudience}
                          onChange={e => setTargetAudience(e.target.value)}
                          maxLength={200}
                          placeholder='All users'
                          className='w-full text-sm bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors'
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!canContinue || step === 'preflight-loading'}
                  className='w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
                >
                  {step === 'preflight-loading' ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      Thinking of the right questions…
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className='w-4 h-4' />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── Step 2: Preflight ──────────────────────────────────────── */}
            {(step === 'preflight' || step === 'generating') && preflightData && (
              <>
                {/* Description preview strip */}
                <div className='px-6 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/[0.06] flex items-start justify-between gap-3'>
                  <p className='text-xs text-gray-500 dark:text-white/40 leading-relaxed flex-1 font-mono'>
                    {descriptionPreview}
                  </p>
                  <button
                    type='button'
                    onClick={() => { setStep('input'); setError(null) }}
                    className='flex-shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline'
                  >
                    Edit
                  </button>
                </div>

                <div className='p-6 space-y-7'>
                  {/* Design Options */}
                  {preflightData.design_options.length > 0 && (
                    <section>
                      <h2 className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-4'>
                        Design options
                      </h2>
                      <div className='space-y-5'>
                        {preflightData.design_options.map(opt => (
                          <DesignOptionPicker
                            key={opt.category}
                            option={opt}
                            selected={designChoices[opt.category]}
                            onSelect={choiceId =>
                              setDesignChoices(prev => ({ ...prev, [opt.category]: choiceId }))
                            }
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Clarifying Questions */}
                  {preflightData.questions.length > 0 && (
                    <section>
                      <h2 className='text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-4'>
                        Quick clarifications
                      </h2>
                      <div className='space-y-5'>
                        {preflightData.questions.map(q => (
                          <QuestionField
                            key={q.id}
                            question={q}
                            value={clarificationAnswers[q.id] ?? ''}
                            onChange={val =>
                              setClarificationAnswers(prev => ({ ...prev, [q.id]: val }))
                            }
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Error */}
                  {error && (
                    <div className='px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400'>
                      {error}
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className='space-y-3 pt-1'>
                    <button
                      onClick={() => handleGenerate(true)}
                      disabled={step === 'generating'}
                      className='w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
                    >
                      {step === 'generating' ? (
                        <>
                          <Loader2 className='w-4 h-4 animate-spin' />
                          Analyzing your codebase…
                        </>
                      ) : (
                        'Generate Spec'
                      )}
                    </button>

                    <div className='flex items-center justify-between'>
                      <button
                        type='button'
                        onClick={() => { setStep('input'); setError(null) }}
                        className='flex items-center gap-1 text-xs text-gray-400 dark:text-white/35 hover:text-gray-600 dark:hover:text-white/60 transition-colors'
                      >
                        <ArrowLeft className='w-3.5 h-3.5' />
                        Back
                      </button>
                      <button
                        type='button'
                        onClick={async () => {
                          setDesignChoices({})
                          setClarificationAnswers({})
                          await handleGenerate(true)
                        }}
                        disabled={step === 'generating'}
                        className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors disabled:pointer-events-none'
                      >
                        Skip, generate without answering
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <p className='text-center text-xs text-gray-400 dark:text-white/25 mt-4'>
            Press <kbd className='font-mono bg-gray-100 dark:bg-white/[0.06] px-1 py-0.5 rounded text-gray-500 dark:text-white/40'>⌘K</kbd> from any screen to open this page
          </p>
        </div>
      </div>
    </div>
  )
}
