'use client'
import { useState } from 'react'
import { Code2 } from 'lucide-react'

interface TechStackStepProps {
  onSave: (stack: { frontend: string; backend: string; database: string; hosting?: string }) => Promise<void>
  onSkip: () => void
}

const FRONTENDS = ['React', 'Next.js', 'Vue', 'SvelteKit', 'Angular', 'Other']
const BACKENDS = [
  'Node.js/Express', 'Node.js/Fastify', 'Python/FastAPI', 'Python/Django',
  'Python/Flask', 'Ruby on Rails', 'Go', 'Java/Spring', 'PHP/Laravel', 'Other',
]
const DATABASES = ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'DynamoDB', 'Other']
const HOSTING = ['AWS', 'GCP', 'Azure', 'Vercel', 'Railway', 'Heroku', 'Other']

const labelClass = 'block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5'
const selectClass =
  'w-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer'

export function TechStackStep({ onSave, onSkip }: TechStackStepProps) {
  const [frontend, setFrontend] = useState('')
  const [backend, setBackend] = useState('')
  const [database, setDatabase] = useState('')
  const [hosting, setHosting] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = frontend && backend && database && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    await onSave({ frontend, backend, database, hosting: hosting || undefined })
    setSaving(false)
  }

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318] flex items-center justify-center px-6'>
      <div className='w-full max-w-md bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
        <div className='w-14 h-14 bg-violet-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
          <Code2 className='w-6 h-6 text-violet-400' />
        </div>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center'>
          Tell us your tech stack
        </h1>
        <p className='text-gray-500 dark:text-white/40 text-sm mb-8 leading-relaxed text-center'>
          SignalPath uses this to generate specs with accurate file paths and
          framework-specific implementation details — not generic placeholders.
        </p>

        <div className='space-y-3'>
          <div>
            <label className={labelClass}>Frontend framework <span className='text-red-400'>*</span></label>
            <select value={frontend} onChange={e => setFrontend(e.target.value)} className={selectClass}>
              <option value=''>Select framework…</option>
              {FRONTENDS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Backend / API <span className='text-red-400'>*</span></label>
            <select value={backend} onChange={e => setBackend(e.target.value)} className={selectClass}>
              <option value=''>Select backend…</option>
              {BACKENDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Database <span className='text-red-400'>*</span></label>
            <select value={database} onChange={e => setDatabase(e.target.value)} className={selectClass}>
              <option value=''>Select database…</option>
              {DATABASES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Hosting <span className='text-gray-400 font-normal'>(optional)</span></label>
            <select value={hosting} onChange={e => setHosting(e.target.value)} className={selectClass}>
              <option value=''>Select hosting…</option>
              {HOSTING.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className='w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
        >
          {saving ? 'Saving…' : 'Save & continue'}
        </button>

        <button
          onClick={onSkip}
          className='w-full mt-2 text-xs text-gray-400 dark:text-white/30 hover:text-gray-500 dark:text-white/50 py-2 transition-colors'
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
