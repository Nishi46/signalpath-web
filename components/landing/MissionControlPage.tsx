'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Code2,
  X,
  CheckCircle,
  ChevronRight,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react'
import { BentoSection } from './BentoSection'
import { useTheme } from '../ThemeProvider'

// ─── Mock Data ────────────────────────────────────────────────────────────────

type Opportunity = {
  id: string
  title: string
  score: number
  tickets: number
  churn: number
  revenue: number
  dims: Record<string, number>
  verbatims: { text: string; from: string }[]
}

const OPPS: Opportunity[] = [
  {
    id: 'opp_1',
    title: 'OAuth token expiry crashes API integrations mid-session',
    score: 9.1,
    tickets: 47,
    churn: 12,
    revenue: 284000,
    dims: {
      'Churn Risk': 9.8,
      'Account Breadth': 9.4,
      'Severity': 9.2,
      'Frequency': 8.9,
      'Recency': 8.6,
      'Revenue': 9.0,
    },
    verbatims: [
      {
        text: "We're losing 3 active sessions per hour because of token expiry. This is costing us a critical demo with Acme Corp tomorrow.",
        from: 'Enterprise · $240K ARR',
      },
      {
        text: "Had to roll back our Salesforce integration twice this week. Engineering is spending more time on this than our actual roadmap.",
        from: 'Mid-market · $72K ARR',
      },
      {
        text: "This bug alone is why we're evaluating switching vendors before our contract renewal in Q2.",
        from: 'Enterprise · $180K ARR',
      },
    ],
  },
  {
    id: 'opp_2',
    title: 'Bulk export times out for accounts with >10k records',
    score: 8.4,
    tickets: 38,
    churn: 8,
    revenue: 196000,
    dims: {
      'Churn Risk': 7.9,
      'Account Breadth': 8.2,
      'Severity': 8.5,
      'Frequency': 8.1,
      'Recency': 8.8,
      'Revenue': 8.3,
    },
    verbatims: [
      {
        text: "Every Monday morning sync fails. We've built a workaround but it takes 2 hours of manual work each week.",
        from: 'Enterprise · $156K ARR',
      },
      {
        text: 'Finance team is blocked on quarterly reporting. This is a P0 for us.',
        from: 'Mid-market · $84K ARR',
      },
    ],
  },
  {
    id: 'opp_3',
    title: 'Webhook delivery fails silently on 4xx client errors',
    score: 7.7,
    tickets: 29,
    churn: 5,
    revenue: 147000,
    dims: {
      'Churn Risk': 7.2,
      'Account Breadth': 7.4,
      'Severity': 7.9,
      'Frequency': 7.6,
      'Recency': 7.8,
      'Revenue': 7.5,
    },
    verbatims: [
      {
        text: "Silent failures are the worst. We had no idea data wasn't syncing for 2 weeks.",
        from: 'Growth · $48K ARR',
      },
      {
        text: 'Need dead-letter queue or at minimum email alerts when webhooks fail.',
        from: 'Mid-market · $95K ARR',
      },
    ],
  },
  {
    id: 'opp_4',
    title: 'Custom field mapping lost after workspace migration',
    score: 6.2,
    tickets: 22,
    churn: 2,
    revenue: 89000,
    dims: {
      'Churn Risk': 5.8,
      'Account Breadth': 6.0,
      'Severity': 6.5,
      'Frequency': 6.3,
      'Recency': 6.1,
      'Revenue': 6.4,
    },
    verbatims: [
      {
        text: "Migration took 3 days to re-map everything. There should be an export/import for field configs.",
        from: 'Enterprise · $210K ARR',
      },
    ],
  },
  {
    id: 'opp_5',
    title: 'Dashboard filter state not persisted across page reloads',
    score: 5.8,
    tickets: 18,
    churn: 1,
    revenue: 45000,
    dims: {
      'Churn Risk': 4.8,
      'Account Breadth': 5.5,
      'Severity': 5.9,
      'Frequency': 5.7,
      'Recency': 6.2,
      'Revenue': 5.4,
    },
    verbatims: [
      {
        text: "Every time I reload the page I have to re-apply my filters. It's death by a thousand cuts.",
        from: 'Growth · $36K ARR',
      },
    ],
  },
]

