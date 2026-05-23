'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardNav } from '@/components/DashboardNav'
import { BriefEditor } from '@/components/BriefEditor'
import { useToast } from '@/lib/toast-context'
import { exportPrdToDocx } from '@/lib/export-prd'
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle, ExternalLink,
  Link2, TrendingUp, Download, ChevronDown, ChevronUp, RefreshCw, Trash2,
} from 'lucide-react'

interface RelatedCluster {
  id: string
  label: string
  score?: number
  signal_count?: number
  similarity?: number
}

interface FreeformSpec {
  id: string
  description: string
  source: string
  generation_status: 'pending' | 'generating' | 'ready' | 'failed'
  generation_error?: string | null
  human_brief?: string | null
  agent_spec?: Record<string, unknown> | null
  related_clusters?: RelatedCluster[]
  codebase_files_matched?: string[]
  linked_cluster_id?: string | null
  pushed_to?: string | null
  pushed_at?: string | null
  external_id?: string | null
  created_at: string
}

const POLL_INITIAL_MS = 2000
const POLL_MAX_MS     = 8000
const POLL_MAX_TRIES  = 40  // ~2 min before showing timeout error

function StatusBadge({ status }: { status: FreeformSpec['generation_status'] }) {
  if (status === 'ready') return null
  if (status === 'failed') return (
    <span className='inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'>
      <AlertTriangle className='w-3 h-3' /> Generation failed
    </span>
  )
  return (
    <span className='inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'>
      <Loader2 className='w-3 h-3 animate-spin' /> Generating...
    </span>
  )
}

