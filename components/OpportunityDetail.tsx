'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ScoreBadge } from './ScoreBadge'
import { DashboardNav } from './DashboardNav'
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Clock,
  Download,
  Sparkles,
  ThumbsUp,
  SkipForward,
  X,
  Users,
  FileText,
  FileDown,
  ChevronDown,
  DollarSign,
  Package,
  Building2,
  RefreshCw,
  Pencil,
  Check,
  Map,
  Plus,
  Trash2,
  Github,
  Zap,
  Loader2,
  GitBranch,
  CheckCircle2,
  XCircle,
  Circle,
  FileCode2,
  MessageCircle,
  ThumbsDown,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { BriefEditor } from './BriefEditor'
import { exportPrdToDocx } from '@/lib/export-prd'
import { deepSet } from '@/lib/utils/deepSet'
import { ScoreBreakdownPanel, type ScoreHistoryEntry } from './ScoreBreakdownPanel'
import { ScoreSparkline } from './ScoreSparkline'
import { useToast } from '@/lib/toast-context'
import { PRFeedPanel } from './PRFeedPanel'

export interface ClusterDetail {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  recent_signal_count: number
  human_brief?: string | null
  agent_spec?: Record<string, unknown> | null
  spec_generated_at?: string | null
  confidence?: string | null
  dimension_f?: number | null
  dimension_r?: number | null
  dimension_c?: number | null
  dimension_b?: number | null
  dimension_s?: number | null
  unique_orgs?: number | null
  unique_requesters?: number | null
  dimension_v?: number | null
  revenue_at_risk_usd?: number | null
  scoring_model?: string | null
  ml_review_needed?: boolean | null
  revenue_source?: string | null
  pm_rating?: string | null
  selected_plan_id?: string | null
  plans_generated_at?: string | null
  pr_url?: string | null
  pr_number?: number | null
  pr_branch?: string | null
  pr_repo_full_name?: string | null
  status?: string | null
  merged_by?: string | null
  pr_merge_sha?: string | null
  github_issue_url?: string | null
  agent_spec_validation?: {
    total_references?: number
    verified?: number
    auto_corrected?: number
    unverified?: number
    unverified_paths?: string[]
    skipped?: boolean
    reason?: string
  } | null
  is_freeform?: boolean
}