const SPEC_JSON = `{
  "opportunity_id": "opp_9f2a3c",
  "schema_version": "1.2",
  "generated_at": "2026-04-20T09:14:33Z",
  "title": "OAuth token expiry crashes API integrations",
  "priority": "critical",
  "score": 9.1,
  "affected_accounts": 47,
  "revenue_at_risk_usd": 284000,
  "churn_signals": 12,
  "recommended_action": "ship_fix",
  "spec": {
    "problem_statement": "OAuth2 access tokens expire after 1h with no silent refresh, terminating active API sessions and requiring full re-auth.",
    "acceptance_criteria": [
      "Implement silent token refresh 5 min before expiry",
      "Add refresh token rotation with 30-day TTL",
      "Emit auth.token_refreshed event to audit log",
      "Zero session interruptions in staging for 48h"
    ],
    "affected_services": [
      "api-gateway",
      "auth-service",
      "session-manager"
    ],
    "suggested_assignee": "platform-team",
    "estimated_effort": "3-5 days"
  },
  "evidence": {
    "verbatim_count": 47,
    "top_accounts": [
      { "name": "Acme Corp", "arr": 240000 },
      { "name": "GlobalTech", "arr": 180000 }
    ]
  }
}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 8) return { bar: '#F97316', text: '#FB923C', badge: 'text-orange-400 bg-orange-500/10 ring-1 ring-orange-500/20' }
  if (score >= 6) return { bar: '#F59E0B', text: '#FBBF24', badge: 'text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/20' }
  return { bar: '#64748B', text: '#94A3B8', badge: 'text-slate-400 bg-slate-500/10 ring-1 ring-slate-500/20' }
}

function fmt(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n}`
}

// ─── FeedCard ─────────────────────────────────────────────────────────────────