function RelatedEvidenceCard({
  cluster,
  specId,
  alreadyLinked,
  onLinked,
}: {
  cluster: RelatedCluster
  specId: string
  alreadyLinked: boolean
  onLinked: () => void
}) {
  const showToast = useToast()
  const [linking, setLinking] = useState(false)

  async function handleLink() {
    setLinking(true)
    try {
      const res = await fetch(`/api/freeform/${specId}/link-cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id }),
      })
      if (!res.ok) throw new Error()
      showToast('Evidence linked successfully', 'success')
      onLinked()
    } catch {
      showToast('Failed to link evidence', 'error')
    }
    setLinking(false)
  }

  return (
    <div className='border border-gray-200 dark:border-white/[0.08] rounded-xl p-4'>
      <div className='flex items-start justify-between gap-2 mb-2'>
        <p className='text-sm font-medium text-gray-900 dark:text-white leading-tight'>{cluster.label}</p>
        {cluster.score != null && (
          <span className='text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium whitespace-nowrap'>
            {Number(cluster.score).toFixed(1)}/10
          </span>
        )}
      </div>
      <div className='flex items-center gap-3 text-xs text-gray-400 dark:text-white/35 mb-3'>
        {cluster.signal_count != null && <span>{cluster.signal_count} signals</span>}
        {cluster.similarity != null && <span>{Math.round(cluster.similarity * 100)}% match</span>}
      </div>
      {!alreadyLinked ? (
        <button
          onClick={handleLink}
          disabled={linking}
          className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors'
        >
          {linking ? <Loader2 className='w-3 h-3 animate-spin' /> : <Link2 className='w-3 h-3' />}
          Link This Evidence
        </button>
      ) : (
        <span className='flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400'>
          <CheckCircle className='w-3 h-3' /> Linked
        </span>
      )}
    </div>
  )
}

export default function FreeformSpecPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const showToast = useToast()

  const [spec, setSpec] = useState<FreeformSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [brief, setBrief] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const draftTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const briefInited   = useRef(false)

  const [pollTimedOut, setPollTimedOut] = useState(false)

  const [pushing, setPushing] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [showCodebaseFiles, setShowCodebaseFiles] = useState(false)

  const [showRegenModal, setShowRegenModal] = useState(false)
  const [regenNotes, setRegenNotes] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await fetch(`/api/freeform/${id}`, { method: 'DELETE' })
    router.push('/specs')
  }

  const [generatingMsg, setGeneratingMsg] = useState('Analyzing your codebase...')
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSpec = useCallback(async () => {
    const res = await fetch(`/api/freeform/${encodeURIComponent(id)}`)
    if (res.status === 404) { setNotFound(true); setLoading(false); return null }
    if (!res.ok) { setLoading(false); return null }
    const data: FreeformSpec = await res.json()
    setSpec(data)
    if (data.human_brief && !briefInited.current) {
      setBrief(data.human_brief)
      briefInited.current = true
    }
    setLoading(false)
    return data
  }, [id])

  // Initial load + polling while generating (exponential backoff + max-retry guard)
  useEffect(() => {
    let cancelled = false
    let currentDelay = POLL_INITIAL_MS
    let tries = 0

    async function poll() {
      const data = await fetchSpec()
      if (cancelled) return
      if (data && (data.generation_status === 'pending' || data.generation_status === 'generating')) {
        tries += 1
        if (tries >= POLL_MAX_TRIES) {
          setPollTimedOut(true)
          return
        }
        currentDelay = Math.min(currentDelay * 2, POLL_MAX_MS)
        pollTimer.current = setTimeout(poll, currentDelay)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Delayed secondary loading message for trust-building
  useEffect(() => {
    if (!spec || spec.generation_status !== 'generating') return
    msgTimer.current = setTimeout(() => {
      const files = spec.codebase_files_matched?.length ?? 0
      setGeneratingMsg(
        files > 0
          ? `Matching against ${files} files in your codebase...`
          : 'Searching for related customer evidence...',
      )
    }, 3000)
    return () => { if (msgTimer.current) clearTimeout(msgTimer.current) }
  }, [spec])

  // Debounced auto-save with confirmation state
  function handleBriefChange(md: string) {
    setBrief(md)
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const res = await fetch(`/api/freeform/${encodeURIComponent(id)}/save-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ human_brief: md }),
        })
        if (res.ok) {
          setSaveState('saved')
          if (savedTimer.current) clearTimeout(savedTimer.current)
          savedTimer.current = setTimeout(() => setSaveState('idle'), 2000)
        } else {
          setSaveState('error')
        }
      } catch {
        setSaveState('error')
      }
    }, 2000)
  }

  async function handlePush(target: 'linear' | 'jira') {
    setPushing(true)
    try {
      const res = await fetch(`/api/freeform/${encodeURIComponent(id)}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Push failed', 'error')
      } else {
        showToast(`Pushed to ${target === 'linear' ? 'Linear' : 'Jira'}: ${data.identifier ?? data.key}`, 'success')
        void fetchSpec()
      }
    } catch {
      showToast('Network error', 'error')
    }
    setPushing(false)
  }

  async function handlePromote() {
    if (!confirm('Promote this freeform spec to an Opportunity on the feed?')) return
    setPromoting(true)
    try {
      // Flush any pending draft before promoting so the cluster gets the latest brief
      if (draftTimer.current) {
        clearTimeout(draftTimer.current)
        draftTimer.current = null
      }
      if (brief) {
        await fetch(`/api/freeform/${encodeURIComponent(id)}/save-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ human_brief: brief }),
        })
      }

      const res = await fetch(`/api/freeform/${encodeURIComponent(id)}/promote`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Promote failed', 'error')
      } else {
        showToast('Promoted to Opportunity feed', 'success')
        router.push(`/opportunities/${data.cluster_id}`)
      }
    } catch {
      showToast('Network error', 'error')
    }
    setPromoting(false)
  }

  // Fire finalize when component unmounts (page navigation)
  useEffect(() => {
    return () => {
      if (spec?.generation_status === 'ready') {
        void fetch(`/api/freeform/${encodeURIComponent(id)}/finalize`, { method: 'POST' })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, spec?.generation_status])

  async function handleRegenerate() {
    setRegenerating(true)
    setShowRegenModal(false)
    try {
      const res = await fetch(`/api/freeform/${encodeURIComponent(id)}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision_notes: regenNotes.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        showToast(data.error ?? 'Regeneration failed', 'error')
      } else {
        briefInited.current = false
        setPollTimedOut(false)
        void fetchSpec()
      }
    } catch {
      showToast('Network error', 'error')
    }
    setRegenNotes('')
    setRegenerating(false)
  }

  function handleDownloadJson() {
    if (!spec?.agent_spec) return
    const json = JSON.stringify(spec.agent_spec, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `agent_spec_freeform_${id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadDocx() {
    if (!brief && !spec?.human_brief) return
    const content = brief || spec?.human_brief || ''
    const docTitle = ((spec?.agent_spec as Record<string, unknown> | null)?.feature as Record<string, unknown> | null)?.title as string | undefined
      ?? spec?.description.slice(0, 80) ?? 'Freeform Spec'
    await exportPrdToDocx(content, docTitle)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
        <DashboardNav />
        <div className='max-w-6xl mx-auto px-6 py-10 animate-pulse'>
          <div className='h-4 bg-gray-100 dark:bg-white/[0.07] rounded w-32 mb-6' />
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl h-96' />
        </div>
      </div>
    )
  }

  if (notFound || !spec) {
    return (
      <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
        <DashboardNav />
        <div className='max-w-3xl mx-auto px-6 py-20 text-center'>
          <p className='text-gray-400 dark:text-white/35 mb-4'>Spec not found.</p>
          <Link href='/freeform' className='text-sm text-blue-600 dark:text-blue-400 hover:underline'>← New Spec</Link>
        </div>
      </div>
    )
  }

  const isGenerating = spec.generation_status === 'pending' || spec.generation_status === 'generating'
  const isReady      = spec.generation_status === 'ready'
  const isFailed     = spec.generation_status === 'failed'

  const title = ((spec.agent_spec as Record<string, unknown> | null)?.feature as Record<string, unknown> | null)?.title as string | undefined
    ?? spec.description.slice(0, 80)

  const relatedClusters: RelatedCluster[] = spec.related_clusters ?? []
  const codebaseFiles: string[] = spec.codebase_files_matched ?? []
  const hasEvidence = relatedClusters.length > 0
  const alreadyLinked = !!spec.linked_cluster_id

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />

      <div className='max-w-6xl mx-auto px-6 py-8'>
        {/* Back + title */}
        <div className='flex items-center gap-3 mb-6'>
          <Link href='/specs' className='flex items-center gap-1 text-sm text-gray-400 dark:text-white/35 hover:text-gray-700 dark:hover:text-white/70 transition-colors'>
            <ArrowLeft className='w-4 h-4' />
            All Specs
          </Link>
          <span className='text-gray-300 dark:text-white/20'>/</span>
          <div className='flex items-center gap-2 flex-1'>
            <span className='text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium'>
              {spec.source === 'freeform_enriched' ? 'Freeform + Evidence' : spec.source === 'promoted' ? 'Promoted' : 'Freeform'}
            </span>
            <StatusBadge status={spec.generation_status} />
          </div>
          {confirmDelete ? (
            <span className='flex items-center gap-2 ml-auto'>
              <button
                onClick={() => setConfirmDelete(false)}
                className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className='flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50'
              >
                {deleting ? <Loader2 className='w-3 h-3 animate-spin' /> : null}
                Delete
              </button>
            </span>
          ) : (
            <button
              onClick={handleDelete}
              className='ml-auto text-gray-300 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 transition-colors'
              title='Delete spec'
            >
              <Trash2 className='w-4 h-4' />
            </button>
          )}
        </div>

        <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-6 leading-snug'>{title}</h1>

        {/* Loading state */}
        {isGenerating && !pollTimedOut && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-12 text-center'>
            <Loader2 className='w-8 h-8 text-blue-600 animate-spin mx-auto mb-4' />
            <p className='text-sm text-gray-600 dark:text-white/60'>{generatingMsg}</p>
            <p className='text-xs text-gray-400 dark:text-white/25 mt-1'>This takes 8–15 seconds</p>
          </div>
        )}

        {/* Poll timeout banner */}
        {isGenerating && pollTimedOut && (
          <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-8 text-center'>
            <AlertTriangle className='w-8 h-8 text-amber-500 mx-auto mb-3' />
            <p className='text-sm font-medium text-amber-700 dark:text-amber-400 mb-1'>Generation is taking longer than expected</p>
            <p className='text-xs text-amber-600 dark:text-amber-500/70 mb-4'>The worker may be busy. Refresh to check progress.</p>
            <button
              onClick={() => { setPollTimedOut(false); void fetchSpec() }}
              className='inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors'
            >
              <RefreshCw className='w-3.5 h-3.5' /> Refresh
            </button>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center'>
            <AlertTriangle className='w-8 h-8 text-red-500 mx-auto mb-3' />
            <p className='text-sm font-medium text-red-700 dark:text-red-400 mb-1'>Generation failed</p>
            <p className='text-xs text-red-500 dark:text-red-500/70'>{spec.generation_error ?? 'An unexpected error occurred.'}</p>
            <Link href='/freeform' className='mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline'>Try again</Link>
          </div>
        )}

        {/* Two-column editor — identical layout to signal-driven spec */}
        {isReady && (
          <div className='grid grid-cols-[1fr_320px] gap-6'>
            {/* Left: editable brief */}
            <div className='space-y-4'>
              {/* Action bar */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {saveState === 'saving' && (
                    <span className='text-xs text-gray-400 dark:text-white/30 animate-pulse'>Saving...</span>
                  )}
                  {saveState === 'saved' && (
                    <span className='flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400'>
                      <CheckCircle className='w-3 h-3' /> Draft saved
                    </span>
                  )}
                  {saveState === 'error' && (
                    <button
                      onClick={() => handleBriefChange(brief)}
                      className='text-xs text-red-500 dark:text-red-400 hover:underline'
                    >
                      Save failed — retry
                    </button>
                  )}
                  {spec.pushed_to && (
                    <span className='text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3' />
                      Pushed to {spec.pushed_to} — {spec.external_id}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setShowRegenModal(true)}
                    disabled={regenerating}
                    className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-colors disabled:opacity-40'
                  >
                    {regenerating ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <RefreshCw className='w-3.5 h-3.5' />}
                    Regenerate
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-colors'
                  >
                    <Download className='w-3.5 h-3.5' />
                    agent_spec.json
                  </button>
                  <button
                    onClick={() => void handleDownloadDocx()}
                    className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-colors'
                  >
                    <Download className='w-3.5 h-3.5' />
                    Download DOCX
                  </button>
                  <button
                    onClick={() => handlePush('linear')}
                    disabled={pushing}
                    className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-colors disabled:opacity-40'
                  >
                    {pushing ? <Loader2 className='w-3.5 h-3.5 animate-spin' /> : <ExternalLink className='w-3.5 h-3.5' />}
                    Push to Linear
                  </button>
                  <button
                    onClick={() => handlePush('jira')}
                    disabled={pushing}
                    className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-colors disabled:opacity-40'
                  >
                    Push to Jira
                  </button>
                </div>
              </div>

              {/* Brief editor */}
              <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] overflow-hidden'>
                {brief ? (
                  <BriefEditor initialContent={brief} onChange={handleBriefChange} />
                ) : (
                  <div className='p-8 text-center text-gray-400 dark:text-white/30 text-sm'>
                    No brief generated.
                  </div>
                )}
              </div>
            </div>

            {/* Right: context panel */}
            <div className='space-y-4'>
              {/* No-evidence amber banner */}
              {!hasEvidence && (
                <div className='px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50'>
                  <p className='text-xs text-amber-700 dark:text-amber-400 leading-relaxed'>
                    This spec has no linked customer evidence. It was generated from your description and codebase context.
                    You can link it to a signal cluster later.
                  </p>
                </div>
              )}

              {/* PM's original description */}
              <div className='bg-white dark:bg-[#1A1D24] rounded-xl border border-gray-100 dark:border-white/[0.07] p-4'>
                <p className='text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2'>Your Description</p>
                <p className='text-sm text-gray-700 dark:text-white/70 leading-relaxed'>{spec.description}</p>
              </div>

              {/* Related evidence cards */}
              {hasEvidence && (
                <div className='bg-white dark:bg-[#1A1D24] rounded-xl border border-gray-100 dark:border-white/[0.07] p-4'>
                  <p className='text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3'>Related Evidence</p>
                  <div className='space-y-3'>
                    {relatedClusters.map(c => (
                      <RelatedEvidenceCard
                        key={c.id}
                        cluster={c}
                        specId={id}
                        alreadyLinked={alreadyLinked && spec.linked_cluster_id === c.id}
                        onLinked={() => void fetchSpec()}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Codebase files matched */}
              {codebaseFiles.length > 0 && (
                <div className='bg-white dark:bg-[#1A1D24] rounded-xl border border-gray-100 dark:border-white/[0.07] p-4'>
                  <button
                    onClick={() => setShowCodebaseFiles(o => !o)}
                    className='flex items-center justify-between w-full'
                  >
                    <p className='text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider'>
                      Codebase Context ({codebaseFiles.length} files)
                    </p>
                    {showCodebaseFiles ? <ChevronUp className='w-3.5 h-3.5 text-gray-400' /> : <ChevronDown className='w-3.5 h-3.5 text-gray-400' />}
                  </button>
                  {showCodebaseFiles && (
                    <ul className='mt-3 space-y-1'>
                      {codebaseFiles.map(f => (
                        <li key={f} className='font-mono text-xs text-gray-500 dark:text-white/40 truncate' title={f}>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Promote to opportunity */}
              {spec.source !== 'promoted' && (
                <button
                  onClick={handlePromote}
                  disabled={promoting}
                  className='w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 disabled:opacity-40 transition-colors'
                >
                  {promoting ? <Loader2 className='w-4 h-4 animate-spin' /> : <TrendingUp className='w-4 h-4' />}
                  Promote to Opportunity
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Regenerate modal */}
      {showRegenModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-xl w-full max-w-md mx-4 p-6'>
            <h3 className='text-base font-semibold text-gray-900 dark:text-white mb-2'>Regenerate Spec</h3>
            <p className='text-sm text-gray-500 dark:text-white/40 mb-4'>
              Optionally describe what to change. Leave blank to regenerate from scratch.
            </p>
            <textarea
              value={regenNotes}
              onChange={e => setRegenNotes(e.target.value)}
              placeholder='e.g. Make the scope smaller, focus only on mobile, add more technical detail...'
              rows={4}
              className='w-full text-sm rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#111318] text-gray-900 dark:text-white px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-400 dark:placeholder:text-white/25'
            />
            <div className='flex justify-end gap-2 mt-4'>
              <button
                onClick={() => { setShowRegenModal(false); setRegenNotes('') }}
                className='px-4 py-2 text-sm text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRegenerate()}
                className='flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors'
              >
                <RefreshCw className='w-3.5 h-3.5' />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