interface Signal {
  id: string
  text: string
  churn_flag: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Feature 4: Agent progress board sub-component
// ---------------------------------------------------------------------------

type AgentTaskStatus = { index: number; title: string; target_files: string[]; status: string; commit_sha?: string | null; error?: string | null }
type CICheck = { name: string; status: string; conclusion: string | null; completed_at: string | null; details_url: string | null }
type AgentRunStatus = { agent_run_id?: string; status: string; total_tasks: number; completed_tasks: number; failed_tasks: number; branch_name?: string; pr_url?: string | null; pr_number?: number | null; ci_checks?: CICheck[]; tasks: AgentTaskStatus[]; error?: string | null }

function TaskIcon({ status }: { status: string }) {
  if (status === 'complete') return <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
  if (status === 'failed') return <XCircle className='w-4 h-4 text-red-400 shrink-0' />
  if (status === 'running') return <Loader2 className='w-4 h-4 text-blue-400 animate-spin shrink-0' />
  return <Circle className='w-4 h-4 text-gray-300 dark:text-white/20 shrink-0' />
}

function CICheckIcon({ conclusion }: { conclusion: string | null }) {
  if (conclusion === 'success') return <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400 shrink-0' />
  if (conclusion === 'failure' || conclusion === 'timed_out') return <XCircle className='w-3.5 h-3.5 text-red-400 shrink-0' />
  if (conclusion === 'cancelled' || conclusion === 'skipped') return <Circle className='w-3.5 h-3.5 text-gray-400 dark:text-white/30 shrink-0' />
  return <Loader2 className='w-3.5 h-3.5 text-blue-400 animate-spin shrink-0' />
}

function AgentProgressBoard({ run, onRebuild }: { run: AgentRunStatus; onRebuild?: () => void }) {
  const isRunning = run.status === 'running' || run.status === 'pending'
  const isComplete = run.status === 'complete'
  const isFailed = run.status === 'failed'

  return (
    <div className='bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] rounded-xl p-5'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          {isRunning && <Loader2 className='w-4 h-4 text-violet-400 animate-spin' />}
          {isComplete && <CheckCircle2 className='w-4 h-4 text-emerald-400' />}
          {isFailed && <XCircle className='w-4 h-4 text-red-400' />}
          <span className='text-sm font-semibold text-gray-900 dark:text-white'>
            {isRunning ? 'Building…' : isComplete ? 'Build Complete' : 'Build Failed'}
          </span>
        </div>
        <span className='text-xs text-gray-400 dark:text-white/30'>
          {run.completed_tasks}/{run.total_tasks} tasks
        </span>
      </div>

      {run.branch_name && (
        <div className='flex items-center gap-1.5 mb-4 text-xs text-gray-400 dark:text-white/30'>
          <GitBranch className='w-3.5 h-3.5' />
          <code className='font-mono'>{run.branch_name}</code>
        </div>
      )}

      <div className='space-y-2 mb-4'>
        {(run.tasks ?? []).map(task => (
          <div key={task.index} className='flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-white/[0.04]'>
            <TaskIcon status={task.status} />
            <div className='min-w-0'>
              <p className='text-xs font-medium text-gray-800 dark:text-white/80 truncate'>{task.title}</p>
              {task.target_files.length > 0 && (
                <p className='text-xs text-gray-400 dark:text-white/30 truncate'>
                  {task.target_files.slice(0, 2).join(', ')}
                </p>
              )}
              {task.error && <p className='text-xs text-red-400 mt-0.5'>{task.error}</p>}
            </div>
          </div>
        ))}
      </div>

      {isComplete && run.pr_url && (
        <a
          href={run.pr_url}
          target='_blank'
          rel='noopener noreferrer'
          className='w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors'
        >
          <Github className='w-4 h-4' /> View Pull Request #{run.pr_number} <ExternalLink className='w-3.5 h-3.5' />
        </a>
      )}

      {(run.ci_checks ?? []).length > 0 && (
        <div className='mt-3 border-t border-gray-100 dark:border-white/[0.06] pt-3'>
          <p className='text-xs text-gray-400 dark:text-white/40 mb-2'>CI Checks</p>
          <div className='space-y-1.5'>
            {(run.ci_checks ?? []).map(check => (
              <div key={check.name} className='flex items-center gap-2 text-xs'>
                <CICheckIcon conclusion={check.conclusion} />
                <span className='flex-1 text-gray-700 dark:text-white/70 truncate'>{check.name}</span>
                {check.details_url && (
                  <a
                    href={check.details_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 shrink-0'
                  >
                    <ExternalLink className='w-3 h-3' />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isFailed && (
        <div className='mt-3 space-y-2'>
          {run.error && <p className='text-xs text-red-400'>{run.error}</p>}
          {onRebuild && (
            <button
              onClick={onRebuild}
              className='w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
            >
              <RefreshCw className='w-4 h-4' /> Build Again
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feature 9: Engineer Context Panel types and component
// ---------------------------------------------------------------------------

type PRFile = { filename: string; status: string | null; additions: number; deletions: number }
type PRReview = { login: string | null; avatar_url: string | null; state: string; submitted_at: string | null; body: string }
type PRReviewData = {
  pr_number: number
  pr_url: string | null
  pr_repo: string | null
  branch_name: string | null
  run_status: string
  ci_checks: CICheck[]
  tasks: AgentTaskStatus[]
  pr_files: PRFile[]
  pr_reviews: PRReview[]
  top_signals: Array<{ id: string; text: string; churn_flag: boolean; created_at: string }>
}

function reviewStateLabel(state: string) {
  if (state === 'APPROVED') return { label: 'Approved', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
  if (state === 'CHANGES_REQUESTED') return { label: 'Changes requested', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  return { label: 'Commented', cls: 'text-gray-400 bg-gray-500/10 border-gray-500/20' }
}

function ciOverallStatus(checks: CICheck[]): 'success' | 'failure' | 'pending' | null {
  if (checks.length === 0) return null
  if (checks.some(c => c.conclusion === 'failure' || c.conclusion === 'timed_out')) return 'failure'
  if (checks.every(c => c.conclusion === 'success')) return 'success'
  return 'pending'
}

function PRReviewPanel({
  clusterId,
  data,
  onSubmitReview,
  submitBusy,
  submitError,
}: {
  clusterId: string
  data: PRReviewData
  onSubmitReview: (event: string, body: string) => Promise<void>
  submitBusy: boolean
  submitError: string | null
}) {
  const [reviewBody, setReviewBody] = useState('')
  const [reviewExpanded, setReviewExpanded] = useState(false)

  const ciStatus = ciOverallStatus(data.ci_checks)

  // Map each PR file to its generating task (by target_files overlap)
  const fileTaskMap: Record<string, string> = {}
  for (const task of data.tasks) {
    for (const tf of task.target_files) {
      fileTaskMap[tf] = task.title
    }
  }
  function taskForFile(filename: string): string | undefined {
    // exact match first
    if (fileTaskMap[filename]) return fileTaskMap[filename]
    // suffix match (e.g. task has 'src/Foo.tsx', PR file has 'src/Foo.tsx')
    for (const [tf, title] of Object.entries(fileTaskMap)) {
      if (filename.endsWith(tf) || tf.endsWith(filename)) return title
    }
    return undefined
  }

  // Top churn signals for evidence sidebar
  const churnSignals = data.top_signals.filter(s => s.churn_flag).slice(0, 3)
  const otherSignals = data.top_signals.filter(s => !s.churn_flag).slice(0, 3 - churnSignals.length)
  const evidenceSignals = [...churnSignals, ...otherSignals]

  return (
    <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6 mb-6'>
      {/* Header */}
      <div className='flex items-center justify-between mb-5'>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='w-4 h-4 text-violet-400' />
          <span className='text-sm font-semibold text-gray-900 dark:text-white'>
            Engineer Review — PR #{data.pr_number}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {ciStatus === 'success' && (
            <span className='inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full'>
              <CheckCircle2 className='w-3 h-3' /> CI passing
            </span>
          )}
          {ciStatus === 'failure' && (
            <span className='inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full'>
              <XCircle className='w-3 h-3' /> CI failing
            </span>
          )}
          {ciStatus === 'pending' && (
            <span className='inline-flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full'>
              <Loader2 className='w-3 h-3 animate-spin' /> CI running
            </span>
          )}
          {data.pr_reviews.length > 0 && (
            <span className='inline-flex items-center gap-1 text-xs text-gray-500 dark:text-white/40 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] px-2 py-0.5 rounded-full'>
              <Users className='w-3 h-3' /> {data.pr_reviews.length} review{data.pr_reviews.length !== 1 ? 's' : ''}
            </span>
          )}
          {data.pr_url && (
            <a
              href={data.pr_url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-xs text-gray-500 dark:text-white/40 hover:text-violet-400 transition-colors'
            >
              <Github className='w-3.5 h-3.5' /> <ExternalLink className='w-3 h-3' />
            </a>
          )}
        </div>
      </div>

      {/* Existing reviews */}
      {data.pr_reviews.length > 0 && (
        <div className='flex flex-wrap gap-2 mb-5'>
          {data.pr_reviews.map((r, i) => {
            const { label, cls } = reviewStateLabel(r.state)
            return (
              <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}>
                {r.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.avatar_url} alt={r.login ?? ''} className='w-4 h-4 rounded-full' />
                )}
                @{r.login} · {label}
              </span>
            )
          })}
        </div>
      )}

      {/* Two-column: files + evidence */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-5'>
        {/* Files changed */}
        <div>
          <p className='text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2'>
            Files Changed ({data.pr_files.length})
          </p>
          {data.pr_files.length === 0 ? (
            <p className='text-xs text-gray-400 dark:text-white/30'>No file data yet.</p>
          ) : (
            <div className='space-y-1'>
              {data.pr_files.map((f, i) => {
                const task = taskForFile(f.filename)
                const parts = f.filename.split('/')
                const name = parts[parts.length - 1]
                const dir = parts.slice(0, -1).join('/')
                return (
                  <div key={i} className='flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors'>
                    <FileCode2 className='w-3.5 h-3.5 text-gray-400 dark:text-white/25 mt-0.5 shrink-0' />
                    <div className='min-w-0 flex-1'>
                      <p className='text-xs text-gray-800 dark:text-white/80 font-mono truncate'>
                        {dir && <span className='text-gray-400 dark:text-white/30'>{dir}/</span>}{name}
                        {f.status === 'added' && <span className='ml-1.5 text-[10px] text-emerald-400 font-sans font-medium'>new</span>}
                      </p>
                      {task && (
                        <p className='text-[10px] text-violet-400 truncate mt-0.5'>{task}</p>
                      )}
                    </div>
                    <span className='text-[10px] text-gray-400 dark:text-white/30 shrink-0 font-mono'>
                      +{f.additions} -{f.deletions}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Customer evidence */}
        <div>
          <p className='text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2'>
            Customer Evidence
          </p>
          {evidenceSignals.length === 0 ? (
            <p className='text-xs text-gray-400 dark:text-white/30'>No signal data.</p>
          ) : (
            <div className='space-y-2'>
              {evidenceSignals.map((s, i) => (
                <div key={i} className='p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]'>
                  {s.churn_flag && (
                    <span className='inline-flex items-center gap-0.5 text-[10px] text-orange-400 font-medium mb-1'>
                      <AlertTriangle className='w-2.5 h-2.5' /> Churn risk
                    </span>
                  )}
                  <p className='text-xs text-gray-600 dark:text-white/60 leading-relaxed line-clamp-3'>
                    &ldquo;{s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text}&rdquo;
                  </p>
                  <p className='text-[10px] text-gray-400 dark:text-white/25 mt-1'>
                    Signal · {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review submission */}
      <div className='border-t border-gray-100 dark:border-white/[0.06] pt-4'>
        <button
          type='button'
          onClick={() => setReviewExpanded(e => !e)}
          className='flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 mb-3 transition-colors'
        >
          <MessageCircle className='w-3.5 h-3.5' />
          {reviewExpanded ? 'Hide review form' : 'Submit a review'}
          <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${reviewExpanded ? 'rotate-180' : ''}`} />
        </button>

        {reviewExpanded && (
          <div className='space-y-3'>
            <textarea
              value={reviewBody}
              onChange={e => setReviewBody(e.target.value)}
              placeholder='Leave a review comment (optional)…'
              rows={3}
              className='w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 outline-none focus:border-violet-500/40 resize-none transition-all'
            />
            <div className='flex gap-2'>
              <button
                type='button'
                disabled={submitBusy}
                onClick={() => void onSubmitReview('APPROVE', reviewBody)}
                className='flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-xs transition-colors'
              >
                <ThumbsUp className='w-3.5 h-3.5' />
                {submitBusy ? 'Submitting…' : 'Approve'}
              </button>
              <button
                type='button'
                disabled={submitBusy}
                onClick={() => void onSubmitReview('REQUEST_CHANGES', reviewBody)}
                className='flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-xs transition-colors'
              >
                <ThumbsDown className='w-3.5 h-3.5' />
                {submitBusy ? 'Submitting…' : 'Request changes'}
              </button>
              {data.pr_url && (
                <a
                  href={data.pr_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.09] text-gray-600 dark:text-white/60 font-medium py-2.5 px-3 rounded-xl text-xs transition-colors border border-gray-200 dark:border-white/[0.08]'
                >
                  <Github className='w-3.5 h-3.5' /> GitHub
                </a>
              )}
            </div>
            {submitError && (
              <p className='text-xs text-red-400'>{submitError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface OpportunityDetailProps {
  cluster: ClusterDetail
  signals: Signal[]
  scoreHistory?: ScoreHistoryEntry[]
  workspaceId: string
  onRefresh?: () => Promise<void>
}

function formatRevenue(amount: number | null | undefined): string {
  if (!amount) return '$0'
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}


// ── Shared edit-field styles ──────────────────────────────────────────────────
const inputCls = 'w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-sky-500/40 transition-all'
const textareaCls = `${inputCls} resize-none`
const sectionLabelCls = 'block text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-1.5'
const addBtnCls = 'flex items-center gap-1 text-xs text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 mt-2 transition-colors'
const removeBtnCls = 'shrink-0 p-1 text-gray-300 dark:text-white/20 hover:text-red-400 dark:hover:text-red-400 transition-colors rounded'

function StringListEditor({
  label, path, items, onAdd, onRemove, onChange, placeholder,
}: {
  label: string
  path: string
  items: string[]
  onAdd: (path: string, def: unknown) => void
  onRemove: (path: string, index: number) => void
  onChange: (path: string, value: unknown) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className={sectionLabelCls}>{label}</label>
      <div className='space-y-1.5'>
        {items.map((item, i) => (
          <div key={i} className='flex items-start gap-1.5'>
            <textarea
              value={item}
              onChange={e => onChange(`${path}[${i}]`, e.target.value)}
              rows={2}
              placeholder={placeholder}
              className={textareaCls + ' flex-1'}
            />
            <button type='button' onClick={() => onRemove(path, i)} className={removeBtnCls} title='Remove'>
              <Trash2 className='w-3.5 h-3.5' />
            </button>
          </div>
        ))}
      </div>
      <button type='button' onClick={() => onAdd(path, '')} className={addBtnCls}>
        <Plus className='w-3.5 h-3.5' /> Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  )
}

function SpecEditor({
  draftSpec,
  onChange,
  onAddItem,
  onRemoveItem,
}: {
  draftSpec: Record<string, unknown> | null
  onChange: (path: string, value: unknown) => void
  onAddItem: (arrayPath: string, defaultValue: unknown) => void
  onRemoveItem: (arrayPath: string, index: number) => void
}) {
  const spec = draftSpec ?? {}
  const feature = (spec['feature'] as Record<string, unknown> | null | undefined) ?? {}
  const tasks = Array.isArray(spec['engineering_tasks']) ? spec['engineering_tasks'] as Record<string, unknown>[] : []
  const uiChanges = Array.isArray(spec['ui_changes']) ? spec['ui_changes'] as string[] : []
  const testPlan = Array.isArray(spec['test_plan']) ? spec['test_plan'] as string[] : []
  const userStories = Array.isArray(feature['user_stories']) ? feature['user_stories'] as string[] : []
  const featAC = Array.isArray(feature['acceptance_criteria']) ? feature['acceptance_criteria'] as string[] : []
  const scopeIn = Array.isArray(feature['scope_in']) ? feature['scope_in'] as string[] : []
  const scopeOut = Array.isArray(feature['scope_out']) ? feature['scope_out'] as string[] : []

  return (
    <div className='space-y-6 pt-1'>
      {/* Feature title */}
      <div>
        <label className={sectionLabelCls}>Feature title</label>
        <input
          type='text'
          value={String(feature['title'] ?? '')}
          onChange={e => onChange('feature.title', e.target.value)}
          className={inputCls}
          placeholder='Feature title'
        />
      </div>

      {/* Problem statement */}
      <div>
        <label className={sectionLabelCls}>Problem statement</label>
        <textarea
          value={String(feature['problem_statement'] ?? '')}
          onChange={e => onChange('feature.problem_statement', e.target.value)}
          rows={4}
          className={textareaCls}
        />
      </div>

      {/* Proposed solution */}
      <div>
        <label className={sectionLabelCls}>Proposed solution</label>
        <textarea
          value={String(feature['proposed_solution'] ?? '')}
          onChange={e => onChange('feature.proposed_solution', e.target.value)}
          rows={4}
          className={textareaCls}
        />
      </div>

      {/* Target users */}
      {(feature['target_users'] !== undefined || feature['target_audience'] !== undefined) && (
        <div>
          <label className={sectionLabelCls}>Target users</label>
          <textarea
            value={String(feature['target_users'] ?? feature['target_audience'] ?? '')}
            onChange={e => onChange('feature.target_users', e.target.value)}
            rows={2}
            className={textareaCls}
          />
        </div>
      )}

      {/* User stories */}
      <StringListEditor
        label='User stories'
        path='feature.user_stories'
        items={userStories}
        onAdd={onAddItem}
        onRemove={onRemoveItem}
        onChange={onChange}
        placeholder='As a [user], I want [goal] so that [benefit]'
      />

      {/* Acceptance criteria (feature-level) */}
      <StringListEditor
        label='Acceptance criteria'
        path='feature.acceptance_criteria'
        items={featAC}
        onAdd={onAddItem}
        onRemove={onRemoveItem}
        onChange={onChange}
        placeholder='Testable criterion...'
      />

      {/* Scope */}
      <div className='grid grid-cols-2 gap-4'>
        <StringListEditor
          label='Scope — In'
          path='feature.scope_in'
          items={scopeIn}
          onAdd={onAddItem}
          onRemove={onRemoveItem}
          onChange={onChange}
          placeholder='In scope item...'
        />
        <StringListEditor
          label='Scope — Out'
          path='feature.scope_out'
          items={scopeOut}
          onAdd={onAddItem}
          onRemove={onRemoveItem}
          onChange={onChange}
          placeholder='Out of scope item...'
        />
      </div>

      {/* Engineering tasks */}
      <div>
        <label className={sectionLabelCls}>Engineering tasks</label>
        <div className='space-y-3'>
          {tasks.map((task, ti) => (
            <div key={ti} className='bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] rounded-xl p-4 space-y-3'>
              <div className='flex items-center gap-2'>
                <span className='w-5 h-5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0'>{ti + 1}</span>
                <input
                  type='text'
                  value={String(task['title'] ?? '')}
                  onChange={e => onChange(`engineering_tasks[${ti}].title`, e.target.value)}
                  className={inputCls + ' flex-1'}
                  placeholder='Task title'
                />
                <button
                  type='button'
                  onClick={() => onRemoveItem('engineering_tasks', ti)}
                  className={removeBtnCls}
                  title='Remove task'
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </button>
              </div>

              {task['description'] !== undefined && (
                <textarea
                  value={String(task['description'] ?? '')}
                  onChange={e => onChange(`engineering_tasks[${ti}].description`, e.target.value)}
                  rows={2}
                  placeholder='Task description...'
                  className={textareaCls}
                />
              )}

              {/* Per-task acceptance criteria */}
              <div>
                <p className='text-[10px] text-gray-400 dark:text-white/30 font-medium uppercase tracking-wide mb-1.5'>Acceptance criteria</p>
                <div className='space-y-1.5'>
                  {(Array.isArray(task['acceptance_criteria']) ? task['acceptance_criteria'] as string[] : []).map((ac, ai) => (
                    <div key={ai} className='flex items-start gap-1.5'>
                      <textarea
                        value={ac}
                        onChange={e => onChange(`engineering_tasks[${ti}].acceptance_criteria[${ai}]`, e.target.value)}
                        rows={2}
                        className={textareaCls + ' flex-1 text-xs'}
                      />
                      <button
                        type='button'
                        onClick={() => onRemoveItem(`engineering_tasks[${ti}].acceptance_criteria`, ai)}
                        className={removeBtnCls}
                        title='Remove'
                      >
                        <Trash2 className='w-3 h-3' />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type='button'
                  onClick={() => onAddItem(`engineering_tasks[${ti}].acceptance_criteria`, '')}
                  className={addBtnCls}
                >
                  <Plus className='w-3.5 h-3.5' /> Add criterion
                </button>
              </div>

              {task['estimated_days'] !== undefined && (
                <div className='flex items-center gap-2'>
                  <label className='text-[10px] text-gray-400 dark:text-white/30 font-medium uppercase tracking-wide whitespace-nowrap'>Est. days</label>
                  <input
                    type='number'
                    min={0}
                    step={0.5}
                    value={Number(task['estimated_days'] ?? 1)}
                    onChange={e => onChange(`engineering_tasks[${ti}].estimated_days`, parseFloat(e.target.value) || 0)}
                    className={inputCls + ' w-20'}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type='button'
          onClick={() => onAddItem('engineering_tasks', { title: '', description: '', acceptance_criteria: [], estimated_days: 2 })}
          className={addBtnCls + ' mt-3'}
        >
          <Plus className='w-3.5 h-3.5' /> Add task
        </button>
      </div>

      {/* UI changes */}
      {(uiChanges.length > 0 || spec['ui_changes'] !== undefined) && (
        <StringListEditor
          label='UI changes'
          path='ui_changes'
          items={uiChanges}
          onAdd={onAddItem}
          onRemove={onRemoveItem}
          onChange={onChange}
          placeholder='UI change description...'
        />
      )}

      {/* Test plan */}
      {(testPlan.length > 0 || spec['test_plan'] !== undefined) && (
        <StringListEditor
          label='Test plan'
          path='test_plan'
          items={testPlan}
          onAdd={onAddItem}
          onRemove={onRemoveItem}
          onChange={onChange}
          placeholder='Test scenario...'
        />
      )}
    </div>
  )
}

export function OpportunityDetail({ cluster, signals, scoreHistory = [], workspaceId, onRefresh }: OpportunityDetailProps) {
  const toast = useToast()
  const [pushingLinear, setPushingLinear] = useState(false)
  const [pushingJira, setPushingJira] = useState(false)
  const [pushedLinear, setPushedLinear] = useState<string | null>(null)
  const [pushedJira, setPushedJira] = useState<string | null>(null)
  const [pushError, setPushError] = useState<string | null>(null)
  const [specBusy, setSpecBusy] = useState(false)
  const [specError, setSpecError] = useState<string | null>(null)
  const [linearConnected, setLinearConnected] = useState<boolean | null>(null)
  const [jiraConnected, setJiraConnected] = useState<boolean | null>(null)
  const [briefExpanded, setBriefExpanded] = useState(false)
  const [specRejecting, setSpecRejecting] = useState(false)
  const [specNotes, setSpecNotes] = useState('')
  const [specRejectBusy, setSpecRejectBusy] = useState(false)
  const [shipped, setShipped] = useState(cluster.status === 'shipped')
  const [shippingBusy, setShippingBusy] = useState(false)
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(false)

  // Feature 4: Agent execution (Build This)
  const [showBuildModal, setShowBuildModal] = useState(false)
  const [buildBusy, setBuildBusy] = useState(false)
  const [agentRun, setAgentRun] = useState<AgentRunStatus | null>(null)
  const [buildError, setBuildError] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Feature 5: Push to GitHub Issue
  const [pushingGithubIssue, setPushingGithubIssue] = useState(false)
  const [pushedGithubIssue, setPushedGithubIssue] = useState<string | null>(cluster.github_issue_url ?? null)

  // Feature 9: Engineer Context Panel (PR Review)
  const [prReviewData, setPrReviewData] = useState<PRReviewData | null>(null)
  const [prReviewLoading, setPrReviewLoading] = useState(false)
  const [reviewSubmitBusy, setReviewSubmitBusy] = useState(false)
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null)

  // Inline brief editing + auto-save
  const [editingBrief, setEditingBrief] = useState(false)
  const [draftBrief, setDraftBrief] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inline agent_spec field editing
  const [editingSpec, setEditingSpec] = useState(false)
  const [draftSpec, setDraftSpec] = useState<Record<string, unknown> | null>(cluster.agent_spec ?? null)

  const [accounts, setAccounts] = useState<{
    organization_id: string
    name: string
    domain: string | null
    arr_usd: number | null
    revenue_source: string
  }[]>([])

  useEffect(() => {
    fetch('/api/workspace-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setLinearConnected(data.linear_connected)
          setJiraConnected(data.jira_connected)
        }
      })
      .catch(() => {})
  }, [])

  const refresh = useCallback(async () => {
    if (onRefresh) await onRefresh()
  }, [onRefresh])

  useEffect(() => {
    if (!cluster.id) return
    const channel = supabase
      .channel(`cluster-row:${cluster.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clusters',
          filter: `id=eq.${cluster.id}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [cluster.id, refresh])

  async function redirectToOAuth(service: 'linear' | 'jira') {
    try {
      const initRes = await fetch(`/api/auth-${service}`)
      if (initRes.ok) {
        const { redirect_url } = await initRes.json()
        if (redirect_url) {
          sessionStorage.setItem('oauth_return_to', window.location.pathname)
          window.location.href = redirect_url
          return true
        }
      }
    } catch { /* fall through */ }
    return false
  }

  // Feature 9: load PR review data when a completed PR exists
  const fetchPrReview = useCallback(async () => {
    setPrReviewLoading(true)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/pr-review`)
      if (res.ok) {
        const data: PRReviewData = await res.json()
        setPrReviewData(data)
      }
    } catch { /* non-fatal */ }
    setPrReviewLoading(false)
  }, [cluster.id])

  // Load review data whenever the agentRun has a completed PR
  useEffect(() => {
    if (agentRun?.status === 'complete' && agentRun.pr_number) {
      void fetchPrReview()
    }
  }, [agentRun?.status, agentRun?.pr_number, fetchPrReview])

  async function handleSubmitReview(event: string, body: string) {
    setReviewSubmitBusy(true)
    setReviewSubmitError(null)
    try {
      const res = await fetch(
        `/api/clusters/${encodeURIComponent(cluster.id)}/pr-review/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, body }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        setReviewSubmitError(data.error ?? 'Failed to submit review')
        return
      }
      toast(`Review submitted: ${event === 'APPROVE' ? 'Approved' : 'Changes requested'}`, 'success')
      // Refresh review data to show the new review
      void fetchPrReview()
    } catch {
      setReviewSubmitError('Network error — please try again')
    } finally {
      setReviewSubmitBusy(false)
    }
  }

  // Poll agent run status until terminal state
  const pollAgentStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/execute`)
      if (!res.ok) return
      const data: AgentRunStatus = await res.json()
      setAgentRun(data)
      if (data.status === 'complete' || data.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        if (data.status === 'complete') {
          void refresh()
          // Re-derive shipped state from cluster after webhook may have fired
          setShipped(cluster.status === 'shipped')
        }
      }
    } catch { /* ignore network blips */ }
  }, [cluster.id, refresh])

  async function handleStartBuild() {
    setBuildBusy(true)
    setBuildError(null)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/execute`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setBuildError(data.error ?? 'Failed to start build')
        setBuildBusy(false)
        return
      }
      setShowBuildModal(false)
      // Start polling
      pollIntervalRef.current = setInterval(() => void pollAgentStatus(), 4000)
      void pollAgentStatus()
    } catch {
      setBuildError('Network error — please try again')
    }
    setBuildBusy(false)
  }

  // On mount, resume polling if a run is already in progress
  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/execute`).catch(() => null)
      if (!res?.ok) return
      const data: AgentRunStatus = await res.json()
      if (data.status === 'none') return
      setAgentRun(data)
      if (data.status === 'running' || data.status === 'pending') {
        pollIntervalRef.current = setInterval(() => void pollAgentStatus(), 4000)
      }
    })()
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cluster.id])

  async function handlePushToGithubIssue() {
    setPushingGithubIssue(true)
    setPushError(null)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/push-github-issue`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setPushError(data.error ?? 'Failed to create GitHub issue')
        return
      }
      setPushedGithubIssue(data.issue_url)
      toast('GitHub issue created successfully')
    } catch {
      setPushError('Network error — please try again')
    } finally {
      setPushingGithubIssue(false)
    }
  }

  async function handlePushToLinear() {
    await finalizeIfEditing()
    setPushingLinear(true)
    setPushError(null)
    if (linearConnected === false) {
      const redirected = await redirectToOAuth('linear')
      if (!redirected) setPushError('Could not start Linear connection. Please try from the Connect page.')
      setPushingLinear(false)
      return
    }
    try {
      const res = await fetch('/api/push-linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, workspace_id: workspaceId }),
      })
      if (!res.ok) {
        const err = await res.json()
        const detail = err.detail ?? 'Push to Linear failed'
        const lc = detail.toLowerCase()
        if (res.status === 401 || lc.includes('not connected') || lc.includes('expired') || lc.includes('reconnect')) {
          setLinearConnected(false)
          const redirected = await redirectToOAuth('linear')
          if (!redirected) throw new Error('Linear not connected. Please connect from the Connect page.')
          return
        }
        throw new Error(detail)
      }
      const { url } = await res.json()
      setPushedLinear(url)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Push to Linear failed'
      setPushError(message)
    } finally {
      setPushingLinear(false)
    }
  }

  async function handlePushToJira() {
    await finalizeIfEditing()
    setPushingJira(true)
    setPushError(null)
    if (jiraConnected === false) {
      const redirected = await redirectToOAuth('jira')
      if (!redirected) setPushError('Could not start Jira connection. Please try from the Connect page.')
      setPushingJira(false)
      return
    }
    try {
      const res = await fetch('/api/push-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, workspace_id: workspaceId }),
      })
      if (!res.ok) {
        const err = await res.json()
        const detail = err.detail ?? 'Push to Jira failed'
        const lc = detail.toLowerCase()
        if (res.status === 401 || lc.includes('not connected') || lc.includes('expired') || lc.includes('reconnect')) {
          setJiraConnected(false)
          const redirected = await redirectToOAuth('jira')
          if (!redirected) throw new Error('Jira not connected. Please connect from the Connect page.')
          return
        }
        throw new Error(detail)
      }
      const { url } = await res.json()
      setPushedJira(url)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Push to Jira failed'
      setPushError(message)
    } finally {
      setPushingJira(false)
    }
  }

  async function handleFeedback(action: 'approve' | 'skip' | 'dismiss') {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Could not save feedback')
      }
      const labels: Record<string, string> = { approve: 'Approved', skip: 'Skipped', dismiss: 'Dismissed' }
      toast(labels[action], action === 'approve' ? 'success' : 'info')
      void refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Feedback failed', 'error')
    }
  }

  function downloadAgentSpec() {
    if (!cluster.agent_spec) return
    const blob = new Blob([JSON.stringify(cluster.agent_spec, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent_spec_${cluster.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadDocx() {
    if (!cluster.human_brief) return
    void exportPrdToDocx(cluster.human_brief, cluster.label)
  }

  function handleDownloadPdf() {
    window.print()
  }

  async function triggerSpecGeneration(notes?: string) {
    setSpecBusy(true)
    setSpecError(null)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/generate-spec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notes ? { notes } : {}),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? err.error ?? 'Could not start spec generation')
      }
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 2500))
        const poll = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}`)
        if (poll.ok) {
          const data = await poll.json()
          if (data.cluster?.human_brief) {
            await refresh()
            return
          }
        }
      }
      await refresh()
    } catch (e: unknown) {
      setSpecError(e instanceof Error ? e.message : 'Spec generation failed')
    } finally {
      setSpecBusy(false)
    }
  }

  async function handleRejectSpec() {
    if (!specNotes.trim()) return
    setSpecRejectBusy(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cluster_id: cluster.id,
          action: 'dismiss',
          feedback_type: 'spec',
          notes: specNotes.trim(),
        }),
      })
      setSpecRejecting(false)
      setSpecNotes('')
      await triggerSpecGeneration(specNotes.trim())
    } catch {
      toast('Could not submit revision — please try again', 'error')
    } finally {
      setSpecRejectBusy(false)
    }
  }

  const hasSpec = Boolean(cluster.agent_spec && cluster.human_brief)

  async function handleShip() {
    setShippingBusy(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster_id: cluster.id, action: 'ship' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Could not mark as shipped')
      }
      setShipped(true)
      toast('Marked as shipped', 'success')
      void refresh()
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Ship failed', 'error')
    } finally {
      setShippingBusy(false)
    }
  }

  async function fetchAccounts() {
    if (accounts.length > 0) return
    setAccountsLoading(true)
    try {
      const res = await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/accounts`)
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts ?? [])
      }
    } catch { /* non-fatal */ }
    setAccountsLoading(false)
  }

  function toggleAccounts() {
    if (!accountsOpen) void fetchAccounts()
    setAccountsOpen(prev => !prev)
  }

  function startEditingBrief() {
    setDraftBrief(cluster.human_brief ?? '')
    setEditingBrief(true)
    setAutoSaveStatus('idle')
  }

  function handleDraftChange(value: string) {
    setDraftBrief(value)
    setAutoSaveStatus('idle')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving')
      try {
        await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/save-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ human_brief: value, agent_spec: draftSpec }),
        })
        setAutoSaveStatus('saved')
      } catch {
        setAutoSaveStatus('idle')
      }
    }, 3000)
  }

  async function finalizeAndClose() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaveStatus('saving')
    try {
      await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ human_brief: draftBrief, agent_spec: draftSpec }),
      })
      setAutoSaveStatus('saved')
    } catch {
      setAutoSaveStatus('idle')
    }
    setEditingBrief(false)
    setEditingSpec(false)
    await refresh()
  }

  async function finalizeIfEditing(): Promise<void> {
    if (!editingBrief && !editingSpec) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    try {
      await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_brief: editingBrief ? draftBrief : (cluster.human_brief ?? ''),
          agent_spec: draftSpec,
        }),
      })
      setEditingBrief(false)
      setEditingSpec(false)
    } catch { /* non-fatal — push still proceeds */ }
  }

  function handleSpecFieldChange(path: string, value: unknown) {
    setDraftSpec(prev => deepSet(prev ?? {} as Record<string, unknown>, path, value))
  }

  function getSpecValue(path: string): unknown {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
    let cur: unknown = draftSpec
    for (const part of parts) {
      if (cur === null || cur === undefined) return undefined
      cur = (cur as Record<string, unknown>)[part]
    }
    return cur
  }

  function addSpecItem(arrayPath: string, defaultValue: unknown = '') {
    const current = getSpecValue(arrayPath)
    const arr = Array.isArray(current) ? [...current, defaultValue] : [defaultValue]
    handleSpecFieldChange(arrayPath, arr)
  }

  function removeSpecItem(arrayPath: string, index: number) {
    const current = getSpecValue(arrayPath)
    if (!Array.isArray(current)) return
    handleSpecFieldChange(arrayPath, current.filter((_, i) => i !== index))
  }

  async function saveSpecDraft(spec: Record<string, unknown> | null) {
    try {
      await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_brief: cluster.human_brief ?? '',
          agent_spec: spec,
        }),
      })
    } catch { /* non-fatal */ }
  }

  async function finalizeSpec() {
    try {
      await fetch(`/api/clusters/${encodeURIComponent(cluster.id)}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          human_brief: cluster.human_brief ?? '',
          agent_spec: draftSpec,
        }),
      })
    } catch { /* non-fatal */ }
    setEditingSpec(false)
    await refresh()
  }

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-5xl mx-auto px-6 py-10 flex gap-6 items-start'>
        {/* Main content column */}
        <div className='flex-1 min-w-0'>
        <Link href='/opportunities' className='inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/40 hover:text-gray-600 dark:text-white/70 mb-6 transition-colors'>
          <ArrowLeft className='w-4 h-4' /> Back to Opportunities
        </Link>

        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 mb-6'>
          <div className='flex items-start justify-between gap-4 mb-6'>
            <div className='flex flex-col gap-2 min-w-0'>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white'>{cluster.label}</h1>
              {cluster.is_freeform && (
                <span className='inline-block self-start text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium'>
                  Freeform
                </span>
              )}
            </div>
            <ScoreBadge score={cluster.opportunity_score} confidence={cluster.confidence} />
          </div>

          <div className='flex flex-wrap gap-5 text-sm text-gray-500 dark:text-white/40 mb-6'>
            <span className='flex items-center gap-1.5'>
              <MessageSquare className='w-4 h-4 text-gray-400 dark:text-white/25' />
              {cluster.signal_count} tickets
            </span>
            {cluster.churn_signal_count > 0 && (
              <span className='flex items-center gap-1.5 text-orange-400'>
                <AlertTriangle className='w-4 h-4' />
                {cluster.churn_signal_count} churn signals
              </span>
            )}
            {cluster.recent_signal_count > 0 && (
              <span className='flex items-center gap-1.5 text-amber-400'>
                <Clock className='w-4 h-4' />
                {cluster.recent_signal_count} recent (30d)
              </span>
            )}
            {(cluster.unique_orgs ?? 0) > 0 && (
              <button
                type='button'
                onClick={toggleAccounts}
                className='flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors'
              >
                <Users className='w-4 h-4' />
                {cluster.unique_orgs} accounts affected
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${accountsOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
              <span className='flex items-center gap-1.5 text-emerald-400'>
                <DollarSign className='w-4 h-4' />
                {formatRevenue(cluster.revenue_at_risk_usd)} at risk
                <span className='text-xs text-gray-400 dark:text-white/30 italic'>
                  {cluster.revenue_source === 'crm' ? 'CRM' : 'AI estimate'}
                </span>
              </span>
            )}
          </div>

          <div className='flex flex-wrap gap-2 pb-6 border-b border-gray-100 dark:border-white/[0.07]'>
            <button
              type='button'
              onClick={() => void handleFeedback('approve')}
              className='flex items-center gap-1 text-xs text-emerald-400 hover:bg-emerald-500/10 px-3 py-2 rounded-lg font-medium border border-emerald-500/20 transition-colors'
            >
              <ThumbsUp className='w-3.5 h-3.5' /> Approve
            </button>
            <button
              type='button'
              onClick={() => void handleFeedback('skip')}
              className='flex items-center gap-1 text-xs text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:bg-white/[0.06] px-3 py-2 rounded-lg font-medium border border-gray-200 dark:border-white/[0.08] transition-colors'
            >
              <SkipForward className='w-3.5 h-3.5' /> Skip
            </button>
            <button
              type='button'
              onClick={() => void handleFeedback('dismiss')}
              className='flex items-center gap-1 text-xs text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg font-medium border border-red-500/20 transition-colors'
            >
              <X className='w-3.5 h-3.5' /> Dismiss
            </button>
            {cluster.status === 'shipped' && cluster.merged_by ? (
              <span className='flex items-center gap-1.5 text-xs text-emerald-400 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5'>
                <CheckCircle2 className='w-3.5 h-3.5' />
                Shipped by @{cluster.merged_by}
              </span>
            ) : (
            <button
              type='button'
              disabled={shippingBusy || shipped}
              onClick={() => void handleShip()}
              className='flex items-center gap-1 text-xs text-violet-400 hover:bg-violet-500/10 px-3 py-2 rounded-lg font-medium border border-violet-500/20 disabled:opacity-50 transition-colors'
            >
              <Package className='w-3.5 h-3.5' />
              {shippingBusy ? 'Marking…' : shipped ? 'Shipped ✓' : 'Mark as shipped'}
            </button>
            )}
          </div>


          {/* Affected accounts drawer */}
          {accountsOpen && (
            <div className='border-t border-gray-100 dark:border-white/[0.07] pt-5 mt-5'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3'>
                <Building2 className='w-4 h-4 text-violet-400' />
                Affected accounts
              </h3>
              {accountsLoading ? (
                <div className='space-y-2'>
                  {[1, 2, 3].map(i => (
                    <div key={i} className='h-10 bg-gray-100 dark:bg-white/[0.05] rounded-xl animate-pulse' />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-white/30'>No account data available.</p>
              ) : (
                <div className='space-y-1'>
                  {accounts.map(acc => (
                    <div key={acc.organization_id} className='flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:bg-white/[0.04] transition-colors'>
                      <div className='min-w-0'>
                        <p className='text-sm font-medium text-gray-700 dark:text-white/80 truncate'>{acc.name}</p>
                        {acc.domain && (
                          <p className='text-xs text-gray-400 dark:text-white/30'>{acc.domain}</p>
                        )}
                      </div>
                      {acc.arr_usd ? (
                        <div className='shrink-0 flex items-center gap-1.5'>
                          <span className='text-sm font-semibold text-emerald-400'>
                            {formatRevenue(acc.arr_usd)}
                          </span>
                          <span className='text-[10px] text-gray-400 dark:text-white/30 font-medium bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full'>
                            {acc.revenue_source === 'crm' ? 'CRM' : 'est'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className='border-t border-gray-100 dark:border-white/[0.07] pt-6 mt-6'>
            <ScoreBreakdownPanel
              cluster={cluster}
              mlModelVersion={cluster.scoring_model?.startsWith('ml_v') ? parseInt(cluster.scoring_model.slice(4)) : 0}
              scoreHistory={scoreHistory}
            />
          </div>

          {(cluster.revenue_at_risk_usd ?? 0) > 0 && (
            <div className='border-t border-gray-100 dark:border-white/[0.07] pt-5 mt-5'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-500 dark:text-white/50 font-medium flex items-center gap-1.5'>
                  <DollarSign className='w-3.5 h-3.5 text-gray-400 dark:text-white/25' />
                  Revenue at risk
                </span>
                <div className='flex items-center gap-2'>
                  <span className='text-lg font-bold text-emerald-400'>{formatRevenue(cluster.revenue_at_risk_usd)}</span>
                  <span className='text-xs text-gray-400 dark:text-white/30 italic'>
                    {cluster.revenue_source === 'crm' ? 'CRM' : 'AI estimate'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Scoring transparency panel */}
          <div className='border-t border-gray-100 dark:border-white/[0.07] pt-5 mt-5 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-gray-500 dark:text-white/40 font-medium'>Scoring model</span>
              <div className='flex items-center gap-2'>
                {cluster.ml_review_needed && (
                  <span className='text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full'>
                    Review needed
                  </span>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  cluster.scoring_model?.startsWith('ml_')
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {cluster.scoring_model?.startsWith('ml_v')
                    ? `Personalized ML v${cluster.scoring_model.slice(4)}`
                    : 'Formula'}
                </span>
              </div>
            </div>
            {scoreHistory.length >= 2 && (
              <div>
                <span className='text-xs text-gray-500 dark:text-white/40 font-medium'>Score trend</span>
                <div className='mt-1.5'>
                  <ScoreSparkline history={scoreHistory} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 mb-6'>
          <div className='flex items-center justify-between gap-3 mb-4'>
            <h2 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <Sparkles className='w-4 h-4 text-sky-400' />
              Opportunity brief & agent spec
            </h2>
            <div className='flex flex-wrap gap-2'>
              {cluster.human_brief && (
                <>
                  <button
                    type='button'
                    onClick={handleDownloadPdf}
                    className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60 bg-gray-100 dark:bg-white/[0.05] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:bg-white/[0.08] transition-colors'
                  >
                    <FileText className='w-3.5 h-3.5' />
                    PDF
                  </button>
                  <button
                    type='button'
                    onClick={handleDownloadDocx}
                    className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60 bg-gray-100 dark:bg-white/[0.05] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:bg-white/[0.08] transition-colors'
                  >
                    <FileDown className='w-3.5 h-3.5' />
                    DOCX
                  </button>
                </>
              )}
              {cluster.agent_spec && (
                <button
                  type='button'
                  onClick={downloadAgentSpec}
                  className='inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 px-3 py-2 rounded-lg border border-sky-500/20 hover:bg-sky-500/15 transition-colors'
                >
                  <Download className='w-3.5 h-3.5' />
                  agent_spec.json
                </button>
              )}
              {cluster.pm_rating === 'approve' && (
                <Link
                  href={`/opportunities/${encodeURIComponent(cluster.id)}/plan`}
                  className='inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 px-3 py-2 rounded-lg border border-violet-500/20 hover:bg-violet-500/15 transition-colors'
                >
                  <Map className='w-3.5 h-3.5' />
                  {cluster.selected_plan_id ? 'Change Plan' : 'Explore Plans'}
                </Link>
              )}
              <button
                type='button'
                disabled={specBusy}
                onClick={() => void triggerSpecGeneration()}
                className='inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-white/60 bg-gray-100 dark:bg-white/[0.06] px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:bg-white/[0.09] disabled:opacity-50 transition-colors'
              >
                <Sparkles className='w-3.5 h-3.5' />
                {specBusy ? 'Generating…' : hasSpec ? 'Regenerate' : 'Generate'}
              </button>
              {hasSpec && (
                <button
                  type='button'
                  disabled={specBusy}
                  onClick={() => setSpecRejecting(r => !r)}
                  className='inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 hover:bg-amber-500/15 disabled:opacity-50 transition-colors'
                >
                  <RefreshCw className='w-3.5 h-3.5' />
                  Request revision
                </button>
              )}
            </div>
          </div>

          {specRejecting && (
            <div className='mb-4 p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl space-y-3'>
              <p className='text-xs font-medium text-amber-300'>
                Describe what's wrong — this note is sent to Claude for the next generation.
              </p>
              <textarea
                value={specNotes}
                onChange={e => setSpecNotes(e.target.value)}
                placeholder='e.g. "We use GraphQL not REST" or "Our frontend is SvelteKit, not React"'
                rows={3}
                className='w-full bg-white/[0.05] border border-amber-500/20 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 outline-none focus:border-amber-500/40 resize-none transition-all'
              />
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  disabled={!specNotes.trim() || specRejectBusy || specBusy}
                  onClick={() => void handleRejectSpec()}
                  className='text-xs font-medium text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors'
                >
                  {specRejectBusy || specBusy ? 'Regenerating…' : 'Submit & regenerate'}
                </button>
                <button
                  type='button'
                  onClick={() => { setSpecRejecting(false); setSpecNotes('') }}
                  className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-500 dark:text-white/50 transition-colors'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {specError && (
            <p className='text-sm text-red-400 mb-3'>{specError}</p>
          )}
          {specBusy && !cluster.human_brief && (
            <p className='text-sm text-gray-500 dark:text-white/40 mb-3 animate-pulse'>
              Analysing evidence and drafting specification… this can take 15–45 seconds.
            </p>
          )}
          {cluster.agent_spec && (
            <div className='mt-6 border-t border-gray-100 dark:border-white/[0.07] pt-5'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-xs font-semibold text-gray-700 dark:text-white/60 uppercase tracking-wide'>Agent spec fields</h3>
                {!editingSpec ? (
                  <button
                    type='button'
                    onClick={() => {
                      setDraftSpec(cluster.agent_spec ?? null)
                      setEditingSpec(true)
                    }}
                    className='inline-flex items-center gap-1 text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:text-white/60 transition-colors'
                  >
                    <Pencil className='w-3 h-3' /> Edit spec
                  </button>
                ) : (
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => { setEditingSpec(false); setDraftSpec(cluster.agent_spec ?? null) }}
                      className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-500 dark:text-white/50 transition-colors'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        void saveSpecDraft(draftSpec)
                        void finalizeSpec()
                      }}
                      className='inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors'
                    >
                      <Check className='w-3.5 h-3.5' /> Save spec
                    </button>
                  </div>
                )}
              </div>

              {editingSpec ? (
                <SpecEditor
                  draftSpec={draftSpec}
                  onChange={handleSpecFieldChange}
                  onAddItem={addSpecItem}
                  onRemoveItem={removeSpecItem}
                />
              ) : (
                <div className='space-y-2'>
                  {typeof (cluster.agent_spec as Record<string, unknown> | null)?.['feature'] === 'object' &&
                    Boolean(((cluster.agent_spec as Record<string, unknown>)['feature'] as Record<string, unknown>)['problem_statement']) && (
                    <div>
                      <p className='text-[10px] text-gray-400 dark:text-white/30 font-medium uppercase tracking-wide mb-1'>Problem statement</p>
                      <p className='text-sm text-gray-700 dark:text-white/70 leading-relaxed'>
                        {String(((cluster.agent_spec as Record<string, unknown>)['feature'] as Record<string, unknown>)['problem_statement'])}
                      </p>
                    </div>
                  )}
                  {Array.isArray((cluster.agent_spec as Record<string, unknown> | null)?.['engineering_tasks']) && (
                    <div>
                      <p className='text-[10px] text-gray-400 dark:text-white/30 font-medium uppercase tracking-wide mb-1'>
                        {((cluster.agent_spec as Record<string, unknown>)['engineering_tasks'] as unknown[]).length} engineering tasks
                      </p>
                      <div className='space-y-1'>
                        {(((cluster.agent_spec as Record<string, unknown>)['engineering_tasks']) as Record<string, unknown>[]).slice(0, 4).map((task, i) => (
                          <div key={i} className='flex items-center gap-2 text-sm text-gray-600 dark:text-white/50'>
                            <span className='w-5 h-5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold flex items-center justify-center shrink-0'>{i + 1}</span>
                            {String(task['title'] ?? '')}
                          </div>
                        ))}
                        {((cluster.agent_spec as Record<string, unknown>)['engineering_tasks'] as unknown[]).length > 4 && (
                          <p className='text-xs text-gray-400 dark:text-white/30 pl-7'>
                            +{((cluster.agent_spec as Record<string, unknown>)['engineering_tasks'] as unknown[]).length - 4} more — click Edit spec to view all
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {cluster.human_brief ? (
            <div>
              {editingBrief ? (
                <div className='space-y-3'>
                  <BriefEditor
                    initialContent={draftBrief}
                    onChange={handleDraftChange}
                  />
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-[10px] text-gray-400 dark:text-white/25'>
                      {autoSaveStatus === 'saving' ? 'Saving…' : autoSaveStatus === 'saved' ? 'Draft saved' : 'Edits auto-save every 3 s'}
                    </span>
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => { setEditingBrief(false); setAutoSaveStatus('idle') }}
                        className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:text-white/60 transition-colors'
                      >
                        Cancel
                      </button>
                      <button
                        type='button'
                        onClick={() => void finalizeAndClose()}
                        className='inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors'
                      >
                        <Check className='w-3.5 h-3.5' />
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    className={`relative overflow-hidden transition-[max-height] duration-300 ease-in-out ${briefExpanded ? 'max-h-none' : 'max-h-64'}`}
                  >
                    <div className='prd-document max-w-none' id='prd-content'>
                      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{cluster.human_brief}</ReactMarkdown>
                    </div>
                    {!briefExpanded && (
                      <div className='absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-[#1A1D24] to-transparent pointer-events-none' />
                    )}
                  </div>
                  <div className='flex items-center justify-between mt-1'>
                    <button
                      type='button'
                      onClick={() => startEditingBrief()}
                      className='inline-flex items-center gap-1 text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:text-white/60 py-2 transition-colors'
                    >
                      <Pencil className='w-3 h-3' /> Edit brief
                    </button>
                    <button
                      type='button'
                      onClick={() => setBriefExpanded(!briefExpanded)}
                      className='flex items-center gap-1 text-xs text-gray-500 dark:text-white/40 hover:text-gray-600 dark:text-white/70 py-2 transition-colors'
                    >
                      {briefExpanded ? 'Show less' : 'Show more'}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${briefExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className='text-gray-400 dark:text-white/30 text-sm'>
              No brief yet. Scoring runs spec generation automatically; use Generate if you need to retry.
            </p>
          )}
        </div>

        {/* Push row — Linear, Jira, GitHub Issue */}
        <div className='flex gap-3 mb-3 flex-wrap'>
          {pushedLinear ? (
            <a
              href={pushedLinear}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-emerald-500 transition-colors'
            >
              Pushed to Linear <ExternalLink className='w-4 h-4' />
            </a>
          ) : (
            <button
              type='button'
              onClick={() => void handlePushToLinear()}
              disabled={pushingLinear}
              className='flex-1 bg-blue-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingLinear ? 'Creating ticket...' : linearConnected === false ? 'Connect Linear' : 'Push to Linear'}
            </button>
          )}

          {pushedJira ? (
            <a
              href={pushedJira}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-emerald-500 transition-colors'
            >
              Pushed to Jira <ExternalLink className='w-4 h-4' />
            </a>
          ) : (
            <button
              type='button'
              onClick={() => void handlePushToJira()}
              disabled={pushingJira}
              className='flex-1 bg-blue-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {pushingJira ? 'Creating ticket...' : jiraConnected === false ? 'Connect Jira' : 'Push to Jira'}
            </button>
          )}

          {/* Feature 5 outbound: Push to GitHub Issue */}
          {pushedGithubIssue ? (
            <a
              href={pushedGithubIssue}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm hover:bg-emerald-500 transition-colors'
            >
              <Github className='w-4 h-4' /> View GitHub Issue <ExternalLink className='w-3.5 h-3.5' />
            </a>
          ) : (
            <button
              type='button'
              onClick={() => void handlePushToGithubIssue()}
              disabled={pushingGithubIssue || !hasSpec}
              className='flex-1 inline-flex items-center justify-center gap-2 bg-gray-800 dark:bg-white/10 text-white font-medium py-3 rounded-xl text-sm hover:bg-gray-700 dark:hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              title={!hasSpec ? 'Generate a spec first' : 'Create a GitHub Issue with the embedded agent_spec.json'}
            >
              {pushingGithubIssue
                ? <><Loader2 className='w-4 h-4 animate-spin' /> Creating…</>
                : <><Github className='w-4 h-4' /> Push to GitHub Issue</>}
            </button>
          )}
        </div>

        {/* Feature 4: Build This button */}
        {hasSpec && (
          <div className='mb-6'>
            {agentRun && agentRun.status !== 'none' ? (
              <AgentProgressBoard run={agentRun} onRebuild={handleStartBuild} />
            ) : (
              <button
                type='button'
                onClick={() => setShowBuildModal(true)}
                className='w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer'
              >
                <Zap className='w-4 h-4' /> Build This Feature
              </button>
            )}
            {buildError && (
              <p className='mt-2 text-xs text-red-400'>{buildError}</p>
            )}
          </div>
        )}

        {/* Feature 9: Engineer Context Panel — shown when a PR exists */}
        {agentRun?.status === 'complete' && agentRun.pr_number && (
          prReviewLoading && !prReviewData ? (
            <div className='mb-6 flex items-center gap-2 text-xs text-gray-400 dark:text-white/30'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' /> Loading PR review data…
            </div>
          ) : prReviewData ? (
            <PRReviewPanel
              clusterId={cluster.id}
              data={prReviewData}
              onSubmitReview={handleSubmitReview}
              submitBusy={reviewSubmitBusy}
              submitError={reviewSubmitError}
            />
          ) : null
        )}

        {pushError && (
          <div className='mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl'>
            <p className='text-sm text-red-400'>{pushError}</p>
          </div>
        )}

        {/* Feature 3: Validation badges */}
        {cluster.agent_spec_validation && !cluster.agent_spec_validation.skipped && (
          <div className='mb-6 flex flex-wrap gap-2 items-center'>
            <span className='text-xs text-gray-400 dark:text-white/30'>File paths:</span>
            {(cluster.agent_spec_validation.verified ?? 0) > 0 && (
              <span className='inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full'>
                <CheckCircle2 className='w-3 h-3' /> {cluster.agent_spec_validation.verified} verified
              </span>
            )}
            {(cluster.agent_spec_validation.auto_corrected ?? 0) > 0 && (
              <span className='inline-flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full'>
                <RefreshCw className='w-3 h-3' /> {cluster.agent_spec_validation.auto_corrected} auto-corrected
              </span>
            )}
            {(cluster.agent_spec_validation.unverified ?? 0) > 0 && (
              <span className='inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full'
                title={(cluster.agent_spec_validation.unverified_paths ?? []).join(', ')}>
                <AlertTriangle className='w-3 h-3' /> {cluster.agent_spec_validation.unverified} unverified
              </span>
            )}
          </div>
        )}

        {/* Build This confirmation modal */}
        {showBuildModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm' onClick={() => setShowBuildModal(false)}>
            <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 max-w-md w-full mx-4 shadow-2xl' onClick={e => e.stopPropagation()}>
              <div className='w-12 h-12 bg-violet-500/10 rounded-2xl mx-auto mb-5 flex items-center justify-center'>
                <Zap className='w-6 h-6 text-violet-400' />
              </div>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-1 text-center'>Build This Feature</h2>
              <p className='text-gray-500 dark:text-white/40 text-sm mb-6 text-center leading-relaxed'>
                SignalPath will create a branch, generate code for each engineering task, and open an evidence-rich pull request.
              </p>
              <ul className='space-y-2 mb-6'>
                {(['Create feature branch', 'Generate code for each task', 'Open pull request with evidence chain'] as const).map(step => (
                  <li key={step} className='flex items-center gap-2 text-sm text-gray-600 dark:text-white/60'>
                    <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' /> {step}
                  </li>
                ))}
              </ul>
              <p className='text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg mb-5 text-center'>
                ⚠ Code changes require engineer review before merge.
              </p>
              <div className='flex gap-3'>
                <button
                  type='button'
                  onClick={() => setShowBuildModal(false)}
                  className='flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={() => void handleStartBuild()}
                  disabled={buildBusy}
                  className='flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
                >
                  {buildBusy ? <><Loader2 className='w-4 h-4 animate-spin' /> Starting…</> : <><Zap className='w-4 h-4' /> Start Build</>}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
          <h2 className='text-sm font-semibold text-gray-900 dark:text-white mb-5'>
            Evidence ({signals.length} tickets)
          </h2>
          {signals.length === 0 ? (
            <p className='text-gray-400 dark:text-white/30 text-sm'>No ticket evidence available yet.</p>
          ) : (
            <div className='space-y-1'>
              {signals.map(signal => (
                <div key={signal.id} className='rounded-xl p-4 hover:bg-gray-50 dark:bg-white/[0.03] transition-colors -mx-2'>
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-xs text-gray-400 dark:text-white/30 font-medium'>
                      {new Date(signal.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                    {signal.churn_flag && (
                      <span className='inline-flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full font-medium'>
                        <AlertTriangle className='w-3 h-3' /> Churn risk
                      </span>
                    )}
                  </div>
                  <p className='text-sm text-gray-500 dark:text-white/60 leading-relaxed'>
                    {signal.text.length > 200 ? signal.text.slice(0, 200) + '...' : signal.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* End main content column */}
        </div>

        {/* PR Activity Feed sidebar */}
        <PRFeedPanel clusterId={cluster.id} />
      </div>
    </div>
  )
}