function FeedCard({
  opp,
  isSelected,
  isTop,
  compact,
  onClick,
}: {
  opp: Opportunity
  isSelected: boolean
  isTop: boolean
  compact: boolean
  onClick: () => void
}) {
  const { bar, badge } = scoreColor(opp.score)
  return (
    <button
      onClick={onClick}
      className={[
        'relative w-full text-left rounded-xl overflow-hidden transition-all duration-200 border group',
        isSelected
          ? 'border-blue-500/40 bg-white dark:bg-[#1A1D24]'
          : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#1A1D24] hover:border-gray-300 dark:hover:border-white/[0.14] hover:bg-gray-50 dark:hover:bg-[#1E2129]',
        isTop && !isSelected ? 'animate-glow-pulse' : '',
      ].join(' ')}
    >
      {/* score bar accent */}
      <div className='absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl' style={{ backgroundColor: bar }} />

      <div className={`pl-4 pr-3 ${compact ? 'py-2.5' : 'py-3'}`}>
        <div className='flex items-start justify-between gap-2 mb-1.5'>
          <span
            className={`font-semibold text-gray-800 dark:text-white/90 leading-snug flex-1 ${compact ? 'text-[11px] line-clamp-2' : 'text-xs line-clamp-2'} group-hover:text-gray-900 dark:group-hover:text-white transition-colors`}
          >
            {opp.title}
          </span>
          <span className={`flex-shrink-0 font-display font-bold rounded-md px-1.5 py-0.5 tabular-nums ${compact ? 'text-[10px]' : 'text-xs'} ${badge}`}>
            {opp.score.toFixed(1)}
          </span>
        </div>
        {!compact && (
          <div className='flex items-center gap-3 text-[10px] text-gray-400 dark:text-white/35'>
            <span className='flex items-center gap-1'>
              <MessageSquare className='w-3 h-3' />
              {opp.tickets}
            </span>
            {opp.churn > 0 && (
              <span className='flex items-center gap-1 text-orange-400/70'>
                <AlertTriangle className='w-3 h-3' />
                {opp.churn} churn
              </span>
            )}
            <span className='flex items-center gap-1 text-emerald-400/70'>
              <DollarSign className='w-3 h-3' />
              {fmt(opp.revenue)}
            </span>
          </div>
        )}
      </div>

      {/* pulsing dot for top card */}
      {isTop && (
        <span className='absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-orange-400 animate-dot-pulse' />
      )}
    </button>
  )
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

function DetailPanel({
  opp,
  onClose,
  onGenerateSpec,
}: {
  opp: Opportunity
  onClose: () => void
  onGenerateSpec: () => void
}) {
  const [animated, setAnimated] = useState(false)
  const { bar, text } = scoreColor(opp.score)

  useEffect(() => {
    setAnimated(false)
    const t = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(t)
  }, [opp.id])

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex items-start gap-3 mb-4'>
        <h2 className='text-sm font-bold text-gray-900 dark:text-white leading-snug flex-1'>{opp.title}</h2>
        <button
          onClick={onClose}
          className='text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/60 transition-colors flex-shrink-0 mt-0.5'
          aria-label='Close'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* Score hero */}
      <div className='flex items-end gap-3 mb-5'>
        <span className='font-display text-4xl font-bold leading-none' style={{ color: text }}>
          {opp.score.toFixed(1)}
        </span>
        <div className='text-[10px] text-gray-400 dark:text-white/35 pb-1 space-y-0.5'>
          <div>{opp.tickets} tickets · {opp.churn} churn signals</div>
          <div className='text-emerald-400/70'>{fmt(opp.revenue)} revenue at risk</div>
        </div>
      </div>

      {/* Score dimensions */}
      <div className='mb-5'>
        <p className='text-[10px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest mb-2.5'>
          Score Breakdown
        </p>
        <div className='space-y-2'>
          {Object.entries(opp.dims).map(([dim, val]) => (
            <div key={dim} className='flex items-center gap-2.5'>
              <span className='text-[10px] text-gray-500 dark:text-white/45 w-28 flex-shrink-0'>{dim}</span>
              <div className='flex-1 bg-gray-200 dark:bg-white/[0.06] rounded-full h-1 overflow-hidden'>
                <div
                  className='h-full rounded-full'
                  style={{
                    width: animated ? `${(val / 10) * 100}%` : '0%',
                    backgroundColor: bar,
                    transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
              <span className='font-mono text-[10px] text-gray-400 dark:text-white/35 w-6 text-right'>{val.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Verbatims */}
      <div className='flex-1 overflow-y-auto min-h-0 mb-4'>
        <p className='text-[10px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest mb-2.5'>
          Representative Signals
        </p>
        <div className='space-y-2'>
          {opp.verbatims.map((v, i) => (
            <div key={i} className='bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3 border border-gray-200 dark:border-white/[0.06]'>
              <p className='text-[11px] text-gray-600 dark:text-white/65 leading-relaxed italic mb-1.5'>
                &ldquo;{v.text}&rdquo;
              </p>
              <p className='text-[10px] text-gray-400 dark:text-white/25'>{v.from}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onGenerateSpec}
        className='flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex-shrink-0'
      >
        <Code2 className='w-3.5 h-3.5' />
        Generate Spec
        <ChevronRight className='w-3.5 h-3.5' />
      </button>
    </div>
  )
}

// ─── SpecPanel ────────────────────────────────────────────────────────────────

function SpecPanel({ specText, onClose }: { specText: string; onClose: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [specText])

  return (
    <div className='h-full flex flex-col bg-[#0D1117] rounded-2xl border border-white/[0.07] overflow-hidden animate-slide-in-right'>
      {/* Title bar */}
      <div className='flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0'>
        <div className='flex items-center gap-2.5'>
          <div className='flex gap-1.5'>
            <span className='w-2.5 h-2.5 rounded-full bg-red-500/50' />
            <span className='w-2.5 h-2.5 rounded-full bg-yellow-500/50' />
            <span className='w-2.5 h-2.5 rounded-full bg-green-500/50' />
          </div>
          <span className='font-mono text-[10px] text-white/50'>agent_spec.json</span>
        </div>
        <button
          onClick={onClose}
          className='text-white/20 hover:text-white/50 transition-colors'
          aria-label='Close spec'
        >
          <X className='w-3.5 h-3.5' />
        </button>
      </div>
      <div className='flex-1 overflow-y-auto p-4'>
        <pre className='font-mono text-[11px] leading-relaxed whitespace-pre-wrap'>
          <JsonHighlight text={specText} />
          {specText.length < SPEC_JSON.length && (
            <span className='text-white/60 animate-pulse'>█</span>
          )}
        </pre>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── JSON Syntax Highlight ────────────────────────────────────────────────────

function JsonHighlight({ text }: { text: string }) {
  const tokens = text.split(/("(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b|[{}\[\],:])/g)
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('"')) {
          const isKey = i + 1 < tokens.length && tokens[i + 1]?.trim() === ':'
          return (
            <span key={i} className={isKey ? 'text-blue-400' : 'text-emerald-400'}>
              {tok}
            </span>
          )
        }
        if (/^\d/.test(tok)) return <span key={i} className='text-orange-400'>{tok}</span>
        if (tok === 'true' || tok === 'false' || tok === 'null')
          return <span key={i} className='text-purple-400'>{tok}</span>
        if (['{', '}', '[', ']', ',', ':'].includes(tok))
          return <span key={i} className='text-white/30'>{tok}</span>
        return <span key={i} className='text-white/50'>{tok}</span>
      })}
    </>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How does SignalPath work?',
    a: 'Connect your help desk (Zendesk, Intercom, or Freshdesk) and SignalPath analyzes your support conversations with ML to cluster related tickets, score them by business impact, and surface ranked product opportunities.',
  },
  {
    q: 'How long until I see results?',
    a: "You'll see your first ranked opportunities within 48 hours of connecting your help desk — usually sooner. The scoring model improves continuously as your team rates opportunities.",
  },
  {
    q: 'What integrations do you support?',
    a: 'We ingest from Zendesk, Intercom, and Freshdesk today. For output, you can push opportunities directly to Linear, Jira, or GitHub Issues with a single click.',
  },
  {
    q: 'How are opportunities scored?',
    a: 'Each cluster is scored across six dimensions: churn risk, account breadth, severity, frequency, recency, and revenue at risk. Scores are weighted by your team\'s rating history as you use the product.',
  },
  {
    q: 'Is my customer data secure?',
    a: 'Yes. All data is encrypted in transit and at rest. We never share your data with third parties or use it to train shared models.',
  },
  {
    q: 'How much does it cost?',
    a: "We're currently in early access with a limited number of design partners. Pricing will be usage-based on volume of support conversations analyzed. Drop us a note to discuss.",
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className='max-w-2xl mx-auto divide-y divide-gray-200 dark:divide-white/[0.07]'>
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className='w-full flex items-center justify-between gap-4 py-5 text-left'
          >
            <span className='text-sm font-semibold text-gray-900 dark:text-white'>{faq.q}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          {open === i && (
            <p className='text-sm text-gray-500 dark:text-white/50 leading-relaxed pb-5'>
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Hero Email Capture ───────────────────────────────────────────────────────

function HeroEmailCapture() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setDone(true)
    } catch {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className='flex items-center gap-2.5 justify-center text-sm text-gray-600 dark:text-white/60'>
        <CheckCircle className='w-5 h-5 text-emerald-500 flex-shrink-0' />
        You&rsquo;re on the list — we&rsquo;ll be in touch within 24 hours.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex gap-2 max-w-sm mx-auto'>
      <input
        type='email'
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder='you@company.com'
        className='flex-1 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:border-blue-500/70 transition-colors shadow-sm'
      />
      <button
        type='submit'
        disabled={loading}
        className='bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap shadow-lg shadow-blue-600/20'
      >
        {loading ? 'Saving…' : 'Get access'}
      </button>
    </form>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MissionControlPage() {
  const { theme, toggle } = useTheme()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSpec, setShowSpec] = useState(false)
  const [specText, setSpecText] = useState('')
  const specIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const specIndexRef = useRef(0)

  const selected = OPPS.find(o => o.id === selectedId) ?? null

  // Start typewriter for spec JSON
  const startSpec = useCallback(() => {
    setShowSpec(true)
    setSpecText('')
    specIndexRef.current = 0
    if (specIntervalRef.current) clearInterval(specIntervalRef.current)
    specIntervalRef.current = setInterval(() => {
      specIndexRef.current += 2
      setSpecText(SPEC_JSON.slice(0, specIndexRef.current))
      if (specIndexRef.current >= SPEC_JSON.length) {
        clearInterval(specIntervalRef.current!)
        specIntervalRef.current = null
      }
    }, 10)
  }, [])

  useEffect(() => {
    return () => {
      if (specIntervalRef.current) clearInterval(specIntervalRef.current)
    }
  }, [])

  function handleCardClick(id: string) {
    if (selectedId === id) {
      setSelectedId(null)
      setShowSpec(false)
      setSpecText('')
    } else {
      setSelectedId(id)
      setShowSpec(false)
      setSpecText('')
    }
  }

  return (
    <div className='bg-[#F4F5F8] dark:bg-[#111318] text-gray-900 dark:text-white overflow-x-hidden'>

      {/* ══════════════════ NAV ══════════════════ */}
      <nav className='sticky top-0 z-50 bg-white/80 dark:bg-[#111318]/80 backdrop-blur border-b border-gray-200/60 dark:border-white/[0.06] flex justify-between items-center px-8 py-4'>
        <div className='flex items-center gap-2.5'>
          <div className='w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shadow-sm shadow-blue-600/30'>
            <span className='text-white font-bold text-xs'>S</span>
          </div>
          <span className='font-display font-bold text-gray-900 dark:text-white'>SignalPath</span>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={toggle}
            className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors'
            aria-label='Toggle theme'
          >
            {theme === 'dark' ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
          </button>
          <Link
            href='/signin'
            className='text-sm text-gray-500 dark:text-white/45 hover:text-gray-800 dark:hover:text-white/80 px-3 py-1.5 transition-colors'
          >
            Sign in
          </Link>
          <Link
            href='/signup'
            className='text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 font-medium transition-colors'
          >
            Get early access
          </Link>
        </div>
      </nav>

      {/* ══════════════════ HERO ══════════════════ */}
      <section className='relative flex flex-col items-center justify-center px-8 py-28 text-center overflow-hidden'>
        {/* Grid background */}
        <div
          className='absolute inset-0 pointer-events-none'
          style={{
            backgroundImage: theme === 'dark'
              ? 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow blob */}
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none' />

        <div className='relative z-10 max-w-3xl mx-auto animate-slide-up'>
          {/* Badge */}
          <div className='inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full mb-6'>
            <span className='w-1.5 h-1.5 rounded-full bg-blue-500 animate-dot-pulse' />
            Now in early access
          </div>

          <h1 className='font-display text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-5'>
            Turn support tickets into<br />
            <span className='text-blue-500'>product decisions</span>
          </h1>

          <p className='text-lg text-gray-500 dark:text-white/45 max-w-xl mx-auto mb-10 leading-relaxed'>
            Get ranked product opportunities in 48 hours.
            Push to Linear or Jira in one click.
          </p>

          <div className='flex flex-col items-center gap-4'>
            <HeroEmailCapture />
            <p className='text-xs text-gray-400 dark:text-white/25'>
              No credit card required · Setup in under 5 minutes
            </p>
          </div>
        </div>

        {/* Scroll hint */}
        <div className='absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-400 dark:text-white/20'>
          <p className='text-[10px] font-mono uppercase tracking-widest'>Explore the demo</p>
          <ChevronDown className='w-4 h-4 animate-bounce' />
        </div>
      </section>

      {/* ══════════════════ INTERACTIVE DEMO ══════════════════ */}
      <section className='px-8 py-16'>
        <div className='max-w-6xl mx-auto'>
          {/* Section header */}
          <div className='text-center mb-8'>
            <p className='font-mono text-[10px] font-semibold text-blue-400/70 uppercase tracking-[0.2em] mb-2'>
              Live demo · Synthetic data
            </p>
            <h2 className='font-display text-2xl font-bold text-gray-900 dark:text-white mb-2'>
              See what your support queue is really saying
            </h2>
            <p className='text-sm text-gray-500 dark:text-white/40'>
              Click any opportunity to explore the scoring breakdown and generate a spec
            </p>
          </div>

          {/* Demo container */}
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-white/[0.07] p-6 shadow-sm dark:shadow-none'>
            <div className='flex gap-5' style={{ minHeight: '480px' }}>

              {/* Feed column */}
              <div
                className='flex-shrink-0 transition-all duration-300'
                style={{ width: selected ? '260px' : '100%', maxWidth: selected ? '260px' : '460px', margin: selected ? undefined : '0 auto' }}
              >
                <div className='space-y-2'>
                  {OPPS.map((opp, i) => (
                    <FeedCard
                      key={opp.id}
                      opp={opp}
                      isSelected={selectedId === opp.id}
                      isTop={i === 0}
                      compact={!!selected}
                      onClick={() => handleCardClick(opp.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Detail / Spec column */}
              {selected && (
                <div className='flex-1 flex gap-4 animate-slide-in-right overflow-hidden' style={{ minHeight: 0 }}>
                  {/* Detail panel */}
                  <div
                    className='bg-gray-50 dark:bg-[#111318] rounded-xl border border-gray-200 dark:border-white/[0.06] p-5 flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300'
                    style={{ width: showSpec ? '300px' : '100%' }}
                  >
                    <DetailPanel
                      opp={selected}
                      onClose={() => {
                        setSelectedId(null)
                        setShowSpec(false)
                        setSpecText('')
                      }}
                      onGenerateSpec={startSpec}
                    />
                  </div>

                  {/* Spec JSON panel */}
                  {showSpec && (
                    <div className='flex-1 overflow-hidden' style={{ minWidth: 0 }}>
                      <SpecPanel specText={specText} onClose={() => { setShowSpec(false); setSpecText('') }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className='text-center text-xs text-gray-400 dark:text-white/25 mt-4'>
            This demo uses synthetic data. Connect your real tickets to see your actual opportunities.
          </p>
        </div>
      </section>

      {/* ══════════════════ BENTO ══════════════════ */}
      <BentoSection />

      {/* ══════════════════ FAQ ══════════════════ */}
      <section className='px-8 py-20'>
        <div className='max-w-2xl mx-auto'>
          <div className='text-center mb-12'>
            <p className='font-mono text-[10px] font-semibold text-blue-400/60 uppercase tracking-[0.2em] mb-3'>
              FAQ
            </p>
            <h2 className='font-display text-2xl font-bold text-gray-900 dark:text-white'>
              Common questions
            </h2>
          </div>
          <FAQ />
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className='border-t border-gray-200 dark:border-white/[0.05] py-8'>
        <div className='max-w-6xl mx-auto px-8 flex items-center justify-between'>
          <p className='text-xs text-gray-400 dark:text-white/20'>
            &copy; {new Date().getFullYear()} SignalPath. All rights reserved.
          </p>
          <a
            href='https://medium.com/@signalpath'
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/25 hover:text-gray-700 dark:hover:text-white/60 transition-colors'
          >
            <svg className='w-3.5 h-3.5' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
              <path d='M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z' />
            </svg>
            Blog
          </a>
        </div>
      </footer>
    </div>
  )
}
