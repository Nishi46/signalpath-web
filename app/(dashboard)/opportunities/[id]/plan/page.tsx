'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardNav } from '@/components/DashboardNav'
import { ArrowLeft, CheckCircle, Clock, FileCode, Database, Route, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

interface PlanStep {
  order: number
  title: string
  file: string
  what_to_do: string
  test?: string
}

interface Plan {
  id: string
  plan_index: number
  title: string
  approach: string
  complexity: 'S' | 'M' | 'L'
  files_affected: string[]
  models_affected: string[]
  routes_affected: string[]
  trade_off: string
  evidence_fit: string
  signal_coverage_pct: number
  estimated_tasks: number
  risk_notes: string | null
  steps: PlanStep[]
  selected: boolean
}

interface PlansResponse {
  cluster_id: string
  cluster_label: string
  plans: Plan[]
  generated_at: string
}

const COMPLEXITY_LABEL: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large' }
const COMPLEXITY_COLOR: Record<string, string> = {
  S: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  M: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  L: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

export default function PlanPage() {
  const params = useParams()
  const router = useRouter()
  const clusterId = params.id as string

  const [data, setData] = useState<PlansResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'ready' | 'error'>('idle')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function toggleSteps(planId: string) {
    setExpandedSteps(prev => ({ ...prev, [planId]: !prev[planId] }))
  }

  const fetchPlans = useCallback(async () => {
    const res = await fetch(`/api/clusters/${encodeURIComponent(clusterId)}/plans`)
    if (!res.ok) return null
    return res.json() as Promise<PlansResponse>
  }, [clusterId])

  const startGeneration = useCallback(async () => {
    setStatus('loading')
    const res = await fetch(`/api/clusters/${encodeURIComponent(clusterId)}/plans`, {
      method: 'POST',
    })
    if (!res.ok) {
      setStatus('error')
      return
    }
    setStatus('polling')
  }, [clusterId])

  // Poll until plans appear
  useEffect(() => {
    if (status !== 'polling') return

    pollRef.current = setInterval(async () => {
      const d = await fetchPlans()
      if (d && d.plans.length > 0) {
        clearInterval(pollRef.current!)
        setData(d)
        const alreadySelected = d.plans.find(p => p.selected)
        if (alreadySelected) setSelectedId(alreadySelected.id)
        setStatus('ready')
      }
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [status, fetchPlans])

  // On mount: try to load existing plans, otherwise show generate button
  useEffect(() => {
    void (async () => {
      setStatus('loading')
      const d = await fetchPlans()
      if (d && d.plans.length > 0) {
        setData(d)
        const alreadySelected = d.plans.find(p => p.selected)
        if (alreadySelected) setSelectedId(alreadySelected.id)
        setStatus('ready')
      } else {
        // Auto-start generation if no plans exist yet
        await startGeneration()
      }
    })()
  }, [fetchPlans, startGeneration])

  const handleSelect = async (planId: string) => {
    if (saving) return
    setSelectedId(planId)
    setSaving(true)

    const res = await fetch(`/api/clusters/${encodeURIComponent(clusterId)}/select-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId }),
    })

    setSaving(false)
    if (res.ok) {
      router.push(`/opportunities/${encodeURIComponent(clusterId)}`)
    }
  }

  return (
    <div className='min-h-screen bg-gray-950 text-white'>
      <DashboardNav />
      <main className='max-w-4xl mx-auto px-4 py-8'>
        <div className='mb-6'>
          <Link
            href={`/opportunities/${encodeURIComponent(clusterId)}`}
            className='inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
            Back to opportunity
          </Link>
        </div>

        <div className='mb-8'>
          <h1 className='text-2xl font-semibold'>
            {data?.cluster_label ?? 'Implementation Plans'}
          </h1>
          <p className='mt-1 text-sm text-white/50'>
            Choose an approach before generating the spec. The selected plan will constrain Claude to use these exact files.
          </p>
        </div>

        {(status === 'loading' || status === 'polling') && (
          <div className='flex flex-col items-center justify-center py-24 gap-4'>
            <div className='w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin' />
            <p className='text-sm text-white/50'>
              {status === 'loading' ? 'Checking for plans…' : 'Generating plans with Claude…'}
            </p>
            <p className='text-xs text-white/30'>This takes about 10–15 seconds</p>
          </div>
        )}

        {status === 'error' && (
          <div className='flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400'>
            <AlertTriangle className='w-5 h-5 shrink-0' />
            <span className='text-sm'>Failed to generate plans. Please try again.</span>
            <button
              type='button'
              onClick={() => void startGeneration()}
              className='ml-auto text-xs underline'
            >
              Retry
            </button>
          </div>
        )}

        {status === 'ready' && data && (
          <div className='space-y-4'>
            {data.plans.map(plan => {
              const isSelected = selectedId === plan.id
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-violet-500/60 bg-violet-500/8 ring-1 ring-violet-500/30'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                  }`}
                  onClick={() => void handleSelect(plan.id)}
                >
                  {/* Header */}
                  <div className='flex items-start justify-between gap-4 mb-4'>
                    <div className='flex items-center gap-3'>
                      {isSelected && (
                        <CheckCircle className='w-5 h-5 text-violet-400 shrink-0' />
                      )}
                      <h2 className='text-base font-semibold'>{plan.title}</h2>
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${COMPLEXITY_COLOR[plan.complexity]}`}>
                        {COMPLEXITY_LABEL[plan.complexity]}
                      </span>
                      <span className='text-xs text-white/40 flex items-center gap-1'>
                        <Clock className='w-3.5 h-3.5' />
                        {plan.estimated_tasks} tasks
                      </span>
                    </div>
                  </div>

                  <p className='text-sm text-white/70 mb-4 leading-relaxed'>{plan.approach}</p>

                  {/* Stats row */}
                  <div className='flex gap-4 mb-4 text-xs text-white/50'>
                    <span>{plan.signal_coverage_pct}% signal coverage</span>
                  </div>

                  {/* Files */}
                  {plan.files_affected.length > 0 && (
                    <div className='mb-3'>
                      <div className='flex items-center gap-1.5 text-xs font-medium text-white/40 mb-1.5'>
                        <FileCode className='w-3.5 h-3.5' />
                        Files
                      </div>
                      <div className='flex flex-wrap gap-1.5'>
                        {plan.files_affected.map(f => (
                          <span key={f} className='text-xs font-mono bg-white/[0.05] px-2 py-0.5 rounded text-white/60'>
                            {f.split('/').slice(-2).join('/')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Models + Routes */}
                  <div className='flex gap-6'>
                    {plan.models_affected.length > 0 && (
                      <div>
                        <div className='flex items-center gap-1.5 text-xs font-medium text-white/40 mb-1'>
                          <Database className='w-3.5 h-3.5' />
                          Models
                        </div>
                        <div className='flex flex-wrap gap-1'>
                          {plan.models_affected.map(m => (
                            <span key={m} className='text-xs bg-white/[0.05] px-2 py-0.5 rounded text-white/60'>{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {plan.routes_affected.length > 0 && (
                      <div>
                        <div className='flex items-center gap-1.5 text-xs font-medium text-white/40 mb-1'>
                          <Route className='w-3.5 h-3.5' />
                          Routes
                        </div>
                        <div className='flex flex-wrap gap-1'>
                          {plan.routes_affected.map(r => (
                            <span key={r} className='text-xs font-mono bg-white/[0.05] px-2 py-0.5 rounded text-white/60'>{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trade-off */}
                  <div className='mt-4 pt-4 border-t border-white/[0.06]'>
                    <p className='text-xs text-white/40'>
                      <span className='font-medium text-white/60'>Trade-off: </span>
                      {plan.trade_off}
                    </p>
                    {plan.risk_notes && (
                      <p className='mt-1 text-xs text-amber-400/70'>
                        <span className='font-medium'>Risk: </span>
                        {plan.risk_notes}
                      </p>
                    )}
                  </div>

                  {/* Steps */}
                  {plan.steps.length > 0 && (
                    <div className='mt-4 pt-4 border-t border-white/[0.06]'>
                      <button
                        type='button'
                        onClick={e => { e.stopPropagation(); toggleSteps(plan.id) }}
                        className='flex items-center gap-2 text-xs font-medium text-white/50 hover:text-white/80 transition-colors'
                      >
                        {expandedSteps[plan.id]
                          ? <ChevronUp className='w-3.5 h-3.5' />
                          : <ChevronDown className='w-3.5 h-3.5' />
                        }
                        {plan.steps.length} implementation steps
                      </button>

                      {expandedSteps[plan.id] && (
                        <ol className='mt-3 space-y-3'>
                          {plan.steps.map(step => (
                            <li key={step.order} className='flex gap-3'>
                              <span className='flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center mt-0.5'>
                                {step.order}
                              </span>
                              <div className='min-w-0'>
                                <p className='text-xs font-medium text-white/80'>{step.title}</p>
                                <p className='text-[10px] font-mono text-violet-400/70 mt-0.5 truncate'>{step.file}</p>
                                <p className='text-xs text-white/45 mt-1 leading-relaxed'>{step.what_to_do}</p>
                                {step.test && (
                                  <p className='text-[10px] text-amber-400/60 mt-1'>
                                    <span className='font-medium'>Verify: </span>{step.test}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <div className='flex justify-end pt-2'>
              <button
                type='button'
                disabled={!selectedId || saving}
                onClick={() => selectedId && void handleSelect(selectedId)}
                className='px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-xl transition-colors'
              >
                {saving ? 'Saving…' : 'Confirm plan & go back'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
